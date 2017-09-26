#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Call as:

    get_wikidata_taxonQid.py wikidata-YYYYMMDD-all.json.gz > map_file.txt

Wikidata JSON dumps are available from https://dumps.wikimedia.org/wikidatawiki/entities/

Note that to obtain wikiPEDIA page titles, the various wikidata APIs can be used,
e.g., from wikidata ID = Q36611

https://www.wikidata.org/wiki/Special:EntityData/Q36611.json
 or 
https://www.wikidata.org/w/api.php?action=wbgetentities&sitefilter=enwiki&ids=Q36611&props=sitelinks&format=json

It is possible to tweak this script to output the various language-specific wikipedia pages, but using the API 
instead avoids the problem of links becoming stale. 

This script streams through the wikidata dump file, looking initially for items ("type":"item") that contain the string
Q16521, since all taxon items have property P31 ("instance of") set to Q16521 ("taxon").

Wikidata dump has one line per object or property, in the following format e.g. for Gorilla (Q36611)
(here simplified from the output obtained via `gzcat wikidata-20151005-all.json.gz | grep -A 200 '"id": "Q36611"'`)

{"type":"item","id":"Q36611","labels":{"eu":{"language":"eu","value":"Gorila"},"pl":{"language":"pl","value":"goryl"},"en":{"language":"en","value":"Gorilla"}...},"claims":{"P31":[{
"mainsnak": {"datatype": "wikibase-item","datavalue":{"type": "wikibase-entityid","value":{"entity-type":"item","numeric-id":16521}},"property":"P31","snaktype":"value"},"rank":"normal","type":"statement"}],"P685":[{"mainsnak": {"datatype": "string","datavalue":{"type":"string","value":"9592"},"property": "P685","snaktype":"value"},"rank": "normal"}],...},"sitelinks":{"arwiki":{"badges":[],"site":"arwiki","title":"\u063a\u0648\u0631\u064a\u0644\u0627"},"enwiki": {"badges":[],"site":"enwiki","title": "Gorilla"},...},...}

For any matching line, it parses the JSON, checks that indeed claim P31[0]['mainsnak']['datavalue']['value']['numeric-id'] == 16521 

then looks up identifiers for the set of databases listed in DATA_SOURCE_KEYS (currently eol, ncbi, gbif, worms, & if),
and matches them against the IDs obtained from the taxonomy.tsv file.

'''
import json
import sys
import resource
import fileinput
import argparse
from collections import OrderedDict
 
parser = argparse.ArgumentParser(description='Find wikidata item IDs for biological taxa')
parser.add_argument('wikidataDumpFile', help='The (compressed) wikidata JSON dump, from https://dumps.wikimedia.org/wikidatawiki/entities/')
parser.add_argument('--verbose', '-v', action="store_true", help='verbose: output extra non-essential info')

args = parser.parse_args()

def warn(*objs):
    print(*objs, file=sys.stderr)

def memory_usage_resource():
    import resource
    rusage_denom = 1024.
    if sys.platform == 'darwin':
        # ... it seems that in OSX the output is different units ...
        rusage_denom = rusage_denom * rusage_denom
    mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / rusage_denom
    return mem

DATA_SOURCE_KEYS = OrderedDict([('P830':'eol'), ('P685':'ncbi'), ('P846':'gbif'), ('P850':'worms'), ('P1391':'if')]) #maps the property ID in wikidata to a column name

try:
    WDF = fileinput.input(args.wikidataDumpFile,openhook=fileinput.hook_compressed)
except IOError as e:
    sys.exit("I/O error({0}): {1}".format(e.errno, e.strerror))


def print_ids(json):
    all_ids=[]
    for wd_src in DATA_SOURCE_KEYS.keys():
        try:
            ids=[]
            for idprop in json['claims'][wd_src]:
                try:
                    ids.append(str(idprop['mainsnak']['datavalue']['value']))
                except LookupError:
                    pass
            all_ids.append(",".join(ids))
        except LookupError:
            all_ids.append("")
    print("\t".join(all_ids))

print("\t".join(DATA_SOURCE_KEYS.items()))
for line in WDF:
    #this file is in byte form, so must match byte strings
    if line.startswith(b'{"type":"item"'):
        if b'"numeric-id":16521}' in line:
            #this could be an item with "P31":[{"mainsnak":{"snaktype":"value","property":"P31","datavalue":{"value":{"entity-type":"item","numeric-id":16521},
            item = json.loads(line.decode('UTF-8').rstrip().rstrip(","))
            try:
                for c in item['claims']['P31']:
                    if c['mainsnak']['datavalue']['value']['numeric-id'] == 16521:
                        check_presence(item)
            except LookupError:
                try:
                    name = "'" + item['labels']['en']['value'] + "'"
                except LookupError:
                    name = "no english name"
                warn("There might be a problem with wikidata item {} ({}), might be a taxon but cannot get taxon data from it".format(item['id'],name));
                