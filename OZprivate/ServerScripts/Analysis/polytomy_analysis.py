#!/usr/bin/env python3
"""
Count the polytomy sizes for each node, and output along with the number of leaves descending from each, and
whether it is a plant, animal, fungus, or (eu)bacterium.

After running `polytomy_analysis.py OpenTreevX.tre > results.out`, the data can be visualized e.g. in R using

data <- read.delim('results.out', header=T, stringsAsFactors=FALSE)
c('Other'= '#00000011', 'Chloroplastida'='#00FF0033', 'Metazoa'='#FF000033', 'Fungi'='#0000FF33', 'Bacteria'='#FF00FF33') -> cols
plot(polytomy.size ~ num.spp, data=data, log='xy', pch=20, col=cols[type], cex=2)

#individual points can then be identified by

identify(data$num.spp, data$polytomy.size, labels = data$name, cex=0.6)

########

To get specific results for a subclade, e.g. the lepidosaurs, find the OTT number (e.g. 35881 for lepidosaurs, 186816 for serpentes, etc), and extract that clade from labelled_supertree_simplified_ottnames.tre using my subtree_extract.pl script.

e.g.

ServerScripts/TreeBuild/subtree_extract.pl data/OpenTree/opentree7.0_tree/labelled_supertree/labelled_supertree_simplified_ottnames.tre 35881
ServerScripts/Analysis/polytomy_analysis.py 35881.nwk > 35881.out

#then in R

data <- read.delim('35881.out', header=T, stringsAsFactors=FALSE)
c('Other'= '#00000011', 'Chloroplastida'='#00FF0033', 'Metazoa'='#FF000033', 'Fungi'='#0000FF33', 'Bacteria'='#FF00FF33') -> cols
plot(polytomy.size ~ num.spp, data=data, log='xy', pch=20, col=cols[type], cex=2)
identify(data$num.spp, data$polytomy.size, labels = data$name, cex=0.6)

"""
import argparse
import re
from dendropy import Tree


label_nodes = {'Other':0, 'Chloroplastida_ott361838':1, 'Metazoa_ott691846':2, 'Fungi_ott352914':3, 'Bacteria_ott844192':4}
target_nodes = {}
names = {index:re.sub("_ott\d+", "", k) for k, index in label_nodes.items()}

parser = argparse.ArgumentParser(description='Count the number of unnamed nodes in a tree')
parser.add_argument('treefile', type=argparse.FileType('r'), help='A newick-format tree')

args = parser.parse_args()

def warn(*objs):
    print(*objs, file=sys.stderr)

tree = Tree.get(file=args.treefile, schema='newick', preserve_underscores=True, suppress_leaf_node_taxa=True)

#set edge length to number of leaves
for node in tree.postorder_node_iter():
    if node.is_leaf():
        node.n_leaves = 1
    else:
        if node.label in label_nodes:
             target_nodes[node.label] = node
    try:
        node._parent_node.n_leaves += node.n_leaves
    except:
        try:
            node._parent_node.n_leaves = node.n_leaves
        except:
            pass #the root


        
#set all descendants of each type
for nm, root in target_nodes.items():     
    for nd in root.postorder_internal_node_iter():
        nd.type = label_nodes[nm]

print("\t".join(["polytomy.size", "num.spp", "type", "name"]))
for n in tree.postorder_internal_node_iter():
    try:
        leaves = n.n_leaves
    except:
        leaves = None
    try:
        i = n.type
    except:
        i = None
    
    print("\t".join([str(n.num_child_nodes()),str(leaves), names.get(i or 0) or "", n.label or ""]))