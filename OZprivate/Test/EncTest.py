#!/usr/bin/env python3

import argparse
parser = argparse.ArgumentParser(description='test')
parser.add_argument('inp', type=argparse.FileType('rb'), nargs='+', help='One or more bzipped "totals" pageview count files, from https://dumps.wikimedia.org/other/pagecounts-ez/merged/ (e.g. pagecounts-2016-01-views-ge-5-totals.bz2, or pagecounts*totals.bz2)')
args = parser.parse_args()

import sys
def memory_usage_resource():
    import resource
    rusage_denom = 1024.
    if sys.platform == 'darwin':
        # ... it seems that in OSX the output is different units ...
        rusage_denom = rusage_denom * rusage_denom
    mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / rusage_denom
    return mem

encodings = [
 "big5",
 "utf_8",
 "utf_8_sig"]

import bz2
import sys
match_project = 'en.z'.encode() 
from urllib.parse import unquote
test = [v.replace(" ","_") for v in ["Gölçük toothcarp","Galium × pomeranicum", "(-)-2β-(3-(4-Methylphenyl)isoxazol-5-yl)-3β-(4-chlorophenyl)tropane", "1._FC_Slovácko"]]
verbosity=3

for file_index, wiki_visits_pagecounts_file in enumerate(args.inp):
    with bz2.open(wiki_visits_pagecounts_file, 'rb') as PAGECOUNTfile:
        for line in PAGECOUNTfile:
            if line.startswith(match_project):
                try:
                    fields = line.decode('UTF-8').rstrip('\r\n').split(" ")
                    if unquote(fields[1]) in test:
                        print(line)
                except:
                    pass;
        