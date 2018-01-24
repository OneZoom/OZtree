#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test the OZ text search API with a set of queries 

Should return a list of times for the different terms


could recode to use https://github.com/wg/wrk
"""

import sys
import os
import re
import json
import argparse
import requests
from requests.packages.urllib3.util.retry import Retry
import time
from random import sample
from statistics import stdev, mean
from collections import OrderedDict, defaultdict
import time
import colorama
import js2py
from js2py.es6 import js6_to_js5

colorama.init()

parser = argparse.ArgumentParser(description='Blat the OZ API')
parser.add_argument('--url', default=["http://127.0.0.1:8000/API/search_node.json"], nargs="+", help='The full search url, e.g. "http://127.0.0.1:8000/API/search_node.json" or "http://beta.onezoom.org/API/search_node.json". You can give multiple values so as to test the speed of e.g. two different implementations')
parser.add_argument('--requests', default=10, type=int, help='Average timings over this many duplicate requests')
parser.add_argument("-s","--search", nargs="*", default = [], help="One or more search terms, to replace the standard set, for trial purposes only")    
parser.add_argument("-l","--lang", default = None, help="Force language")    
parser.add_argument("-v","--verbosity", action="count", help="Verbosity level: (do not print results, print results only for failures, print all results)", default=0)    

args = parser.parse_args()

#make a single http session, which we can tweak
#s = requests.Session()
#retries = Retry(total=0,
#                backoff_factor=0,
#                status_forcelist=[ 500, 502, 503, 504 ])
#s.mount('http://', HTTPAdapter(max_retries=retries))

if len(args.search):
    search_terms = OrderedDict([
        (None, {term:dict(min_n = -1, max_n = -1, contains_within_top={}) for term in args.search})])
else:
    search_terms = OrderedDict([
        #list test here, keys give language (if key=None, test on all)
        (None, {
            '#':            dict(min_n = 0, max_n= 0, contains_within_top={}),
            'Homo sap':     dict(min_n = 1, contains_within_top={"Homo sapiens": 1}),
            'Homo sapiens': dict(min_n = 1, contains_within_top={"Homo sapiens": 1}),
        }),
        ('en', {
            '££££':         dict(min_n = 0, max_n= 0, contains_within_top={}),
            '漢':           dict(min_n = 0, max_n= 0, contains_within_top={}),
            '💩':           dict(min_n = 0, max_n= 0, contains_within_top={}), #a 4 byte unicode char
            'a':            dict(min_n = 0, max_n= 0, contains_within_top={}),
            'a b':          dict(min_n = 0, max_n= 0, contains_within_top={}),
            ' a b ':        dict(min_n = 0, max_n= 0, contains_within_top={}),
            'aa':           dict(min_n = 0, max_n= 0, contains_within_top={}),
            'aaa':          dict(min_n = 0, max_n= 0, contains_within_top={}),
            'ox':           dict(min_n = 0, max_n= 0, contains_within_top={}),   
            'zz':           dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Human":        dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Fish":         dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Fishes":       dict(min_n = 0, max_n= 0, contains_within_top={}),
            "lion":         dict(min_n = 0, max_n= 0, contains_within_top={"Panthera leo": 3}),
            "tiger":        dict(min_n = 0, max_n= 0, contains_within_top={}),
            'Cat':          dict(min_n = 0, max_n= 0, contains_within_top={}),
            'big cat':      dict(min_n = 0, max_n= 0, contains_within_top={}),
            'Dog':          dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Darwin's":     dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Darwin’s":     dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Mammals":      dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Frog":         dict(min_n = 0, max_n= 0, contains_within_top={}),
            "Frogs":        dict(min_n = 0, max_n= 0, contains_within_top={}),
            'Three men in a ':dict(min_n = 0, max_n= 0, contains_within_top={"Tradescantia spathacea": 1}),
            'Three men in a boat':dict(min_n = 0, max_n= 0, contains_within_top={"Tradescantia spathacea": 1}),
        }),
    ])

#To restrict load on the server, the ordering of returned results is done in javascript
# using the overall_search_score function. We can run this using js2py by
# extracting all the plain functions in OZTreeModule/src/api/search_manager.js and looking for
# lines bounded by a start line of  ^function... and an end line of ^}
#Since it is very slow to convert the JS to JS5, we keep a copy of the converted code locally
js_fn = os.path.join(sys.path[0],'..','..','rawJS','OZTreeModule','src','api','search_manager.js')
cache_fn = os.path.join(sys.path[0],"BlatSearch.code_cache")

js_modtime = os.path.getmtime(js_fn)
try:
    if js_modtime > os.path.getmtime(cache_fn):
        os.remove(cache_fn)
        raise FileNotFoundError
except FileNotFoundError:
    print("Creating cached JS code")
    javascript = ""
    with open(js_fn, 'r') as js_file, open(cache_fn, 'w') as cache_file:
        use_line = False
        for line in js_file:
            if re.match("function",line):
                use_line = True
            elif use_line and re.match("}",line):
                use_line=False
                javascript += line[:line.find(";")]+";\n"
            if use_line:
                javascript += line
        print(js6_to_js5(javascript+ "\noverall_search_score;"), file=cache_file)
    
overall_search_score = js2py.eval_js(open(cache_fn, 'r').read())


times={p:defaultdict(list) for p in args.url}
codes = {p:{} for p in args.url}
lengths = {p:OrderedDict() for p in args.url}
failed = {}
print("Starting API requests on the following APIs:")
for ui, url in enumerate(args.url):
    print("API {}: {}".format(ui+1, url))

for i in range(1, args.requests+1):
    if args.verbosity:
        print('*', flush=True, end="")
    for lang, terms in search_terms.items():
        payload = {'no_log':1} #do not log the count in the db
        if args.lang:
            lang = args.lang
        if lang is not None:
            payload['lang']=lang
        for ti, searchterm in enumerate(sorted(terms.keys())):
            expected = terms[searchterm]
            payload['query']=searchterm
            for ui, url in enumerate(args.url):
                start = time.time()
                r = requests.get(url, params=payload)
                r.content  # wait until full content has been transfered
                times[url][searchterm].append(time.time() - start)
                lengths[url][searchterm]={k:len(v) for k,v in json.loads(r.text).items()}
                if str(r.status_code) not in codes[url]:
                    codes[url][str(r.status_code)]=0
                codes[url][str(r.status_code)] += 1

                if i==args.requests:
                    #check on expected
                    result = json.loads(r.text)
                    main_hits = result['nodes']
                    sponsor_hits = result['sponsors']
                    sciname_idx = main_hits['headers']['name']
                    vername_idx = main_hits['headers']['vernacular']
                    exvname_idx = main_hits['headers']['extra_vernaculars']
                    scinames = {}
                    scinames.update({sp[sciname_idx]:sp for sp in main_hits['leaf_hits']})
                    scinames.update({sp[sciname_idx]:sp for sp in main_hits['node_hits']})
                    total_hits = len(scinames)
                    
                    #this is the last loop, we can print out the hits
                    print("Testing search on API {} ({:4d} hits): ".format(ui, total_hits), end="")

                    ranking = {name:rank for rank, name in enumerate(
                         sorted(scinames, reverse=True, key=lambda sn: overall_search_score(
                            searchterm, 
                            scinames[sn][sciname_idx],
                            lang, 
                            scinames[sn][vername_idx] if len(scinames[sn]) > vername_idx else None, 
                            scinames[sn][exvname_idx] if len(scinames[sn]) > exvname_idx else [])[0]))}

                    fail = False
                    min_n = expected.get('min_n') or 0
                    max_n = expected.get('max_n') or 1e9
                        
                    if not min_n <= total_hits <= max_n:
                        fail = True
                    for sp, position in expected['contains_within_top'].items():
                        if sp in scinames:
                            if ranking[sp] > position:
                                fail = True
                        else:
                            fail = True
                    
                    if len(args.search)==0:
                        if fail:
                            print(colorama.Fore.RED + "FAILED" + colorama.Style.RESET_ALL, end="")
                        else:
                            print(colorama.Fore.GREEN + "PASSED" + colorama.Style.RESET_ALL, end="")
                    print(' {:.2g}{}s/request for search term "{}".'.format(
                        mean(times[url][searchterm]), 
                        "±{:.2g}".format(stdev(times[url][searchterm])) if len(times[url][searchterm])>1 else "", 
                        searchterm))
                    if args.verbosity:
                        if args.verbosity>1 or fail:
                            #print out the returned list of species, one per line, ordered properly, so we can check
                            for sn in sorted(ranking, key=ranking.get):
                                print("{}: {} [{}]".format(ranking[sn], scinames[sn][sciname_idx], 
                                    scinames[sn][vername_idx] if len(scinames[sn]) > vername_idx else "no vernacular"))
if args.verbosity:
    for url in args.url:
        print("Error reponses for", url, "('200'=OK):\n", codes[url])



