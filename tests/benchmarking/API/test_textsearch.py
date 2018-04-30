#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test the OZ text search API with a set of queries

If you want to run this to benchmark the API running on a different computer to the one you are 
testing on, you need to run it directly on the command-line, as in

 ./test_textsearch.py --

Timings are dependent on database settings, in particular innodb_ft_min_token_size which is set to 3
(SHOW VARIABLES LIKE 'innodb_ft_min_token_size';)

Note that we will want to be able to specify a different server for the blatting test, so that e.g. we can test beta remotely
One way to do this is to place a testing setup after if __name__ == '__main__':, so that the file can be called directly with 
a server parameter
"""

import sys
import os
import re
import json
import argparse
import requests
from requests.packages.urllib3.util.retry import Retry
import time
import math
from random import sample
from statistics import stdev, mean
from collections import OrderedDict, defaultdict
import time
import colorama
import js2py
from js2py.es6 import js6_to_js5

script_path = os.path.dirname(os.path.realpath(__file__))

if __name__ == '__main__':
    sys.path.append(os.path.join(script_path, "..",".."))
    from util import web2py_app_dir, web2py_server, base_url
else:
    from ...util import web2py_app_dir, web2py_server, base_url
    

default_api_path = "API/search_node.json"

default_search_terms = OrderedDict([
    #list test here, keys give language (if key=None, test on all)
    (None, [
        ('#',            dict(min_n = 0, max_n= 0, contains_within_top={})),
        ('Homo sap',     dict(min_n = 1, max_n=1, contains_within_top={"Homo sapiens": 1})),
        ('Homo sapiens', dict(min_n = 1, max_n=1, contains_within_top={"Homo sapiens": 1})),
    ]),
    ('en', [
        'The following should be culled (not return anything)',
        ('££££',         dict(min_n = 0, max_n= 0, contains_within_top={})),
        ('漢',           dict(min_n = 0, max_n= 0, contains_within_top={})),
        ('a',            dict(max_n= 0, contains_within_top={})),
        ('a b',          dict(max_n= 0, contains_within_top={})),
        (' a b ',        dict(max_n= 0, contains_within_top={})),
        'Test a 4-byte unicode character (e.g. is it stored)',
        ('💩',           dict(max_n= 0, contains_within_top={})), #a 4 byte unicode char
        'Two-letter words are slow',
        ('aa',           dict(min_n = 0, contains_within_top={})),
        ('aaa',          dict(min_n = 1, contains_within_top={"Cavaticovelia aaa":3})),
        ('ox',           dict(min_n = 100, contains_within_top={})),   
        ('zz',           dict(min_n = 1, contains_within_top={"Zamioculcas zamiifolia":1})),
        'The following are all common search terms',
        ("Human",        dict(min_n = 1, contains_within_top={})),
        ("Fish",         dict(min_n = 0, contains_within_top={})),
        ("Fishes",       dict(min_n = 0, contains_within_top={})),
        ("lion",         dict(min_n = 0, contains_within_top={"Panthera leo": 3})),
        ("tiger",        dict(min_n = 0, contains_within_top={})),
        ('Cat',          dict(min_n = 0, contains_within_top={})),
        ('big cat',      dict(min_n = 0, contains_within_top={})),
        ('Dog',          dict(min_n = 0, contains_within_top={})),
        ("Darwin's",     dict(min_n = 1, contains_within_top={"Geospiza":10})),
        ("Darwin’s",     dict(min_n = 1, contains_within_top={"Geospiza":10})),
        ("Mammals",      dict(min_n = 0, contains_within_top={})),
        ("rat",        dict(min_n = 0, contains_within_top={})),
        ("mouse",        dict(min_n = 0, contains_within_top={})),
        ("Frog",         dict(min_n = 0, contains_within_top={})),
        ("Frogs",        dict(min_n = 0, contains_within_top={})),
        ('Three men in a ',dict(min_n = 0, max_n= 4, contains_within_top={"Tradescantia spathacea": 1})),
        ('Three men in a boat',dict(min_n = 0, max_n= 4, contains_within_top={"Tradescantia spathacea": 1})),
    ]),
])

class TestTextsearch(object):

    replicates = 1

    @classmethod
    def setUpClass(self):
        print("> starting web2py")
        self.web2py = web2py_server()
        wait_for_server_active()
        colorama.init()
        self.js_search_score = make_js_translation_code()

    @classmethod    
    def tearDownClass(self):
        print("> stopping web2py")
        self.web2py.kill()

    def TestSearchReturnSpeed(self):
        urls = [base_url + default_api_path]
        run_benchmark(default_search_terms, self.replicates, urls, self.js_search_score, verbosity=1)


def make_js_translation_code():
    """
    To restrict load on the server, the ordering of returned results is done in javascript
    using the overall_search_score function. We can run this using js2py by
    extracting all the plain functions in OZTreeModule/src/api/search_manager.js and looking for
    lines bounded by a start line of  ^function... and an end line of ^}
    Since it is very slow to convert the JS to JS5, we keep a copy of the converted code locally
    """
    js_fn = os.path.join(web2py_app_dir,'OZprivate','rawJS','OZTreeModule','src','api','search_manager.js')
    cache_fn = os.path.join(script_path,"BlatSearch.code_cache")
    
    js_modtime = os.path.getmtime(js_fn)
    try:
        if js_modtime > os.path.getmtime(cache_fn):
            os.remove(cache_fn)
            raise FileNotFoundError
    except FileNotFoundError:
        print("One-off creation of cached JS code")
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
        
    return js2py.eval_js(open(cache_fn, 'r').read())

def wait_for_server_active():
    for i in range(1000):
        try:
            requests.get(base_url)
            break
        except requests.exceptions.ConnectionError:
            time.sleep(0.1)
    return i

    
def run_benchmark(search_terms, n_replicates, urls, overall_search_score, verbosity=0, lang_override = None, url_abbrevs = {}):
    #make a single http session, which we can tweak
    #s = requests.Session()
    #retries = Retry(total=0,
    #                backoff_factor=0,
    #                status_forcelist=[ 500, 502, 503, 504 ])
    #s.mount('http://', HTTPAdapter(max_retries=retries))

    times={p:defaultdict(list) for p in urls}
    codes = {p:{} for p in urls}
    lengths = {p:OrderedDict() for p in urls}
    failed = {}
    for i in range(1, n_replicates+1):
        #go through all terms before replicating, to avoid the DB caching the most recent result
        if verbosity:
            print('.', flush=True, end="")
        for lang, terms in search_terms.items():
            payload = {'no_log':1} #do not log the count in the db
            payload['lang'] = lang_override or lang
            for t in terms:
                if isinstance(t, str):
                    #this is not a term to search, but a heading
                    if verbosity > 1 and i==n_replicates:
                        print(colorama.Style.DIM + t + colorama.Style.RESET_ALL)
                else:
                    searchterm = t[0]
                    expected = t[1]
                    payload['query']=searchterm
                    for url in urls:
                        start = time.time()
                        r = requests.get(url, params={k:v for k,v in payload.items() if v is not None}, timeout=30)
                        r.content  # wait until full content has been transfered
                        times[url][searchterm].append(time.time() - start)
                        lengths[url][searchterm]={k:len(v) for k,v in json.loads(r.text).items()}
                        if str(r.status_code) not in codes[url]:
                            codes[url][str(r.status_code)]=0
                        codes[url][str(r.status_code)] += 1
        
                        if i==n_replicates:
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
                            if verbosity:
                                print("Testing search on {} ({:4d} hits): ".format(url_abbrevs[url] if url in url_abbrevs else url, total_hits), end="")
        
                            ranking = {name:rank for rank, name in enumerate(
                                 sorted(scinames, reverse=True, key=lambda sn: overall_search_score(
                                    searchterm, 
                                    scinames[sn][sciname_idx],
                                    lang, 
                                    scinames[sn][vername_idx] if len(scinames[sn]) > vername_idx else None, 
                                    scinames[sn][exvname_idx] if len(scinames[sn]) > exvname_idx else [])[0]))}
        
                            fail = False
                            min_n = expected.get('min_n', 0)
                            max_n = expected.get('max_n', math.inf)
                                
                            if not min_n <= total_hits <= max_n:
                                fail = True
                            for sp, position in expected.get('contains_within_top',{}).items():
                                if sp in scinames:
                                    if ranking[sp] > position:
                                        fail = True
                                else:
                                    fail = True
                            
                            if fail:
                                print(colorama.Fore.RED + "FAILED" + colorama.Style.RESET_ALL, end="")
                            else:
                                print(colorama.Fore.GREEN + "PASSED" + colorama.Style.RESET_ALL, end="")
                            print(' {:.2g}{}s/request for search term "{}".'.format(
                                mean(times[url][searchterm]), 
                                "±{:.2g}".format(stdev(times[url][searchterm])) if len(times[url][searchterm])>1 else "", 
                                searchterm))
                            if verbosity>1:
                                if verbosity>2 or fail:
                                    #print out the returned list of species, one per line, ordered properly, so we can check
                                    for sn in sorted(ranking, key=ranking.get):
                                        print("{}: {} [{}]".format(ranking[sn], scinames[sn][sciname_idx], 
                                            scinames[sn][vername_idx] if len(scinames[sn]) > vername_idx else "no vernacular"))
    for url in urls:
        print("{}: total time for all queries = {} secs".format(url, sum([mean(times[url][t]) for t in times[url]])))
    if verbosity > 1:
        for url in urls:
            print("Error reponses for", url, "('200'=OK):\n", codes[url])
    
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Blat the OZ API')
    parser.add_argument('--url', default=[], nargs="+", help='The full search url, e.g. "http://127.0.0.1:8000/API/search_node.json" or "http://beta.onezoom.org/API/search_node.json". You can give multiple values so as to test the speed of e.g. two different implementations. If none is given, we spin up a local version of the web2py site and test that.')
    parser.add_argument("-r", '--requests', default=10, type=int, help='Average timings over this many duplicate requests')
    parser.add_argument("-s","--search", nargs="*", default = [], help="One or more search terms, to replace the standard set, mainly for development")    
    parser.add_argument("-l","--lang", default = None, help="Force language")    
    parser.add_argument("-v","--verbosity", action="count", help="Verbosity level: (0 = do not print anything, 1 = print search terms, 2 = print full search result lists only for failures, 3 = print full search results lists for everything)", default=0)    
    
    args = parser.parse_args()
    colorama.init()
    web2py = None
    
    
    if len(args.search):
        #override the default set of search terms
        search_terms = OrderedDict([
            (None, [(term,dict(min_n = -1, max_n = -1, contains_within_top={})) for term in args.search])])
    else:
        search_terms = default_search_terms
        
    js_search_score = make_js_translation_code()
    
    try:
        if len(args.url):
            urls = args.url
            url_abbrevs = {url:i+1 for i,url in enumerate(urls)}
        else:
            print("> starting web2py on {}".format(base_url))
            web2py = web2py_server()
            #must wait until the http server is properly available
            start_time = time.time()
            if wait_for_server_active() and args.verbosity:
                print("Waited {} seconds for server to start".format(time.time()-start_time))
            urls = [base_url + default_api_path]
            url_abbrevs = {}
        
        if args.verbosity:
            print("Starting API requests on the following APIs:")
            for url in urls:
                print("API {}: {}".format(url))
        run_benchmark(search_terms, args.requests, urls, js_search_score, verbosity = args.verbosity, lang_override = args.lang, url_abbrevs= url_abbrevs)

    except KeyboardInterrupt:        
        if web2py is not None:
            print("> killing web2py")
            web2py.kill()
        sys.exit()

    if web2py is not None:
        print("> stopping web2py")
        web2py.kill()
