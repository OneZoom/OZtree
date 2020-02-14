#!/usr/bin/env python3
# -*- encoding: utf-8 -*-

"""Usage: getOpenTreesFromOneZoom.py OpenTreeFile.tre output_dir file1.PHY file2.PHY ... > include_text

or as a python routine which will print out the same

    getOpenTreesFromOneZoom('OpenTreeFile.tre', 'output_dir', include_var, list_of_phy_filenames)
    

This script should be run from the same directory as the html file that creates the onezoom tree (e.g. OZ_yan)
It places a set of inclusion files into output_dir, based on the names of nodes in the input .PHY
files. The input files should contain one or more node names in the OneZoom @include format
which is the scientific name + '_ott' + (an OTT id, optionally a ~ sign, and optionally other OTT numbers separated
by an minus sign) + '@' + (optionally a number),  e.g. Brachiopoda_ott826261@4
This specifies that the node should be replaced with part of the OpenTree: namely the subtree 
starting at ott node 826261. 

foobar_ott123@ means create a node named foobar with ott 123, consisting of all descendants of 123 in the opentree.
foobar_ott123~456-789-111@ means create a node named foobar with ott 123, using ott456 minus the descendant subtrees 789 and 111
The tilde sign can be read an a equals (Dendropy doesn't like equals signs in taxon names)
foobar_ott123~-789-111@ is shorthand for foobar_ott123~123-789-111@
foobar_ott~456-789-111@ means create a node named foobar without any OTT number, using ott456 minus the descendant subtrees 789 and 111

If to_include corresponds to the name of a file, then that file is opened and assumed to contain a list of taxa
to retain in the inclusion files. Otherwise it is taken to be a number which is the default depth to which to descend
when creating inclusion files (so that e.g. we do not include all million insect species). To omit a default depth, 
and include all species by default, set to_include to 'Inf'. If to_include cannot be read as a number, depth is also
taken to be infinite. 

Depths can also be specified on a per-taxon basis by specifying an optional number after the @ sign in a taxon to include.
This number is ignored when specifying a file of included taxa, and it is also ignored if the default depth is negative.
In other words, to force all depths to the default value, overriding any per-taxon value, use a negative number, 
e.g. '-5' forces all extraction to depth 5, and '-Inf' sets all taxa to be extracted to the maximum depth.

The actual inclusion is done by the OneZoom js Tree class, this script merely creates the
files to include. It does this by extracting the relevant subtree from the full OpenTree (e.g.
a tree based on http://files.opentreeoflife.org/trees/. The script extracts newick files from this tree using a defined
 ExtractionUtility (normally subtree_extract.pl, see http://yanwong.me/?page_id=1090), saving the result to .nwk files.
These newick files are then ultrametricised, wth the
final result being output to an identically named file with a .phy extension.

The javascript commands needed to instruct OneZoom to include these files are printed to 
stdout. In the example above, the created files will be 826261.nwk and 826261.phy, with
the javascript output something like
    $tree.substitute('Brachiopoda_ott826261_5297812@\\d*', 'user/OpenTree_print/826261.phy')
This javascript code can be pasted directly into the OneZoom tree init file.

"""

import re
import os
import sys
import math
import logging
from subprocess import call

from dendropy import TreeList
from prune_trees_from_dict import get_taxa_include_dict_from_csv, prune_tree

def getTaxonNameMap(filename):
    '''
    Place the names of the taxa in the taxonomy file into a dictionary keyed by OTT id
    If the taxon is an extinct species, add the "extinct" dagger symbol (†) before the
    taxon name.
    '''
    taxon_map = {}
    with open(filename, 'rt') as taxon_file:
        reader = csv.DictReader(taxonomy_file, delimiter='\t')
        for row in reader:
            if row['flags'].contains('extinct'):
                taxon_map[int(row['uid'])] = row['name']
                assert not row['name'].startswith('†')
            else:
                taxon_map[int(row['uid'])] = '†' + row['name']
    return taxon_map


def getOpenTreesFromOneZoom(
    OpenTreeFile, OpenTreeTaxonomy, output_dir, include_var, phy_files, verbose=False):
    '''Python routine to get OToL subtrees from phy files. If include_var is a number, 
    treat it as a recursion depth, otherwise a dictionary of names to keep. 
    The parameter phy_files should be an iterable list of .phy or .PHY filenames'''


    taxom_map = getTaxonNames(args.OpenTreeTaxonomy)


    from numbers import Number
    ExtractionUtility = os.path.join(os.path.dirname(os.path.realpath(__file__)), "subtree_extract.pl")
    #find all nodes that end in  ott plus a number and (optionally) some other numbers starting with underscore, ending in
    # an at sign followed optionally by another number (giving the max depth) are OpenTree subnode IDs
    
    # the first number after the ott is always the ott number to use as the filename. 
    # the 1) ott123 2) ott_123: use the name, not the ott id
    
    ottRE = re.compile(r"^(.*)_ott([-~\d]+)\@(\d*)$")
    id_pattern = re.compile(r"(\d*)~?([-\d]*)$")
    
    if not os.path.isfile(OpenTreeFile):
        OpenTreeURL = "http://files.opentreeoflife.org/synthesis/opentree9.1/output/labelled_supertree/labelled_supertree_simplified_ottnames.tre"
        warn("Could not find the OpenTree file {}. Do you want to download it from {}".format(OpenTreeFile, OpenTreeURL))
        if (input("Press Enter to accept, or N to abort... ") == "N"):
            sys.exit(0)
        if not get_species_level_tree(OpenTreeFile):
            warn("Could not get the Open Tree of Life newick file to save at {}".format(OpenTreeFile))
    if isinstance(include_var, Number):
        keep = True #means keep all of the species down to a certain depth, i.e. do not use an include list
        default_recursion_depth = include_var
    else:
        keep = include_var
        default_recursion_depth = float('nan')
    
    for file in phy_files:
        if file == "-":
            trees = TreeList.get_from_stream(sys.stdin, schema="newick", preserve_underscores=True, rooting='default-rooted')
            file = "<stdin>"
        else:
            try:
                with open(file, 'r', encoding="utf8") as stream:
                    trees = TreeList.get_from_stream(stream, schema="newick", preserve_underscores=True, rooting='default-rooted')
            except Exception as e:
                trees = []
                warn("Problem reading tree from {}: {}".format(file, e))
                
        for tree in trees:
            for i, include_ott in enumerate(tree.preorder_node_iter(
                    lambda node: True if hasattr(node, "taxon") and node.taxon is not None and ottRE.search(node.taxon.label) else False
                )):
                if i==0:
                    print("\n//;#  == {} ==, from file {}".format(tree.seed_node.label, file))
                #each of these is a file to @include
                #first get recursion depth from the end of the string
                match = ottRE.search(include_ott.taxon.label)
                name = match.group(1)
                ottIDs = match.group(2)
                if default_recursion_depth < 0:
                    recursion_depth = abs(default_recursion_depth)
                else:
                    recursion_depth = float(match.group(3)) if len(match.group(3)) else default_recursion_depth
                match = id_pattern.match(ottIDs)
                if match:
                    subfile_name = match.group(1) or name
                    del_otts = (match.group(2) or '').split('-') #split by minus signs
                    base_ott = del_otts.pop(0) or match.group(1) #first number after '=' is the tree to extract.
                    system_call = [ExtractionUtility]
                    if keep==True and math.isfinite(recursion_depth):
                        system_call.append("-d={}".format(int(recursion_depth)))
                    system_call.append(os.path.relpath(OpenTreeFile, output_dir))
                    system_call.append(base_ott)
                    OpenSubTreeFile = os.path.join(output_dir, base_ott + ".nwk")
                    if verbose:
                        warn("For "+include_ott.taxon.label+": extracting tree into " + OpenSubTreeFile, prefix='');
                    call(system_call, cwd=output_dir) #should create many ottID.nwk files
                    OutputFilename = os.path.join(output_dir, subfile_name + ".phy")
                    if os.path.isfile(OpenSubTreeFile):
                        removed = "" if len(del_otts)==0 else " removed {}".format(del_otts)
                        subtree = prune_tree(OpenSubTreeFile, keep, del_otts)
                        if keep == True:
                            if verbose:
                                warn("Found file {} with {} leaf taxa,{} and extracted to max depth: {}".format(OpenSubTreeFile, len(subtree.taxon_namespace), removed, recursion_depth), prefix='')
                        else:
                            subtree_size = len(subtree.leaf_nodes())
                            if verbose:
                                warn("Found file with {} leaf taxa, {}, and simplified to only selected taxa ({} {})".format(len(subtree.taxon_namespace), removed, subtree_size, 'leaf' if subtree_size==1 else 'leaves', del_otts), prefix='')
                        '''this is not needed until the OpenTree has branch lengths
            
                        subtree.ultrametricize() #maybe use subtree.calc_node_ages()
                        warn("ultrametricized\n", prefix="")
                        #subtree->get_root()->set_branch_length(undef);
                        stem_height = include_ott.edge_length - subtree.calc_tree_height
                        if (stem_height < 0):'''
                        
                        if verbose:
                            warn("Now writing to {}".format(OutputFilename), prefix='')
                        with open(OutputFilename, 'w', encoding='UTF-8') as outputstream:
                            subtree.write_to_stream(outputstream,'newick', unquoted_underscores=True, suppress_rooting=True)

                        max_tree_height = 0
                        if include_ott.edge_length is not None and include_ott.edge_length > max_tree_height:
                            stem_height = include_ott.edge_length- max_tree_height
                        else:
                            stem_height = 0

                        # print(r'$tree.substitute_with_fn_last("{}_ott{}@\\d*", {}, "{}", {}); //;# "user/OpenTree/{}");'.format(name, ottIDs, stem_height, name, len(subtree.taxon_namespace), OutputFilename))
                        # OpenTrees are currently not dated, so we should omit the 'stem_length' value, so that the node becomes
                        # 'date unknown'
                        print(r"$tree.substitute('{}_ott{}@\\d*', '{}');".format(name, ottIDs, OutputFilename))
                    else:
                        warn("File " + OpenSubTreeFile + " does not exist, skipping\n")
                        
###### routine starts here
if __name__ == "__main__":
    import argparse
    import time
    parser = argparse.ArgumentParser(description='Create subtrees from the Open Tree of Life, on the basis of ott numbers in a set of newick files.')
    parser.add_argument('--verbose', '-v', action="store_true", help='verbose: output extra non-essential info')
    parser.add_argument('OpenTreeFile', help='Path to the Open Tree file, containing only open tree numbers.')
    parser.add_argument('OpenTreeTaxonomy', help='Path to the Open Tree Taxonomy file (taxonomy.tsv) corresponding to the OpenTreeFile.')
    parser.add_argument('output_dir', help='Path to the directory in which to save the OpenTree subtrees')
    parser.add_argument('parse_files', nargs='+', help='A list of newick files to parse for OTT numbers, giving the subtrees to extract.')
    args = parser.parse_args()

    args.verbose

    start = time.time()
    getOpenTreesFromOneZoom(
        args.OpenTreeFile, args.OpenTreeTaxonomy, args.output_dir, args.parse_files)
    end = time.time()
    warn("Time taken: {} seconds".format(end - start))