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
import time
import math
from random import sample
from statistics import stdev, mean
from collections import OrderedDict, defaultdict
import time
from urllib.parse import urlparse
import requests
from requests.packages.urllib3.util.retry import Retry

import colorama
import js2py
from js2py.es6 import js6_to_js5

script_path = os.path.dirname(os.path.realpath(__file__))

if __name__ == '__main__':
    sys.path.append(os.path.join(script_path, "..",".."))
    from util import web2py_app_dir, Web2py_server, base_url
else:
    from ...util import web2py_app_dir, Web2py_server, base_url
    

default_api_path = "/API/search_node.json"

'''
Some prior tests
> stopping web2py
yans-air:tests yan$ ./benchmarking/API/test_textsearch.py -r 1 --url http://www.onezoom.org/API/search_node.json
PASSED 3.3s/request for search term "#".
PASSED 0.77s/request for search term "Homo sap".
PASSED 0.78s/request for search term "Homo sapiens".
PASSED 0.74s/request for search term "££££".
PASSED 0.74s/request for search term "漢".
FAILED 22s/request for search term "a".
FAILED 3.3s/request for search term "a b".
PASSED 2.9s/request for search term " a b ".
PASSED 0.075s/request for search term "💩".
PASSED 2.5s/request for search term "aa".
PASSED 0.12s/request for search term "aaa".
PASSED 2.8s/request for search term "ox".
PASSED 3.1s/request for search term "zz".
PASSED 0.11s/request for search term "Human".
PASSED 0.35s/request for search term "Fish".
PASSED 0.12s/request for search term "Fishes".
PASSED 0.13s/request for search term "lion".
PASSED 0.19s/request for search term "tiger".
PASSED 1.2s/request for search term "Cat".
PASSED 0.79s/request for search term "big cat".
PASSED 0.19s/request for search term "Dog".
PASSED 0.75s/request for search term "Mammals".
PASSED 0.34s/request for search term "rat".
PASSED 0.29s/request for search term "mouse".
PASSED 0.92s/request for search term "Frog".
PASSED 0.12s/request for search term "Frogs".
PASSED 1s/request for search term "Three men in a ".
PASSED 1.1s/request for search term "Three men in a boat".
http://www.onezoom.org/API/search_node.json: total time for all queries = 51.463809967041016 secs

./benchmarking/API/test_textsearch.py -r 2 --url http://beta.onezoom.org/API/search_node.json
PASSED 0.089±0.011s/request for search term "#".
PASSED 0.085±0.0014s/request for search term "Homo sap".
PASSED 0.085±0.0044s/request for search term "Homo sapiens".
PASSED 0.083±0.00044s/request for search term "££££".
PASSED 0.08±0.0014s/request for search term "漢".
PASSED 0.082±0.001s/request for search term "a".
PASSED 0.08±0.002s/request for search term "a b".
PASSED 0.081±0.0027s/request for search term " a b ".
PASSED 0.089±0.013s/request for search term "💩".
PASSED 0.097±0.0048s/request for search term "aa".
PASSED 0.09±0.0046s/request for search term "aaa".
PASSED 0.52±0.039s/request for search term "ox".
PASSED 0.11±0.03s/request for search term "zz".
PASSED 0.1±0.016s/request for search term "Human".
PASSED 0.37±0.028s/request for search term "Fish".
PASSED 0.088±0.0039s/request for search term "Fishes".
PASSED 0.11±0.0028s/request for search term "lion".
PASSED 0.17±0.0083s/request for search term "tiger".
PASSED 0.88±0.0084s/request for search term "Cat".
PASSED 0.098±0.0018s/request for search term "big cat".
PASSED 0.18±6.9e-06s/request for search term "Dog".
PASSED 0.086±0.0012s/request for search term "Mammals".
PASSED 0.34±0.0053s/request for search term "rat".
PASSED 0.26±0.0049s/request for search term "mouse".
PASSED 0.58±0.008s/request for search term "Frog".
PASSED 0.098±0.00025s/request for search term "Frogs".
PASSED 0.084±0.00016s/request for search term "Three men in a ".
PASSED 0.085±0.0024s/request for search term "Three men in a boat".
'''
standard_search_time = 0.15 #roughly max we expect for an easy search with few results

default_search_terms = OrderedDict([
    #list test here, keys give language (if key=None, test on all)
    (None, [
        #max_time_secs is derived from prior testing above
        ('#',            dict(max_n = 0, contains_within_top={}, max_time_secs = standard_search_time)),
        ('Homo sap',     dict(min_n = 1, max_n=1, contains_within_top={"Homo sapiens": 1}, max_time_secs = standard_search_time)),
        ('Homo sapiens', dict(min_n = 1, max_n=1, contains_within_top={"Homo sapiens": 1}, max_time_secs = standard_search_time)),
    ]),
    ('en', [
        'The following should be culled (not return anything)',
        ('££££',         dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        ('漢',           dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        ('a',            dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        ('a b',          dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        (' a b ',        dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        'Test a 4-byte unicode character (e.g. is it stored)',
        ('💩',           dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)), #a 4 byte unicode char
        'Two-letter words use stem matching, rather than fultext index',
        ('aa',           dict(min_n = 10, contains_within_top={}, max_time_secs = standard_search_time*3)), #quite a lot of hits here
        ('ox',           dict(min_n = 100, contains_within_top={}, max_time_secs = standard_search_time*6)),   
        ('zz',           dict(min_n = 1, contains_within_top={"Zamioculcas zamiifolia":1}, max_time_secs = standard_search_time)),
        'Three-letter words fultext index, and may be slow',
        ('aaa',          dict(min_n = 1, contains_within_top={"Cavaticovelia aaa":3}, max_time_secs = standard_search_time)),
        ('Cat',          dict(min_n = 1000, contains_within_top={}, max_time_secs = 1.5)), #this is slow since there are so many hits
        ('Dog',          dict(min_n = 10, contains_within_top={},  max_time_secs = 1)),
        ("rat",          dict(min_n = 10, contains_within_top={},  max_time_secs = 1)),
        ('big cat',      dict(min_n = 1, contains_within_top={})),
        'The following are all common search terms',
        ("Human",        dict(min_n = 1, contains_within_top={}, max_time_secs = standard_search_time)),
        ("Fish",         dict(min_n = 100, contains_within_top={})),
        ("Fishes",       dict(min_n = 10, contains_within_top={})),
        ("lion",         dict(min_n = 10, contains_within_top={"Panthera leo": 3})),
        ("tiger",        dict(min_n = 10, contains_within_top={})),
        #("Darwin's",     dict(min_n = 1, contains_within_top={"Geospiza":10})), #Darwin's finches are not in :(
        #("Darwin’s",     dict(min_n = 1, contains_within_top={"Geospiza":10})),
        ("Mammals",      dict(min_n = 1, contains_within_top={})),
        ("mouse",        dict(min_n = 10, contains_within_top={})),
        ("Frog",         dict(min_n = 0, contains_within_top={},  max_time_secs = 1)),
        ("Frogs",        dict(min_n = 0, contains_within_top={})),
        ('Three men in a ',dict(min_n = 1, max_n= 4, contains_within_top={"Tradescantia spathacea": 1})),
        ('Three men in a boat',dict(min_n = 1, max_n= 4, contains_within_top={"Tradescantia spathacea": 1})),
    ]),
    ('zh', [
        'The following should be culled (not return anything)',
        ('££££',         dict(max_n = 0, contains_within_top={}, max_time_secs = standard_search_time)),
        ('a',            dict(max_n= 0, contains_within_top={}, max_time_secs = standard_search_time)),
        'Some chinese characters should exist in vernacular names',
        ('漢',           dict(min_n = 1, contains_within_top={}, max_time_secs = standard_search_time)),
    ])
])

class TestTextsearch(object):

    replicates = 3

    @classmethod
    def setUpClass(self):
        self.web2py = Web2py_server()
        wait_for_server_active()
        colorama.init()
        self.js_search_score = make_js_translation_code()

    def TestSearchReturnSpeed(self):
        urls = [base_url.rstrip("/") + default_api_path]
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
    
def run_benchmark(search_terms, n_replicates, urls, overall_search_score, verbosity=0, lang_override = None, url_abbrevs = {}):
    #make a single http session, which we can tweak
    #s = requests.Session()
    #retries = Retry(total=0,
    #                backoff_factor=0,
    #                status_forcelist=[ 500, 502, 503, 504 ])
    #s.mount('http://', HTTPAdapter(max_retries=retries))

    #flags to record failures
    errors = {k:2**v for v, k in enumerate(['wrong number of hits', 'av. response too slow', 'missing result', 'results in wrong order'])}
    
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
                        r = requests.get(url, params={k:v for k,v in payload.items() if v is not None}, timeout=60)
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
        
                            fail = 0
                            min_n = expected.get('min_n', 0)
                            max_n = expected.get('max_n', math.inf)
                                
                            if not min_n <= total_hits <= max_n:
                                fail |= errors['wrong number of hits']
                            if 'max_time_secs' in expected and mean(times[url][searchterm]) > expected['max_time_secs']:
                                fail |= errors['av. response too slow']
                                
                            for sp, position in expected.get('contains_within_top',{}).items():
                                if sp in scinames:
                                    if ranking[sp] > position:
                                        fail |= errors['results in wrong order']
                                else:
                                    fail |= errors['missing result']
                            
                            if fail:
                                print(colorama.Fore.RED + \
                                    "FAILED: {}".format(", ".join([e for e,b in errors.items() if (b & fail)])) + \
                                    colorama.Style.RESET_ALL, end="")
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
    parser.add_argument('--url', default=[], nargs="+", help='The search url, e.g. "http://127.0.0.1:8000/" or "http://beta.onezoom.org/API/search_node.json". If there is no path after the server name, the standard path ({}) is added. You can give multiple values so as to test the speed of e.g. two different implementations. If no URL is given, we spin up a local version of the web2py site and test that.')
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
            urls = [(url if urlparse(url).path else url.rstrip("/") + default_api_path) for url in args.url]
            url_abbrevs = {url:i+1 for i,url in enumerate(urls)}
        else:
            web2py = Web2py_server()
            #must wait until the http server is properly available
            start_time = time.time()
            urls = [base_url + default_api_path]
            url_abbrevs = {}
        
        if args.verbosity:
            print("Starting API requests on the following APIs:")
            for url in urls:
                if url in url_abbrevs:
                    print("API {}: {}".format(url_abbrevs[url],url))
                else:
                    print("{}".format(url))
                
        run_benchmark(search_terms, args.requests, urls, js_search_score, verbosity = args.verbosity, lang_override = args.lang, url_abbrevs= url_abbrevs)

    except KeyboardInterrupt:        
        if web2py is not None:
            web2py.stop_server()
        sys.exit()

