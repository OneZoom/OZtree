#!/usr/bin/env python3
'''Simply count the number of unnamed nodes in a tree
'''

import argparse
from dendropy import Tree

parser = argparse.ArgumentParser(description='Count the number of unnamed nodes in a tree')
parser.add_argument('treefile', type=argparse.FileType('r'), help='A newick-format tree')

args = parser.parse_args()

def warn(*objs):
    print(*objs, file=sys.stderr)

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True)

i=j=0
#put popularity as edge length
for node in tree.preorder_internal_node_iter():
    if node.label and node.label != "":
        pass
    else:
        i=i+1;
for leaf in tree.leaf_node_iter():
    if leaf.label and leaf.label != "":
        pass
    else:
        j=j+1;

print("Number of unlabelled nodes is {}\nNumber of unlabelled leaves is {}\n".format(i,j));