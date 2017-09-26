#!/usr/bin/env python3
'''
Print the leaves of a tree. Previously used for populating the leaves_in_unsponsored_tree table (now not necessary)


'''

import argparse
import re
import sys
from dendropy import Tree
from collections import OrderedDict

parser = argparse.ArgumentParser(description='Print all the leaves in a tree')
parser.add_argument('treefile', type=argparse.FileType('r', encoding="UTF-8"), help='A newick-format tree')
parser.add_argument('--ott', action="store_true", help='Should we only print ott numbers?')
parser.add_argument('--header', action="store_false", help='Should we only print ott numbers?')
parser.add_argument('--unique', action="store_false", help='Should we delete duplicates?')

args = parser.parse_args()

def warn(*objs):
    print(*objs, file=sys.stderr)

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True)

out = OrderedDict()
for leaf in tree.leaf_node_iter():
    if leaf.label and leaf.label != '':
        if args.ott:
            m = re.search("_ott(\d+)", leaf.label)
            if m:
                if m.group(1) in out:
                    out[m.group(1)] += 1
                else:
                    out[m.group(1)] = 1
        else:
            if leaf.label in out:
                out[leaf.label] += 1
            else:
                out[leaf.label] = 1
            
            
if args.header:
    if args.ott:
        print("ott")
    else:
        print("fullname")
if args.unique:
    for k,v in out.items():
        print(k)
        if v!=1:
            warn("{} is repeated {} times.".format(k, v))
else:
    print("\n".join(out))