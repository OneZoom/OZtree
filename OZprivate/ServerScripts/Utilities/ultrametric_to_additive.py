#!/usr/bin/env python3
'''
Transform an ultrametric newick tree into an additive newick tree

e.g. if A split from B 7 MYA, and C split from A&B 20 MYA, the ultrametric tree would be:

(
  (
    A,
    B
  ):7,
  C
):20;

And this code turns that into a proper additive newick tree:

(
  (
    A:7,
    B:7
  ):13,
  C:20
);

Note that the input is a clear abuse of the newick branch length syntax, since
we're not actually storing length, but ages. It is however convenient as a
transitional format when translating an ultrametric diagram to newick format.
'''

import argparse
import sys
from dendropy import Tree

parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('treefile', type=argparse.FileType('r'), nargs='?', default=sys.stdin, help='The ultrametric tree in newick form')
parser.add_argument('outfile', type=argparse.FileType('w'), nargs='?', default=sys.stdout, help='The output newick tree file')
args = parser.parse_args()

def process_node(node, parent_age):
    # If a input node has a length, it's semantically an age, not a length
    node_age = node.edge_length if node.edge_length else 0

    # The actual edge length is the difference between the parent age and the node age
    node.edge_length = round(parent_age - node_age, 2)
    if node.edge_length == 0:
        node.edge_length = None 

    # Process children recursively, 
    for child_node in node.child_nodes():
        process_node(child_node, node_age)

tree = Tree.get(stream=args.treefile, schema='newick', preserve_underscores=True,
    suppress_leaf_node_taxa=True, suppress_internal_node_taxa=True)
process_node(tree.seed_node, tree.seed_node.edge_length if tree.seed_node.edge_length else 0)

tree.write(file=args.outfile, schema='newick', suppress_leaf_node_labels=False) 

