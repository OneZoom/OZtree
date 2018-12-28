#!/usr/bin/env python3 -u
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
import io
import gzip
import json
import argparse
import inspect
import random
import os
import logging
from collections import OrderedDict, defaultdict
from time import time
from math import log

#non-standard python packages
from dendropy import Node, Tree
from tqdm import tqdm

#local packages
from dendropy_extras import write_pop_newick
import OTT_popularity_mapping
# to get globals from ../../../models/_OZglobals.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir, os.path.pardir, os.path.pardir, "models")))
from _OZglobals import wikiflags

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''

sql_subs_string = '' #  ? for sqlite, %s for mysql

logger = logging.getLogger(__name__)
logging.EXTREME_DEBUG = logging.DEBUG + 1
logging.addLevelName(logging.EXTREME_DEBUG, "DEBUG++")

def _make_gen(reader):
    b = reader(1024 * 1024)
    while b:
        yield b
        b = reader(1024*1024)

def rawgencount(filename, byte_to_count=b'\n'):
    f = open(filename, 'rb')
    f_gen = _make_gen(f.raw.read)
    return sum( buf.count(byte_to_count) for buf in f_gen )

class ProgressFileWrapper(io.TextIOBase):
    def __init__(self, file, callback):
        self.file = file
        self.callback = callback
    def read(self, size=-1):
        buf = self.file.read(size)
        if buf:
            self.callback(len(buf))
        return buf
    def readline(self, size=-1):
        buf = self.file.readline(size)
        if buf:
            self.callback(len(buf))
        return buf

def is_unnamed_OTT(OTTid):
    """
    TO DO: I'm not sure when we use unnamed nodes with an OTT, so unsure if this is needed
    """
    try:
        
        return OTTid < 0
    except TypeError:
        return False

def get_OTT_species(taxonomy_file):
    species_list = set()
    taxonomy_file.seek(0)
    reader = csv.DictReader(taxonomy_file, delimiter='\t')
    for row in reader:
        if row['rank'] == 'species':
            species_list.add(int(row['uid']))
    return(species_list)
    
def get_tree_and_OTT_list(tree_filehandle, sources):
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
        size = os.stat(tree_filehandle.fileno()).st_size
        with tqdm(desc="Reading tree", file=sys.stdout, total=size) as progress:
            wrapper = ProgressFileWrapper(tree_filehandle, progress.update)
            tree = Tree.get_from_stream(wrapper, schema="newick",
                preserve_underscores=True, suppress_leaf_node_taxa=True)
    except:
        sys.exit("Problem reading tree from " + treefile.name)
    logger.info("-> read tree from " + tree_filehandle.name)
    
    ott_node = re.compile(r"(.*) ott(\d+)(@\d*)?$") #matches the OTT number
    mrca_ott_node = re.compile(r"(.*) (mrcaott\d+ott\d+)(@\d*)?$") #matches a node with an "mrca" node number (no unique OTT)
    rough_n_nodes = rawgencount(tree_filehandle.name, b',') + \
        rawgencount(tree_filehandle.name, b')') #rough number is close braces \
        # (for internal nodes plus last leaf in clade) plus commas for remaining leaves
    for i, node in tqdm(
        enumerate(tree.preorder_node_iter()),
        desc="Parsing node names",
        file=sys.stdout,
        total=rough_n_nodes:
        node.data = {'parent':node.parent_node or None}
        if node.label:
            node.label = node.label.replace("_"," ")
            m = ott_node.search(node.label)
            if m is not None:
                if m.group(3):
                    logger.warning(
                        "Node has an @ sign at the end ({}), meaning it has probably not"
                        " been substituted by an OpenTree equivalent. You may want to"
                        " provide an alternative subtree from this node downwards, as"
                        " otherwise it will probably be deleted from the main tree."
                        .format(node.label))
                node.label = m.group(1)
                node.data['ott'] = int(m.group(2))
                indexed_by_ott[node.data['ott']] = node.data
                node.data['sources']={k:None for k in sources}
            else:
                m = mrca_ott_node.search(node.label)
                if m is not None:
                    if m.group(3):
                        logger.warning(
                            "Node has an @ sign at the end ({}), meaning it has probably"
                            " not been substituted by an OpenTree equivalent. You may"
                            " want to provide an alternative subtree from this node"
                            " downwards, as otherwise it will probably be deleted from the main tree."
                            .format(node.label))
                    node.label = m.group(1)
                    #this is an 'mrca' node, so we want to save sources but *not* save the ott number in node.data
                    indexed_by_ott[m.group(2)] = node.data
                    node.data['sources']={k:None for k in sources}
                elif node.is_leaf():
                    logger.warning(
                        "Leaf without an OTT id: '{}'. This will not be associated with any other data"
                        .format(node.label))
            #finally, put underscores at the start or the end of the new label back
            #as these denote "fake" names that are hidden and only used for mapping
            #we could keep them as spaces, but leading/trailing underscores are easier to see by eye
            if node.label[0]==" ":
                node.label = "_" + node.label[1:]
            if node.label[-1]==" ":
                node.label = node.label[:-1] + "_"

    logger.info("-> extracted {} otts from among {} leaves and nodes".format(len(indexed_by_ott), i))
    return tree, indexed_by_ott

def add_eol_IDs_from_EOL_table_dump(source_ptrs, identifiers_file, source_mapping):
    used=0
    EOL2OTT = {v:k for k,v in source_mapping.items()}
    identifiers_file.seek(0)
    reader = csv.reader(identifiers_file, escapechar='\\')
    for EOLrow in tqdm(reader, file=sys.stdout, total=rawgencount(identifiers_file.name)):
        if (reader.line_num % 1000000 == 0):
            logger.info("-> {} rows read, {} used,  mem usage {:.1f} Mb".format(
                reader.line_num, used, OTT_popularity_mapping.memory_usage_resource()))
        provider = int(EOLrow[2])
        if provider in EOL2OTT:
            src = source_ptrs[EOL2OTT[provider]]
            providerid = str(EOLrow[1])
            EOLid = int(EOLrow[3])
            if providerid in src:
                used += 1;
                src[providerid]['EoL'] = EOLid
    logger.debug(
        " Matched {} EoL entries in the EoL identifiers file. Mem usage {:.1f} Mb"
        .format(used, OTT_popularity_mapping.memory_usage_resource()))

def identify_best_EoLdata(OTT_ptrs, sources):
    '''
    Each OTT number may point to several EoL entries, one for the NCBI number, another for the WORMS number, etc etc.
    Hopefully these will be the same entry, but they may not be. If they are different we need to choose the best one
    to use. We take the one with the most sources supporting this entry: if there is a tie, we take the lowest, as recommended by JRice from EoL
    '''
    logger.debug("Finding best EoL matches. mem usage {:.1f} Mb".format(
            OTT_popularity_mapping.memory_usage_resource()))
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
            e_str = None
            if len(choose) > 1:
                #weed out those EOLids with the least support.
                e_str = "More than one EoL ID {} for taxon OTT: {}".format(choose, OTTid)
                dups += 1
                max_refs = max([len(choose[id]) for id in choose])
                choose = [EOLid for EOLid in choose if len(choose[EOLid]) == max_refs]
            best = min(choose)
            data['eol'] = best
            logger.debug(" {}, chosen {}".format(e_str, best))
    logger.debug(
        " NB: of {} OpenTree taxa, {} ({:.2f}%) have EoL entries in the EoL identifiers "
        "file, and {} have multiple possible EOL ids. Mem usage {:.1f} Mb".format(
            validOTTs, OTTs_with_EOLmatch, OTTs_with_EOLmatch/validOTTs * 100, dups, 
            OTT_popularity_mapping.memory_usage_resource()))

def supplement_from_wikidata(OTT_ptrs):
    """
    If no OTT_ptrs[OTTid]['eol'] exists, but there is an 
        OTT_ptrs[OTTid]['wd']['initial_wiki_item']['EoL'] then put this into 
        OTT_ptrs[OTTid]['eol']
        Similarly for IPNI (although this is currently unpopulated)
    """
    EOLbase = EOLsupp = IPNIsupp = tot = 0
    for OTTid, data in OTT_ptrs.items():
        if is_unnamed_OTT(OTTid):
            logger.info(" unlabelled node (OTT: {}) when iterating through OTT_ptrs".format(OTTid))
            continue
        tot += 1
        if data.get('eol') is None:
            try:
                data['eol'] = int(data['wd']['initial_wiki_item']['EoL'])
                EOLsupp += 1
            except:
                pass
        else:
            EOLbase += 1
        if data.get('ipni') is None:
            try:
                data['ipni'] = int(data['wd']['initial_wiki_item']['IPNI'])
                IPNIsupp += 1
            except:
                pass
    logger.debug(
        "Out of {} OTT taxa, {} ({:.2f}%) already have EOL ids from the EOL file."
        " Supplementing these with {} EOL ids from wikidata gives {:.1f}% coverage."
        .format(tot, EOLbase, EOLbase/tot * 100.0, EOLsupp, (EOLbase+EOLsupp)/tot * 100))
    logger.info.debug("{} IPNI identifiers added via wikidata".format(IPNIsupp))


def populate_iucn(OTT_ptrs, identifiers_file):
    """
    Port the IUCN number from both EoL and Wikidata, and keep both if there is a conflict
    """
    used=0
    
    iucn_num = 622 #see https://github.com/EOL/tramea/issues/162
    eol_mapping = {} #to store eol=>iucn
    for OTTid, data in OTT_ptrs.items():
         if 'eol' in data:
            if data['eol'] in eol_mapping:
                eol_mapping[data['eol']].append(OTTid)
            else:
                eol_mapping[data['eol']] = [OTTid]
            
    identifiers_file.seek(0)
    reader = csv.reader(identifiers_file, escapechar='\\')
    for EOLrow in reader:
        if (reader.line_num % 1000000 == 0):
            logger.info("{} rows read, {} used,  mem usage {:.1f} Mb".format(
                reader.line_num, used, OTT_popularity_mapping.memory_usage_resource()))
        if int(EOLrow[2]) == iucn_num and EOLrow[1]: #there are lots of IUCN rows with no IUCN number, so check EOLrow[1]!= "" and != None
            try:
                for ott in eol_mapping[int(EOLrow[3])]:
                    OTT_ptrs[ott]['iucn'] = str(EOLrow[1])
                    used += 1
            except LookupError:
                pass #no equivalent eol id in eol_mapping
            except ValueError:
                logger.warning(
                    " Cannot convert IUCN ID {} to integer on line {} of {}."
                    .format(EOLrow[1], reader.line_num, identifiers_file.name))

    logger.debug(
        " Matched {} IUCN entries in the EoL identifiers file. Mem usage {:.1f} Mb"
        .format(used, OTT_popularity_mapping.memory_usage_resource()))

    #now go through and double-check against IUCN stored on wikidata
    for OTTid, data in OTT_ptrs.items():
        try:
            wd_iucn = str(data['wd']['initial_wiki_item']['iucn'])
            if 'iucn' in data:
                if wd_iucn != data['iucn']:
                    data['iucn'] = "|".join([data['iucn'], wd_iucn])
                    logger.debug(
                        " conflicting IUCN IDs for OTT {}: EoL = {} (via http://eol.org/pages/{}), wikidata = {} (via http://http://wikidata.org/wiki/Q{})."
                        .format(OTTid, data['iucn'], data['eol'], wd_iucn, 
                            data['wd']['initial_wiki_item']['Q']))
            else:
                data['iucn'] = wd_iucn
                used += 1
        except:
            pass #we can't find a wd iucn. Oh well...
    logger.debug("Increased IUCN coverage to {} taxa using wikidata".format(used))


def construct_wiki_info(OTT_ptrs):
    """
    Construct a wikidata Qid, and a wikipedia lang flag, for outputting to csv files
    Languages are sorted roughly according to active users on 
    https://en.wikipedia.org/wiki/List_of_Wikipedias
    
    We need only do this for taxa with OTTs - others we cannot map
    """
    lang_flags = {lang:2**bit for lang, bit in wikiflags.items()}
    for OTTid, data in OTT_ptrs.items():
        try:
            #if this field has a number in, it must have at least one lang
            tot = 0
            for lang in data['wd']['final_wiki_item']['l']:
                tot += (lang_flags.get(lang) or 0) #add together as bit fields                       
            data['wd']['final_wiki_item']['wikipedia_lang_flag'] = tot
        except KeyError:
            pass

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
    
def inherit_popularity(tree, exclude=[]):
            
    #NB: we must percolate popularities through the tree before deleting monotomies, since these often contain info
    #this should allocate popularities even for nodes that have been created by polytomy resolving.
    
    # We should also check that there are not multuple uses of the same Qid (https://github.com/OneZoom/OZtree/issues/132)
    
    OTT_popularity_mapping.sum_popularity_over_tree(tree, exclude=exclude)
    #now apply the popularity function
    Qids = set()
    for node in tree.preorder_node_iter():
        try:
            Q = node.data['wd']['final_wiki_item']['Q']
            if Q in Qids:
                logger.warning("duplicate wikidata Qids used (Q{})"
                    "- this will cause popularity double-counting for OTT {}"
                    .format(Q, node.data['ott']))
            else:
                Qids.add(Q)
        except KeyError:
            pass
        pop = popularity_function(
            node.ancestors_popsum,
            node.descendants_popsum,
            node.n_ancestors,
            node.n_descendants)
        node.data['raw_popularity'] = node.pop_store
        node.data['popularity'] = pop


def resolve_polytomies_add_popularity(tree, seed):
    """
    If there are polytomies in the tree, resolve them, but make sure that the newly 
    created nodes get popularity values too. These can be recalculated from the
    descendants and ancestors of the children
    
    """
    prev_num_nodes = sum(1 for i in tree.postorder_node_iter())
    random.seed(seed) #so we get the same bifurcations each time
    tree.resolve_polytomies(rng=random)
    logger.info(" {} extra nodes created"
        .format(sum(1 for i in tree.postorder_node_iter()) - prev_num_nodes))
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
                    'raw_popularity':0,
                    'popularity':popularity_function(
                        ancestor_pop_sum/n,
                        descendant_pop_sum,
                        n_ancestors_sum/n,
                        n_descendants_sum)
                    }
            except AttributeError:
                #probably popularity values undefined for one of the children
                pass

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
    try:
        for k in sorted(leaf_popularities.keys(), reverse=True):
           add_next = leaf_popularities[k]
           leaf_popularities[k] = cumsum
           cumsum += add_next
        for leaf in tree.leaf_node_iter():
           leaf.data['popularity_rank'] = leaf_popularities[leaf.data.get('popularity')]
    except TypeError:
        #there are some Nones in the popularity. We cannot set ranks.
        pass


def write_popularity_tree(tree, outdir, filename, version):
    Node.write_pop_newick = write_pop_newick
    with open(os.path.join(outdir, "{}_{}.nwk".format(filename, version)), 'w+') as popularity_newick:
        tree.seed_node.write_pop_newick(popularity_newick)


def simplify_tree(tree, taxonomy_file, seed):
    """
    We should now have leaf entries attached to each node in the tree like
    data = {
     'ott':,
     'wd': {'final_wiki_item':{'Q': 15478814, 'EoL': 1100788, 'l':['en','fr']}}, 
     'pop_dscdt': 0,
     'pop_ancst': 220183.23395609166,
     'sources': {'ncbi': None,
                 'worms': None, 
                 'gbif': {'wd': {'final_wiki_item':{'Q': 15478814, 'EoL': 1100788}}, 'id': '2840414'}, 
                 'if': None, 
                 'irmng': None},
     'popularity': 220183.23395609166,
     'eol': 1100788
     'iucn':XXXXXXX}
    
    ... or, if we have managed to calculate popularity ...
    
    data = {'wd': {'final_wiki_item':{'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}}, 
     'pop_dscdt': 0, 
     'pop_ancst': 392245.76075749274, 
     'sources': {'ncbi': {'wd': {'final_wiki_item':{'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}, 'EoL': 281897, 'id': '691616'}}, 
                 'worms': None, 
                 'gbif': {'wd': {'final_wiki_item':{'PGviews': [64, 47], 'pop': 285.14470010855894, 'Q': 4672161, 'EoL': 281897, 'PGsz': 1465}, 'id': '1968205'}}, 
                 'if': None, 
                 'irmng': {'EoL': 281897, 'id': '10290975'}}, 
     'eol': 281897}
     
    Removes non-species from tips, outputs simplified versions.
    """
    from dendropy_extras import prune_children_of_otts, prune_non_species, \
        set_node_ages, set_real_parent_nodes, remove_unifurcations_keeping_higher_taxa
    #monkey patch the existing dendropy objects
    Tree.prune_children_of_otts = prune_children_of_otts
    Tree.prune_non_species = prune_non_species
    Tree.set_node_ages = set_node_ages
    Tree.set_real_parent_nodes = set_real_parent_nodes
    Tree.write_preorder_ages = write_preorder_ages
    Tree.remove_unifurcations_keeping_higher_taxa = remove_unifurcations_keeping_higher_taxa
    
    Tree.create_leaf_popularity_rankings = create_leaf_popularity_rankings #not defined in dendropy_extras, but in this file
    Tree.resolve_polytomies_add_popularity = resolve_polytomies_add_popularity
    
    n = len(tree.prune_children_of_otts(get_OTT_species(taxonomy_file)))
    logger.info(
        "-> removed all children of {} nodes (nodes labeled as 'species' in '{}')"
        .format(n, taxonomy_file.name))
    
    bad_sp =['cf.', 'aff.', 'subsp.', 'environmental sample'] #species names containing these (even initially) are discarded
    bad_sp += [' cv.', ' sp.'] #species names containing these within the name are discarded: 
    n = {k:len(v) for k,v in tree.prune_non_species(bad_matches = bad_sp).items()}
    logger.info(
        "-> removed {} blank leaves, {} with no space in the name, and {} containing {} "
        "(assumed bad tips)".format(n['unlabelled'],n['no_space'],n['bad_match'], bad_sp))
    
    a, n = tree.set_node_ages()
    logger.info(
        "-> set ages on {} nodes and leaves, and removed {} extinction props"
        .format(a,n))
    
    logger.info("-> removing unifurcations")
    n_deleted_nodes = tree.remove_unifurcations_keeping_higher_taxa()
    #see https://github.com/jeetsukumaran/DendroPy/issues/75
    logger.info(" (removed {} unifurcations)".format(n_deleted_nodes))
    
    
    logger.info("-> breaking polytomies at random with seed={}".format(seed))
    tree.resolve_polytomies_add_popularity(seed)

    
    #NB: we shouldn't need to (re)set popularity or ages, since deleting nodes 
    #does not affect these, and both have been calculated *after* new
    #nodes were created by resolve_polytomies. 
    logger.info("-> setting real parents and ranking leaf popularity")
    tree.set_real_parent_nodes()
    tree.create_leaf_popularity_rankings()
    
    logger.info("-> ladderizing tree (groups with fewer leaves first)")
    tree.ladderize(ascending=True) #warning: ladderize ascending is needed for the short OZ newick-like form


def output_treefiles(tree, outdir, version, save_sql=True):
    from dendropy_extras import write_preorder_ages, write_preorder_to_csv, write_brief_newick
    Node.write_brief_newick = write_brief_newick
    Tree.write_preorder_to_csv = write_preorder_to_csv
    logger.info("-> writing tree, dates, and csv to files")
    with open(os.path.join(outdir, "ordered_tree_{}.nwk".format(version)), 'w+') as condensed_newick, \
         open(os.path.join(outdir, "ordered_tree_{}.poly".format(version)), 'w+') as condensed_poly, \
         open(os.path.join(outdir, "ordered_dates_{}.js".format(version)), 'w+') as json_dates, \
         open(os.path.join(outdir, "ordered_leaves_{}.csv".format(version)), 'w+', encoding='utf-8') as leaves, \
         open(os.path.join(outdir, "ordered_nodes_{}.csv".format(version)), 'w+', encoding='utf-8') as nodes:
        tree.seed_node.write_brief_newick(condensed_newick)
        tree.seed_node.write_brief_newick(condensed_poly, "{}")
        tree.write_preorder_ages(json_dates, format="json")
        #these are the extra columns output to the leaf csv file
        leaf_extras=OrderedDict()
        leaf_extras['ott']=['ott']
        leaf_extras['wikidata']=['wd','final_wiki_item','Q']
        leaf_extras['wikipedia_lang_flag']=['wd','final_wiki_item','wikipedia_lang_flag']
        leaf_extras['iucn']=['iucn']
        leaf_extras['eol']=['eol']
        leaf_extras['raw_popularity']=['raw_popularity']
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
        node_extras['wikidata']=['wd','final_wiki_item','Q']
        node_extras['wikipedia_lang_flag']=['wd','final_wiki_item','wikipedia_lang_flag']
        node_extras['eol']=['eol']
        node_extras['raw_popularity']=['raw_popularity']
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
    
    #make a copy of the csv file that can be imported into mySQL (has \\N for null values)
    if save_sql:
        from shutil import copyfile
        from subprocess import call
        #make copies of the csv files that can be imported into mySQL (has \\N for null values)
        print("-> saving copies of the files for reading into mySQL: read them in using:")
        for tab in ['_leaves','_nodes']:
            fn = os.path.join(outdir, "ordered"+tab + "_{}".format(version) +".csv")
            sqlfile = fn+'.mySQL'
            copyfile(fn, sqlfile)
            call(['perl', '-pi', '-e', r's/,(?=(,|\n))/,\\N/g', sqlfile])
            info(("sql> TRUNCATE TABLE ordered{}; " +
                "LOAD DATA LOCAL INFILE '{}' REPLACE INTO TABLE `ordered{}` " +
                "FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' " + 
                "IGNORE 1 LINES ({}) SET id = NULL;").format(tab, sqlfile, tab, open(fn).readline().rstrip()))


def main():
    r_seed = 1234
    parser = argparse.ArgumentParser(description='Convert a newick file with OpenTree labels into refined trees and CSV tables, while mapping Open Tree of Life Taxonomy IDs to other ids (including EoL & Wikidata)')
    parser.add_argument('Tree', type=argparse.FileType('r', encoding='UTF-8'), 
        help='The newick format tree to use')
    parser.add_argument('OpenTreeTaxonomy', type=argparse.FileType('r', encoding='UTF-8'), 
        help='The 325.6 MB Open Tree of Life taxonomy.tsv file, from http://files.opentreeoflife.org/ott/')
    parser.add_argument('EOLidentifiers', type=argparse.FileType('r', encoding='UTF-8'), 
        help='The 450 MB EOL identifiers file, from https://opendata.eol.org/dataset/identifiers-csv-gz')
    parser.add_argument('wikidataDumpFile', nargs="?", type=argparse.FileType('rb'), 
        help='The >4GB wikidata JSON dump, from https://dumps.wikimedia.org/wikidatawiki/entities/ (latest-all.json.bz2) ')
    parser.add_argument('wikipediaSQLDumpFile', nargs="?", type=argparse.FileType('rb'), 
        help='The >1GB wikipedia -latest-page.sql.gz dump, from https://dumps.wikimedia.org/enwiki/latest/ (enwiki-latest-page.sql.gz) ')
    parser.add_argument('wikipedia_totals_bz2_pageviews', nargs='*', type=argparse.FileType('rb'),
        help='One or more bzipped "totals" pageview count files, from https://dumps.wikimedia.org/other/pagecounts-ez/merged/ (e.g. pagecounts-2016-01-views-ge-5-totals.bz2, or pagecounts*totals.bz2)')
    parser.add_argument('--popularity_file', '-p', nargs="?", const=None, default="",
        help="Use or save popularity as branch lengths in a tree under this filename. If the 'popularity_file' switch is used but no filename provided, we skip the tedious process of calculating popularity altogether (useful for testing). If the 'popularity_file' switch is not used, we calculate popularity but don't save an intermediate file. If the ")
    parser.add_argument('--exclude', '-x', nargs='*', default=[], 
        help='(Optional) a number of taxa to exclude from calculation of phylogenetic popularities, such as Dinosauria_ott90215, Archosauria_ott335588')
    parser.add_argument('--output_location', '-o', default="output", 
        help='The directory to store the csv, newick, and date files')
    parser.add_argument('--wikilang', '-l', default='en', 
        help='The language wikipedia to check for popularity, e.g. "en". Where there are multiple Wikidata items for a taxon (e.g. one under the common name, one under the scientific name), then we also default to using the WD item with the sitelink in this language.')
    parser.add_argument('--version', default=int(time()/60.0), 
        help='A unique version number for the tree, to be saved in the DB tables & output files. Defaults to minutes since epoch (time()/60)')
    parser.add_argument('--extra_source_file', default=None, type=str, 
        help='An optional additional file to supplement the taxonomy.tsv file, providing additional mappings from OTTs to source ids (useful for overriding . The first line should be a header contining "uid" and "sourceinfo" column headers, as taxonomy.tsv. NB the OTT can be a number, or an ID of the form "mrcaott409215ott616649").')
    parser.add_argument('--info_on_focal_labels', nargs='*', default=[], 
        help='Output some extra information for these named taxa, for debugging purposes')        
    parser.add_argument('--verbosity', '-v', action="count", default=0, 
        help='verbosity: output extra non-essential info')

    args = parser.parse_args()

    if args.verbosity <= 0:
        logging.basicConfig(level=logging.WARN) 
    elif args.verbosity == 1:
        logging.basicConfig(level=logging.INFO) 
    elif args.verbosity == 2:
        logging.basicConfig(level=logging.DEBUG) 
    elif args.verbosity > 2:
        logging.basicConfig(level=logging.EXTREME_DEBUG) #super-verbose output 
        
    #from http://eol.org/api/docs/provider_hierarchies
    #these need to be an ordered dict with the first being the preferred id used when getting a corresponding wikidata ID
    #all the ids for these are integers >= 0
    int_sources = OrderedDict((('ncbi', 1172), ('if', 596), ('worms', 123), ('irmng', 1347), ('gbif', 800)))
    #the ids for these sources may not be numbers (e.g. Silva has things like D11377/#1
    nonint_sources = OrderedDict()
    sources = int_sources.copy()
    sources.update(nonint_sources)
    
    logger.info("Creating tree structure")
    tree, OTT_ptrs = get_tree_and_OTT_list(args.Tree, sources)
    
    logger.info("Adding source IDs")
    source_ptrs = OTT_popularity_mapping.create_from_taxonomy(
        args.OpenTreeTaxonomy, sources, OTT_ptrs, args.extra_source_file)
    
    logger.info("Adding EOL IDs from EOL csv file")
    add_eol_IDs_from_EOL_table_dump(source_ptrs, args.EOLidentifiers, sources)
    identify_best_EoLdata(OTT_ptrs, sources)
    
    if args.wikidataDumpFile:
        logger.info("Adding wikidata info")
        wiki_title_ptrs = OTT_popularity_mapping.add_wikidata_info(
            source_ptrs, args.wikidataDumpFile, args.wikilang)
        
        OTT_popularity_mapping.identify_best_wikidata(OTT_ptrs, sources.keys())
        construct_wiki_info(OTT_ptrs)
        
        logger.info("Supplementing ids (EOL/IPNI) with ones from wikidata")
        supplement_from_wikidata(OTT_ptrs)
    else:
        logger.info("No wikidataDumpFile given, so skipping wiki mapping")
        
    logger.info("Populating IUCN IDs using EOL csv file (or if absent, wikidata)")
    populate_iucn(OTT_ptrs, args.EOLidentifiers)
    
    
    if args.popularity_file is not None and args.wikipediaSQLDumpFile is not None and args.wikipedia_totals_bz2_pageviews:
        
        if args.popularity_file and os.path.isfile(args.popularity_file):
            info
        logger.info("Adding popularity measures")    
        OTT_popularity_mapping.add_pagesize_for_titles(
            wiki_title_ptrs, args.wikipediaSQLDumpFile)
        OTT_popularity_mapping.add_pageviews_for_titles(
            wiki_title_ptrs, args.wikipedia_totals_bz2_pageviews, args.wikilang)
        
        logger.info("Calculating base popularity measures")    
        OTT_popularity_mapping.calc_popularities_for_wikitaxa(wiki_title_ptrs.values(), 
            "Unused Popularity Function Here")
        
        #If we save the tree with branch lengths as popularities, we can recalculate the 
        
        #Here we might want to multiply up some taxa, e.g. plants, see https://github.com/OneZoom/OZtree/issues/130
        
        info("Percolating popularity through the tree")    
        inherit_popularity(tree, args.exclude)    
    
        if args.popularity_file:
            write_popularity_tree(
                tree, args.output_location, args.popularity_file, args.version)
        #NB to examine a taxon for popularity contributions here, you could try
        for focal_label in args.info_on_focal_labels:
            focal_taxon = focal_label.replace("_", " ")
            n = tree.find_node_with_label(focal_taxon)
            print("{}: own pop = {} (Q{}) descendant pop sum = {}".format(
                focal_taxon, n.pop_store, n.data['wd']['final_wiki_item']['Q'], n.descendants_popsum))
            
            for t, tip in enumerate(n.leaf_iter()):
              print("Tip {} = {}: own_pop = {}, Qid = {}".format(
                t, tip.label, getattr(tip,"pop_store",None), tip.data['wd']['final_wiki_item']['Q']))
              if t > 100:
                print("More tips exist, but have been omitted")
                break
            while(n.parent_node):
             n = n.parent_node
             if n.pop_store:
               print("Ancestors: {} = {:.2f}".format(n.label, n.pop_store))
    
    logger.info("Writing out results to {}/xxx".format(args.output_location))
    simplify_tree(tree, args.OpenTreeTaxonomy, r_seed)
    output_treefiles(tree, args.output_location, args.version)

if __name__ == "__main__":
    main()