#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
"""
Usage: extract_trees.py Supertree Taxonomy output_dir file1.PHY file2.PHY ... > include_commands

or as a python routine which does the same, returning include_commands as a string

    getOpenTreesFromOneZoom(
        'Supertree.tre', 'taxonomy.tsv', include_var, list_of_phy_filenames,
        supplementary_taxonomy='')

This script places a set of newick trees into output_dir. The newick trees are extracted
from the Supertree file, with names added from the OpenTreeTaxonomy file. Each newick tree is based on a
OpenTree Taxonomy number taken from within an input .PHY files.

INPUT FILE FORMAT. The input phy files should contain one or more node names in the 
OneZoom @include format - essentially a taxon name followed by the '@' sign. Formally,
the include format consists of a scientific name followed by '_ott' followed a numeric
specifier, including an OTT number, and terminated by '@': a simple example is the
string `Brachiopoda_ott826261@` will be replaced with that part of the OpenTree based at
the node with ott 826261. More complex numeric specifiers are allowed, consisting of
numbers separated by a tilde and (optionally) minus signs these allow parts of the tree
to be excluded. While `foobar_ott123@` means create a node named foobar_ott123 consisting
of all descendants of the node with ott ID 123 in the opentree, the string
`foobar_ott123~456-789-111@` means "create a tree with a root node named `foobar_ott123`,
using ott456 minus the descendant subtrees 789 and 111" (think of the tilde sign as an
equals sign, used because Dendropy doesn't like equals signs in taxon names). The
shorthand `foobar_ott123~-789-111@` can be used instead of `foobar_ott123~123-789-111@`.
If a tilde is provided, the initial OTT can be omitted, so that `foobar_ott~456-789-111@`
creates a node named foobar without any OTT number, using ott456 minus the descendant
subtrees 789 and 111. Note that the include format is not escaped in the input file.

This script parses the created trees, adding names to them and also adding "extinction
nodes" to species marked as `extinct` or `extinct_inherited`. An extinction node (or
extinction prop) is where a focal node has a child named `†` (the dagger sign), with an
optional branch length, indicating the extinction date of the focal node (in an 
ultrametric tree, the child node † exists at the current time: the branch length
therefore pushes the parent node back in time by the specified amount, taken to be in
units of millions of years). These extinction nodes are removed later by the OneZoom
parsing software. For example, the dodo, Raphus cuculatus, or Raphus_cucullatus_ott455686
in the OpenTree, which went extinct about 400 years ago, would be output as 
`(†:0.0004)Raphus_cucullatus_ott455686`, or `(†)Raphus_cucullatus_ott455686` if the
extinction date was unknown.

Note that this script does not piece together the extracted trees, but simply outputs
a set of inclusion commands that can be used to piece the trees together.
"""
import csvreader
import collections

Taxon = collections.namedtuple('Taxon', 'scientific_name is_extinct')


def getTaxonNameMap(filename, supplementary_filename=None):
    '''
    Place the names of the taxa in the taxonomy file into a dictionary keyed by OTT id
    
    '''
    taxa = {}
    with open(filename, 'rt') as taxon_file:
        reader = csv.DictReader(taxon_file, delimiter='\t')
        for row in reader:
            taxa[int(row['uid'])] = Taxon(row['name'], 'extinct' in row['flags'])

    if supplementary_filename is None
        return taxon_map
        
    with open(supplementary_filename, 'rt') as taxon_file:
        reader = csv.DictReader(taxon_file, delimiter='\t')
        for row in reader:
            uid = int(row['uid'])
            check_in_main_file = 'missing' not in row['info']
            if check_in_main_file:
                if uid not in taxa or taxa[uid].scientific_name != row['name']:
                    logging.warning(
                        "The taxon {} in the supplementary taxonomy file ({}) does not "
                        "match a taxon of the same name in the main taxonomy file ({})"
                        .format(row['name'], supplementary_filename, filename))

    return taxon_map

def getOpenTreesFromOneZoom(
    OpenTreeFile, OpenTreeTaxonomy, output_dir, include_var, phy_files, verbose=False):
    '''Python routine to get OToL subtrees from phy files. If include_var is a number, 
    treat it as a recursion depth, otherwise a dictionary of names to keep. 
    The parameter phy_files should be an iterable list of .phy or .PHY filenames'''


    taxon_map = getTaxonNames(args.OpenTreeTaxonomy)
    

if __name__ == "__main__":
    import argparse
    import time
    parser = argparse.ArgumentParser(description='Create subtrees from the Open Tree of Life, on the basis of ott numbers in a set of newick files.')
    parser.add_argument('--verbose', '-v', action="store_true", help='verbose: output extra non-essential info')
    parser.add_argument('--supplementary_taxonomy', help='A supplementary taxonomy file')
    parser.add_argument('OpenTreeFile', help='Path to the Open Tree file: a large Newick file with OTT numbers (usually called "labelled_supertree.tre").')
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