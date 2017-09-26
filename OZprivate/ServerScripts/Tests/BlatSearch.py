#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test the OZ API (the one which returns leaf and node details)

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
parser.add_argument('--protocol', default="http", help='protocol: http or https')
parser.add_argument('--server', default="127.0.0.1:8000", help='The server to use: try 127.0.0.1:8000, or beta.onezoom.org')
parser.add_argument('--pages', default=["search_for_name", "search_for_name2"], nargs="+", help='The search "pages", e.g. search_for_name')
parser.add_argument('--requests', default=10, type=int, help='Average timings over this many duplicate requests')
args = parser.parse_args()

#make a single http session, which we can tweak
#s = requests.Session()
#retries = Retry(total=0,
#                backoff_factor=0,
#                status_forcelist=[ 500, 502, 503, 504 ])
#s.mount('http://', HTTPAdapter(max_retries=retries))


search_terms=["bear","lion","red","pan","orchi","optera","rat","grass","monkey"]
payload = {'query':"", 'lang':'en'}
times={p:[] for p in args.pages}
codes = {p:{} for p in args.pages}
lengths = {p:OrderedDict() for p in args.pages}
for i in range(args.requests):
    for t in search_terms:
        payload['query']=t
        for p in args.pages:
            plus = '&' if '?' in p else '?'
            url = args.protocol + "://" + args.server + "/" + p + plus + "&".join([k+"="+v for k,v in payload.items()])
            start = time.time()
            r = requests.get(url)
            r.content  # wait until full content has been transfered
            times[p].append(time.time() - start)
            lengths[p][t]={k:len(v) for k,v in json.loads(r.text).items()}
            if str(r.status_code) not in codes[p]:
                codes[p][str(r.status_code)]=0
            codes[p][str(r.status_code)] += 1

for p in args.pages:    
    print(p, "=", mean(times[p]), "±", stdev(times[p]) if len(times[p])>1 else "N/A", "seconds per request")
for p in args.pages:    
    print("Error reponses for", p, "('200'=OK):\n", codes[p])
for p in args.pages:    
    print("Sizes for", p, lengths[p])
