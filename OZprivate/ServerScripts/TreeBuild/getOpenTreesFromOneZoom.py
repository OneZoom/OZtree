#!/usr/bin/env python3
# -*- encoding: utf-8 -*-

"""Usage: getOpenTreesFromOneZoom.py OpenTreeFile.tre output_dir to_include file1.PHY file2.PHY ... > include_text.js_fragment

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

If specifying a to_include file, it is simply in the format:

Hippocampus_hippocampus_ott630167
Anthaxia_candens_ott3415523
Hapalochlaena_lunulata_ott1033634
Eumimesis_d'almeidai_ott5545324

(note that these names are after newick parsing, but with underscores retained, so e.g. the drafttree file would have 
'Eumimesis_d''almeidai_ott5545324')

If such a file is used, the inclusion files will contain these species plus all nodes on the way to them, each with
an alternative leaf marked #N, where N is the number of leaves that descend from this node.

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
import multiprocessing
import logging
import argparse
import time
import itertools
from subprocess import call

from multiprocessing_logging import install_mp_handler
from dendropy import TreeList

from prune_trees_from_dict import prune_tree

EXTRACTION_UTILITY = os.path.join(os.path.dirname(os.path.realpath(__file__)), "subtree_extract.pl")

def getOpenTreesFromOneZoomFile(params):
    '''Python routine to get OToL subtrees from a phy file'''
    OpenTreeFile, output_dir, file = params
    from numbers import Number
    #find all nodes that end in  ott plus a number and (optionally) some other numbers starting with underscore, ending in
    # an at sign followed optionally by another number (giving the max depth) are OpenTree subnode IDs
    
    # the first number after the ott is always the ott number to use as the filename. 
    # the 1) ott123 2) ott_123: use the name, not the ott id
    

    ottRE = re.compile(r"^(.*)_ott([-~\d]+)\@(\d*)$")
    id_pattern = re.compile(r"(\d*)~?([-\d]*)$")

    if file == "-":
        trees = TreeList.get_from_stream(sys.stdin, schema="newick", preserve_underscores=True, rooting='default-rooted')
        file = "<stdin>"
    else:
        try:
            with open(file, 'r', encoding="utf8") as stream:
                trees = TreeList.get_from_stream(stream, schema="newick", preserve_underscores=True, rooting='default-rooted')
        except Exception as e:
            trees = []
            logging.warning("Problem reading tree from {}: {}".format(file, e))
    return_string = ""

    for tree in trees:
        for i, include_ott in enumerate(tree.preorder_node_iter(
                lambda node: True if hasattr(node, "taxon") and node.taxon is not None and ottRE.search(node.taxon.label) else False
            )):
            if i==0:
                return_string += "\n//;#  == {} ==, from file {}".format(
                    tree.seed_node.label, file) + "\n"
            #each of these is a file to @include
            #first get recursion depth from the end of the string
            match = ottRE.search(include_ott.taxon.label)
            name = match.group(1)
            ottIDs = match.group(2)
            match = id_pattern.match(ottIDs)
            if match:
                subfile_name = match.group(1) or name
                del_otts = (match.group(2) or '').split('-') #split by minus signs
                base_ott = del_otts.pop(0) or match.group(1) #first number after '=' is the tree to extract.
                system_call = [EXTRACTION_UTILITY]
                system_call.append(os.path.relpath(OpenTreeFile, output_dir))
                system_call.append(base_ott)
                OpenSubTreeFile = os.path.join(output_dir, base_ott + ".nwk")
                logging.info("For "+include_ott.taxon.label+": extracting tree into " + OpenSubTreeFile);
                call(system_call, cwd=output_dir) #should create many ottID.nwk files
                OutputFilename = os.path.join(output_dir, subfile_name + ".phy")
                if os.path.isfile(OpenSubTreeFile):
                    removed = "" if len(del_otts)==0 else ", removed {}".format(del_otts)
                    subtree = prune_tree(OpenSubTreeFile, True, del_otts)
                    subtree_size = len(subtree.leaf_nodes())
                    logging.info(
                        "Found file with {} leaf taxa{}, and simplified to only selected taxa ({} {})"
                        .format(
                            len(subtree.taxon_namespace),
                            removed, subtree_size,
                            'leaf' if subtree_size==1 else 'leaves',
                            del_otts))

                    '''this is not needed until the OpenTree has branch lengths
        
                    subtree.ultrametricize() #maybe use subtree.calc_node_ages()
                    logging.info("ultrametricized\n")
                    #subtree->get_root()->set_branch_length(undef);
                    stem_height = include_ott.edge_length - subtree.calc_tree_height
                    if (stem_height < 0):'''
                    
                    logging.info("Now writing to {}".format(OutputFilename))
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
                    return_string += r"$tree.substitute('{}_ott{}@\\d*', '{}');".format(
                        name, ottIDs, OutputFilename) + "\n"
                else:
                    logging.warning("File " + OpenSubTreeFile + " does not exist, skipping")
    return return_string, file

###### routine starts here
if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description='Create subtrees from the Open Tree of Life, on the basis of ott numbers in a set of newick files.')
    parser.add_argument('--verbosity', '-v', action='count', default=0, help='verbosity level: output extra non-essential info')
    parser.add_argument('OpenTreeFile', help='Path to the Open Tree newick file')
    parser.add_argument('output_dir', help='Path to the directory in which to save the OpenTree subtrees. See https://github.com/jrosindell/OneZoomTouch')
    parser.add_argument('parse_files', nargs='+', help='A list of newick files to parse for OTT numbers, giving the subtrees to extract.')
    parser.add_argument('--include_var', help='Deprecated (used to be used to restrict the depth of recursion)')
    parser.add_argument('--num_threads', '-T', default=1, type=int,
        help='The number of threads to use. If >1, use multithreading') 
    args = parser.parse_args()

    if args.verbosity==0:
        logging.basicConfig(stream=sys.stderr, level=logging.WARNING)
    elif args.verbosity==1:
        logging.basicConfig(stream=sys.stderr, level=logging.INFO)
    elif args.verbosity==2:
        logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
    install_mp_handler()

    start = time.time()
    if not os.path.isfile(args.OpenTreeFile):
        logging.warning("Could not find the OpenTree file {}".format(args.OpenTreeFile))
    params_iter = zip(
        itertools.repeat(args.OpenTreeFile),
        itertools.repeat(args.output_dir),
        args.parse_files)
    if args.num_threads > 1:
        with multiprocessing.Pool(processes=args.num_threads) as pool:
            for ret, fn in pool.imap_unordered(getOpenTreesFromOneZoomFile, params_iter):
                logging.info(f"== Parsed file {fn}")
                print(ret)
    else:
        for params in params_iter:
            ret, fn = getOpenTreesFromOneZoomFile(params)
            logging.info(f"== Parsed file {fn}")
            print(ret)
            
    end = time.time()
    logging.debug("Time taken: {} seconds".format(end - start))