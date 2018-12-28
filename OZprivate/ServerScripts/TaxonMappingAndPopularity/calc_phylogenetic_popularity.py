#!/usr/bin/env python3
"""Creates phylogenetic trees with branch lengths as popularity indices, based on the output from OTT_popularity_mapping.py

Assuming the output of OTT_popularity_mapping.py is called popularity.csv, call e.g. as 

OTT_popularity_mapping.py popularity.csv OpenTree/draftversionX.tre > poptree.phy

or more complicated, to make sure birds don't gather popularity intended for dinosaurs

OTT_popularity_mapping.py popularity.csv OpenTree/draftversionX.tre --exclude Dinosauria_ott90215 Archosauria_ott335588 --branch_length sum_ancestor_and_descendant_popularities > popularity_sums.phy

or even

OTT_popularity_mapping.py popularity.csv OpenTree/draftversionX.tre --exclude Dinosauria_ott90215 Archosauria_ott335588 --branch_length sum_ancestor_and_descendant_popularities --print_leaves_from_bespoke_tree OneZoomTouch/OZ_yan/fulltree.phy > popularity_list.txt

To view the leaves with the highest total popularity in a tree, you might want to do:

sort -k 2,2nr popularity_list.txt | less

Note that some of the leaves on (say) the draft tree correspond to subspecies etc (in particular, Canis lupus familiaris), and so we will not get an output for this.

In this particular instance, it seems sensible to sum up the total of the subspecies nodes 


try e.g. 

ServerScripts/TaxonMappingAndPopularity/calc_phylogenetic_popularity.py data/output_files/raw_pop data/OpenTree/draftversion5.tre -p sum_ancestor_and_descendant_popularities -b ../static/FinalOutputs/Life_full_tree.phy -v -x Dinosauria_ott90215 -x Archosauria_ott335588 > data/output_files/Data_phylo.csv
"""

def create_structure_from_file(OTTfile):
    """
    We might want to try several versions of the popularity_function, without going through the hassle of
    rerunning all the measures to get hold of the basic pagesize & pageviews data, so this function takes
    an open filehandle to a csv file as a parameter, and translates it into the data structure.
    
    OTT_ptrs[OTT_ID] = {'Q': Qid_column, 'oldpop': PopBase_column, 'PGsz': PageSize_column, 'PGviews'=[pagecounts1_column, pagecounts2_column, ...]}
    
    note that this might read in an already-calculated popularity measure, but we should recalculate a new popularity measure from
    page size and page views, just to be sure. Hence the read-in measure is named 'oldpop'
    
    Once this structure is created, we can call sum_popularity_over_tree() (from OTT_popularity_mapping.py) to try out different summing algorithms.
    
    """
    
    OTT_ptrs={}
    csvin = csv.DictReader(OTTfile)
    viewcols = [col for col in csvin.fieldnames if 'pagecounts' in col]
    for row in csvin:
        [int(row[col]) for col in viewcols if row[col] and row[col].isdigit()]
        d = OTT_ptrs[int(row["OTT_ID"])] = {}
        d['Q'] = None if row["Qid"] == '' else int(row["Qid"])
        d['PGsz'] = None if row["PageSize"] == '' else int(row["PageSize"])
        d['PGviews'] = [int(row[col]) for col in viewcols if row[col] and row[col].isdigit()]
        if "PopBase" in row:
            d['oldpop'] = None if row["PopBase"] == '' else float(row["PopBase"])
    return OTT_ptrs


import argparse
import csv
import re
import sys
import random
from dendropy import Tree
from statistics import mean, StatisticsError
from OTT_popularity_mapping import sum_popularity_over_tree, calc_popularities_for_wikitaxa

parser = argparse.ArgumentParser(description='Create a phylogenetic tree of life with branch lengths as popularity indices.')
parser.add_argument('popularity_csvfile', type=argparse.FileType('r', encoding='UTF-8'), help='A csv data file with headers containing OTT_ID, PageSize, and various pagecounts columns')
parser.add_argument('intree', type=argparse.FileType('r', encoding='UTF-8'), help='A newick-formatted input tree, e.g. the entire tree of life (draftversion4.tre) or fulltree.phy. Note that it may help if the tree still contains unifurcations')
parser.add_argument('--pop_measure', '-p', choices=['popularity', 'sum_ancestor_popularities', 'sum_descendant_popularities', 'sum_ancestor_and_descendant_popularities'], help='what should the measures or branch lengths in the new tree represent? (NB: "ancestor" popularities include the popularity of self)', default='popularity')
parser.add_argument('--print_leaves_from_bespoke_tree', '-b', type=argparse.FileType('r', encoding='UTF-8'), help='If another newick file is specified here, instead of outputting a newick file, the program will output the immediate branch_length values for each leaf from this tree, sorted by popularity')
parser.add_argument('--exclude', '-x', nargs='*', help='(optional) a number of taxa to exclude, such as Dinosauria_ott90215, Archosauria_ott335588')
parser.add_argument('--verbosity', '-v', action="count", help='verbosity level for outputting extra non-essential info')

args = parser.parse_args()

OTT_ptrs = create_structure_from_file(args.popularity_csvfile)
calc_popularities_for_wikitaxa(OTT_ptrs, '', args.verbosity)
tree = sum_popularity_over_tree(OTT_ptrs, args.intree, args.exclude, args.verbosity)

if args.print_leaves_from_bespoke_tree:
    print("Outputting leaf data", file=sys.stderr)
    data_from_bespoke_tree = []
    colmap = ['id','pop','name','raw_pop', 'ancst_pop', 'dscdt_pop','n_ancst','n_dscdt','n_pop_ancst', 'seedplant']
    leaves_from_tree = Tree.get(file=args.print_leaves_from_bespoke_tree, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True)
    for leaf in leaves_from_tree.leaf_node_iter():
        
        try:
            nm, OTTid = leaf.label.rsplit("_ott",1)
            OTTid = int(OTTid)
            try:
                raw_pop = OTT_ptrs[OTTid]['wd']['pop']
            except:
                raw_pop = 0
            try:
                apop = OTT_ptrs[OTTid]['pop_ancst']
            except:
                apop = 0
            try:
                dpop = OTT_ptrs[OTTid]['pop_dscdt']
            except:
                dpop = 0
            try:
                na = OTT_ptrs[OTTid]['n_ancst']
            except:
                na = 0
            try:
                nd = OTT_ptrs[OTTid]['n_dscdt']
            except:
                nd = 0
            try:
                npa = OTT_ptrs[OTTid]['n_pop_ancst']
            except:
                npa = 0
            try:
                sp = 1 if OTT_ptrs[OTTid]['is_seed_plant'] else 0
            except:
                sp = 0

            if args.pop_measure == 'sum_ancestor_popularities':
                pop = apop
            elif args.pop_measure == 'sum_descendant_popularities':
                pop = dpop
            elif args.pop_measure == 'sum_ancestor_and_descendant_popularities':
                pop = apop + dpop
            else:
                pop = raw_pop

            data_from_bespoke_tree.append([OTTid, pop, nm, raw_pop, apop, dpop, na, nd, npa, sp])
        except (ValueError):
            pass
    nodewriter = csv.writer(sys.stdout, quoting=csv.QUOTE_MINIMAL, delimiter = '\t')
    nodewriter.writerow(colmap)
    for row in sorted(data_from_bespoke_tree, reverse = True, key = lambda row: row[1]):
        nodewriter.writerow(row)
else:
    print("Outputting new tree", file=sys.stderr)

    #Before doing this, we might want to set the edge lengths to either ancestor_sum_popularities, descendant
    for nodes in tree.preorder_node_iter():
        if node.edge.length:
            if args.pop_measure == 'popularity':
                node
            elif args.pop_measure == 'sum_ancestor_popularities':
                pass
            elif args.pop_measure == 'sum_descendant_popularities':
                pass
            elif args.pop_measure == 'sum_ancestor_and_descendant_popularities':
                pass
    print(tree.as_string(schema='newick', unquoted_underscores=True, suppress_leaf_node_labels=False))