#!/usr/bin/env python3
"""
Usage: server_scripts/ResolvePolytomies.py ../OpenTree/draftversion4_no_subsp.tre ../OpenTree/draftversion4_nosubsp_bifurcating.tre

Resolve polytomies and add new edges in with length==0 (ensure that existing branches with length==null are kept.

Make sure we don't suppress unifurcations, as these are useful later.

Also can prune single word leaf nodes.

This can also add 'fake' numbers to all the nodes if they don't have one already, which aids in the crowdfunding tree

We need to reserve some numbers for passerines (5141 unnamed nodes) and sponges (6686 unnamed nodes)

The code *requires* DendroPy 4: https://pythonhosted.org/DendroPy/
"""

import os
import sys
import random
import argparse
from dendropy import Tree, TreeList

parser = argparse.ArgumentParser(description='Take a newick tree and process it for OneZoom')
parser.add_argument('--prune_bad_leaves', '-p', action="store_true", help='delete leaf nodes that do not seem like species. For the moment, these are ones that consist of only a single word with no spaces. In verbose mode, the deleted leaves are printed.')
parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info')
parser.add_argument('--blank_node_labelling', type=int, default=0, help='when labelling blank nodes, start with this number (default of 20,000, since 1-20,000 are reserved for passerines and sponges). Set to 0 to not label any.')
parser.add_argument('--blank_node_end_num', type=int, help='when labelling blank nodes, ensure that the numbers do not exceed this')
parser.add_argument('intree', type=argparse.FileType('r', encoding="UTF-8"), help='input tree')
parser.add_argument('outfile', type=argparse.FileType('w', encoding="UTF-8"), nargs='?', help='file to output (if absent, default to stdout)', default=sys.stdout)
args = parser.parse_args()

random_seed_addition = 1234

def warning(*objs, prefix="WARNING: "):
  print(prefix, *objs, file=sys.stderr)

class MyTree(Tree):
    """
    Just like a normal Tree class, but with a function that prunes bad leaves
    """
    def prune_non_species(self,
                recursive=True,
                update_bipartitions=False,
                suppress_unifurcations=True,
                verbosity=0):
            """
            Removes all terminal nodes that have their ``taxon`` attribute set to
            |None| or which contain an underscore (i.e. space) in their names.
            """
            nodes_removed = []
            while True:
                nodes_to_remove = []
                for nd in self.leaf_node_iter():
                    if nd.taxon is None:
                        nodes_to_remove.append(nd)
                    elif nd.taxon.label.count("_") <= 1: #all labels have _ottxxx, but species should have an extra underscore
                        if verbosity:
                            print("Removed '{}' since it does not seem to be a species (it does not contain an underscore)".format(nd.taxon.label))
                        nodes_to_remove.append(nd)
                for nd in nodes_to_remove:
                    nd.edge.tail_node.remove_child(nd)
                nodes_removed += nodes_to_remove
                if not nodes_to_remove or not recursive:
                    break
            if suppress_unifurcations:
                self.suppress_unifurcations()
            if update_bipartitions:
                self.update_bipartitions()
            return nodes_removed


try:
    if args.verbosity:
        warning("Reading tree\n", prefix="")
    tree = MyTree.get(file=args.intree, schema="newick", preserve_underscores=True, rooting='default-rooted')
except:
    sys.exit("Problem reading tree from " + args.intree)

#warning("Suppressing_unifurcations\n")
#tree.suppress_unifurcations()
if args.verbosity:
    warning("Done\nResolving polytomies\n", prefix="")
random.seed(random_seed_addition); #so we get the same bifurcations each time
tree.resolve_polytomies(rng=random)
if args.prune_bad_leaves:
    if args.verbosity:
        warning("Done\nPruning bad leaves\n", prefix="")
    tree.prune_non_species(suppress_unifurcations=False, verbosity=args.verbosity)
else:
    if args.verbosity:
        warning("Done\nPruning blank leaves\n", prefix="")
    tree.prune_leaves_without_taxa(suppress_unifurcations=False)

if args.verbosity:
    warning("Done\n", prefix="")
if args.blank_node_labelling:
    if args.verbosity:
        warning("Adding node labels\n", prefix="")
    
    unnamed_node_id = args.blank_node_labelling #numbers from  -1:-19999 are reserved for sponges and passerines
    for node in tree.postorder_node_iter():
        if ((not node.is_leaf()) and (not node.label)):
            node.label = "{}_".format(unnamed_node_id);
            unnamed_node_id +=1
    
    if args.blank_node_end_num is not None and unnamed_node_id > args.blank_node_end_num:
        sys.exit("The unnamed node label number ({}) used has exceeded the number specified in --end_num ({})".format(unnamed_node_id, args.end_num))
        
tree.write(file=args.outfile, schema='newick', unquoted_underscores=True, suppress_rooting=True)

if args.verbosity:
    warning("Done",  prefix="")
