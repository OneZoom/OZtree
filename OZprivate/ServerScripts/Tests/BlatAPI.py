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
from random import sample, seed
from statistics import stdev, mean
parser = argparse.ArgumentParser(description='Blat the OZ API')
parser.add_argument('--protocol', default="http", help='protocol: http or https')
parser.add_argument('--server', default="127.0.0.1:8000", help='The server to use: try 127.0.0.1:8000, or beta.onezoom.org')
parser.add_argument('--pages', default=["API/node_details.json"], nargs="+", help='The API "page", e.g. API/node_details.json')
parser.add_argument('--method', default="get", help="'post' or 'get'")
parser.add_argument('--ids', default=20, type=int, help="This many leaf id requests and node id requests in a batch")
parser.add_argument('--requests', default=100, type=int, help='Average timings over this many random requests')
parser.add_argument('--seed', default=None, type=int, help='Use this random seed (allows replication)')
args = parser.parse_args()

            
#make a single http session, which we can tweak
#s = requests.Session()
#retries = Retry(total=0,
#                backoff_factor=0,
#                status_forcelist=[ 500, 502, 503, 504 ])
#s.mount('http://', HTTPAdapter(max_retries=retries))




if args.seed is not None:
    seed(args.seed)
payload = {'node_ids':{}, 'leaf_ids':{}, 'imageSource':'best_any'}
times={p:[] for p in args.pages}
codes = {p:{} for p in args.pages}
for i in range(args.requests):
    payload['node_ids']=",".join([str(x) for x in sample(range(int(2e6)), args.ids)])
    payload['leaf_ids']=",".join([str(x) for x in sample(range(int(2e6)), args.ids)])
    for p in args.pages:
        
        url = args.protocol + "://" + args.server + "/" + p
        if args.method == 'post':
            start = time.time()
            r=requests.post(url, data = payload)
        else:
            url_plus = url + "?" + 'node_ids=' + payload['node_ids'] + "&" + 'leaf_ids=' + payload['leaf_ids'] + "&" + 'imageSource=' + payload['imageSource']
            start = time.time()
            r = requests.get(url_plus)
        r.content  # wait until full content has been transfered
        times[p].append(time.time() - start)
        if str(r.status_code) not in codes[p]:
            codes[p][str(r.status_code)]=0
        codes[p][str(r.status_code)] += 1

for p in args.pages:    
    print(p, "=", mean(times[p]), "±", stdev(times[p]) if len(times[p])>1 else "N/A", "seconds per request of ", args.ids, " ids in a batch")
for p in args.pages:    
    print("Error reponses for", p, "('200'=OK):\n", codes[p])
if args.requests==1:
    print(url)
