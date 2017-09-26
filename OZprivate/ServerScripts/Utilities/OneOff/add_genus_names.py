#!/usr/bin/env python3
'''Label all unnamed nodes with an underscore + number.
'''

import argparse
import re
import sys
from warnings import warn
from dendropy import TreeList
from collections import OrderedDict

parser = argparse.ArgumentParser(description='Add genus names to nodes on the tree, for each monophyletic genus')
parser.add_argument('treefile', type=argparse.FileType('r'), help='A newick-format tree')

args = parser.parse_args()

trees = TreeList.get(file=args.treefile, schema='newick', preserve_underscores=True, rooting='default-rooted')

tree = trees[0]

#compile a list of genus names

count = {}
for node in tree.preorder_internal_node_iter():
    if node.label:
        nl = re.sub(r'_\d+_$','', node.label).lower()
        count[nl] = 1+ (count.get(nl) or 0)

dups = {name:0 for name,n in count.items() if n > 1}

#collect a list of genus names
genera = OrderedDict()
for node in tree.leaf_node_iter():
    if node.taxon.label:
        m = re.match(r'([^_]+)_',node.taxon.label)
        if m:
            try:
                genera[m.group(1)].append(node.taxon)
            except KeyError:
                genera[m.group(1)] = [node.taxon]                 

#insert genus names, or replace if current name is a dup etc
for genus,taxa in genera.items():
    if trees.frequency_of_bipartition(taxa=taxa) > 0.5 and len(genus) > 1:
        genus_node = tree.mrca(taxa=taxa)
        if genus_node.label and genus_node.label != "":
            print("Label '{}' is already given to MRCA of all leaves labelled {}.".format(genus_node.label, genus), file=sys.stderr)
            name_at_genus_node = re.sub(r'_\d+_$','', genus_node.label).lower()
            if (name_at_genus_node in dups) or re.search(r'^Clade\d+_$', genus_node.label):
                print("Overwriting '{}' with '{}' since {} is CladeXXX_ name or a duplicate.".format(genus_node.label, genus, genus_node.label), file=sys.stderr)
                genus_node.label = genus
        else:
            print("Adding genus '{}' to previously blank node on tree.".format(genus), file=sys.stderr)
            genus_node.label = genus

#rewrite Thraupidae_n_ to ThraupidaeN_, where n->N accounts for losing some to genus labels
for node in tree.preorder_internal_node_iter():
    if node.label and node.label != "":
        name_at_node = re.sub(r'_\d+_$','', node.label).lower()
        if name_at_node in dups:
            m = re.search(r'^(.+?)_(\d+)_$', node.label)
            if m:
                dups[name_at_node] += 1
                newname = m.group(1) + str(dups[name_at_node]) + "_"
                print("Overwriting '{}' with '{}' to account for numbers lost when assigning genera.".format(node.label, newname), file=sys.stderr)
                node.label = newname
            else:
                print("WARNING: could not match name & number in node label '{}' .".format(node.label), file=sys.stderr)
            
print(tree.as_string(schema="newick",unquoted_underscores=True, suppress_rooting=True))