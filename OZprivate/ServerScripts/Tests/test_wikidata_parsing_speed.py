#!/usr/bin/env python3

import argparse
import bz2
import time
import re
import io

parser = argparse.ArgumentParser(description='test speed of matchin a wikidata file')
parser.add_argument('wikidataDumpFile', type=argparse.FileType('rb'),
        help='The >4GB wikidata JSON dump, from https://dumps.wikimedia.org/wikidatawiki/entities/ (latest-all.json.bz2) ')
args = parser.parse_args()

initial_match = [b'id":16521',b'id":310890',b'id":23038290',b'id":713623',b'id":502895']
#initial_re = re.compile(b'id":16521|id":310890|id":23038290|id":713623|id":502895')
initial_re = re.compile(b'numeric-id":(?:16521|310890|23038290|713623|502895)')

matches = 0
with bz2.open(args.wikidataDumpFile, 'rb') as WDF: #open filehandle, to allow read as bytes (converted to UTF8 later)
    t = time.time()
    line_num=0
    for line in WDF:
        line_num = line_num+1
        if (line_num % 100000) == 0:
            break
        if line.startswith(b'{"type":"item"'):
            #if any(n in line for n in initial_match):
            if initial_re.search(line):
                matches = matches + 1
    t = time.time() - t
print("{} matches for {} lines in {} seconds".format(matches, line_num, t))