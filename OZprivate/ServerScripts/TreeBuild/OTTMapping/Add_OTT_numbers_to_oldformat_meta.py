#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""This script looks through an OZ metadata file and adds OTT ids,
using their name resolution API (https://github.com/OpenTreeOfLife/opentree/wiki/Open-Tree-of-Life-APIs#match_names)

server_scripts/Add_OTT_numbers_to_meta.py OZ_yan/user/ATlife_selected_meta_NOautoOTT.js tmp.js --context Animals -i | less

"""
import json
import urllib.request
import re
import sys
import os
from itertools import islice
import argparse

parser = argparse.ArgumentParser(description="Read metadata files and print back out with OpenTree Taxonomy IDs appended to the taxa (if they don't have them) in the style of OToL (e.g. Homo_sapiens becomes Homo_sapiens_ott770315).")
parser.add_argument('metadata_infile', type=argparse.FileType('r'), default=sys.stdin, help="A js metadata file in Yan's new format, e.g. ATlife_selected_meta.js")
parser.add_argument('metadata_outfile', type=argparse.FileType('w'), default=sys.stdout, help="A file to output js metadata in Yan's new format. if stdout, warnings are diverted to stderr.")
parser.add_argument('--context', default="All life", help="A taxonomic context, e.g. see https://github.com/OpenTreeOfLife/opentree/wiki/Open-Tree-of-Life-APIs#contexts")
parser.add_argument('--add_info', '-i', action="store_true", help="Add a comment line at the top about how the file was produced")

args = parser.parse_args()
if args.metadata_outfile == sys.stdout:
    warn_out = sys.stderr
else:
    warn_out = sys.stdout


unambiguous = 0
synonyms = 0
unidentified = 0

def spp_replace(name):
    replacement_species = {'Anas_andium':'Anas_flavirostris_andium', 'Hylobates_abbotti':'Hylobates_muelleri_abbotti', 'Hylobates_funereus':'Hylobates_muelleri_funereus', 'Hylobates_muelleri':'Hylobates_muelleri_muelleri', 'Galago_zanzibaricus':'Galagoides_zanzibaricus', 'Avahi_ramanantsoavani':'Avahi_ramanantsoavanai','Galeopterus_peninsulae':'Galeopterus_variegatus_peninsulae'}
    OTT_mistakes = {'Aotus_azarae':'Aotus_azarai','Galagoides_demidovii':'Galagoides_demidoff', 'Ateles_chamek':'Ateles_belzebuth_chamek', 'Eulemur_collaris':'Eulemur_fulvus_collaris', 'Alouatta_macconnelli':'Alouatta_seniculus_macconnelli', 'Lepilemur_tymerlachsoni':'Lepilemur_tymerlachsonorum','Cebus_robustus':'Cebus_nigritus_robustus','Aotus_infulatus':'Aotus_azarai_infulatus'}
    if (name in replacement_species):
        return replacement_species[name]
    if (name in OTT_mistakes):
        return OTT_mistakes[name]
    return name


def print_OTT_lines(file_obj, context_name):
    '''This should process a set of metadata lines in batches looking up the
    name in OTT and appending _ottNODENUM to the label for that line.'''
    batch_size = 995 #number of lines in batch
    
    nameRE = re.compile(r'^\s*"([^"]+)') #assume names to match are each on new line and in double quotes
    OTTre = re.compile(r'_ott\d+$')
    excludeRE = re.compile(r'^Clade\d+_$')
    global unambiguous
    global synonyms
    global unidentified
    while True:
        next_n_lines = list(islice(file_obj, batch_size))
        if not next_n_lines:
            break
        #print("Next batch includes {}".format([l.label for l in batch][s][:5]))
        matches = [nameRE.search(l) for l in next_n_lines]
        line_ids = {str(idx): mch.group(1) for idx, mch in enumerate(matches) if (mch and not OTTre.search(mch.group(1)) and not excludeRE.search(mch.group(1)))}
        results = {}
        if len(line_ids):
            params = json.dumps({'context_name':context_name, 'do_approximate_matching': False,
                                'names': [spp_replace(l).replace('_',' ') for l in line_ids.values()], 'ids':[str(l) for l in line_ids.keys()]}).encode('utf8')
            req = urllib.request.Request("https://api.opentreeoflife.org/v2/tnrs/match_names", data=params,
                             headers={'content-type': 'application/json'})
            response = urllib.request.urlopen(req)
            response_string = response.read().decode('utf8')
            OToLdata=json.loads(response_string)
            unambiguous += len(OToLdata["unambiguous_name_ids"])
            unidentified += len(OToLdata["unmatched_name_ids"])
            synonyms += (len(OToLdata["matched_name_ids"])-len(OToLdata["unambiguous_name_ids"]))
            print(" {} names matched unambigously, first 10 are {}".format(len(OToLdata["unambiguous_name_ids"]),[line_ids[id] for id in OToLdata["unambiguous_name_ids"][:10]]), file=warn_out)
            print(" ++> {} ambiguous taxa in one batch: {}".format(len(OToLdata["matched_name_ids"])-len(OToLdata["unambiguous_name_ids"]),[line_ids[id] for id in OToLdata["matched_name_ids"] if id not in OToLdata["unambiguous_name_ids"]]), file=warn_out)
            print(" ==> {} unmatched taxa in one batch: {}".format(len(OToLdata["unmatched_name_ids"]),[line_ids[id] for id in OToLdata["unmatched_name_ids"]]), file=warn_out)
            #print({k:v for (k,v) in OToLdata.items() if k.startswith('includes')}) #sanity check
            multiples = [r['id'] for r in OToLdata['results'] if r['matches'] and len(r['matches'])>1]
            if len(multiples):
                print(" !!> {} taxa have multiple matches (some may be synonyms): {}".format(len(multiples),[line_ids[id] for id in multiples]), file=warn_out)
            for res in OToLdata['results']:
                orig = [m["ot:ottId"] for m in res['matches'] if not m['is_synonym']]
                syno = [m["ot:ottId"] for m in res['matches'] if m['is_synonym']]
                if res['id'] in OToLdata['unambiguous_name_ids']:
                    if len(orig) == 1:
                        results[res['id']]=orig[0]
                    elif len(orig) > 1:
                        print("WARNING: more than one non-synonym for unambiguous taxon {}".format(line_ids[res['id']]), file=warn_out)
                    else:
                        print("WARNING: something's wrong for {}: no non-synonyms for unambiguous taxon".format(line_ids[res['id']]), file=warn_out)
                else:
                    if len(orig) == 1:
                        print("WARNING: something's wrong for {}: listed as ambiguous but has single non-synonymous result".format(line_ids[res['id']]), file=warn_out)
                        results[res['id']]=orig[0]
                    elif len(orig) > 1:
                        print("WARNING: more than one non-synonym for ambiguous taxon {}: none taken".format(line_ids[res['id']]), file=warn_out)
                    else:
                        #no orig hits
                        if len(syno) == 1:
                            results[res['id']]=syno[0]
                        elif len(syno) > 1:
                            print("WARNING: more than one synonym for ambiguous taxon {}: none taken".format(line_ids[res['id']]), file=warn_out)
                        else:
                            print("WARNING: no hits for taxon {}".format(line_ids[res['id']]), file=warn_out)

        for id in range(len(next_n_lines)):
            if str(id) in results:
                print(nameRE.sub(r'\g<0>'+'_ott'+str(results[str(id)]), next_n_lines[id]),end='', file=args.metadata_outfile)
            else:
                print(next_n_lines[id],end='', file=args.metadata_outfile)
            #replace the names - these should by now not contain any '_ottXXX' strings.

if args.add_info:
    print("// This file created from {} by {}".format(args.metadata_infile.name, " ".join(sys.argv[:])), file=args.metadata_outfile)
print_OTT_lines(args.metadata_infile, args.context)

tot = unambiguous + synonyms + unidentified or float('NaN')
print("In the whole file {}% names were precisely matched, {}% matched via synonyms, and {}% have no match".format(unambiguous/tot*100, synonyms/tot*100, unidentified/tot*100), file=warn_out)
