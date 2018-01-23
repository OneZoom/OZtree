#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test the OZ text search API with a set of queries 

Should return a list of times for the different terms


could recode to use https://github.com/wg/wrk
"""

import sys
import json
import argparse
import requests
from requests.packages.urllib3.util.retry import Retry
import time
from random import sample
from statistics import stdev, mean
from collections import OrderedDict
parser = argparse.ArgumentParser(description='Blat the OZ API')
parser.add_argument('--url', default=["http://127.0.0.1:8000/API/search_node.json"], nargs="+", help='The full search url, e.g. "http://127.0.0.1:8000/API/search_node.json" or "http://beta.onezoom.org/API/search_node.json". You can give multiple values so as to test the speed of e.g. two different implementations')
parser.add_argument('--requests', default=10, type=int, help='Average timings over this many duplicate requests')
parser.add_argument("-v","--verbosity", action="count", help="Verbosity level: (do not print results, print results only for failures, print all results)", default=0)    

args = parser.parse_args()

#make a single http session, which we can tweak
#s = requests.Session()
#retries = Retry(total=0,
#                backoff_factor=0,
#                status_forcelist=[ 500, 502, 503, 504 ])
#s.mount('http://', HTTPAdapter(max_retries=retries))

search_terms = OrderedDict([
    #list test here, keys give language (if key=None, test on all)
    (None, {
        '#':            dict(min_n = 0, max_n= 0, contains_within_top={}),
        'Homo sap':     dict(min_n = 0, max_n= 0, contains_within_top={}),
        'Homo sapiens': dict(min_n = 1, max_n= 1, contains_within_top={"Homo sapiens": 1}),
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
        'Three men in a ':dict(min_n = 0, max_n= 0, contains_within_top={}),
        'Three men in a boat':dict(min_n = 0, max_n= 0, contains_within_top={}),
    }),
    ('zh', {
        '漢':            dict(min_n = 0, max_n= 0, contains_within_top={}),
    }),
])

times={p:[] for p in args.url}
codes = {p:{} for p in args.url}
lengths = {p:OrderedDict() for p in args.url}
failed = {}
for i in range(1, args.requests+1):
    print('*', flush=True, end="")
    for lang, terms in search_terms.items():
        payload = {'no_log':1} #do not log the count in the db
        if lang is not None:
            payload['lang']=lang
        for searchterm in sorted(terms.keys()):
            expected = terms[searchterm]
            payload['query']=searchterm
            for url in args.url:
                start = time.time()
                r = requests.get(url, params=payload)
                r.content  # wait until full content has been transfered
                times[url].append(time.time() - start)
                lengths[url][searchterm]={k:len(v) for k,v in json.loads(r.text).items()}
                if str(r.status_code) not in codes[url]:
                    codes[url][str(r.status_code)]=0
                codes[url][str(r.status_code)] += 1

                if i==args.requests:
                    #this is the last loop, we can print out the hits
                    if url==args.url[1]:
                        #check on expected
                        fail = True
                        if args.verbosity:
                            if args.verbosity>1 or Fail:
                                print(r.content)
                    print(url, "=", mean(times[p]), "±", stdev(times[url]) if len(times[url])>1 else "N/A", "seconds per request")
                    if verbosity:
                        print("Error reponses for", url, "('200'=OK):\n", codes[url])
