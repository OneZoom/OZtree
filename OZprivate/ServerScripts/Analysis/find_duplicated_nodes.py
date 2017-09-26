#!/usr/bin/env python3
'''Output all duplicated nodes in a tree.
'''

import argparse
import re
import sys
from dendropy import TreeList

parser = argparse.ArgumentParser(description='Check which nodes have duplicated names')
parser.add_argument('treefile', type=argparse.FileType('r'), nargs='+', help='Any number of newick-format tree files')

args = parser.parse_args()

for f in args.treefile:

    trees = TreeList.get(file=f, schema='newick', preserve_underscores=True)
    
    tree = trees[0]
        
    count = {}
    for node in tree.preorder_internal_node_iter():
        if node.label:
            count[node.label] = 1+ (count.get(node.label) or 0)
    
    tot =0
    for name,n in count.items():
        if n > 1:
            print("Node name '{}' duplicated {} times".format(name, n))
            tot = tot + n
    print("Total dups for {}: {}".format(f.name, tot))