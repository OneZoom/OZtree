#!/usr/bin/env python3
'''Simply count the number of unnamed nodes in a tree
'''

import argparse
import sys
import re
from dendropy import Tree

parser = argparse.ArgumentParser(description='print the taxa (either leaves, or both leaves and nodes) from a huge tree')
parser.add_argument('treefile', type=argparse.FileType('r'), default=sys.stdin, help='A newick-format tree')
parser.add_argument('--leaves_only', '-l', action="store_true", help='print only the leaves of the tree')
parser.add_argument('--internal_nodes_only', '-n', action="store_true", help='print only the internal nodes of the tree')

args = parser.parse_args()

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True, suppress_internal_node_taxa=True)

#put popularity as edge length
if args.leaves_only:
    for leaf in tree.leaf_node_iter():
        if leaf.label and leaf.label != "":
            print(re.sub('_', ' ',re.sub(r"[_ ]ott\d+$","",leaf.label)))
elif args.internal_nodes_only:
    for node in tree.preorder_internal_node_iter():
        if node.label and node.label != "":
            print(re.sub('_', ' ',re.sub(r"[_ ]ott\d+$","",node.label)))
else:
    for node in tree.preorder_node_iter():
        if node.label and node.label != "":
            print(re.sub('_', ' ',re.sub(r"[_ ]ott\d+$","",node.label)))
