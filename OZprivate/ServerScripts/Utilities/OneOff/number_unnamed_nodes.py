#!/usr/bin/env python3
'''Label all unnamed nodes with an underscore + number.
'''

import argparse
from warnings import warn
from dendropy import Tree

parser = argparse.ArgumentParser(description='Give a number (preceeded by an underscore) to all unnamed nodes in a tree')
parser.add_argument('treefile', type=argparse.FileType('r'), help='A newick-format tree')
parser.add_argument('start_number', type=int, help='the starting number for labelling')
parser.add_argument('end_number', type=int, help='the maximum end number - if more numbers that this are needed, the process is aborted')

args = parser.parse_args()

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True)

i=args.start_number
for node in tree.postorder_internal_node_iter():
    if node.label and node.label != "":
        pass
    else:
        node.label="_{}".format(i)
        i=i+1

if i <= args.end_number:
    print(tree.as_string(schema="newick",unquoted_underscores=True))
else:
    warn("You need {} labels, but you have specified a start number of {} and end of {} (i.e. only {} numbers allowed)".format(i, args.start_number, args.end_number, -args.start_number + args.end_number))