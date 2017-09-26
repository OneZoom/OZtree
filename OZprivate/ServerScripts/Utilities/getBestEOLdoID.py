#!/usr/bin/env python3
# -*- coding: utf-8 -*-
''' Given a csv input file containing EOL page numbers, return a file of the best pd|cc-by|cc-by-sa picture ids and the common names. It is useful to include OTT numbers for each EOL id, so there can be multiple columns in each line of the file, one of which is an EOL id. The column number (1,2,3 etc) containing the EOL id can be specified using -c X

e.g. list of all leaves using 
 cut -f 2,4 -d, data/output_files/ordered_leaves.csv | ServerScripts/Utilities/getBestEOLdoID.py -c 2 > output.txt

 The simplest use of this script is e.g. 
      ./getBestEOLdoID.pl pageIDs.txt output.txt
'''

import os
import sys
import re
import csv
import argparse
import requests
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import html

def warn(*objs):
  print(*objs, file=sys.stderr)

def getPageInfo(input_ids, sess):
    url = "http://eol.org/api/pages/1.0.json"; #see http://eol.org/api/docs/pages
    APIkey="0e8786f5d94e9587e31ed0f7703c9a81f3036c7f"; #replace with your own API key.
    pages_params = {
        'batch'          : 'true',
        'key'            : APIkey,
        'images_per_page': 1,     # only look at the first images
        'videos_per_page': 0,
        'sounds_per_page': 0,
        'maps_per_page'  : 0,
        'texts_per_page' : 0,
        'iucn'           : 'false',
        'licenses'       :'pd|cc-by|cc-by-sa', #change this to get objects distributed under different licences
        'details'        : 'false',
        'references'     : 'false',
        'synonyms'       : 'false',
        'taxonomy'       : 'false',
        'language'       : args.language,
        'cache_ttl'      : 2500, #only cache for X secs
    }
    input_ids = [id for id in input_ids] #convert to array
    eol_ids = [str(id) for id in input_ids]
    if args.verbose:
        warn('checking ' , eol_ids)

    try:
        #If 'vetted' is given a value of '1', then only trusted content will be returned. If 'vetted' is '2', then only trusted and unreviewed content will be returned (untrusted content will not be returned). If 'vetted' is '3', then only unreviewed content will be returned. If 'vetted' is '4', then only untrusted content will be returned.The default is to return all content.

        pages_params.update({'id':",".join(eol_ids), 'vetted':1, 'common_names': 'true'})
        r1 = sess.get(url,params=pages_params, timeout=10)
        pages_params.update({'id':",".join(eol_ids), 'vetted':3, 'common_names': 'false'})
        r2 = sess.get(url,params=pages_params, timeout=10)
    except requests.exceptions.Timeout:
        warn('socket timed out - URL {}'.format(url))
        return
    except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as error:
        warn('Data not retrieved because {}\nURL: {}'.format(error, url))
        return

    returned_ids = [int(i.popitem()[0]) for i in r1.json()]
    d1 = [i.popitem()[1] for i in r1.json()]
    d2 = [i.popitem()[1] for i in r2.json()]
    
    conversion = dict(zip(returned_ids, input_ids))
    warn(conversion)
    final_data = {id:{'vn':"", 'DOid':None} for id in input_ids}

    for data in d1:
        VN_en=""
        try:
            for vn in data['vernacularNames']:
                if (vn['language'] and vn['language'] == args.language):
                  if VN_en=="" or ('eol_preferred' in vn and vn['eol_preferred'] == 'true'):
                      VN_en = vn['vernacularName'] #pick the first one
        except KeyError:
            #no vernacular names array
            pass
        final_data[conversion[data['identifier']]]['vn'] = VN_en
    
    trustedpics = {data['identifier']:[data['dataObjects'][0]['dataObjectVersionID'], data['dataObjects'][0]['dataRating']] for data in d1 if 'dataObjects' in data and len(data['dataObjects'])}
    unreviewedpics = {data['identifier']:[data['dataObjects'][0]['dataObjectVersionID'], data['dataObjects'][0]['dataRating']] for data in d2 if 'dataObjects' in data and len(data['dataObjects'])}
    
    for k in returned_ids:
        c = conversion[k]
        if k != c:
            warn("WARNING: ID passed in ({}) is not the same as ID returned ({})".format(c, k))
        if k not in trustedpics and k not in unreviewedpics:
            pass
        elif k in trustedpics and k not in unreviewedpics:
            final_data[c]['DOid'] = trustedpics[k][0]
        elif k not in trustedpics and k in unreviewedpics:
            final_data[c]['DOid'] = unreviewedpics[k][0]
        else:
            #must pick one with best score
            if trustedpics[k][1]<unreviewedpics[k][1]:
                final_data[c]['DOid'] = unreviewedpics[k][0]
            else:
                final_data[c]['DOid'] = trustedpics[k][0]
    return final_data
            

parser = argparse.ArgumentParser(description='Save best EoL image (data object) id for each EOL page IDs')
parser.add_argument('csv_infile', nargs='?', type=argparse.FileType('r'),  default=sys.stdin, help='A file containing EOL page ids')
parser.add_argument('csv_outfile', nargs='?', type=argparse.FileType('w'), default=sys.stdout, help='The new csv file with best data object ID and common name appended')
parser.add_argument('--csvfield', '-c',  type=int, default=0, help='Find the EOL page ID in this field of each row')
parser.add_argument('--language', '-lang', default="en", help='The language to use for vernacular names')
parser.add_argument('--verbose', '-v', action="store_true", help='verbose: output extra non-essential info')
args = parser.parse_args()

#make a single http session, which we can tweak
s = requests.Session()
retries = Retry(total=5,
                backoff_factor=1,
                status_forcelist=[ 500, 502, 503, 504 ])
s.mount('http://', HTTPAdapter(max_retries=retries))
            
            
with args.csv_infile as f:
    with args.csv_outfile as out:
        reader = csv.reader(f)
        writer = csv.writer(out, quoting=csv.QUOTE_MINIMAL)
        ids = set()
        output=[]
        
        for row in reader:
            output.append(row)
            try:
                ids.update([int(row[args.csvfield-1])]) 
            except ValueError:
                warn("'{}' cannot be converted to an integer in row {}".format(row[args.csvfield-1], row))
            except IndexError:
                #EOL page ID is missing from this row
                pass
            if len(ids)==25:
                vals = getPageInfo(ids, s)
                for o in output:
                    try:
                        lookup = int(o[args.csvfield-1])
                        if lookup in vals:
                            writer.writerow(o + [vals[lookup]['DOid'], vals[lookup]['vn']])
                        else:
                            writer.writerow(o)                    
                    except ValueError:
                        pass
                del output[:]
                ids.clear() 
        if len(ids):
            vals = getPageInfo(ids, s)
            for o in output:
                try:
                    lookup = int(o[args.csvfield-1])
                    if lookup in vals:
                        writer.writerow(o + [vals[lookup]['DOid'], vals[lookup]['vn']])
                    else:
                        writer.writerow(o)                    
                except ValueError:
                    pass
        
