#!/usr/bin/env python3
'''Creates phylogenetic trees with branch lengths as popularity indices.
Call e.g. as 

OneZoomTouch/server_scripts/utilities/popularity_tree.py popularity.txt OpenTree/draftversion4.tre > poptree.phy

or more complicated, to make sure birds don't gather popularity intended for dinosaurs

OneZoomTouch/server_scripts/utilities/popularity_tree.py popularity.txt OpenTree/draftversion4.tre --exclude Dinosauria_ott90215 Archosauria_ott335588 --branch_length sum_ancestor_and_descendant_popularities > popularity_sums.phy

or even

OneZoomTouch/server_scripts/utilities/popularity_tree.py popularity.txt OpenTree/draftversion4.tre --exclude Dinosauria_ott90215 Archosauria_ott335588 --branch_length sum_ancestor_and_descendant_popularities --print_leaves_from_tree OneZoomTouch/OZ_yan/fulltree.phy > popularity_list.txt

To view the leaves with the highest total popularity in a tree, you might want to do:


sort -k 2,2nr popularity_list.txt | less

Note that some of the leaves on (say) the draft tree correspond to subspecies etc (in particular, Canis lupus familiaris), and so we will not get an output for this.

In this particular instance, it seems sensible to sum up the total of the subspecies nodes 

'''

import argparse
import csv
import re
import random
from dendropy import Tree
from statistics import mean, StatisticsError

parser = argparse.ArgumentParser(description='Create a phylogenetic tree of life with branch lengths as popularity indices.')
parser.add_argument('popularity_file', type=argparse.FileType('r'), help='A tab-separated data file with headers containing OTTid, page_size, and trTop2meanMonthlyPageviews.XXX. See "OTT2wikidata.py" and "MatchPageSizeAndViews.py"')
parser.add_argument('intree', type=argparse.FileType('r'), help='A newick-formatted input tree, e.g. the entire tree of life (draftversion4.tre) or fulltree.phy. Note that it may help if the tree still contains unifurcations')
parser.add_argument('--branch_length', choices=['popularity', 'sum_ancestor_popularities', 'sum_descendant_popularities', 'sum_ancestor_and_descendant_popularities'], help='what should the branch lengths in the new tree represent? (NB: "ancestor" popularities include the popularity of self)', default='popularity')
parser.add_argument('--print_leaves_from_tree', type=argparse.FileType('r'), help='If another newick file is specified here, instead of outputting a newick file, the program will output the immediate branch_length values for each leaf from this tree',)
parser.add_argument('--exclude', nargs='*', help='(optional) a number of taxa to exclude, such as Dinosauria_ott90215, Archosauria_ott335588')
parser.add_argument('--verbose', '-v', action="store_true", help='verbose: output extra non-essential info')

args = parser.parse_args()

def warn(*objs):
    print(*objs, file=sys.stderr)

#construct dict of OTTid:PopularityMetric 
popularity = {};
tsvin = csv.DictReader(args.popularity_file, delimiter='\t')
viewcols = [col for col in tsvin.fieldnames if 'pagecounts' in col]
for row in tsvin:
    try:
        views = [int(row[col]) for col in viewcols if row[col] and row[col].isdigit()]
        trMeanViews = mean(sorted(views)[:-2])
        popularity[row["OTTid"]] = (float(row["page_size"]) * trMeanViews)**0.5 #take the sqrt transform
    except (StatisticsError, ValueError):   #perhaps data is absent, a number is NA or we are trying to take a mean of an empty list - if so, ignore
        pass;
           
tree = Tree.get(file=args.intree, schema='newick', suppress_edge_lengths=True, preserve_underscores=True, suppress_leaf_node_taxa=True)

#put popularity as edge length
for node in tree.preorder_node_iter():
    if node.label in args.exclude:
        node.edge_length = 0
    else:
        try:
            node.edge_length = popularity[node.label.rsplit("_ott",1)[1]]
        except (LookupError, AttributeError):
            node.edge_length = 0

#go up the tree from the tips, summing up the popularity indices beneath
if args.branch_length in ['sum_descendant_popularities', 'sum_ancestor_and_descendant_popularities']:
    for node in tree.postorder_node_iter():
        if node.is_leaf():
            node.descendants_popsum = 0
        try:
            node._parent_node.descendants_popsum += node.edge_length
        except AttributeError: #could be the first time we have checked the parent
            try:
                node._parent_node.descendants_popsum = 0
            except AttributeError: #this could be the root, with node._parent_node = None
                pass

#go down the tree from the root, summing up the popularity indices above 
if args.branch_length in ['sum_ancestor_popularities', 'sum_ancestor_and_descendant_popularities']:
    for node in tree.preorder_node_iter():
        try:
            node.ancestors_popsum = node._parent_node.ancestors_popsum + node.edge_length
        except AttributeError: #could be the root
            node.ancestors_popsum = 0

if args.branch_length == 'sum_descendant_popularities':
    for node in tree.postorder_node_iter():
        node.edge_length = node.descendants_popsum
elif args.branch_length == 'sum_ancestor_popularities':
    for node in tree.postorder_node_iter():
        node.edge_length = node.ancestors_popsum
elif args.branch_length == 'sum_ancestor_and_descendant_popularities':
    for node in tree.postorder_node_iter():
        node.edge_length = node.ancestors_popsum + node.descendants_popsum

        
if args.print_leaves_from_tree:
    print("OTTid\tPopularityMetric\tName")
    OTTids = set()
    leaves_from_tree = Tree.get(file=args.print_leaves_from_tree, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True)
    for leaf in leaves_from_tree.leaf_node_iter():
        try:
            OTTids.add(leaf.label.rsplit("_ott",1)[1])
        except (LookupError, AttributeError):
            pass
    if args.verbose:
        warn("added {} ({})".format(len(OTTids), random.sample(OTTids,2)))
    for node in tree.postorder_node_iter():
        try:
            n = node.label.rsplit("_ott",1)
            if n[1] in OTTids:
                print("{}\t{}\t{}".format(n[1], node.edge_length, n[0]))
        except (LookupError, AttributeError):
            pass
else:
    print(tree.as_string(schema='newick', unquoted_underscores=True, suppress_leaf_node_labels=False))