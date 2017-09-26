#run from python3 prompt within OZprivate/ServerScripts/TaxonMappingAndPopularity/

import re
import sys
import csv
import gzip
import json
import argparse
from collections import OrderedDict
from OTT_popularity_mapping import *
from OTTmapper2csv import *
random_seed_addition = 1234
verbose = 1

sources = OrderedDict((('ncbi', 1172), ('if', 596), ('worms', 123), ('irmng', 1347), ('gbif', 800)))
n_leaves, OTT_ptrs = create_OTT_data(open('../../../static/FinalOutputs/Life_full_tree.phy'), sources)
source_ptrs = create_from_taxonomy(open('../../data/OpenTree/ott/taxonomy.tsv'), sources, OTT_ptrs, verbose)
add_eol_IDs_from_EOL_table_dump(source_ptrs, open('../../data/EOL/identifiers.csv'), sources, verbose)
identify_best_EoLdata(OTT_ptrs, sources, verbose)

wiki_title_ptrs = add_wikidata_info(source_ptrs, open('../../data/Wiki/latest-all.json.gz', 'rb'), 'en', verbose)

identify_best_wikidata(OTT_ptrs, sources, verbose)

supplement_eol_from_wikidata(OTT_ptrs, verbose)

add_pagesize_for_titles(wiki_title_ptrs, open('../../data/Wiki/wp_SQL/enwiki-latest-page.sql.gz', 'rb'), verbose)

add_pageviews_for_titles(wiki_title_ptrs, [open('../../data/Wiki/wp_pagecounts/pagecounts-2014-07-views-ge-5-totals.bz2', 'rb'),open('../../data/Wiki/pagecounts-2015-02-views-ge-5-totals.bz2', 'rb')] , 'en', verbose)

calc_popularities_for_wikitaxa(wiki_title_ptrs, "", verbose, 0)

sum_popularity_over_tree(OTT_ptrs, open("../../data/OpenTree/draftversion4.tre"), ['Dinosauria_ott90215', 'Archosauria_ott335588'], verbose)
for OTTid, data in OTT_ptrs.items():
    if OTTid >= 0:
        data['Pop'] = data['pop_ancst'] + data['pop_dscdt'] if ('pop_ancst' in data and 'pop_dscdt' in data) else None

save_csv(OTT_ptrs, n_leaves, sources, 'tmp')

#have a look at a random one
import random
OTT_ptrs[random.choice(list(OTT_ptrs.keys()))]
wiki_title_ptrs[random.choice(list(wiki_title_ptrs.keys()))]

'''
     {'name': 'Platyseiella',
      'rgt': 133348, 
      'lft': 133342, 
      'wd': {'PGviews': [54, 55], 'pop': 249.04015740438328, 'Q': 4358149, 'PGsz': 1138}, 
      'pop_dscdt': 0, 
      'pop_ancst': 302713.62094885897,
      'sources': {'ncbi': None, 
                  'worms': None, 
                  'gbif': {'wd': {'PGviews': [54, 55], 'pop': 249.04015740438328, 'Q': 4358149, 'PGsz': 1138}, 'id': '2186518'}, 
                  'if': None, 
                  'irmng': {'id': '1138705'}}, 
      'Pop': 302713.62094885897,
      'EOLid': None} 

'''