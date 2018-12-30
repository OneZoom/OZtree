#!/usr/bin/env python3 -u
"""
A set of functions for monkey patching into dendropy objects.
These all assume that the tree has been loaded with suppress_leaf_node_taxa=True
"""

#
# To be patched into the Tree object
#
import itertools
import logging
logger = logging.getLogger(__name__)

def prune_children_of_otts(self, ott_species_list):
    to_trim = set()
    for nd in self.postorder_internal_node_iter():
        try:
            if nd.data.get('ott') in ott_species_list:
                trim_me = True
                #check for extinction props
                if (nd.num_child_nodes() == 1) and \
                    (list(nd.child_nodes())[0].num_child_nodes() == 0) and \
                    (list(nd.child_nodes())[0].edge.length):
                    trim_me = False #this is an extinction prop
                #check for species within this group
                for sub_nd in nd.postorder_internal_node_iter():
                    if sub_nd in to_trim:
                        logger.warning(
                            "Species {} is contained within another species {}: not trimming it"
                            .format(sub_nd.label, nd.label))
                        trim_me = False
                if trim_me:
                    to_trim.add(nd)
        except AttributeError:
            pass #nodes created by breaking polytomies will have no data attribute
    for nd in to_trim:
        nd.clear_child_nodes()
    return(to_trim)
        
                        
def prune_non_species(self,
            recursive=True,
            bad_matches = [], #any strings in here indicate non-species (e.g. ' cf.')
            update_bipartitions=False):
        """
        Recursive=true means remove tips (which may create more tips) and keep going until non left to prune
        Removes all terminal nodes whose name is '' or does not contain a space. Extinction props should be 
        unlabelled nodes with a length, e.g.
        ((:65)Tyrannosaurus_rex,Birds)
        """
        nodes_removed = {'no_space':[],'unlabelled':[],'bad_match':[]}
        done = False
        while not done:
            nodes_to_remove = {k:[] for k in nodes_removed.keys()}
            for nd in self.leaf_node_iter():
                if nd.label is None:
                    if nd.edge.length and nd.parent_node and nd.parent_node.label and (nd.parent_node.num_child_nodes()==1):
                        #only an extinction prop, if it has a length AND the parent node is a named unifurcation
                        pass
                    else:
                        nodes_to_remove['no_space'].append(nd)
                elif ' ' not in nd.label: #number of spaces is 0: a leaf, but probably not a species. Also catches label==''
                    logger.info(
                        "Removing '{}' since it does not seem to be a species (it does not contain a space)"
                        .format(nd.label))
                    nodes_to_remove['unlabelled'].append(nd)
                elif any(match in nd.label for match in bad_matches):
                    logger.info(
                        "Removing '{}' since it contains one of {}"
                        .format(nd.label, bad_matches))
                    nodes_to_remove['bad_match'].append(nd)
            for k, nodes in nodes_to_remove.items():
                for nd in nodes:
                    nd.edge.tail_node.remove_child(nd)
                nodes_removed[k] += nodes
            if not recursive:
                done = True
            if all([len(v)==0 for v in nodes_to_remove.values()]):
                done = True
                
        if update_bipartitions:
            self.update_bipartitions()
        return nodes_removed

def set_node_ages(self):
    """
    Adds an attribute called 'age' to each node, with the value equal to
    the sum of edge lengths from the node to the tips. Also adds the attribute
    extinction_date to terminal nodes that have been propped to earlier in time than 0Ma
    
    By convention, null branch lengths are of unspecified length, whereas zero-length branches (e.g. injected by 
    resolving polytomies) are of a fixed length = 0. Fossil species are denoted by a terminal unnamed
    monotomy (an 'extinction prop') which allows us to set the extinction date of any taxon. That means the 
    entire tree is expected to be ultrametric.
    
    Returns number of nodes with age set, and number of deleted extinction props
    """
    #Percolate age up the tree (go from tips upwards, assuming all tips at 0Ma)
    #Where children disagree on the age of their parent, take the larger number
    tot_ages=0
    for node in self.postorder_node_iter():
        if node.is_leaf():
            node.age = 0
        if node.parent_node is not None:
            l = node.edge.length
            if getattr(node,'age',None) is not None and l is not None:
                if l<0:
                    logger.warning("length <0 for {}".format(node.label))
                l=0 if l<0 else l
                if getattr(node.parent_node,'age', None) is None:
                    node.parent_node.age = node.age + l
                    tot_ages += 1
                else: 
                    if node.parent_node.age < (node.age + l):
                        node.parent_node.age = node.age + l
                    if (abs(node.parent_node.age - (node.age + l)) >= 1):
                        logger.warning(
                            "Age of node '{}' (child of {}) is {} via one route, but has a child node '{}' of age {}, attached by a branch of length {}, which sums to {}."
                            .format(
                                 node.parent_node.label,
                                 [n.label for n in node.ancestor_iter() if n.label][:3],
                                 node.parent_node.age,
                                 node.label,
                                 node.age,
                                 l,
                                 node.age+l))

    #For newly fixed ages, now percolate them down the tree if we know the age of a deeper node
    for node in self.preorder_node_iter():
        if getattr(node,'age', None) is not None:
            for ch in node.child_node_iter():
                if getattr(ch, 'age', None) is None and ch.edge.length is not None:
                    ch.age = node.age - (ch.edge.length if ch.edge.length>0 else 0)
                    tot_ages += 1

    #Now that we have calculated dates, remove 'extinction props', and flag up extinct species
    removed = 0
    for leaf in self.leaf_node_iter():
        if (leaf.label is None) and leaf.edge.length > 0:
            assert(leaf.parent_node.num_child_nodes()==1)
            leaf.parent_node.extinction_date = getattr(leaf.parent_node,'age',None)
            removed += 1
            #this is an extinction prop - remove the prop
            leaf.parent_node.clear_child_nodes()
    return tot_ages, removed

def set_real_parent_nodes(self):
    """
    Adds an attribute called 'real_parent' to each leaf and node, which 
    represents the parent node ignoring randomly resolved polytomies. We can then find
    all 'true' children by looking for leaves and nodes which have this as a 'real_parent'.
    edge.length==0 indicates a node which is a polytomy. 
    """
    for node in self.preorder_node_iter():
        for ch in node.child_node_iter():
            if node.edge.length == 0 and node.real_parent_node:
                ch.real_parent_node = node.real_parent_node
            else:
                ch.real_parent_node = node            

def is_on_unifurcation_path(node):
    """
    this is a node which is either a unifurcation or the first node in a path of 
    successive unifurcations
    """
    return node.num_child_nodes()==1 or \
        (node.parent_node and node.parent_node.num_child_nodes() == 1)

def remove_unifurcations_keeping_higher_taxa(self):
    """
    Does a more sophisticated pass than the remove_unifurcations flag in Dendropy4:
    * If this is a unifurcation ending in a leaf, the lowest level (i.e. species) is 
        retained as the name of the leaf
    * If this is a series of unifurcations within the tree, the node with the highest 
        raw popularity score should be kept. If there is a tie, any *named* nodes are 
        given priority, then the nodes highest in the tree.
    """
    nd_iter = self.postorder_node_iter()
    n_deleted = 0
    for k, g in itertools.groupby(nd_iter, is_on_unifurcation_path):
        #k should alternate between 0 (not on unifurcation path) and 1 
        if k:
            # the group could consist of multiple unifurcation paths
            # we need to separate them into groups themselves 
            node_lists = [[next(g)]]
            for next_node in g:
                if next_node == node_lists[-1][-1].parent_node:
                    node_lists[-1].append(next_node)
                else:
                    node_lists.append([next_node])
            for sequential_unary_nodes in node_lists:
                if sequential_unary_nodes[0].num_child_nodes() == 0:
                    #this ends in a tip, we can rely on the normal suppress_unifurcation
                    #behaviour (by default Dendropy keeps the lowest level taxa)
                    logger.debug(
                        "Unary nodes ending in tip left so that first is used: "
                        ", ".join([(x.label or "<None>") for x in sequential_unary_nodes]))
                else:
                    #sort so that best is last - by popularity then presence of label, 
                    #finally by existing position
                    sorted_unary_nodes = sorted(
                        sequential_unary_nodes,
                        key = lambda n: (n.data.get('raw_popularity'),bool(getattr(n,'label',""))))
                    keep_node = sorted_unary_nodes[-1]
                    logger.debug(
                        "Unary nodes collapsed to last in this list: " 
                        ", ".join([(x.label or "None") for x in sorted_unary_nodes]))
                    for nd in sequential_unary_nodes:
                        #these should still be in postorder
                        if nd != keep_node:
                            n_deleted += 1
                            nd.edge.collapse(adjust_collapsed_head_children_edge_lengths=True)
    n_deleted += len(self.suppress_unifurcations())
    return n_deleted

def write_preorder_ages(self, node_dates_filehandle, leaf_dates_filehandle=None, format="tsv"):
    """
    Write the dates to one or two files. If no second file is given, only write leaves if
    the format is 'json'. The main file is for nodes: any absent dates should be treated
    as unknown. The leaves file should be tiny: most leaves should not have a date, and
    be treated as extant (0 Ma), unless they have an extinction_date set.
    
    Format can equal 'json', 'csv', or 'tsv'
    """
    if format =='json':
        start = '{'
        end   = ['}']
        sep   = '":'
        join  = ['"','"']
    
    if format =='tsv':
        sep  = '\t'
        end  = [""]
        start= ""
        join = ['','']
    
    if format =='csv':
        sep  = ','
        end=[""]
        start= ""
        join = ['','']
    
    leaf_num = 0
    node_num = 0
    if leaf_dates_filehandle or format =='json':
        if leaf_dates_filehandle is None:
            leaf_dates_filehandle = node_dates_filehandle
            leaf_dates_filehandle.write('var tree_date = {"leaves":')
            join = ['"','"']
            end = ['},"nodes":',
                   '}}']
    
        leaf_dates_filehandle.write(start)
        for leaf in self.leaf_node_iter():
            #for compactness, we should probably write this in binary, as a series of (4-byte int, float)
            #but for the moment we write it as text format, which will be gzipped
            leaf_num += 1
            if (getattr(leaf, 'age', None) is not None) and (leaf.age > 0):
                leaf_dates_filehandle.write(join[0]+str(leaf_num)+sep + str(leaf.age))
                if format=='json':
                    join[0]=',"' #after the first value, start putting initial commas (avoids trailing comma)
                else:
                    join[0]='\n'
        leaf_dates_filehandle.write(end[0])
        leaf_dates_filehandle.flush()
    
    node_dates_filehandle.write(start)
    for node in self.preorder_internal_node_iter():
        node_num += 1
        if getattr(node, 'age', None) is not None:
            node_dates_filehandle.write(join[-1]+str(node_num)+sep + str(node.age))
            if format=='json':
                join[-1]=',"'
            else:
                join[-1]='\n'
    node_dates_filehandle.write(end[-1])
    node_dates_filehandle.flush()

def write_preorder_to_csv(self, leaf_file, extra_leaf_data_properties, node_file, 
    extra_node_data_properties, root_parent_id, callback=None):
    """
    Write the leaf and node info for this tree to csv files.
    * for leaves, always write the parent, name, and extinction_data
    * for nodes, always write the parent,node_rgt,leaf_lft,leaf_rgt, name, and age
    In addition to these, also write out the extra_leaf_data_properties and extra_node_data_properties
    contained in the data property dictionary of each node (or blank if the property does not exist), 
    e.g. for leaves this might be extinction_date,ott,wikidata,wikipedia_lang_flag,eol,iucn,popularity,popularity_rank,price,ncbi,ifung,worms,irmng,gbif
    for nodes: age,ott,wikidata,wikipedia_lang_flag,eol,popularity,ncbi,ifung,worms,irmng,gbif,vern_synth,rep1,...,rtr1,...,iucnNE,...
    """
    import csv
    from collections import OrderedDict
    from warnings import warn
    leaf_csv = csv.writer(leaf_file, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    leaf_csv.writerow(['parent','real_parent','name', 'extinction_date'] + list(extra_leaf_data_properties.keys()))
    node_csv = csv.writer(node_file, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    node_csv.writerow(['parent','real_parent','node_rgt','leaf_lft','leaf_rgt','name', 'age'] + list(extra_node_data_properties.keys()))
    
    #allocate node numbers
    internal_node_number = 0
    for node in self.preorder_internal_node_iter():
        internal_node_number += 1 #NB: increment first, since we use a 1-base numbering system, for mySQL row numbering
        node.id = internal_node_number
    
    #postorder traversal to allocate rgt side of ranges
    internal_leaf_count = 0
    prev_node = None
    for node in self.postorder_node_iter():
        #find rightmost leaf by postorder iteration.
        #For rightmost node, if previously visited node is a leaf, then (because we are ladderized ascending)
        # the rightmost node must be self (i.e. this is a terminal internal node). Otherwise it is the previously visted node 
        if node.is_leaf():
            internal_leaf_count += 1
        else:
            node.last_leaf = internal_leaf_count #should have counted all the internal leaves by now
            if prev_node.is_leaf():
                node.node_rgt = node.id #node_rgt == self
            else:
                #the node_rgt should be the same as the node_rgt of the previous node
                node.node_rgt = prev_node.node_rgt
        prev_node = node
    
    leaf_count = 1
    extra_leaf_output = OrderedDict()
    extra_node_output = OrderedDict()
    for node in self.preorder_node_iter():
        if node.is_leaf():
            base_output = [node.parent_node.id, 
                           #negative real_parent ids if this is a polytomy
                           -node.real_parent_node.id if node.edge.length==0 else node.real_parent_node.id,
                           node.label,
                           getattr(node, 'extinction_date', None)]
            for colname, keys in extra_leaf_data_properties.items():
                try:
                    extra_leaf_output[colname] = node.data
                    for k in keys:
                        extra_leaf_output[colname] = extra_leaf_output[colname][k]
                except (KeyError, TypeError, AttributeError): #catch none existent key name, None, or no data attribute (e.g. for polytomies)
                    extra_leaf_output[colname] = None           
            leaf_csv.writerow(base_output + list(extra_leaf_output.values()))
            leaf_count += 1
        else:
            base_output = [node.parent_node.id if node.parent_node else root_parent_id,
                           (-node.real_parent_node.id if node.edge.length==0 else node.real_parent_node.id) if hasattr(node,'real_parent_node') else 0,
                           node.node_rgt,
                           leaf_count,
                           node.last_leaf,
                           node.label,
                           getattr(node, 'age', None)]
            for colname, keys in extra_node_data_properties.items():
                try:
                    extra_node_output[colname] = node.data
                    for k in keys:
                        extra_node_output[colname] = extra_node_output[colname][k]
                except (KeyError, TypeError, AttributeError): #catch none existent key name, None, or no data attribute (e.g. for polytomies)
                    extra_node_output[colname] = None
            node_csv.writerow(base_output + list(extra_node_output.values()))
        if callback is not None:
            callback()

#
# To be patched into the Node object
#

def write_brief_newick(self, out, polytomy_braces="()", write_otts=False):
    """
    Copied from the default dendropy 4 function Node._write_newick
    The function requires a binary tree, and the tree should have been ladderized beforehand 
    It outputs id a string consisting of braces only (no commas), such that the number of tips 
    (and therefore the number of nodes-1, since this is a binary tree) is equal to the number of 
    characters in the string. Edges lengths are not output, but internal nodes that have an edge 
    length of 0 are represented by 'polytomy_braces' which can be specified, e.g. '{}' or '<>'
    """
    child_nodes = self.child_nodes()
    if child_nodes:
        if self.edge and self.edge.length==0: #if 0, this is a polytomy
            out.write(polytomy_braces[0]) #added
        else:
            out.write('(')
        assert(len(child_nodes)==2) #added
        f_child = child_nodes[0]
        for child in child_nodes:
            if child is not f_child:
                out.write(',')
            child.write_brief_newick(out, polytomy_braces)
        if self.edge and self.edge.length==0:
            out.write(polytomy_braces[1]) #added
            if write_otts and 'ott' in self.data:
                out.write(str(self.data['ott']))
        else:
            out.write(')')
            if write_otts and 'ott' in self.data:
                out.write(str(self.data['ott']))

def newick_label(node):
    return node._get_node_token(suppress_leaf_node_labels=False, suppress_rooting=True,
        unquoted_underscores = True)


def write_pop_newick(self, out, pop_store):
    """
    Copied from the default dendropy 4 function Node._write_newick
    This returns the Node as a NEWICK statement but uses getattr(node,pop_store)
    instead of node.edge.length for the edge length values.
    """
    child_nodes = self.child_nodes()
    if child_nodes:
        out.write('(')
        f_child = child_nodes[0]
        for child in child_nodes:
            if child is not f_child:
                out.write(',')
            child.write_pop_newick(out)
        out.write(')')
    
    label = newick_label(self)
    
    try:
        ott = self.data['ott']
        if label.endswith('\''):
            out.write(label[:-1] + '_ott{}\''.format(ott))
        else:
            out.write(label + '_ott{}'.format(ott))
    except (AttributeError, KeyError):
        out.write(label)
    
    sel = getattr(self, pop_store)
    if sel is not None:
        out.write(":%s" % str(float(sel)))

if __name__ == "__main__":
    #test
    import sys
    from dendropy import Tree
    from collections import OrderedDict
    Tree.write_preorder_to_csv = write_preorder_to_csv
    Tree.set_node_ages = set_node_ages
    t = Tree.get_from_path(sys.argv[1], schema="newick", suppress_internal_node_taxa=True, suppress_leaf_node_taxa=True)
    for i, nd in enumerate(t.preorder_node_iter()):
        nd.data={'preorder_index':i}
    t.set_node_ages()
    #logger.warning(t.find_node_with_label("Primates").data)
    t.ladderize(ascending=True)
    with open('test_leaves.csv', 'w+') as l, open('test_nodes.csv', 'w+') as n:
        node_extras=OrderedDict()
        node_extras['preorder index']=['preorder_index']
        t.write_preorder_to_csv(l,{},n,node_extras,-1)