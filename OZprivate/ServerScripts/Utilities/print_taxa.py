#!/usr/bin/env python3
"""
Print all the taxa (either leaves, interior nodes, or both) from a tree
"""

import argparse
import sys
import re
from dendropy import Tree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('treefile', type=argparse.FileType('r'), nargs="?", default=sys.stdin, help='A newick-format tree')
parser.add_argument('--leaves_only', '-l', action="store_true", help='print only the leaves of the tree')
parser.add_argument('--internal_nodes_only', '-n', action="store_true", help='print only the internal nodes of the tree')

args = parser.parse_args()

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True, suppress_internal_node_taxa=True)

# Use the relevant iterator based on the arguments
iter = (tree.leaf_node_iter() if args.leaves_only else
    tree.preorder_internal_node_iter() if args.internal_nodes_only else tree.preorder_node_iter())

for node in iter:
    if node.label and node.label != "":
        print(re.sub('_', ' ',re.sub(r"[_ ]ott\d+$","",node.label)))
