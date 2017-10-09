#!/usr/bin/env python3
"""
Takes a newick tree with OTT numbers on the leaves and nodes, and store leaves and nodes in
 a large python structure, using nested set notation with nodes containing 'lft' and 'rgt' indexes into the leaves

Using the Open Tree of Life taxonomy file (taxonomy.tsv), point leaves and nodes to source ids (e.g. ncbi:1234, etc etc),
adding any missing leaves/nodes/subspecies etc from the OpenTree of life (this helps calculate phylogenetic popularity later).

Then use these source ids to map against Encyclopedia of Life and WikiData ids, using the EOL identifiers.csv file
and the WikiData JSON dump. Using wikidata, also flag whether or not a wikipedia english language page for that taxon exists (this helps decide whether or not to show the wikipedia tab). Additionally, to get extra EoL ids, we supplement the EOL identifiers list by EOL numbers gleaned from wikidata

We also use wikidata and EoL lists to populate the IUCN id field (potentially problematic & out of date, but at least means we don't need to do any taxonomic name matching)

==Popularity==

The Wikidata ids are then used to look into page size and pageview count files, to calculate popularities.

Finally, the full OpenTree is used to calculate phylogenetic popularities from these base popularities

==Nested set structure, to get leaves from nodes===

At the end of the script, the nodes and leaves from the original tree are placed into 2 csv files. Each node provides a lft and rgt bracket
delimiting all the leaves descended from it. This allows us to quickly find all terminal children of a given node.

The csv can be imported into a mysql database by removing the existing data using 'TRUNCATE TABLE'
then using the mysql command 'LOAD DATA INFILE', which is orders of magnitude faster than
using the builtin web2py import (https://groups.google.com/forum/#!topic/web2py/1bGR8ojrEfs). 


The OTT id is matched using a regular expression for names such as Aptenodytes_forsteri_ott494370. This script also allows for temporary 
node names such as _1234, which are taken as (arbitrary) *negative* OTT IDs (i.e. -1234 in this case) in the database. This
allows us to find children of unnamed nodes too.

Download the OpenTree taxonomy from https://tree.opentreeoflife.org/about/taxonomy-version/ott2.9
At the moment, download a beta eol mapping file from http://beta.eol.org/uploads/data_search_files/identifiers.csv.gz
Download the wikidata JSON dump from  http://dumps.wikimedia.org/wikidatawiki/entities/ 

To test, try e.g.  

Usage (obsolete): 
OT_VERSION=5
ServerScripts/TaxonMappingAndPopularity/OTTmapper2csv.py ../static/FinalOutputs/Life_full_tree.phy data/OpenTree/ott/taxonomy.tsv data/EOL/identifiers.csv data/Wiki/wd_JSON/* data/Wiki/wp_SQL/* data/Wiki/wp_pagecounts/* --OpenTreeFile data/OpenTree/draftversion${OT_VERSION}.tre -o data/output_files/ordered -v --exclude Archosauria_ott335588 Dinosauria_ott90215 > data/output_files/nested_set_output.log


"""
from __future__ import print_function

sql_subs_string = '' #  ? for sqlite, %s for mysql

def warning(*objs):
    import sys
    print("WARNING: ", *objs, file=sys.stderr)

def info(*objs):
  import sys
  try:
    if verbose<1:
        return
  except:
    pass;
  print(*objs, file=sys.stderr)

def is_named_OTT(OTTid):
    return OTTid >= 0

def create_OTT_data(treefile, sources):
    '''all OTT ids generated here should either have id<0 or a 'name' field'''
    import sys
    import re
    from dendropy import Tree
    OTT_ids = {}

    try:
        tree = Tree.get_from_stream(treefile, schema="newick", preserve_underscores=True, suppress_leaf_node_taxa=True)
    except:
        sys.exit("Problem reading tree from " + treefile.name)
        
    leaf_num = 1
    
    ott_node = re.compile(r"'?(.*)_ott(\d+)(#\d*)?$")
    unlabelled_node = re.compile(r'^(\d+)_(#\d*)?$')
    for node in tree.preorder_node_iter():
        #go over the nodes in preorder, inserting the rightmost leaf ID
        OTTid = name = None
        if node.label is not None:
            m = ott_node.search(node.label)
            if m is not None:
                name = m.group(1)
                OTTid = int(m.group(2))
                
        if (node.is_leaf()):
            if OTTid is None:
                warning("Leaf without an OTT id: {}. This is being omitted".format(node.label))
            else:
                OTT_ids[OTTid] = {'name':name, 'leaf_id':leaf_num, 'sources':{k:None for k in sources}}
            leaf_num+=1;
            
        else:
            if OTTid is None:
                if node.label is not None:
                    m = unlabelled_node.search(node.label)
                    if m is not None:
                        OTT_ids[-int(m.group(1))] = {'lft': leaf_num}
                else:
                    pass #this happens e.g. for internal nodes labelled _cladeXXX, etc. Annoyingly these won't get stored in nested_set_nodes
            else:
                OTT_ids[OTTid] = {'name':name, 'lft': leaf_num, 'sources':{k:None for k in sources}}

    leaf_num = 0
    for node in tree.postorder_node_iter():
        #go over the nodes in preorder, inserting the leftmost leaf ID
    
        if (node.is_leaf()):
            leaf_num+=1;
        else:
            OTTid = None
            if node.label is not None:
                m = ott_node.search(node.label)
                if m is not None:
                    OTTid = int(m.group(2))
                else:
                    m = unlabelled_node.search(node.label)
                    if m is not None:
                        OTTid = -int(m.group(1))
            if OTTid is not None:
                OTT_ids[OTTid]['rgt'] = leaf_num
            
    info("Done")
    del tree
    return leaf_num, OTT_ids

def add_eol_IDs_from_EOL_table_dump(source_ptrs, identifiers_file, source_mapping, verbosity=0):
    import csv
    from OTT_popularity_mapping import memory_usage_resource
    used=0
    EOL2OTT = {v:k for k,v in source_mapping.items()}
    identifiers_file.seek(0)
    reader = csv.reader(identifiers_file, escapechar='\\')
    for EOLrow in reader:
        if (reader.line_num % 1000000 == 0):
            info("{} rows read, {} used,  mem usage {:.1f} Mb".format(reader.line_num, used, memory_usage_resource()))
        provider = int(EOLrow[2])
        if provider in EOL2OTT:
            src = source_ptrs[EOL2OTT[provider]]
            providerid = str(EOLrow[1])
            EOLid = int(EOLrow[3])
            if providerid in src:
                used += 1;
                src[providerid]['EoL'] = EOLid
    if verbosity:
        info(" Matched {} EoL entries in the EoL identifiers file. Mem usage {:.1f} Mb".format(used, memory_usage_resource()))

def identify_best_EoLdata(OTT_ptrs, sources, verbosity):
    '''
    Each OTT number may point to several EoL entries, one for the NCBI number, another for the WORMS number, etc etc.
    Hopefully these will be the same entry, but they may not be. If they are different we need to choose the best one
    to use. We take the one with the most sources supporting this entry: if there is a tie, we take the lowest, as recommended by JRice from EoL
    '''
    from OTT_popularity_mapping import memory_usage_resource
    if verbosity:
        info("Finding best EoL matches. mem usage {:.1f} Mb".format(memory_usage_resource()))
    validOTTs = OTTs_with_EOLmatch = dups = 0
    for OTTid, data in OTT_ptrs.items():
        if OTTid >= 0:  #needed for alternative notation where arbitrary negative numbers indicate unlabelled nodes
            validOTTs += 1
            choose = {}
            for src in sources:
                if src in data['sources'] and data['sources'][src] is not None:
                    if 'EoL' in data['sources'][src]:
                        EOLid = int(data['sources'][src]['EoL'])
                        if EOLid not in choose:
                            choose[EOLid] = []
                        choose[EOLid] += [src]
            if len(choose) == 0:
                data['EOLid'] = None
            else:
                OTTs_with_EOLmatch += 1
                errstr = None
                if len(choose) > 1:
                    #weed out those EOLids with the least support.
                    if verbosity > 1:
                        errstr = "More than one EoL ID {} for taxon OTT: {}".format(choose, OTTid)
                    dups += 1
                    max_refs = max([len(choose[id]) for id in choose])
                    choose = [EOLid for EOLid in choose if len(choose[EOLid]) == max_refs]
                best = min(choose)
                data['EOLid'] = best
                if errstr:
                    info(" {}, chosen {}".format(errstr, best))
    if verbosity:
        info(" NB: of {} OpenTree taxa, {} ({:.2f}%) have EoL entries in the EoL identifiers file, and {} have multiple possible EOL ids. Mem usage {:.1f} Mb".format(validOTTs, OTTs_with_EOLmatch, OTTs_with_EOLmatch/validOTTs * 100, dups, memory_usage_resource()))

def supplement_eol_from_wikidata(OTT_ptrs, verbosity):
    """
    If no OTT_ptrs[OTTid]['EOLid'] exists, but there is an OTT_ptrs[OTTid]['wd']['EoL'] then put this into OTT_ptrs[OTTid]['EOLid']
    """
    EOLused = WDsupp = tot = 0
    for OTTid, data in OTT_ptrs.items():
        if OTTid >= 0:
            tot += 1
            if 'EOLid' not in data or data['EOLid'] is None:
                if 'wd' in data and 'EoL' in data['wd'] and data['wd']['EoL'] is not None:
                    data['EOLid'] = int(data['wd']['EoL'])
                    WDsupp += 1
            else:
                EOLused += 1
    if verbosity:
        info("Out of {} OTT taxa, {} ({:.2f}%) have EOL ids from EOL. Supplementing these with {} EOL ids from wikidata gives a coverage of {:.1f} %.".format(tot, EOLused, EOLused/tot * 100.0, WDsupp, (EOLused+ WDsupp)/tot * 100.0))


def populate_iucn(OTT_ptrs, identifiers_file, verbosity):
    """
    Port the IUCN number from both EoL and Wikidata, and keep both if there is a conflict
    """
    import csv
    import re
    from OTT_popularity_mapping import memory_usage_resource
    used=0
    
    iucn_num = 622 #see https://github.com/EOL/tramea/issues/162
    eol_mapping = {} #to store eol=>iucn
    for OTTid, data in OTT_ptrs.items():
         if 'EOLid' in data:
            if data['EOLid'] in eol_mapping:
                eol_mapping[data['EOLid']].append(OTTid)
            else:
                eol_mapping[data['EOLid']] = [OTTid]
            
    identifiers_file.seek(0)
    reader = csv.reader(identifiers_file, escapechar='\\')
    for EOLrow in reader:
        if (reader.line_num % 1000000 == 0):
            info("{} rows read, {} used,  mem usage {:.1f} Mb".format(reader.line_num, used, memory_usage_resource()))
        if int(EOLrow[2]) == iucn_num and EOLrow[1]: #there are lots of IUCN rows with no IUCN number, so check EOLrow[1]!= "" and != None
            try:
                for ott in eol_mapping[int(EOLrow[3])]:
                    OTT_ptrs[ott]['IUCNid'] = str(EOLrow[1])
                    used += 1
            except LookupError:
                pass #no equivalent eol id in eol_mapping
            except ValueError:
                warning(" Cannot convert IUCN ID {} to integer on line {} of {}.".format(EOLrow[1], reader.line_num, identifiers_file.name), file=sys.stderr);

    if verbosity:
        info(" Matched {} IUCN entries in the EoL identifiers file. Mem usage {:.1f} Mb".format(used, memory_usage_resource()))

    #now go through and double-check against IUCN stored on wikidata
    for OTTid, data in OTT_ptrs.items():
        try:
            wd_iucn = str(data['wd']['iucn'])
            if 'IUCNid' in data:
                if wd_iucn != data['IUCNid']:
                    data['IUCNid'] = "|".join([data['IUCNid'], wd_iucn])
                    if verbosity:
                        warning(" conflicting IUCN IDs for OTT {}: EoL = {} (via http://eol.org/pages/{}), wikidata = {} (via http://http://wikidata.org/wiki/Q{}).".format(OTTid, data['IUCNid'], data['EOLid'], wd_iucn, data['wd']['Q']));
            else:
                data['IUCNid'] = wd_iucn
                used += 1
        except:
            pass #we can't find a wd iucn. Oh well...
    if verbosity:
        info("Increased IUCN coverage to {} taxa using wikidata".format(used))

             
def save_csv(OTT_ids, n_leaves, sources, prefix):
    """ we should now have leaf entries like
    {'wd': {'Q': 15478814, 'EoL': 1100788, 'l':['en','fr']}, 
     'pop_dscdt': 0,
     'leaf_id': 1997953,
     'pop_ancst': 220183.23395609166,
     'sources': {'ncbi': None,
                 'worms': None, 
                 'gbif': {'wd': {'Q': 15478814, 'EoL': 1100788}, 'id': '2840414'}, 
                 'if': None, 
                 'irmng': None},
     'name': 'Gymnadenia_wettsteiniana', 
     'Pop': 220183.23395609166,
     'EOLid': 1100788
     'IUCNid':XXXXXXX}
    
    ... or ...
    
    {'wd': {'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}, 
     'pop_dscdt': 0, 
     'leaf_id': 358257, 
     'pop_ancst': 392245.76075749274, 
     'sources': {'ncbi': {'wd': {'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}, 'EoL': 281897, 'id': '691616'}, 
                 'worms': None, 
                 'gbif': {'wd': {'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}, 'id': '1968205'}, 
                 'if': None, 
                 'irmng': {'EoL': 281897, 'id': '10290975'}}, 
     'name': 'Acasis_viridata',
     'EOLid': 281897}
     
     ... and node entries like ...
     
     {'rgt': 750181, 'lft': 750180}
      
     ... or ...
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
      
    """
    import csv
    leaf_ids = [None] * n_leaves;
    with open(prefix + '_nodes.csv', 'w', encoding='utf-8') as nodefile:
        nodewriter = csv.writer(nodefile, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        base_cols = ["ott","lft","rgt","name", "wikidata", "wikipedia_lang_flag", "eol", "popularity",]
        nodewriter.writerow(base_cols + [k if k!='if' else 'ifung' for k in sources.keys()])
        for OTTid, data in OTT_ids.items():
            if OTTid<0 or 'name' in data: #this should exclude all the extra added OpenTree items, which we used to get popularity
                if 'wd' in data and 'p' in data['wd'] and len(data['wd']['p']):
                    #if this field has a number in, it must have at least one lang
                    data['wd']['langflag']=0
                    if 'en' in data['wd']['p']:                            
                        data['wd']['langflag']+= 1
                #save array of references to rows into tables, to be able to print in sensible order
                if 'leaf_id' in data:
                    if OTT_ids[OTTid]['leaf_id'] > n_leaves:
                        warning("Tried to insert leaf number {} but there should only be {} leaves.".format(OTT_ids[OTTid]['leaf_id'], n_leaves))
                    else:
                        leaf_ids[OTT_ids[OTTid]['leaf_id']-1] = OTTid
                else:
                    #nodes can appear in any order
                    if is_named_OTT(OTTid):
                        row_srcs = data['sources']
                        nodewriter.writerow(
                            [OTTid, 
                             data['lft'],
                             data['rgt'],
                             data['name'],
                             data['wd'].get('Q'), #even unmapped OTT_ids should have {} in the 'wd' slot
                             data['wd'].get('langflag'),
                             data['EOLid'],
                             data['Pop']
                            ] + 
                            [row_srcs[s]['id'] if row_srcs.get(s) is not None and 'id' in row_srcs[s] else None for s in sources]
                        )
                    else:
                        nodewriter.writerow([OTTid,OTT_ids[OTTid]['lft'],OTT_ids[OTTid]['rgt']] + [None]* (len(base_cols)-3+len(sources)))
    
    #now print out the leaf rows in the right order, with blanks for missing rows (helps in web2py)
    with open(prefix + '_leaves.csv', 'w', encoding='utf-8') as leaffile:
        leafwriter = csv.writer(leaffile, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        base_cols = ["id", "ott", "name", "wikidata", "wikipedia_lang_flag", "eol", "iucn", "popularity", "price"]
        leafwriter.writerow(base_cols + [k if k!='if' else 'ifung' for k in sources.keys()])
        for leaf_id, OTTid in enumerate(leaf_ids, start=1):
            if OTTid is None:
                leafwriter.writerow([leaf_id] + [None] * ((len(base_cols)-1)+len(sources)))
            else:
                data = OTT_ids[OTTid]
                row_srcs = data['sources']
                leafwriter.writerow(
                    [leaf_id,
                     OTTid,
                     data['name'],
                     data['wd'].get('Q'),
                     data['wd'].get('langflag'),
                     data.get('EOLid'),
                     data.get('IUCNid'),
                     data['Pop'],
                     None #could set price here, but we might want to change it
                    ] + 
                    [row_srcs[s]['id'] if row_srcs.get(s) is not None and 'id' in row_srcs[s] else None for s in sources]
                )

if __name__ == "__main__":

    import sys
    import csv
    import gzip
    import json
    import argparse
    from math import log
    from collections import OrderedDict
    from OTT_popularity_mapping import *
    
    random_seed_addition = 1234


    parser = argparse.ArgumentParser(description='Use data dumps to create a database dump to map Open Tree of Life Taxonomy IDs to other ids (including EoL & Wikidata), and also list children of opentree nodes')
    parser.add_argument('Tree', type=argparse.FileType('r', encoding='UTF-8'), help='The newick format tree to use')
    parser.add_argument('OpenTreeTaxonomy', type=argparse.FileType('r', encoding='UTF-8'), help='The 325.6 MB Open Tree of Life taxonomy.tsv file, from http://files.opentreeoflife.org/ott/')
    parser.add_argument('EOLidentifiers', type=argparse.FileType('r', encoding='UTF-8'), help='The 450 MB EOL identifiers file, current beta version from https://github.com/EOL/tramea/issues/162')
    parser.add_argument('wikidataDumpFile', type=argparse.FileType('rb'), help='The >4GB wikidata JSON dump, from https://dumps.wikimedia.org/wikidatawiki/entities/ (latest-all.json.bz2) ')
    parser.add_argument('wikipediaSQLDumpFile', type=argparse.FileType('rb'), help='The >1GB wikipedia -latest-page.sql.gz dump, from https://dumps.wikimedia.org/enwiki/latest/ (enwiki-latest-page.sql.gz) ')
    parser.add_argument('wikipedia_totals_bz2_pageviews', type=argparse.FileType('rb'), nargs='+', help='One or more bzipped "totals" pageview count files, from https://dumps.wikimedia.org/other/pagecounts-ez/merged/ (e.g. pagecounts-2016-01-views-ge-5-totals.bz2, or pagecounts*totals.bz2)')
    parser.add_argument('--OpenTreeFile', '-t', type=argparse.FileType('r', encoding='UTF-8'), help='The newick-format opentree of life, used to calculate phylogenetic populaties, from http://files.opentreeoflife.org. If absent, only base popularities will be output')
    parser.add_argument('--exclude', '-x', nargs='*', default=[], help='(optional) a number of taxa to exclude from calculation of phylogenetic popularities, such as Dinosauria_ott90215, Archosauria_ott335588')
    parser.add_argument('--output_location', '-o', default="output", help='Where to put the csv files')
    parser.add_argument('--wikilang', '-l', default='en', help='The language wikipedia to check, e.g. "en"')
    parser.add_argument('--verbose', '-v', action="count", help='verbose: output extra non-essential info')


    args = parser.parse_args()
    verbose = args.verbose
    
    #from http://eol.org/api/docs/provider_hierarchies
    #these need to be an ordered dict with the first being the preferred id used when getting a corresponding wikidata ID
    sources = OrderedDict((('ncbi', 1172), ('if', 596), ('worms', 123), ('irmng', 1347), ('gbif', 800)))


    info("Creating OTT dataset")
    n_leaves, OTT_ptrs = create_OTT_data(args.Tree, sources)

    info("Adding source IDs")
    source_ptrs = create_from_taxonomy(args.OpenTreeTaxonomy, sources, OTT_ptrs, args.verbose)

    info("Adding EOL IDs from EOL csv file")
    add_eol_IDs_from_EOL_table_dump(source_ptrs, args.EOLidentifiers, sources, args.verbose)
    identify_best_EoLdata(OTT_ptrs, sources, args.verbose)
    
    info("Adding wikidata info")
    wiki_title_ptrs = add_wikidata_info(source_ptrs, args.wikidataDumpFile, args.wikilang, args.verbose)
    identify_best_wikidata(OTT_ptrs, sources, args.verbose)

    info("Supplementing EoL numbers with ones from wikidata")
    supplement_eol_from_wikidata(OTT_ptrs, args.verbose)

    info("Populating IUCN IDs using EOL csv file (or if absent, wikidata)")
    populate_iucn(OTT_ptrs, args.EOLidentifiers, args.verbose)
    
    info("Adding popularity measures")    
    add_pagesize_for_titles(wiki_title_ptrs, args.wikipediaSQLDumpFile, args.verbose)
    add_pageviews_for_titles(wiki_title_ptrs, args.wikipedia_totals_bz2_pageviews, args.wikilang, args.verbose)
    
    info("Calculating base popularity measures")    
    calc_popularities_for_wikitaxa(wiki_title_ptrs, "", args.verbose)
    
    if args.OpenTreeFile:
        info("Calculating phylogenetic popularity measures from tree")    
        sum_popularity_over_tree(args.OpenTreeFile, OTT_ptrs, args.exclude, pop_store='edge_length', verbosity=args.verbose)
        for OTTid, data in OTT_ptrs.items():
            if OTTid >= 0:
                #dividing by n_ancst would mean averaging pop over all nodes (both ancestors and descendants).
                # Dividing by a constant means summing pop over all nodes
                #we do something between the two by dividing by the log of the number of ancestors. 
                #But we have to add a constant (>1) otherwise for the root, the log is negative or zero
                data['Pop'] = (data['pop_ancst'] + data['pop_dscdt'])/log(data['n_ancst']+2) if ('pop_ancst' in data and 'pop_dscdt' in data and 'n_ancst' in data) else None
                if data.get('is_seed_plant') and data.get('Pop'):
                    data['Pop'] *=  1.5 #multiply the phylo popularity for plants
    else:
        warning("No OpenTree file specified, so base popularities rather than phylogenetic probabilites are being output")
        for OTTid, data in OTT_ptrs.items():
            if OTTid >= 0:
                data['Pop'] = data['wd'].get('pop') or 0
        
    info("Writing out results to {}xxx".format(args.output_location))
    save_csv(OTT_ptrs, n_leaves, sources, args.output_location)
            