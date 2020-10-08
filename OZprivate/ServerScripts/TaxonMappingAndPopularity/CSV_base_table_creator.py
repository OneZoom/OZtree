#!/usr/bin/env -S python3 -u
"""
Creates the base files for the dynamically-loaded tree, on the basis of a single newick tree with OTT numbers on the leaves and nodes.

Final output is 2 csv files, two long newick string with braces and commas (one with curly braces for polytomies) and a dates file.
 
First we remove polytomies, subspecies, and  leaves and nodes in two large python structures

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

Usage: 
OT_VERSION=9_1
ServerScripts/TaxonMappingAndPopularity/CSV_base_table_creator.py ../static/FinalOutputs/Life_full_tree.phy data/OpenTree/ott/taxonomy.tsv data/EOL/identifiers.csv data/Wiki/wd_JSON/* data/Wiki/wp_SQL/* data/Wiki/wp_pagecounts/pagecounts* --OpenTreeFile data/OpenTree/draftversion${OT_VERSION}.tre -o data/output_files/ordered -v --exclude Archosauria_ott335588 Dinosauria_ott90215 > data/output_files/ordered_output.log

ServerScripts/TaxonMappingAndPopularity/CSV_base_table_creator.py ../static/FinalOutputs/Life_full_tree.phy data/OpenTree/ott/taxonomy.tsv data/EOL/identifiers.csv data/Wiki/wd_JSON/* data/Wiki/wp_SQL/* data/Wiki/wp_pagecounts/* --OpenTreeFile data/OpenTree/draftversion${OT_VERSION}.tre -o data/output_files/ordered -n

currently results in:
 Out of 3526952 OTT taxa, 2394052 (67.88%) have EOL ids from EOL. Supplementing these with 371071 EOL ids from wikidata gives a coverage of 78.4 %.
Populating IUCN IDs using EOL csv file (or if absent, wikidata)
"""

import sys
import csv
import re
import gzip
import json
import argparse
import inspect
import random
import os.path
from collections import OrderedDict, defaultdict
import time
from math import log, inf
import tempfile
import pickle
import logging
import itertools
import multiprocessing

import multiprocessing_logging
from indexed_bzip2 import IndexedBzip2File
from dendropy import Node, Tree

#local packages
from dendropy_extras import write_pop_newick
import OTT_popularity_mapping

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''

sql_subs_string = '' #  ? for sqlite, %s for mysql

import indexed_bzip2
import math
import pickle
import bz2



def is_unnamed_OTT(OTTid):
    """
    TO DO: I'm not sure when we use unnamed nodes with an OTT, so unsure if this is needed
    """
    try:
        
        return OTTid < 0
    except TypeError:
        return False

def get_OTT_species(taxonomy_filename):
    with open(taxonomy_filename, 'rt') as taxonomy_file:
        species_list = set()
        taxonomy_file.seek(0)
        reader = csv.DictReader(taxonomy_file, delimiter='\t')
        for row in reader:
            if row['rank'] == 'species':
                species_list.add(int(row['uid']))
    return species_list

def get_tree_and_OTT_list(tree_filename, sources):
    """
    Takes a base tree and creates objects for each node and leaf, attaching them as 'data' dictionaries
    to each node in the DendroPy tree. Nodes and leaves with an OTT id also have pointers to their data 
    dicts stored in an OTT-keyed dict, so that mappings to other databases (ncbi id, etc etc) can be created.
    
    We can easily have duplicate leaf names, so for the entire procedure we ignore the Dendropy concept
    of a taxon list and simply use labels.
    Returns the Dendropy tree and the OTT dict.
    """
    #these variables are all pointers into the same data
    ordered_leaves=[]
    ordered_nodes=[]
    indexed_by_ott={}
    
    try:
        tree = Tree.get_from_path(
            tree_filename,
            schema="newick",
            preserve_underscores=True,
            suppress_leaf_node_taxa=True)
    except:
        sys.exit("Problem reading tree from " + tree_filename)
    logging.info(" > read tree from " + tree_filename)
    
    ott_node = re.compile(r"(.*) ott(\d+)(@\d*)?$") #matches the OTT number
    mrca_ott_node = re.compile(r"(.*) (mrcaott\d+ott\d+)(@\d*)?$") #matches a node with an "mrca" node number (no unique OTT)
    for i, node in enumerate(tree.preorder_node_iter()):
        node.data = {'parent':node.parent_node or None}
        if node.label:
            node.label = node.label.replace("_"," ")
            m = ott_node.search(node.label)
            if m is not None:
                if m.group(3):
                    logging.warning(
                        "Node has an @ sign at the end ({node.label}), meaning it has "
                        "probably not been substituted by an OpenTree equivalent. You "
                        "may want to provide an alternative subtree from this node "
                        "downwards, as otherwise it will probably be deleted from the "
                        "main tree.")
                node.label = m.group(1)
                node.data['ott'] = int(m.group(2))
                indexed_by_ott[node.data['ott']] = node.data
                node.data['sources']={}
            else:
                m = mrca_ott_node.search(node.label)
                if m is not None:
                    if m.group(3):
                        logging.warning(
                            f"Node has an @ sign at the end ({node.label}), meaning it "
                            "has probably not been substituted by an OpenTree "
                            "equivalent. You may want to provide an alternative subtree "
                            "from this node downwards, as otherwise it will probably be "
                            "deleted from the main tree.")
                    node.label = m.group(1)
                    #this is an 'mrca' node, so we want to save sources but *not* save the ott number in node.data
                    indexed_by_ott[m.group(2)] = node.data
                    node.data['sources']={}
                elif node.is_leaf():
                    logging.warning(
                    f"Leaf without an OTT id: '{node.label}'. "
                    "This will not be associated with any other data")
            #finally, put underscores at the start or the end of the new label back
            #as these denote "fake" names that are hidden and only used for mapping
            #we could keep them as spaces, but leading/trailing underscores are easier to see by eye
            if node.label[0]==" ":
                node.label = "_" + node.label[1:]
            if node.label[-1]==" ":
                node.label = node.label[:-1] + "_"
    logging.info(
        f"✔ extracted {len(indexed_by_ott)} otts from {i} leaves & nodes. "
        f"Mem usage {OTT_popularity_mapping.mem():.1f} Mb")
    return tree, indexed_by_ott

def add_eol_IDs_from_EOL_table_dump(source_ptrs, identifiers_filename, source_mapping):
    used=0
    EOL2OTT = {v:k for k,v in source_mapping.items()}
    with gzip.open(identifiers_filename, "rt") as identifiers_file:
        reader = csv.DictReader(identifiers_file)
        for EOLrow in reader:
            if (reader.line_num % 1000000 == 0):
                logging.info("... {} rows read, {} used,  mem usage {:.1f} Mb".format(
                    reader.line_num, used, OTT_popularity_mapping.mem()))
            provider = int(EOLrow['resource_id'])
            if provider in EOL2OTT:
                src = source_ptrs[EOL2OTT[provider]]
                if EOL2OTT[provider] == "gbif" and not EOLrow['resource_pk'].isdigit():
                    # The EoL file has duplicate (non numeric) IDs for GBIF: ignore these
                    continue
                providerid = EOLrow['resource_pk']
                EOLid = int(EOLrow['page_id'])
                try:
                    if int(providerid) in src:
                        used += 1;
                        src[int(providerid)]['EoL'] = EOLid
                except ValueError:
                    if providerid in src:
                        used += 1;
                        src[providerid]['EoL'] = EOLid
        logging.info(
            f"✔ Matched {used} EoL entries in the EoL identifiers file. "
            f"Mem usage {OTT_popularity_mapping.mem():.1f} Mb")

def identify_best_EoLdata(OTT_ptrs, sources):
    '''
    Each OTT number may point to several EoL entries, one for the NCBI number, another for the WORMS number, etc etc.
    Hopefully these will be the same entry, but they may not be. If they are different we need to choose the best one
    to use. We take the one with the most sources supporting this entry: if there is a tie, we take the lowest, as recommended by JRice from EoL
    '''
    validOTTs = OTTs_with_EOLmatch = dups = 0
    for OTTid, data in OTT_ptrs.items():
        if is_unnamed_OTT(OTTid):
            continue
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
            data['eol'] = None
        else:
            OTTs_with_EOLmatch += 1
            errstr = None
            if len(choose) > 1:
                #weed out those EOLids with the least support.
                errstr = "More than one EoL ID {} for taxon OTT: {}".format(choose, OTTid)
                dups += 1
                max_refs = max([len(choose[id]) for id in choose])
                choose = [EOLid for EOLid in choose if len(choose[EOLid]) == max_refs]
            best = min(choose)
            data['eol'] = best
            if errstr:
                logging.debug(" {}, chosen {}".format(errstr, best))
    logging.info(" ✔ Of {} OpenTree taxa, {} ({:.2f}%) have EoL entries in the EoL identifiers file, and {} have multiple possible EOL ids. Mem usage {:.1f} Mb".format(
            validOTTs, OTTs_with_EOLmatch, OTTs_with_EOLmatch/validOTTs * 100, dups, 
            OTT_popularity_mapping.mem()))

def set_wikidata_in_parallel(bz2_filename, source_ptrs, lang, num_threads):
    """
    Will alter the source_ptrs.
    Returns WDitems (Q->WD), WPnames (name-WD), common_name_Qs (Q->Q)
    """
    if num_threads <=1:
        offsets_filename = None
        byte_chunks = []
        uncompressed_size=None
    else:
        n_chunks = num_threads
        logging.debug(f"  > Calculating hash to get offset file for {bz2_filename}")
        info = OTT_popularity_mapping.PartialBzip2.block_info(bz2_filename)
        offsets_filename = info[1]
        uncompressed_size = info[2]
        chunksize = uncompressed_size / n_chunks
        byte_chunks = [int(a * chunksize) for a in range(1, n_chunks)]
    with tempfile.NamedTemporaryFile("wb") as source_ptrs_file:
        # Pass in the pickled source_ptrs as a temp file, to be loaded by each thread
        logging.debug(f"  > Dumping input info to temporary file")
        pickle.dump(source_ptrs, source_ptrs_file)
        source_ptrs_file.flush()
        byte_chunks = [None] + byte_chunks + [math.inf]
        params = zip(
            itertools.repeat(bz2_filename),
            itertools.repeat(source_ptrs_file.name),
            itertools.repeat(lang),
            byte_chunks[:-1],  # start_after_byte
            byte_chunks[1:],  # stop_including_byte
            itertools.repeat(offsets_filename),
            itertools.count()
        )
        WDitems = {}
        WPnames = {}
        common_name_Qs = {}
        sum_info = defaultdict(int)
        # Most time is taken within the process => we set maxtasksperchild=1 to free mem
        with multiprocessing.Pool(processes=num_threads, maxtasksperchild=1) as pool:
            logging.debug(f"  > Creating a pool of {num_threads} parallel processes")
            for Q_to_WD, WPname_to_WD, src_to_WD, replace_Q, info in pool.imap_unordered(
                OTT_popularity_mapping.wikidata_info_single_arg,
                params
            ):
                WDitems.update(Q_to_WD)
                WPnames.update(WPname_to_WD)
                common_name_Qs.update(replace_Q)
                # Add 'wd' item to source_ptrs
                for src, ids in src_to_WD.items():
                    for src_id, WD in ids.items():
                        source_ptrs[src][src_id]['wd'] = WD
                for k, v in info.items():
                    sum_info[k] += v

    if uncompressed_size is not None:
        assert uncompressed_size == sum_info['bytes_read']

    logging.info(
        f"✔ {len(WDitems)} wikidata matches, of which "
        f"{sum_info['n_eol']} have EOL ids, {sum_info['n_iucn']} have IUCN ids, "
        f"{sum_info['n_ipni']} have IPNI, and {len(WPnames)} "
        f"({(len(WPnames)/len(WDitems)*100):.2f}%) have titles that exist on "
        f"{lang}.wikipedia. Mem usage {OTT_popularity_mapping.mem():.1f} Mb"
    )
    return WDitems, WPnames, common_name_Qs


def set_wikipedia_pageviews_in_parallel(filenames, WPnames, lang, num_threads):
    """
    Allocate a pool for looking through the files. 
    """
    filenames.sort(key = os.path.getsize, reverse=True)
    spare_threads = num_threads - len(filenames)
    # If there are more threads than files, we start splitting files in order of
    # compressed size. E.g. if 24 files and 25 threads, we split the largest file in 2
    file_splits = [1 for _ in filenames]
    i = 0
    while spare_threads > 0:
        file_splits[i % len(filenames)] += 1
        spare_threads -= 1
        i += 1
    # make mappings from filename -> stuff
    file_splits = {fn: file_splits[i] for i, fn in enumerate(filenames)}
    offset_filenames = {fn: None for fn in filenames}
    byte_chunks = {}

    split_files = [fn for fn, splits in file_splits.items() if splits > 1]
    # Any files that are split will need their unzipped size / byte offsets calculating
    with multiprocessing.Pool(processes=num_threads, maxtasksperchild=1) as pool:
        for fn, offsets_filename, uncompressed_size in pool.imap_unordered(
            OTT_popularity_mapping.PartialBzip2.block_info, split_files
        ):
            n_chunks = file_splits[fn]
            offset_filenames[fn] = offsets_filename
            chunksize = uncompressed_size / n_chunks
            byte_chunks[fn] = [int(a * chunksize) for a in range(1, n_chunks)]
    for fn in filenames:
        byte_chunks[fn] = [None] + byte_chunks.get(fn, []) + [math.inf]

    names_found = 0
    with tempfile.NamedTemporaryFile("wb") as WPnames_file:
        # Pass in the pickled WPnames as a temp file, to be loaded by each thread
        pickle.dump(set(WPnames.keys()), WPnames_file)
        WPnames_file.flush()
        params = []
        for i, fn in enumerate(filenames):
            for j in range(file_splits[fn]):
                params.append((
                    fn,
                    WPnames_file.name,
                    lang,
                    byte_chunks[fn][j],
                    byte_chunks[fn][j+1],
                    offset_filenames[fn],
                    len(params),
                    (i+1, len(filenames), j+1, file_splits[fn]),
                ))
        with multiprocessing.Pool(processes=num_threads, maxtasksperchild=1) as pool:
            for WPnames_views in pool.imap_unordered(
                OTT_popularity_mapping.pageviews_for_titles_single_arg,
                params
            ):
                for name, n_views in WPnames_views.items():
                    if not hasattr(WPnames[name], 'pageviews'):
                        names_found += 1
                        WPnames[name].pageviews = []
                    WPnames[name].pageviews.append(n_views)
    logging.info(
        f" ✔ Of {len(WPnames)} WikiData taxon entries, {names_found} "
        f"({(names_found/len(WPnames) * 100):.2f}%) have pageview data for '{lang}' in "
        f"{len(filenames)} files. Mem usage {OTT_popularity_mapping.mem():.1f} Mb")
    

def supplement_from_wikidata(OTT_ptrs):
    """
    If no OTT_ptrs[OTTid]['eol'] exists, but there is an 
    OTT_ptrs[OTTid]['wd']['initial_wiki_item']['EoL'] then put this into 
    OTT_ptrs[OTTid]['eol']
    Similarly for IPNI (although this is currently unpopulated)
    """
    EOLalready = n_eol = n_ipni = n = 0
    for OTTid, data in OTT_ptrs.items():
        if is_unnamed_OTT(OTTid):
            logging.info(
                f" unlabelled node (OTT: {OTTid}) when iterating through OTT_ptrs")
            continue
        n += 1
        if data.get('eol') is None:
            try:
                data['eol'] = int(data['wd'].EoL)
                n_eol += 1
            except:
                pass
        else:
            EOLalready += 1
        if data.get('ipni') is None:
            try:
                data['ipni'] = int(data['wd'].ipni)
                n_ipni += 1
            except:
                pass
    logging.info(
        f"✔ Out of {n} OTT taxa, {EOLalready} ({(EOLalready/n * 100):.2f}%) already "
        f"have EOL ids from the EOL file. Supplementing these with {n_eol} EOL ids from "
        f"wikidata gives a coverage of {((EOLalready + n_eol)/n * 100):.1f} %." +
        (f" An addition {n_ipni} IPNI identifiers added via wikidata" if n_ipni else ""))


def populate_iucn(OTT_ptrs, identifiers_filename, verbosity=0):
    """
    Port the IUCN number from both EoL and Wikidata, and keep both if there is a conflict
    """
    used=0
    
    iucn_num = 5
    eol_mapping = {} #to store eol=>iucn
    for OTTid, data in OTT_ptrs.items():
         if 'eol' in data:
            if data['eol'] in eol_mapping:
                eol_mapping[data['eol']].append(OTTid)
            else:
                eol_mapping[data['eol']] = [OTTid]

    with gzip.open(identifiers_filename, 'rt') as identifiers_file:
        reader = csv.DictReader(identifiers_file)
        for EOLrow in reader:
            if (reader.line_num % 1000000 == 0):
                logging.info(
                    f" - {reader.line_num} rows read, {used} used. "
                    f"Mem usage {OTT_popularity_mapping.mem():.1f} Mb")
            if int(EOLrow['resource_id']) == iucn_num and EOLrow['resource_pk'].isdigit(): 
                #there are lots of non-species IUCN rows with pk == str (e.g. Animalia)
                try:
                    for ott in eol_mapping[int(EOLrow['page_id'])]:
                        OTT_ptrs[ott]['iucn'] = EOLrow['resource_pk']
                        used += 1
                except LookupError:
                    pass #no equivalent eol id in eol_mapping
        logging.info(
            f" > matched {used} IUCN entries in the EoL identifiers file. "
            f"Mem usage {OTT_popularity_mapping.mem():.1f} Mb")

    #now go through and double-check against IUCN stored on wikidata
    for OTTid, data in OTT_ptrs.items():
        try:
            wd_iucn = str(int(data['wd'].iucn))
            if 'iucn' not in data:
                data['iucn'] = wd_iucn
                used += 1
            else:
                if wd_iucn not in data['iucn'].split("|"):
                    data['iucn'] += "|" + wd_iucn
                logging.debug(
                    " conflicting IUCN IDs for OTT {}: EoL = {} (via http://eol.org/pages/{}), wikidata = {} (via http://http://wikidata.org/wiki/Q{}).".format(
                        OTTid, data['iucn'], data['eol'], wd_iucn, data['wd'].Q));
        except ValueError:
            logging.warning(
                f" Cannot convert wikidata IUCN ID {data['wd'].iucn} to integer.")
        except (KeyError, AttributeError):
            pass  # can't find a wd instance or an iucn within the wd instance. Oh well.

    logging.info(f" > Increased IUCN coverage to {used} taxa using wikidata")


def popularity_function(
    sum_of_all_ancestor_popularities, 
    sum_of_all_descendant_popularities, 
    number_of_ancestors, 
    number_of_descendants):
    """
    a) Dividing by number_of_ancestors+number_of_descendants would mean averaging 
        popularity over all nodes, which would bias against taxa which have many
        unvisited/unpopular children
    b) Alternatively, dividing by a constant is equivalent to summing popularity over
        all nodes, which biases towards taxa with many fine taxonomic divisions
    We do something between the two by dividing by the log of the number of nodes.
    """
    if ((sum_of_all_ancestor_popularities is None) or 
        (sum_of_all_descendant_popularities is None) or 
        (number_of_ancestors is None) or 
        (number_of_descendants is None)):
        return None
    else:
        return ((sum_of_all_ancestor_popularities + sum_of_all_descendant_popularities)/
            log(number_of_ancestors + number_of_descendants))
    


def resolve_polytomies_add_popularity(tree, seed):
    """
    If there are polytomies in the tree, resolve them, but make sure that the newly 
    created nodes get popularity values too. These can be recalculated from the
    descendants and ancestors of the children
    
    """
    prev_num_nodes = sum(1 for i in tree.postorder_node_iter())
    random.seed(seed) #so we get the same bifurcations each time
    tree.resolve_polytomies(rng=random)
    num_new_nodes = sum(1 for i in tree.postorder_node_iter()) - prev_num_nodes
    for node in tree.postorder_node_iter():
        if not hasattr(node, 'data'):
            #this is a new node - it should always have 2 children
            try:
                n = ancestor_pop_sum = descendant_pop_sum = n_ancestors_sum = n_descendants_sum = 0
                for c in node.child_node_iter():
                    n += 1
                    ancestor_pop_sum += c.ancestors_popsum
                    descendant_pop_sum += c.descendants_popsum
                    n_ancestors_sum += c.n_ancestors
                    n_descendants_sum += c.n_descendants
                
                node.data={
                    'popularity':popularity_function(
                        ancestor_pop_sum/n,
                        descendant_pop_sum,
                        n_ancestors_sum/n,
                        n_descendants_sum)
                    }
            except AttributeError:
                #probably popularity values undefined for one of the children
                pass
    return num_new_nodes


def create_leaf_popularity_rankings(tree):
    """
    Make a rank of all existing leaves by phylogenetic popularity
    Must be run once all invalid tips etc have been removed.
    If there are no popularities, set all ranks to None
    """
    leaf_popularities = defaultdict(int)
    for node in tree.leaf_node_iter():
        leaf_popularities[node.data.get('popularity')] += 1
    cumsum = 1
    if None in leaf_popularities:
        return
    for k in sorted(leaf_popularities.keys(), reverse=True):
       add_next = leaf_popularities[k]
       leaf_popularities[k] = cumsum
       cumsum += add_next
    for leaf in tree.leaf_node_iter():
       leaf.data['popularity_rank'] = leaf_popularities[leaf.data.get('popularity')]


def write_popularity_tree(tree, outdir, filename, version, verbosity=0):
    Node.write_pop_newick = write_pop_newick
    with open(os.path.join(outdir, "{}_{}.nwk".format(filename, version)), 'w+') as popularity_newick:
        tree.seed_node.write_pop_newick(popularity_newick)


def output_simplified_tree(tree, taxonomy_file, outdir, version, seed, save_sql=True):
    """
    We should now have leaf entries attached to each node in the tree like
    data = {
     'ott':,
     'wd': WikidataItem(Q=15478814, EoL=1100788, l={'en','fr'}), 
     'pop_dscdt': 0,
     'pop_ancst': 220183.23395609166,
     'sources': {'ncbi': None,
                 'worms': None, 
                 'gbif': {'wd': WikidataItem(Q=15478814, EoL=1100788), 'id': '2840414'}, 
                 'if': None, 
                 'irmng': None},
     'popularity': 220183.23395609166,
     'eol': 1100788
     'iucn':XXXXXXX}
    
    ... or, if we have managed to calculate popularity ...
    
    data = {'wd': WikidataItem(Q=15478814, EoL=1100788, l={'en','fr'}, pageviews=[64, 47], pagesize=1465, raw_pop=285.14470010855894)}, 
     'pop_dscdt': 0, 
     'pop_ancst': 392245.76075749274, 
     'sources': {'ncbi': {'wd': WikidataItem(pageviews=[64, 47], raw_popularity=285.14470010855894, Q=4672161, EoL=281897, pagesize=1465), 'EoL': 281897, 'id': '691616'}}, 
                 'worms': None, 
                 'gbif': {'wd': WikidataItem(pageviews=[64, 47], raw_popularity=285.14470010855894, Q=4672161, EoL=281897, pagesize=1465), 'id': '1968205'}}, 
                 'if': None, 
                 'irmng': {'EoL': 281897, 'id': '10290975'}}, 
     'eol': 281897}
     
    Removes non-species from tips, outputs simplified versions.
    """
    from dendropy_extras import prune_children_of_otts, prune_non_species, set_node_ages, \
        set_real_parent_nodes, write_preorder_ages, write_preorder_to_csv, write_brief_newick, \
        remove_unifurcations_keeping_higher_taxa
    #monkey patch the existing dendropy objects
    Tree.prune_children_of_otts = prune_children_of_otts
    Tree.prune_non_species = prune_non_species
    Tree.set_node_ages = set_node_ages
    Tree.set_real_parent_nodes = set_real_parent_nodes
    Tree.write_preorder_ages = write_preorder_ages
    Tree.remove_unifurcations_keeping_higher_taxa = remove_unifurcations_keeping_higher_taxa
    Tree.write_preorder_to_csv = write_preorder_to_csv
    
    Tree.create_leaf_popularity_rankings = create_leaf_popularity_rankings #not defined in dendropy_extras, but in this file
    Tree.resolve_polytomies_add_popularity = resolve_polytomies_add_popularity
    Node.write_brief_newick = write_brief_newick
    
    logging.info(f" > removing children labeled species in '{taxonomy_file}'")
    n = len(tree.prune_children_of_otts(get_OTT_species(taxonomy_file)))
    logging.info(f" ✔ removed all children of {n} nodes")
    
    
    logging.info(f" > removing tips that appear not to be species")
    # species names containing these (even initially) are discarded
    bad_sp =['cf.', 'aff.', 'subsp.', 'environmental sample']
    # species names containing these within the name are discarded:
    bad_sp += [' cv.', ' sp.']
    n = {k:len(v) for k,v in tree.prune_non_species(bad_matches = bad_sp).items()}
    logging.info(
        f" ✔ removed {n['unlabelled']} blank leaves, {n['no_space']} lacking a space, "
        f"& {n['bad_match']} containing {bad_sp} (assumed bad tips)")
    
    logging.info(f" > setting node ages & removing extinction props")
    a, n = tree.set_node_ages()
    logging.info(f" ✔ set ages on {a} nodes and leaves & removed {n} extinction props")
    
    logging.info(f" > removing unary nodes, keeping monotypic species or highest taxon")
    n_deleted_nodes = tree.remove_unifurcations_keeping_higher_taxa()
    #see https://github.com/jeetsukumaran/DendroPy/issues/75
    logging.info(f" ✔ removed {n_deleted_nodes} unifurcations")
    
    
    logging.info(f" > splitting polytomies and assigning popularities to new nodes")
    n_new = tree.resolve_polytomies_add_popularity(seed)
    tree.create_leaf_popularity_rankings()
    logging.info(f" ✔ polytomies split with seed={seed}: {n_new} extra nodes created")

    
    #NB: we shouldn't need to (re)set popularity or ages, since deleting nodes 
    #does not affect these, and both have been calculated *after* new
    #nodes were created by resolve_polytomies. 
    logging.info(" > setting real parents and ranking leaf popularity")
    tree.set_real_parent_nodes()
    logging.info(" ✔ real parents and popularity ranks set")
    
    logging.info(" > ladderizing tree (groups with fewer leaves first)")
    tree.ladderize(ascending=True) #warning: ladderize ascending is needed for the short OZ newick-like form
    logging.info(" ✔ ladderized")
    
    logging.info(" > writing tree, dates, and csv to files")
    with open(os.path.join(outdir, f"ordered_tree_{version}.nwk"), 'w+') as condensed_newick, \
         open(os.path.join(outdir, f"ordered_tree_{version}.poly"), 'w+') as condensed_poly, \
         open(os.path.join(outdir, f"ordered_dates_{version}.js"), 'w+') as json_dates, \
         open(os.path.join(outdir, f"ordered_leaves_{version}.csv"), 'w+', encoding='utf-8') as leaves, \
         open(os.path.join(outdir, f"ordered_nodes_{version}.csv"), 'w+', encoding='utf-8') as nodes:
        tree.seed_node.write_brief_newick(condensed_newick)
        tree.seed_node.write_brief_newick(condensed_poly, "{}")
        tree.write_preorder_ages(json_dates, format="json")
        #these are the extra columns output to the leaf csv file
        leaf_extras=OrderedDict()
        leaf_extras['ott']=['ott']
        leaf_extras['wikidata']=['wd','Q']
        leaf_extras['wikipedia_lang_flag']=['wd','wikipedia_lang_flag']
        leaf_extras['iucn']=['iucn']
        leaf_extras['eol']=['eol']
        leaf_extras['raw_popularity']=['wd', 'raw_popularity']
        leaf_extras['popularity']=['popularity']
        leaf_extras['popularity_rank']=['popularity_rank']
        leaf_extras['price']=None
        leaf_extras['ncbi']=['sources','ncbi','id']
        leaf_extras['ifung']=['sources','ifung','id']
        leaf_extras['worms']=['sources','worms','id']
        leaf_extras['irmng']=['sources','irmng','id']
        leaf_extras['gbif']=['sources','gbif','id']
        leaf_extras['ipni']=['ipni']
        
        #these are the extra columns output to the node csv file
        node_extras=OrderedDict()
        node_extras['ott']=['ott']
        node_extras['wikidata']=['wd','Q']
        node_extras['wikipedia_lang_flag']=['wd','wikipedia_lang_flag']
        node_extras['eol']=['eol']
        node_extras['raw_popularity']=['wd', 'raw_popularity']
        node_extras['popularity']=['popularity']
        node_extras['ncbi']=['sources','ncbi','id']
        node_extras['ifung']=['sources','ifung','id']
        node_extras['worms']=['sources','worms','id']
        node_extras['irmng']=['sources','irmng','id']
        node_extras['gbif']=['sources','gbif','id']
        node_extras['ipni']=['ipni']
        node_extras['vern_synth']=None
        for representative_image_type in ['rep','rtr','rpd']:
            for i in [str(x+1) for x in range(8)]:
                node_extras[representative_image_type+i]=None
        
        for iucn_type in ['NE','DD','LC','NT','VU','EN','CR','EW','EX']:
                node_extras['iucn'+iucn_type]=None
        
        tree.write_preorder_to_csv(leaves, leaf_extras, nodes, node_extras, -version)
    logging.info(f" ✔ written into {outdir}/ordered_..._{version}...")
    
    #make a copy of the csv file that can be imported into mySQL (has \\N for null values)
    if save_sql:
        from shutil import copyfile
        from subprocess import call
        #make copies of the csv files that can be imported into mySQL (has \\N for null values)
        logging.info(" > saving extra file copies in mySQL format: import them using:")
        for tab in ['_leaves','_nodes']:
            fn = os.path.join(outdir, "ordered"+tab + "_{}".format(version) +".csv")
            sqlfile = fn+'.mySQL'
            copyfile(fn, sqlfile)
            call(['perl', '-pi', '-e', r's/,(?=(,|\n))/,\\N/g', sqlfile])
            logging.info(
                f"sql> TRUNCATE TABLE ordered{tab}; "
                f"LOAD DATA LOCAL INFILE '{sqlfile}' REPLACE INTO TABLE `ordered{tab}` "
                f"FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' "
                f"IGNORE 1 LINES ({open(fn).readline().rstrip()}) SET id = NULL;")
    

def map_wiki_info(
    source_ptrs,
    source_order,
    OTT_ptrs,
    WD_filename,
    lang,
    WP_SQL_filename,
    WP_pageviews_filenames,
    num_threads,
):
    """
    1) use the wikidata JSON dump to map identifiers from the source_ptrs structure to
    wikidata Qids, and then on to wikipedia pages
    2) if sql and pagevisits filenames are given 
    
    Return True if popularity is mapped
    """
    logging.debug(f"Processing wikidata json dump in parallel for {lang}")
    popularity_steps = 0
    WDitems, WPnames, swap_Qs = set_wikidata_in_parallel(
        WD_filename, source_ptrs, lang, num_threads)

    if WP_SQL_filename is not None:
        logging.info(f" > Adding wikipedia page sizes from {WP_SQL_filename}")    
        # Can't easily parallelize this as it is gzip compressed (not a block format)
        OTT_popularity_mapping.add_pagesize_for_titles(WPnames, WP_SQL_filename)
        popularity_steps += 1
    
    if len(WP_pageviews_filenames) > 0:
        logging.info(
            f" > Adding wikipedia visit counts from {len(WP_pageviews_filenames)} files")    
        set_wikipedia_pageviews_in_parallel(
            WP_pageviews_filenames, WPnames, lang, num_threads)
        popularity_steps += 1

    if popularity_steps == 2:
        logging.info(" > Calculating raw popularity measures")
        tot = 0
        for WDinstance in WDitems.values():
            if WDinstance.set_raw_popularity():
                tot += 1
        logging.info(f" ✔ Raw popularity measures set on {tot} wikidata items")
    else:
        logging.info(" x Skipping popularity calculations")    

            
    #Here we might want to multiply up some taxa, e.g. plants, see https://github.com/OneZoom/OZtree/issues/130
    logging.info(" > Finding best wiki matches")
    OTT_popularity_mapping.identify_best_wikidata(OTT_ptrs, lang, source_order)

    logging.info(" > Swapping vernacular wikidata items into taxon items")
    OTT_popularity_mapping.overwrite_wd(
        WDitems, swap_Qs, only_if_more_popular=(popularity_steps == 2), check_lang=lang)

    logging.info(" > Supplementing ids (EOL/IPNI) with ones from wikidata")
    supplement_from_wikidata(OTT_ptrs)

    logging.info("✔ Wikidata/wikipedia data mapped")

    return popularity_steps == 2


def percolate_popularity(
    tree,
    exclude_taxa,
    output_location,
    popularity_file,
    version,
    info_on_focal_labels = [],
):
    """
    NB: we must percolate popularities through the tree before deleting monotomies, since these often contain info
    this should allocate popularities even for nodes that have been created by polytomy resolving.
    
    We should also check that there are not multiple uses of the same Qid (https://github.com/OneZoom/OZtree/issues/132)
    """
    
    OTT_popularity_mapping.sum_popularity_over_tree(tree, exclude=exclude_taxa)
    #now apply the popularity function
    Qids = set()
    for node in tree.preorder_node_iter():
        try:
            Q = node.data['wd']['Q']
            if Q in Qids:
                logging.warning(
                    f"duplicate wikidata Qids used (Q{Q}) - this will cause "
                    f"popularity double-counting for OTT {node.data['ott']}")
            else:
                Qids.add(Q)
        except KeyError:
            pass
        pop = popularity_function(
            node.ancestors_popsum,
            node.descendants_popsum,
            node.n_ancestors,
            node.n_descendants)
        node.data['popularity'] = pop

    if popularity_file:
        write_popularity_tree(tree, output_location, popularity_file, version)
    #NB to examine a taxon for popularity contributions here, you could try
    for focal_label in info_on_focal_labels:
        focal_taxon = focal_label.replace("_", " ")
        node = tree.find_node_with_label(focal_taxon)
        try:
            print("{}: own pop = {} (Q{}) descendant pop sum = {}".format(
                focal_taxon, node.pop_store, node.data['wd'].get('Q', ' absent'), node.descendants_popsum))
            try:
                leaf_iter = node.leaf_node_iter()
            except AttributeError:
                leaf_iter = node.leaf_iter()
            for t, tip in enumerate(leaf_iter):
              print("Tip {} = {}: own_pop = {}, Qid = Q{}".format(
                t, tip.label, getattr(tip, "pop_store", None), tip.data['wd'].get('Q', ' absent')))
              if t > 100:
                print("More tips exist, but have been omitted")
                break
            while(node.parent_node):
             node = node.parent_node
             if node.pop_store:
               print("Ancestors: {} = {:.2f}".format(node.label, node.pop_store))
        except (IndexError, AttributeError) as e:
            logging.warning(f"Problem reporting on focal taxon '{focal_taxon}': {e}")

def main(args):
    random_seed_addition = 1234
    start = time.time()
    if args.verbosity==0:
        logging.basicConfig(stream=sys.stderr, level=logging.WARNING)
    elif args.verbosity==1:
        logging.basicConfig(stream=sys.stderr, level=logging.INFO, format='%(message)s')
    elif args.verbosity>=2:
        logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
    logging.info(
        f"OneZoom data generation started on {time.asctime(time.localtime(time.time()))}"
        f" using {args.num_threads} threads. For large input files this may take hours!")
    if args.num_threads > 1:
        # Allow logging even when multiprocessing
        multiprocessing_logging.install_mp_handler()
    skip_popularity = args.popularity_file is None  # Default is "": None is when popularity_file explictly specified with no name
        
    #from http://eol.org/api/docs/provider_hierarchies
    #these need to be an ordered dict with the first being the preferred id used when getting a corresponding wikidata ID
    #all the ids for these are integers >= 0
    sources = ['ncbi', 'if', 'worms', 'irmng', 'gbif']
    eol_sources = {'ncbi': 676, 'worms': 459, 'gbif': 767}  # update when EoL has harvested index fungorum & IRMNG
    #the ids for these sources may not be numbers (e.g. Silva has things like D11377/#1
    nonint_sources = OrderedDict()
    
    logging.info("> Creating tree structure")
    tree, OTT_ptrs = get_tree_and_OTT_list(args.Tree, sources)
    
    logging.info("> Adding source IDs")
    source_ptrs = OTT_popularity_mapping.create_from_taxonomy(
        args.OpenTreeTaxonomy, sources, OTT_ptrs, args.extra_source_file)
    
    logging.info("> Adding EOL IDs from EOL csv file")
    add_eol_IDs_from_EOL_table_dump(source_ptrs, args.EOLidentifiers, eol_sources)
    logging.info("> Finding best EoL matches")
    identify_best_EoLdata(OTT_ptrs, eol_sources)
    
    if args.wikidataDumpFile:
        logging.info("> Adding wikidata info")
        has_popularity = map_wiki_info(
            source_ptrs,
            sources,
            OTT_ptrs,
            args.wikidataDumpFile,
            args.wikilang,
            None if skip_popularity else args.wikipediaSQLDumpFile,
            None if skip_popularity else args.wikipedia_totals_bz2_pageviews,
            args.num_threads,
        )
        if has_popularity:
            logging.info("> Percolating popularity through the tree")
            percolate_popularity(
                tree, 
                args.exclude,
                args.output_location,
                args.popularity_file,
                args.version,
                args.info_on_focal_labels,
            )
    else:
        logging.info("No wikidataDumpFile given, so skipping wiki mapping and popularity calc")
        
    logging.info("> Populating IUCN IDs using EOL csv file (or if absent, wikidata)")
    populate_iucn(OTT_ptrs, args.EOLidentifiers)
    

    logging.info("> Writing out results to {}/xxx".format(args.output_location))
    output_simplified_tree(
        tree, args.OpenTreeTaxonomy, args.output_location, args.version, 
        random_seed_addition)
    t_fmt = "%H hrs %M min %S sec"
    logging.info(f"✔ ALL DONE IN {time.strftime(t_fmt, time.gmtime(time.time()-start))}")
       

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert a newick file with OpenTree labels into refined trees and CSV tables, while mapping Open Tree of Life Taxonomy IDs to other ids (including EoL & Wikidata)')
    parser.add_argument('Tree', 
        help='The newick format tree to use')
    parser.add_argument('OpenTreeTaxonomy', 
        help='The 325.6 MB Open Tree of Life taxonomy.tsv file, from http://files.opentreeoflife.org/ott/')
    parser.add_argument('EOLidentifiers', 
        help='The gzipped 450 MB EOL identifiers file, from https://opendata.eol.org/dataset/identifiers-csv-gz')
    parser.add_argument('wikidataDumpFile', nargs="?", 
        help='The b2zipped >4GB wikidata JSON dump, from https://dumps.wikimedia.org/wikidatawiki/entities/ (latest-all.json.bz2) ')
    parser.add_argument('wikipediaSQLDumpFile', nargs="?",
        help='The gzipped >1GB wikipedia -latest-page.sql.gz dump, from https://dumps.wikimedia.org/enwiki/latest/ (enwiki-latest-page.sql.gz) ')
    parser.add_argument('wikipedia_totals_bz2_pageviews', nargs='*',
        help='One or more b2zipped "totals" pageview count files, from https://dumps.wikimedia.org/other/pagecounts-ez/merged/ (e.g. pagecounts-2016-01-views-ge-5-totals.bz2, or pagecounts*totals.bz2)')
    parser.add_argument('--popularity_file', '-p', nargs="?", const=None, default="",
        help="Save popularity as branch lengths in a tree under this filename. If no filename given, skip the tedious process of calculating popularity altogether, for test purposes only")
    parser.add_argument('--exclude', '-x', nargs='*', default=[], 
        help='(Optional) a number of taxa to exclude from calculation of phylogenetic popularities, such as Dinosauria_ott90215, Archosauria_ott335588')
    parser.add_argument('--output_location', '-o', default="output", 
        help='The directory to store the csv, newick, and date files')
    parser.add_argument('--wikilang', '-l', default='en', 
        help='The language wikipedia to check for popularity, e.g. "en". Where there are multiple Wikidata items for a taxon (e.g. one under the common name, one under the scientific name), then we also default to using the WD item with the sitelink in this language.')
    parser.add_argument('--num_threads', '-T', default=1, type=int,
        help='The number of threads to use for reading bzip files etc. If >1, use multithreading') 
    parser.add_argument('--version', default=int(time.time()/60.0), 
        help='A unique version number for the tree, to be saved in the DB tables & output files. Defaults to minutes since epoch (time()/60)')
    parser.add_argument('--extra_source_file', default=None, type=str, 
        help='An optional additional file to supplement the taxonomy.tsv file, providing additional mappings from OTTs to source ids (useful for overriding . The first line should be a header contining "uid" and "sourceinfo" column headers, as taxonomy.tsv. NB the OTT can be a number, or an ID of the form "mrcaott409215ott616649").')
    parser.add_argument('--info_on_focal_labels', nargs='*', default=[], 
        help='Output some extra information for these named taxa (e.g. "Canis_lupus"), for debugging purposes')        
    parser.add_argument('--verbosity', '-v', action="count", default=0, 
        help='verbosity: output extra non-essential info')

    args = parser.parse_args()
    main(args)
    