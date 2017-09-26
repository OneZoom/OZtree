#!/usr/bin/env python3
'''Usage: prune_trees_from_dict.py tree.phy includefile > pruned_tree.phy

'''
from dendropy import Tree, Taxon
from itertools import compress
import sys
import re

def warn(*objs, prefix='WARNING: '):
    print(prefix, *objs, file=sys.stderr)

def get_taxa_include_dict_from_csv(filename):
    '''returns a set of species to include in the trees, from a text file'''
    try:
        f = open(filename, 'r')
    except IOError:
        warn('cannot open', filename)
    else:
        return {k:0 for k in f.read().strip().split('\n')}

def get_taxa_include_dict_from_db(db_connection):
    '''returns a set of species to include in the trees, by querying a db'''
    try:
        db_curs = db_connection.cursor()
        db_curs.execute("SELECT OTT_ID, name from reservations where verified_time is not NULL and (deactivated is NULL  or deactivated = '') and OTT_ID NOT IN (SELECT ott from leaves_in_unsponsored_tree)")
        arr = db_curs.fetchall()
        return {"{}_ott{}".format(k[1].replace (" ", "_"), k[0]):0 for k in arr}
    except:
        warn('problem with db')
        return({})

def leave_only(self, to_keep_dict):
    '''
    Removes terminal nodes associated with Taxon objects whose labels are 
    not a key in to_keep_dict. For each item in to_keep_dict that matches,
    increment its value by 1 (allows tracking how many we have) 
    
    We have to be careful with non-branching twigs (a series of unifurcations)
    because we want the tip to be left, and the rest pruned (so that a 
    single species is left on the tree)
    '''
    to_keep = self.taxon_namespace.get_taxa(labels=to_keep_dict.keys())
    #flag up the routes to keep 
    for nd in self.postorder_node_iter():
        if hasattr(nd, 'keep') or (nd.taxon and nd.taxon in to_keep):
            if (nd.parent_node):
                nd.parent_node.keep = True
      
    to_prune = set([t for t in self.taxon_namespace if t not in to_keep])
    
    for lf in self.leaf_node_iter(lambda n: n.taxon in to_prune):
        lf.spp=1;
    
    for nd in self.postorder_node_iter():
        if (hasattr(nd, 'spp')):
            if (nd.parent_node and not hasattr(nd.parent_node, 'keep')):
                if (hasattr(nd.parent_node, 'spp')):
                    nd.parent_node.spp += nd.spp
                else:
                    nd.parent_node.spp = nd.spp
                    
            else:
                if (nd.spp > 1):
                    if (nd.taxon):
                        nd.taxon.label += '#%d' % (nd.spp)
                    else:
                        if (nd.label):
                            nd.taxon = Taxon(label=nd.label + '#%d' % (nd.spp))
                        else:
                            warn("Couldn't find a label for a node with multiple descendants. Using label 'unknown'.")
                            nd.taxon = Taxon(label='unknown#%d' % (nd.spp))
                    nd.set_child_nodes([])
    self.prune_leaves_without_taxa(update_bipartitions=False,suppress_unifurcations=False)
    check_list_against_taxa(self, to_keep_dict)

Tree.leave_only = leave_only

def check_list_against_taxa(tree, checklist):
    '''take a dendropy tree and look for any taxa that correspond to keys in the "keep" dictionary,
    incrementing the value of each one found'''
    for n in checklist:
        if tree.taxon_namespace.has_taxon_label(n):
            checklist[n] += 1 #count each matched label from the keep list
    
def check_list_against_tree(treepath, checklist):
    '''take a path to a newick tree file and look for any taxa that correspond to keys in the "keep" dictionary,
    incrementing the value of each one found'''
    with open(treepath, 'r', encoding='UTF-8') as treefile:
        check_list_against_taxa(Tree.get_from_stream(treefile, schema="newick", preserve_underscores=True, rooting='default-rooted'), checklist)

def prune_tree(treepath, keep, prune_OTTids=[]):
    '''take a newick tree file and remove all the subtrees in prune_OTTids, then keep only those taxa listed as keys in the "keep" dictionary,
    incrementing the value of the key by one each time. If keep is True, keep all of the remaining taxa'''
    with open(treepath, 'r', encoding='UTF-8') as treefile:
        tree = Tree.get_from_stream(treefile, schema="newick", preserve_underscores=True, rooting='default-rooted')
        removed = 0
        for to_omit in prune_OTTids:
            to_remove = (tree.find_node(lambda node: True if node.label is not None and re.search("_ott" + to_omit + "'?$", node.label) else False) or
                        tree.find_node_with_taxon(lambda taxon: True if re.search("_ott" + to_omit + "'?$", taxon.label) else False))
            if to_remove:
                tree.prune_subtree(to_remove, suppress_unifurcations=False)
                removed += 1
            else:
                warn("Could not find subtree _ott{} within tree in {}".format(to_omit,treepath))
    
        if not keep == True:
            if removed:
                tree.purge_taxon_namespace() #make sure that taxa in the pruned subtrees are not counted 
            tree.leave_only(keep)
        return(tree)

def prune_trees_from_dict(treefile, keep_dict):
    '''Prune a '''
    pruned_tree = prune_tree(treefile, keep_dict)
    print(pruned_tree.as_string(schema='newick', unquoted_underscores=True, suppress_rooting=True))
    
if __name__ == "__main__":
    import sys
    intree = sys.argv[1]
    if sys.argv[2]:
        prune_trees_from_dict(intree, get_taxa_include_dict_from_csv(sys.argv[2]))
    else:
        prune_trees_from_dict(intree, get_taxa_include_dict_from_db())