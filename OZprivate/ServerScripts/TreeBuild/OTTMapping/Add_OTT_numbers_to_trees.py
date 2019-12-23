#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>

This script looks through the leaves of multiple newick trees and replaces the taxa with matches from the Open Tree of Life
using their name resolution API (https://github.com/OpenTreeOfLife/opentree/wiki/Open-Tree-of-Life-APIs#match_names)

cd applications/OneZoom/OZ_private/YanTree/BespokeTree/include_noAutoOTT
../../../../ServerScripts/TreeBuild/OTTMapping/Add_OTT_numbers_to_trees.py --savein ../include_OTT2.9 *.phy *.PHY

#or a more sophisticated list of only crowdfunding files to process, using just the @ included files in a tree.js file, plus the Passerine, Porifera, and Amphibian OZ tree
cd OZ_yan/user/include_noAutoOTT
perl -ne 'print if s|(^\$tree.*include_files/([^/\.]*\.phy).*)|$2|i' ../ATlife_selected_tree.js | xargs ../../../server_scripts/Add_OTT_numbers_to_trees.py  --savein ../include_OTT2.9 PasserinesOneZoom.phy PoriferaOneZoom.phy AmphibiansOneZoom.phy > ../include_OTT2.9/ottmatches

"""
import json
from dendropy import Tree
import urllib
import re
import sys
import os
from itertools import islice
import argparse

parser = argparse.ArgumentParser(description='Read newick files and append OpenTree Taxonomy IDs to the taxa in the style of OToL (e.g. Homo_sapiens becomes Homo_sapiens_ott770315). If --savein dir is given, save a set of equivalent newick files with appended OTT numbers in "dir", and create a symlink to that directory in the parent dir')
parser.add_argument('--savein', help="Store replacement newick files in this dir. Without this flag, the script is simply run to produce stats/warnings")
parser.add_argument('--output_info', default="info_about_matches.txt", help="file in --savein to save info about matches. If no --savein, print to stdout")
parser.add_argument('--symlink', default="include_files", help="If --savein is a dir, also create a symlink to the new dir in its parent dir (requires permission to create symlinks in windows)")
parser.add_argument('--leavesonly', action="store_true", help="Only add ott numbers to leaves on the trees, not to internal nodes")
parser.add_argument('newick_files', nargs=argparse.REMAINDER)

args = parser.parse_args()
outinfo = sys.stdout
if args.savein:
    if not os.path.isdir(args.savein):
        try:
            os.makedirs(args.savein)
        except IOError as e:
            print("Could not create dir to save files {}: I/O error({}): {}".format(args.savein, e.errno, e.strerror), file=sys.stderr)
    if args.output_info and args.output_info != '':
        outinfo = open(os.path.join(args.savein, args.output_info), mode='w')



unambiguous = 0
synonyms = 0
unidentified = 0

def lookup_OTT(name_node_dict, context):
    '''This should process a dictionary of name:<Dendropy_node> items in batches looking up the
    name in OTT and appending _ottNODENUM to the label for that node. Assumes all nodes have labels, not taxa'''
    batch_size = 995
    global unambiguous
    global synonyms
    global unidentified
    it = iter(name_node_dict)
    for s in (islice(name_node_dict, pos, pos + batch_size) for pos in range(0, len(name_node_dict), batch_size)):
        #print("Next batch includes {}".format([l.label for l in batch][s][:5]))
        params = json.dumps({'context_name':context, 'do_approximate_matching': False,
                            'names': [l for l in s]}).encode('utf8')
        req = urllib.request.Request("https://api.opentreeoflife.org/v3/tnrs/match_names", data=params,
                         headers={'content-type': 'application/json'})
        try:
            response = urllib.request.urlopen(req)
        except:
            print("Problem with getting {}".format(req))
            raise
        response_string = response.read().decode('utf8')
        OToLdata=json.loads(response_string)
        unambiguous += len(OToLdata["unambiguous_names"])
        unidentified += len(OToLdata["unmatched_names"])
        synonyms += (len(OToLdata["matched_names"])-len(OToLdata["unambiguous_names"]))
        print(" {} names matched unambigously, first 10 are {}".format(len(OToLdata["unambiguous_names"]),OToLdata["unambiguous_names"][:10]), file=outinfo)
        print(" ++> {} ambiguous taxa in one batch from {}: {}".format(len(OToLdata["matched_names"])-len(OToLdata["unambiguous_names"]),f,[name for name in OToLdata["matched_names"] if name not in OToLdata["unambiguous_names"]]), file=outinfo)
        print(" ==> {} unmatched taxa in one batch from {}: {}".format(len(OToLdata["unmatched_names"]),f,OToLdata["unmatched_names"]), file=outinfo)
        #print({k:v for (k,v) in OToLdata.items() if k.startswith('includes')}, file=sys.stderr) #sanity check
        multiples = [r['name'] for r in OToLdata['results'] if r['matches'] and len(r['matches'])>1]
        if len(multiples):
            print(" !!> {} taxa from {} have multiple matches (some may be synonyms): {}".format(len(multiples),f,multiples), file=outinfo)
        results = {}
        for res in OToLdata['results']:
            orig = [m["taxon"]["ott_id"] for m in res['matches'] if not m['is_synonym']]
            syno = [m["taxon"]["ott_id"] for m in res['matches'] if m['is_synonym']]
            if res['name'] in OToLdata['unambiguous_names']:
                if len(orig) == 1:
                    results[res['name']]=orig[0]
                elif len(orig) > 1:
                    print("WARNING: more than one non-synonym for unambiguous taxon {}".format(res['name']), file=outinfo)
                else:
                    print("WARNING: something's wrong for {}: no non-synonyms for unambiguous taxon".format(res['name']), file=outinfo)
            else:
                if len(orig) == 1:
                    print("WARNING: something's wrong for {}: listed as ambiguous but has single non-synonymous result".format(res['name']), file=outinfo)
                    results[res['name']]=orig[0]
                elif len(orig) > 1:
                    print("WARNING: more than one non-synonym for ambiguous taxon {}: none taken".format(res['name']), file=outinfo)
                else:
                    #no orig hits
                    if len(syno) == 1:
                        results[res['name']]=syno[0]
                    elif len(syno) > 1:
                        print("WARNING: more than one synonym for ambiguous taxon {}: none taken".format(res['name']), file=outinfo)
                    else:
                        print("WARNING: no hits for taxon {}".format(res['name']), file=outinfo)

        for k in results.keys():
            #replace the names - these should by now not contain any '_ottXXX' strings.
            name_node_dict[k].label = name_node_dict[k].label + "_ott" + str(results[k])
    
    
OTTre = re.compile(r'(_ott\d+|_mrcaott\d+ott\d+)(@\d*)?$')
context_re = re.compile(r'context=(\w+)\s*]')
sp_re = re.compile(r'[\s_]+sp\.?\s*$')
omit = re.compile(r'_$'); #by OneZoom convention, we ignore any names ending in space or underscore
for f in args.newick_files:
    context_name = "All life"
    with open(f,'r', encoding='utf-8') as treefile:
        treestr = treefile.read()
        treestart = treestr.find(']')
        if treestart == -1:
            treestart = 0
        treestart = treestr.find('(',treestart)
        if treestart == -1:
            print("No tree in file {}".format(f), file=sys.stderr)
            continue
        startstr = treestr[:treestart]
        m = context_re.search(startstr)
        if m:
            context_name = m.group(1)
        try:
            tree = Tree.get(
                data=treestr[treestart:], schema="newick", suppress_leaf_node_taxa=True,
                terminating_semicolon_required=False, preserve_underscores=True,
                rooting='default-rooted')
        except:
            print("WARNING: error reading tree '{}'".format(f))
            raise
        #check for polytomies
        for nd in tree.postorder_internal_node_iter():
            if len(nd._child_nodes) != 2:
                if len(nd._child_nodes)==1:
                    print(
                        "WARNING: in {} there is a unary node ({}) which may be removed"
                        " later".format(f, nd.label or "<unnamed>"), file=sys.stderr)
                else:
                    print(
                        "WARNING: in {} there is a node ({}) with {} child nodes: this"
                        " may be resolved in random order later"
                        .format(f, nd.label or "<unnamed>", len(nd._child_nodes)),
                        file=sys.stderr)
                
        #These are cases where v5 of the OpenTree incorrectly gives them the same number
        # as another species
        OTT_wrong_synonyms =[
            'Geochelone_nigra_ephippium', 'Geochelone_nigra_guntheri',
            'Geochelone_nigra_vandenburghi', 'Geochelone_nigra_microphyes',
            'Pachyptila_crassirostris', 'Ducula_spilorrhoa','Ducula_luctuosa',
            'Ducula_subflavescens', 'Lophura_hoogerwerfi', 'Acomys_airensis',
            'Alouatta_nigerrima', 'Myotis_occultus']
        #these are cases where OneZoom probably has an incorrect species (OpenTree has
        # them as a synonym of something else) but I can't be bothered to correct the OZ tree
        OZ_spurious_spp = ['Cyclemys_orbiculata','Cyclemys_ovata']
        ignore = OTT_wrong_synonyms + OZ_spurious_spp
                
        if args.leavesonly:
            check = set(tree.leaf_node_iter(lambda n: n.label is not None and n.label not in ignore))
        else:
            check = set(tree.postorder_node_iter(lambda n: n.label is not None and n.label not in ignore))
            
        to_change = {n for n in check if n.label and '@' not in n.label and OTTre.search(n.label) is None and sp_re.search(n.label) is None and omit.search(n.label) is None}
        print("Parsed {}, looking up {} names out of {} (omitted {})".format(f, len(to_change), len(check), [n.label for n in check-to_change]), file=outinfo)

        
        replacement_species = {'Anas_andium':'Anas_flavirostris_andium', 'Hylobates_abbotti':'Hylobates_muelleri_abbotti', 'Hylobates_funereus':'Hylobates_muelleri_funereus', 'Galago_zanzibaricus':'Galagoides_zanzibaricus', 'Avahi_ramanantsoavani':'Avahi_ramanantsoavanai','Galeopterus_peninsulae':'Galeopterus_variegatus_peninsulae'}
        OTT_mistakes = {'Ateles_chamek':'Ateles_belzebuth_chamek', 'Eulemur_collaris':'Eulemur_fulvus_collaris', 'Alouatta_macconnelli':'Alouatta_seniculus_macconnelli', 'Cebus_robustus':'Cebus_nigritus_robustus','Aotus_infulatus':'Aotus_azarai_infulatus'}
        replacement_species.update(OTT_mistakes)
        replacement_species = {replacement_species[n.label].replace("_", " "):n for n in to_change if n.label in replacement_species}

        remainder = to_change - set(replacement_species.values())

        if len(replacement_species):
            lookup_OTT(replacement_species, context_name)

        if len(remainder):
            names = [(n.label).replace("_", " ") for n in remainder]
            lookup_OTT(dict(zip(names, remainder)), context_name)
        
        if args.savein:
            try:
                write_filename = os.path.join(args.savein,os.path.basename(f))
                try:
                    os.remove(write_filename) #remove the file beforehand if it exists (needed on OS X in case case sensitivity has changed)
                except OSError:
                    pass
                with open(write_filename,'w', encoding='utf-8') as newtreefile:
                    #override the normal node label writer to allow + and - signs to be unquoted
                    print(startstr + tree.as_string(schema="newick", suppress_leaf_node_labels=False, unquoted_underscores=True, suppress_rooting=True), file=newtreefile)
            except IOError as e:
                print("Could not save files in {} I/O error({}): {}".format(args.savein, e.errno, e.strerror), file=sys.stderr)
tot = unambiguous + synonyms + unidentified or float('NaN')

if args.symlink and os.path.isdir(os.path.dirname(args.savein)):
    #save a symlink
    symlink = os.path.join(os.path.dirname(args.savein), args.symlink)
    print("Creating symlink from '{}' to '{}'".format(symlink,os.path.basename(args.savein)), file=sys.stderr)
    if os.path.islink(symlink):
        os.unlink(symlink)
    try:
        os.symlink(os.path.basename(args.savein),symlink)
    except:
        print("Could not create symlink at {}. If you are running windows, you will need to give yourself permission to create symlinks (see https://superuser.com/questions/104845/permission-to-make-symbolic-links-in-windows-7)".format(symlink))
for f in (outinfo, sys.stderr):
    print("Over all input files, {}% names were precisely matched, {}% matched via synonyms, and {}% have no match".format(unambiguous/tot*100, synonyms/tot*100, unidentified/tot*100), file=f)
