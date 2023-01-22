#!/usr/bin/env python3
'''
Format a newick tree with indentation to make it more human readable. This is not meant for very large trees.

For example, if the input tree is:

(Tupaia_tana:8.5,(Tupaia_picta:8.0,(Tupaia_montana:7.0,Tupaia_splendidula:7.0):1.0):0.5):4.5;

The output is:

(
  Tupaia_tana:8.5,
  (
    Tupaia_picta:8.0,
    (
      Tupaia_montana:7.0,
      Tupaia_splendidula:7.0
    ):1.0
  ):0.5
):4.5;
'''

import argparse
import sys
from dendropy import Tree

parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument('treefile', type=argparse.FileType('r'), nargs='?', default=sys.stdin, help='The tree file in newick form')
parser.add_argument('outfile', type=argparse.FileType('w'), nargs='?', default=sys.stdout, help='The output tree file')
parser.add_argument('--indent_spaces', '-i', default=2, type=int, help='the number of spaces for each indentation level')
args = parser.parse_args()

tree = Tree.get(stream=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True, suppress_internal_node_taxa=True)
output_stream = args.outfile
indent_string = ' ' * args.indent_spaces

def process_node(node, depth):
    output_stream.write(indent_string * depth)

    if len(node.child_nodes()) > 0:
        output_stream.write('(\n')

        # Go through children and process them recursively, increasing the depth
        for count, child_node in enumerate(node.child_nodes()):
            process_node(child_node, depth+1)

            # Commas between the children
            if count < len(node.child_nodes())-1:
                output_stream.write(',')

            output_stream.write('\n')

        output_stream.write(indent_string * depth + ')')

    if node.label:
        output_stream.write(node.label)
    if node.edge_length:
        output_stream.write(':' + str(node.edge_length))
    
process_node(tree.seed_node, 0)

# Need a ; at the end of the newick
output_stream.write(';\n')
