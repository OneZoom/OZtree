#!/usr/bin/env python3
"""
Routines for mapping OpenTree Taxonomy identifiers to wikidata/pedia, and 
then calculating popularity indices from them.

Most of these routines can be called from other files: running this file as the main
python script will save popularity measures to a csv file. If you want to output phylogenetic 
popularity measures, based on ancestors and descendants in a tree, you must specify an 
--OpenTreeFile. Otherwise, the script will produce a csv output with basic popularity measures
which can be run through calc_phylogenetic_popularity.py to output phylogenetic (ancestor / 
descendant summmed) popularities separately. This allows quick recalculation of popularities 
(NB: 'ancestor' popularities include the popularity of self)

The routines work by taking an OpenTree taxonomy file and map each line to wikidata Qid using source ids

    each source id is stored in a object, e.g. {'id':NCBIid}, to which we add wiki info such as the qID
    {'id':NCBIid, wd:{'Q':Qid}}
    
    the object is pointed to from two sources, a source_data 2D array and an OTT_ids array, e.g.
    
    source_ptrs['ncbi'][NCBIid] -> {'id':NCBIid} <- OTT_ptrs[OTTid]['sources']['ncbi']
    source_ptrs['worms'][WORMSid] -> {'id':WORMSid} <- OTT_ptrs[OTTid]['sources']['worms']
    
    this allows us to add wiki info to the object
    which can then be seen from the OTT_ids reference, i.e.    

    source_ptrs['ncbi'][NCBIid] -> {'id':NCBIid, 'wd':{'Q':Qid1, 'p':['en','fr'], 'iucn':IUCNid}} <- OTT_ptrs[OTTid]['sources']['ncbi']
    source_ptrs['worms'][WORMSid] -> {'id':WORMSid, 'wd':{'Q':Qid2}} <- OTT_ptrs[OTTid]['sources']['worms']

    where 'p' gives the sitelinks into the different language wikipedias

    We also create a wikipedia_title array of pointers into the same dataset
    
    enwikipedia_ptrs[enwiki_title] -> {'Q':Qid1}
    
    so that we can add e.g. page sizes & visits

== Wikidata parsing ==

Wikidata dump has one line per item or property, and there are millions of items ('type':'item') in the dump.
We are only interested in taxon items (and possibly common names that point to taxon items)

=== Taxon items ===
These must contain the strings Q16521, Q310890, Q23038290, or Q713623, since all taxon 
items have property P31 ('instance of') set to taxon (Q16521) or a subclass of 'taxon': monotypic taxon (Q310890),
fossil taxon (Q23038290), clade (Q713623), or similar see 
https://www.wikidata.org/wiki/Wikidata:WikiProject_Taxonomy/Tutorial#Basic_properties, and all the subclasses of
taxon at http://bit.ly/2m1717d). These taxon items should be in the following format e.g. 
==== Example ====
for Gorilla (Q36611) (simplified from the output via https://www.wikidata.org/wiki/Special:EntityData/Q737838.json
 or using `gzcat wikidata-20151005-all.json.gz | grep -A 200 '"id": "Q737838"'`, with linebreaks added) 

{"type":"item","id":"Q36611","labels":{"pl":{"language":"pl","value":"goryl"},"en":{"language":"en","value":"Gorilla"}...},
  "claims":{
    "P31":[
      {"mainsnak": {"datatype": "wikibase-item","datavalue":{"type": "wikibase-entityid","value":{"entity-type":"item","numeric-id":16521}},"property":"P31","snaktype":"value"},"rank":"normal","type":"statement"}],
    "P685":[
      {"mainsnak": {"datatype": "string","datavalue":{"type":"string","value":"9592"},"property": "P685","snaktype":"value"},"rank": "normal"}],
    ...},
  "sitelinks":{
    "arwiki":{"badges":[],"site":"arwiki","title":"\u063a\u0648\u0631\u064a\u0644\u0627"},
    "enwiki": {"badges":[],"site":"enwiki","title": "Gorilla"},...},...}

=== Common name items ===
Common name items must contain the string Q502895, since all these have property P31 ('instance of') set to 
common name (Q502895) of (P642) [Taxon item]

==== Example ====
for Snake (Q2102) which points to the taxon page 'Serpentes' (Q29540038)
{"type": "item","id":"Q2102","labels":{ "en": { "language": "en", "value": "snake" }, "sv": { "language": "sv", "value": "Ormar" }},
  "claims":{"P31":[
    {"mainsnak":{
      "snaktype": "value","property":"P31","datavalue":{"value": { "entity-type": "item", "numeric-id": 502895, "id": "Q502895" }, "type": "wikibase-entityid"},"datatype":"wikibase-item"},
      "type":"statement",
      "qualifiers":{"P642":[{
        "snaktype": "value",
        "property": "P642",
        "hash": "2fde8becf289ba42ea01b3adfa2dfd4da65ba561",
        "datavalue": { "value": { "entity-type": "item", "numeric-id": 29540038, "id": "Q29540038" }, "type": "wikibase-entityid" },
        "datatype": "wikibase-item" }]},
      ...}]
    },
  "sitelinks":{
    "dewiki":{"site":"dewiki","title": "Schlangen", "badges":[],"url": "https://de.wikipedia.org/wiki/Schlangen"},
    "enwiki": { "site": "enwiki", "title": "Snake", "badges": [], "url": "https://en.wikipedia.org/wiki/Snake"}},
    ...}

=== Issues ===

A good example of problematic issues is Gazella/gazelle. The English word "gazelle" applies to a number of antelope species, not all of which are in the genus Gazella. The genus Gazella is present in WD at [[Q190858]], and the concept of a gazelle at [[Q29001815]]. The gazelle item is (correctly) stated as an instance of a common name of Gazella, Eudorcas, Nanger, and Antilopini. But there is no english wikipedia item for Gazella (the genus), only for gazelles (the vernacular).

== Running the script ==

You can run this script to produce a raw output file using something like

ServerScripts/TaxonMappingAndPopularity/OTT_popularity_mapping.py \
    data/OpenTree/ott/taxonomy.tsv \
    data/Wiki/wd_JSON/*.bz2 \
    data/Wiki/wp_SQL/*.gz \
    data/Wiki/wp_pagecounts/*.bz2 \
    -o data/output_files/raw_pop -v > ServerScripts/TaxonMappingAndPopularity/ottmap.log
    
To get e.g. only the species in the current OpenTree, this raw_pop can be filtered by first collecting a list of the 
OTT ids of interest, e.g.

grep -o "\d\+" opentree7.0_tree/labelled_supertree/labelled_supertree.tre | sort | uniq > tree_taxa
grep "|\s*species\s*|" ott/taxonomy.tsv | cut -f 1 | sort > ot_species
comm -12 tree_taxa ot_species > tree_species
grep ",\d" raw_pop | cut -f 1 -d, | sort > wiki_taxa

#the number of wiki : total taxa
wc -l raw_pop wiki_taxa # 1492679/3452152 = 43%

#the number of wiki : total taxa for those only in tree_species
perl -e 'open(F1, "<tree_taxa");open(F2, "<raw_pop"); %foo = map {$_ => 1} <F1>; while(<F2>) {print if(exists($foo{(split(/,/,$_,2))[0]."\n"}));};' > raw_species
grep ",\d" raw_species | cut -f 1 -d, | sort > wiki_species
wc -l raw_species wiki_species # 1429835/2335500 = 43%

##Note: a few organisms like Dog and Cat do not have the wikipedia pages linked from the taxon item, but 
##from another more generic page. For example, Canis lupus familiaris (Q26972265) is not linked to 
##the 'dog' wikipedia items. Instead, these are linked from Q144 (dog) which is an 
##"instance of (P31) common name (Q502895) of (P642) Canis lupus familiaris (Q26972265)"
##we can find these (very few) examples by the wikidata query at http://tinyurl.com/y7a95upp
"""

import sys
import csv
import re
import gzip
import bz2
import os
import json

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''


def memory_usage_resource():
    import resource
    rusage_denom = 1024.
    if sys.platform == 'darwin':
        # ... it seems that in OSX the output is different units ...
        # perhaps update to try psutils instead
        rusage_denom = rusage_denom * rusage_denom
    mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / rusage_denom
    return mem

def create_from_taxonomy(OTTtaxonomy_file, sources, OTT_ptrs, verbosity=0, extra_taxonomy_file=None):
    '''
    Creates object data and a source_ptrs array pointing to elements within it.
    Also fills out the OTT_ptrs array to point to the right place.
    OTT_ptrs can be partially filled: new OTT numbers are simply appended OTT id in the taxonomy.
    
    src ids are strings, not ints, since some may contain characters
    
    "extra_taxonomy_map" allows us to inject mappings that are missing from the OpenTree
    e.g.
    
    
    '''
    unused_sources = set()
    source_ptrs = {s:{} for s in sources}
    
    #hack for NCBI_via_silva (see https://groups.google.com/d/msg/opentreeoflife/L2x3Ond16c4/CVp6msiiCgAJ)
    silva_regexp = re.compile(r'ncbi:(\d+),silva:([^,$]+)')
    silva_sub = r'ncbi_silva:\1'  #keep the ncbi_id as ncbi_silva, but chop off the silva ID since it is not used in wikidata/EoL
    
    data_files = [OTTtaxonomy_file]
    if extra_taxonomy_file is not None:
        try:
            data_files.append(open(extra_taxonomy_file, "r"))
        except FileNotFoundError:
            print(" Extra taxonomy file '{}' not found, so ignored".format(extra_taxonomy_file), file=sys.stderr)
        
    for f in data_files:
        reader = csv.DictReader(f, delimiter='\t')
        used = 0
        for OTTrow in reader:
            if ((reader.line_num-2) % 1000000 == 0) and verbosity: #first 2 lines are header & blank in taxonomy.tsv
                print("Reading taxonomy file {}: {} rows read, {} identifiers used,  mem usage {:.1f} Mb".format(f.name, reader.line_num-2, used, memory_usage_resource()), file=sys.stderr)
            try:
                OTTid = int(OTTrow['uid'])
            except ValueError:
                OTTid = OTTrow['uid']
                print(" Found an ott 'number' which is not an integer: {}".format(OTTid), file=sys.stderr)
                
            sourceinfo = silva_regexp.sub(silva_sub,OTTrow['sourceinfo'])
            ncbi = False
            for str in reversed(sourceinfo.split(",")): #look at sources in reverse order, overwriting, so that first ones take priority
                src, id = str.split(':',1)
                if (src=="ncbi"):
                    ncbi = True
                elif (src=="ncbi_silva") and (not ncbi):
                    src = "ncbi" #only use the ncbi_via_silva id if no 'normal' ncbi already set
                if src not in source_ptrs:
                    if src not in unused_sources and verbosity:
                        print(" New and unused source: {} (e.g. '{}')".format(src, str), file=sys.stderr)
                    unused_sources.update([src]);
                    continue;
                used += 1;
                source_ptrs[src][id]={'id':id}
                try:
                    if OTTid < 0:
                        print(" Skipping source ID matching for negative ott ({}) representing unlabelled node: {}".format(OTTid, OTTrow['name']))
                        continue
                except TypeError:
                    pass
                if OTTid not in OTT_ptrs:
                    OTT_ptrs[OTTid]={'sources':{}}
                OTT_ptrs[OTTid]['sources'][src]=source_ptrs[src][id]
    return source_ptrs

def taxon_name(json, lang='en'):
    try:
        name = "'{}'".format(json['labels'][lang]['value'])
        return(name)
    except LookupError:
        return("no name for lang = {}".format(lang))

def wikidata_value(json_item):
    """
    used to get the value out of a wd parsed object, so we can use it without errors in a list comprehension
    """
    try:
        return json_item["datavalue"]["value"]
    except (KeyError, TypeError):
        return {}

def wikidata_makebaseinfo(json_item, wikilang=''):
    """
    Return a basic item of the form {'Q':XXX, 'l':{'fr':1,'en':'title'}} etc
    """
    basic_item = {'Q':int(json_item['id'].replace("Q","",1)), 'l':{}}
    for sitelink, data in json_item['sitelinks'].items():
      if sitelink.endswith('wiki'):
        #this is a wikipedia link (to save memory, only save the title for the specified lang)
        lang = sitelink[:-4]
        #canonical form has underscores not spaces
        basic_item['l'][lang] = data["title"].replace(" ", "_") if lang==wikilang else 1
    return basic_item

def add_wikidata_info(source_ptrs, wikidata_json_dump_file, wikilang, verbosity=0, 
    EOLid_property_id='P830', 
    IUCNid_property_id=['P141','P627'], 
    IPNIid_property_id='P961',
    wikidata_Q_exceptions={
        'Q144':['Q26972265','Q20717272'], #dog (Q144) -> Q20717272 (Canis familiaris) & Q26972265 (Canis lupus familiaris *)
        'Q146':['Q20980826'], #cat
        'Q830':['Q46889','Q20747320','Q20747334','Q20747712','Q20747726'], #cow
        'Q5':['Q3238275','Q15978631'], #human
        'Q726':['Q10758650','Q26644764'], #horse
        }): #
    """
    Maps the name in taxonomy.tsv to the property ID in wikidata (e.g. 'ncbi' in OTT, P685 in wikidata. Note that wikidata does not have 'silva' and 'irmng' types)
    Also save a list of wikipedia sitelinks, but only as comman-delimited presence/absence data, e.g. if there is an enwiki & frwiki entry, save sitelinks='en,fr'
    However, if a wikilang is present, also store the wikipedia page title for this particular language. Note that this could be unicode, e.g. 'Günther's dwarf burrowing skink', 'Gölçük toothcarp', 'Galium × pomeranicum'. We replace underscores with spaces so that they matching against page size & page counts (views)
       
    If an EOLid_property_id, IUCN id, or IPNI id exists, save these too (NB: the IUCN id is present as Property:P627 of claim P141. It may also be overwritten by an ID subsequently extracted from the EOL identifiers list)
    
    Some taxa (especially common ones) have most sitelinks in a 'common name' item, e.g. cattle (Q830) contains most language sitelinks for the taxon items Q46889 (Bos primigenius indicus), Q20747320 (Bos primigenius taurus), Q20747334 (Bos taurus *+), Q20747712, Q20747726, etc. (* marks the name used in OneZoom, + for OpenTree). These 'common name' pages point to the taxon by having a property P31 ('instance of') set to 
common name (Q502895) of (P642) (locate them at http://tinyurl.com/y7a95upp).

    Additionally, taxa like Homo sapiens might have *two* wikipedia pages, https://en.wikipedia.org/wiki/Homo_sapiens and https://en.wikipedia.org/wiki/Human. I code around these by hand (yuck).
    
    For each taxon line in the dump, we store the relevant information in a dict which contains the Qid and identifiers for EoL, IPNI, and IUCN, and an array of languages in the 'l' field e.g.
    wikidata_taxon_info[Qid] = {'Q':Qid, 'l':['en','fr'], 'EoL':EoLid, 'IUCN': IUCNid, 'IPNI':IPNIid}
    
    We map it to NCBI etc identifiers using the function JSON_contains_known_dbID(), and if the mapping is successful (i.e. we may be using this taxon), we store it in wikidata_taxon_info[Qid]
    
    We also store the few common-name wikidata pages in a separate variable, wikidata_cname_info. Then, if the equivalent taxon exists, and it has no `wikilang`.wikipedia.org sitelink (or is a special case), we set 'Q' and 'l' to the new

    1) dog (Q144) common name of taxon 
    2) cattle (Q830) common name of taxon Q46889 (Bos primigenius indicus), Q20747320 (Bos primigenius taurus), Q20747334 (Bos taurus *+), Q20747712, Q20747726
    3) human (Q5) common name of taxon Q3238275 (Homo sapiens sapiens), Q15978631 (Homo sapiens+*)
    4) horse (Q726) common name of taxon Q10758650 (Equus caballus+*), Q26644764 (Equus ferus caballus)
    """
    replaced = {}
    wikilang_title_ptrs = {}
    wikidata_taxon_info = {}
    wikidata_cname_info = {}
    override_with_common_name = [5] #for humans (Q5) use the sitelinks from the common name item, even though the taxon item exists
    wikidata_db_props = {'P685':'ncbi','P846':'gbif','P850':'worms','P1391':'if'}
    #numbers to search for
    match_Qtypes = {'taxon':16521, 'monotypic taxon':310890, 'fossil taxon': 23038290, 'clade':713623, 'common name': 502895}
    initial_byte_match = re.compile('numeric-id":(?:{})\D'.format('|'.join([str(v) for v in match_Qtypes.values()])).encode()) 
    filesize = os.path.getsize(wikidata_json_dump_file.name)
    with bz2.open(wikidata_json_dump_file, 'rb') as WDF: #open filehandle, to allow read as bytes (converted to UTF8 later)
      found=n_eol=n_iucn=n_ipni=n_titles=0
      stored_wd_exception_taxa={}
      for line_num, line in enumerate(WDF):
        if (line_num % 1000000 == 0) and verbosity:
                print("Reading wikidata JSON dump: {}% done. "
                  "{} entries read, {} taxon entries found, "
                  "{} with EoL ids, {} with IUCN ids, {} with IPNIs:  mem usage {:.1f} Mb"
                  .format(wikidata_json_dump_file.tell()*100.0 / filesize, 
                    line_num, found, n_eol, n_iucn, n_ipni, memory_usage_resource()),
                  file=sys.stderr)
        #this file is in byte form, so must match byte strings
        if line.startswith(b'{"type":"item"') and initial_byte_match.search(line): #}'
          #done fast match, now check by parsing JSON (slower)
          item = json.loads(line.decode("UTF-8").rstrip().rstrip(","))
          if 'claims' not in item or 'P31' not in item['claims']:
            continue
          instance_of = {int(wikidata_value(wd_json.get("mainsnak")).get("numeric-id")):wd_json for wd_json in item["claims"]["P31"]}
          
          if any([Q in instance_of for name,Q in match_Qtypes.items() if name != 'common name']):
            #this is a taxon page
            taxon_item = wikidata_makebaseinfo(item)
            if JSON_contains_known_dbID(item, taxon_item, source_ptrs, verbosity):
              #we have matched against a known taxon
              wikidata_taxon_info[taxon_item['Q']] = taxon_item
              if EOLid_property_id:
                try:
                  eolid = wikidata_value(item['claims'][EOLid_property_id][0]['mainsnak'])
                  if eolid:
                    taxon_item['EoL'] = int(eolid)
                    n_eol += 1;
                except LookupError:
                  pass #no EOL id
                except ValueError:
                  print(" Cannot convert EoL property {} to integer in {}.".format(eolid, taxon_name(item)), file=sys.stderr);
              if IUCNid_property_id:
                try:
                  #IUCN number is stored as a reference
                  for ref in item['claims'][IUCNid_property_id[0]][0]['references']:
                    try:
                      iucnid = wikidata_value(ref['snaks'][IUCNid_property_id[1]][0])
                      if iucnid:
                        taxon_item['iucn']= int(iucnid)
                        n_iucn += 1
                        break
                    except LookupError:
                      pass #no IUCN id value
                except LookupError:
                  pass #no IUCN property
                except ValueError:
                  print(" Cannot convert IUCN property {} to integer in {}.".format(iucnid, taxon_name(item)), file=sys.stderr);
              if IPNIid_property_id:
                try:
                  ipni = wikidata_value(item['claims'][IPNIid_property_id][0]['mainsnak'])
                  #convert e.g. 391732-1 to 3917321 (assumes last digit has a dash before it)
                  if ipni:
                    taxon_item['IPNI'] = ipni.replace("-","")
                    n_ipni += 1;
                except LookupError:
                  pass #no IPNI id
                except ValueError:
                  print(" Cannot convert IPNI property {} to integer in {}.".format(eolid, taxon_name(item)), file=sys.stderr);
                
                #Check for common names 
                if taxon_item['Q'] in wikidata_cname_info:
                  #we previously found a common name for this one
                  if (wikilang in wikidata_cname_info[taxon_item['Q']]['l'] and wikilang not in taxon_item['l']) or taxon_item['Q'] in override_with_common_name:
                    #only change if there is no sitelink in the pre-specified wikilang but there *is* one in the common_name item (or is an exception)
                    if verbosity:
                      print(" Updating taxon {} ({}) with Qid and sitelinks from Q{}.".format(item['id'], taxon_name(item),  wikidata_cname_info[taxon_item['Q']]['Q']), file=sys.stderr)
                    if len(taxon_item['l']):
                      print("WARNING. Taxon {} ({}) is being swapped for a common-name equivalent {}, losing sitelinks in the following languages: {}.".format(item['id'], taxon_name(item), wikidata_cname_info[taxon_item['Q']]['Q'], taxon_item['l']), file=sys.stderr)
                 
                    replaced[taxon_item['Q']]=wikidata_cname_info[taxon_item['Q']]['Q']
                    taxon_item.update(wikidata_cname_info[taxon_item['Q']])
                
                if wikilang in taxon_item['l']:
                  wikilang_title_ptrs[taxon_item['l'][wikilang]] = taxon_item
          elif match_Qtypes['common name'] in instance_of:
            #This is a common name - it may have links to the correct wikipedia titles, but nothing else
            common_name = instance_of[match_Qtypes['common name']]
            if "qualifiers" not in common_name or "P642" not in common_name["qualifiers"]:
              if verbosity > 1:
                print(" Found a common name property without any qualifiers for {} ({}). This could be a common name which doesn't apply to a monophyletic taxon (e.g. 'slugs', 'coral', 'rabbit', 'whale')".format(item["id"], taxon_name(item)), file=sys.stderr)
              continue
            for common_name_of in common_name["qualifiers"]["P642"]:
              #e.g. https://www.wikidata.org/wiki/Q144
              common_name_taxon_Qid = wikidata_value(common_name_of).get("numeric-id")
              if common_name_taxon_Qid:
                common_name_item = wikidata_makebaseinfo(item)
                print(" Found a common name: {} ({}) is common name of Q{}, which could be a taxon item".format(item["id"], taxon_name(item), common_name_taxon_Qid), file=sys.stderr)
                if wikilang in common_name_item['l']:
                  #we have e.g. sitelink = 'en.wiki' in this item
                  wikidata_cname_info[common_name_taxon_Qid]=common_name_item
                  if common_name_taxon_Qid in wikidata_taxon_info:
                    #we have already stored taxon details in a previous pass, so we might want to change the the info
                    if wikilang not in wikidata_taxon_info[common_name_taxon_Qid]['l'] or common_name_taxon_Qid in override_with_common_name:
                      #only change if there was not a previous sitelink in the pre-specified wikilang (or an exception)
                      if verbosity:
                        print(" Updating taxon {} with Qid and sitelinks from Q{} ({}).".format(common_name_taxon_Qid, item['id'], taxon_name(item)),  file=sys.stderr)
                      if len(wikidata_taxon_info[common_name_taxon_Qid]['l']):
                        print("WARNING. Taxon {} is being swapped for a common-name equivalent {} ({}), losing sitelinks in the following languages: {}.".format(common_name_taxon_Qid, item['id'], taxon_name(item), wikidata_taxon_info[common_name_taxon_Qid]['l']), file=sys.stderr)
                      replaced[common_name_taxon_Qid]=wikidata_cname_info[common_name_taxon_Qid]['Q']
                      wikidata_taxon_info[common_name_taxon_Qid].update(common_name_item)
                      wikilang_title_ptrs[common_name_item['l'][wikilang]] = wikidata_taxon_info[common_name_taxon_Qid]
          elif 'Q13406463' in instance_of:
            #this is a "Wikimedia list article", which explains why a taxon Qid might be present 
            #(e.g. "List of Lepidoptera that feed on Solanum" which is a "list of" taxon)
            #we can ignore it without printing a message
            pass
          elif 'Q4167836' in instance_of: 
            #this is a "Wikimedia category", which explains why a taxon Qid might be present 
            #e.g. "Category:Species described in 2016", which is a "category combines topics" taxon
            #we can ignore it without printing a message
            pass
          elif 'Q19887878' in instance_of:
            #a wikimedia template: we can ignore it without printing a message
            pass
          else:
            #possibly flag up problems here, in case there are taxa which are instances of more specific types, e.g. ichnotaxon, etc etc.
            if verbosity:
              print(" There might be a problem with wikidata item {} ({}), might be a taxon but cannot get taxon data from it".format(item['id'], taxon_name(item)), file=sys.stderr);
    if verbosity:
      print(" The following taxon Qids were swapped for common name Qids: {}".format(replaced), file=sys.stderr)
      print(" NB: {} wikidata matches, of which {} have eol IDs, {} have IUCN ids, {} have IPNI, and {} ({:.2f}%) have titles that exist on the {} wikipedia. mem usage {:.1f} Mb".format(len(wikidata_taxon_info), n_eol,n_iucn, n_ipni, n_titles, n_titles/len(wikidata_taxon_info) * 100, wikilang, memory_usage_resource()), file=sys.stderr)
    return(wikilang_title_ptrs)


def JSON_contains_known_dbID(json, wd_info, source_ptrs, verbosity=0):
    """
    If we match with any of the wikidata props (e.g. 'P685' for ncbi, etc etc) then link to the 
    wd_info object from the appropriate source_ptrs item, so that it doesn't get garbage collected
    """
    wikidata_db_props = {'P685':'ncbi','P846':'gbif','P850':'worms','P1391':'if'} #doesn't have irmng
    used = False
    for taxon_id_prop in wikidata_db_props.keys():
        if taxon_id_prop in json['claims']:
            try:
                id = str(json['claims'][taxon_id_prop][0]['mainsnak']['datavalue']['value'])
                try:
                    source_ptrs[wikidata_db_props[taxon_id_prop]][id]['wd'] = wd_info
                    used=True
                except KeyError:
                    if verbosity>2:
                        #very common for OTT to be missing ids that are present in wikidata, so only output if -vvv
                        print(" NB: can't find item source_ptrs[{} ({})][{}] in OTTids for taxon {} ({})".format(wikidata_db_props[taxon_id_prop], taxon_id_prop, id, taxon_name(json), json['id']), file=sys.stderr);
            except KeyError:
                if verbosity>1:
                    print(" Can't find an id value for source_ptrs[{} ({})] in OTTids for taxon {} ({})".format(wikidata_db_props[taxon_id_prop], taxon_id_prop, taxon_name(json), json['id']), file=sys.stderr);
    return used
        
def identify_best_wikidata(OTT_ptrs, order_to_trust, verbosity):
    """
    Each OTT number may point to several wiki entries, one for the NCBI number, another for the WORMS number, etc etc.
    Hopefully these will point to the same entry, but they may not. If they are different we need to choose the best one
    to use. We set OTT_ptrs[OTTid]['wd'] to the entry with the most numbers supporting this entry. 
    In the case of a tie, we pick the one associated with the lowest (nearest 0) order_to_trust value
    """
    
    if verbosity:
        print("Finding best wiki matches. mem usage {:.1f} Mb".format(memory_usage_resource()), file=sys.stderr)
    OTTs_with_wd = allOTTs = 0
    for OTTid, data in OTT_ptrs.items():
        try:
            if OTTid < 0:
                print(" Skipping negative ott ({}) mapping wikidata for unlabelled node".format(OTTid))
                continue
        except TypeError:
            pass
        allOTTs += 1
        choose = {}
        for rank, src in enumerate(order_to_trust):
            if src in data['sources'] and data['sources'][src] is not None:
                if 'wd' in data['sources'][src]:
                    if 'Q' in data['sources'][src]['wd']:
                        Q = data['sources'][src]['wd']['Q']
                        obj = data['sources'][src]['wd']
                        if Q not in choose:
                            choose[Q] = {rank:obj}
                        else: 
                            choose[Q][rank]=obj
        if len(choose) == 0:
            data['wd'] = {} #for future referencing, it is helpful to have a blank array here
        else:
            OTTs_with_wd += 1
            errstr = None
            if len(choose) == 1:
                chosen = choose.popitem()[1]
            else:
                if verbosity > 1:
                    errstr = "More than one wikidata ID {} for taxon OTT: {}".format(choose, OTTid)
                max_refs = max([len(v) for v in choose.values()])
                chosen = {rank:obj for v in choose.values() for rank,obj in v.items() if len(v) == max_refs}
            best = chosen[min(chosen)]
            data['wd'] = best
            if errstr:
                print(" {}, chosen {}".format(errstr, best['Q']), file=sys.stderr)
    if verbosity:
        print(" NB: of {} OpenTree taxa, {} ({:.2f}%) have wikidata entries. mem usage {:.1f} Mb".format(allOTTs, OTTs_with_wd, OTTs_with_wd/allOTTs * 100, memory_usage_resource()), file=sys.stderr)

def add_pagesize_for_titles(wiki_title_ptrs, wikipedia_SQL_dump, verbosity):
    """
    looks through the sql insertion file for page sizes. This file has extremely long lines with each csv entry
    brace-delimited within a line, e.g.
    
    INSERT INTO `page` VALUES (10,0,'AccessibleComputing','',0,1,0,0.33167112649574004,'20150924002226','20150924010543',631144794,69,'wikitext'),(12,0,'Anarchism','',5252,0,0,0.786172332974311,'20151002214722','20151002214722',683845221,177800,'wikitext')
    
    The second entry (column 2) within each brace gives the namespace (we need namespace=0 for 'normal' pages).
    Column 3 gives the title (in unicode).
    The page length is in Column 12
    
    Note that titles have had spaces replaced with underscores
    """
    used = 0
    #the column numbers for each datum are specified in the SQL file, and hardcoded here.
    page_table_namespace_column = 2
    page_table_title_column = 3
    page_table_pagelen_column = 12
    with gzip.open(wikipedia_SQL_dump, 'rt', encoding='utf-8') as file: #use csv reader as it copes well e.g. with escaped SQL quotes in fields etc.
        pagelen_file = csv.reader(file, quotechar='\'',doublequote=True)
        match_line = "INSERT INTO `page` VALUES"
        for fields in filter(lambda x: False if len(x)==0 else x[0].startswith(match_line), pagelen_file):
            if (pagelen_file.line_num % 500 == 0) and verbosity:
                print("Reading page details from SQL dump to find page sizes: {} lines ({} pages) read: mem usage {:.1f} Mb".format(pagelen_file.line_num,pagelen_file.line_num*1000, memory_usage_resource()), file=sys.stderr)
            field_num=0
            #the records are all on the same line, separated by '),(', so we need to count fields into the line.
            for f in fields:
                try:
                    if f.lstrip()[0]=="(":
                        field_num=0
                        namespace = None
                        title = None
                except IndexError:
                    pass
                field_num+=1;
                if field_num == page_table_namespace_column:
                    namespace = f
                if field_num == page_table_title_column:
                    title = f
                elif field_num == page_table_pagelen_column and namespace == '0':
                    if title in wiki_title_ptrs:
                        wiki_title_ptrs[title]['PGsz'] = int(f)
                        used += 1
    if verbosity:
        print(" NB: of {} titles of taxa on the {} wikipedia, {} ({:.2f}%) have page size data. mem usage {:.1f} Mb".format(len(wiki_title_ptrs), wikipedia_SQL_dump if isinstance(wikipedia_SQL_dump, str) else wikipedia_SQL_dump.name, used, used/len(wiki_title_ptrs) * 100, memory_usage_resource()), file=sys.stderr)


def add_pageviews_for_titles(wiki_title_ptrs, array_of_opened_files, wikilang, verbosity, wiki_suffix="z"):
    '''
    Append monthly page visits to the data objects pointed to by wiki_title_ptrs. 
    We expect several months of data, each corresponding to a file, so we append 
    an array of the same length as number of files passed in, e.g. if 3 files are used:
    
    {'Q':Qid1, PGviews:[12,None,203]}
    
    (in this case, there is no pageview number for the 2nd month's data)
     
    Having several values (one per month) allows us to trim off any that show unusual spikes of activity
    
    wiki_suffix taken from https://dumps.wikimedia.org/other/pagecounts-ez/ 
    [b (wikibooks), k (wiktionary), n (wikinews), o (wikivoyage), q (wikiquote), s (wikisource), v (wikiversity), z (wikipedia)]
    
    '''
    wikicode = wikilang + '.' + wiki_suffix

    for title, obj in wiki_title_ptrs.items():     #fill arrays with 0 to start with: missing data indicates no hits that month
        obj['PGviews'] = len(array_of_opened_files)*[0]
    for index, pageviews_file in enumerate(array_of_opened_files):
        visits_for_titles(wiki_title_ptrs, pageviews_file, index, wikicode, verbosity)


def visits_for_titles(wiki_title_ptrs, wiki_visits_pagecounts_file, file_index, wikicode, verbosity):
    '''
    Append page visits to the data objects. We expect several of these, so append each to an array, e.g.
    
    {'Q':Qid1, PGviews:[12,19,203]}
    
    In the more recent files, missing values indicate <5 hits in that month, so we set these to 0
    
    Having several values (one per month) allows us to trim off any that show an unusual spike
    
    NB: see https://dumps.wikimedia.org/other/pagecounts-ez/ for format.
    Pageviews totals files have a wikicode project name in ascii followed by .z for wikipedias (e.g. en.z) followed by space, 
    followed by uri-escaped title, followed by space, followed by integer. The format is a very difficult one to parse, as it varies
    e.g. there are multiple differently quoted version of the same title, sometime with spaces not underscores, unicode encoding sometimes fails, 
    the bzip file sometimes appears truncated, etc etc. I've found that the best way to do this is to unquote_to_bytes first 
    (to remove uri-encoding), then convert to unicode.
    In fact, the encoding is unclear, and sometimes utf-8 encoding seems to fail, so we pass on any utf-8 conversion errors. 
    Hopefully this should only affect a few taxa where the page title has odd accents that have not been either uri-escaped, 
    or properly encoded in utf-8.
    '''
    from urllib.parse import unquote_to_bytes
    used = 0
    match_project = (wikicode +' ').encode() 
    start_char = len(match_project)
    
    with bz2.open(wiki_visits_pagecounts_file, 'rb') as PAGECOUNTfile:
        try:
            problem_lines = [] #there are apparently some errors in the unicode dumps
            for n, line in enumerate(PAGECOUNTfile):
                if (n % 10000000 == 0) and verbosity:
                    print("Reading pagecount file of number of page views: {} entries read from file {} ({}): mem usage {} Mb".format(n, file_index, wiki_visits_pagecounts_file.name, memory_usage_resource()), file=sys.stderr)
                if line.startswith(match_project):
                    try:
                        info = line[start_char:].rstrip(b'\r\n\\rn').rsplit(b' ', 1)
                        title = unquote_to_bytes(info[0]).decode('UTF-8').replace(" ", "_") #even though most titles should not have spaces, some can sneak in via uri escaping
                        wiki_title_ptrs[title]['PGviews'][file_index] = (wiki_title_ptrs[title]['PGviews'][file_index] or 0) + int(info[1]) #sometimes there are multiple encodings of the same title, with different visit numbers
                        used += 1
                    except UnicodeDecodeError:
                        problem_lines.append(str(n))
                    except KeyError:
                        pass #title not in wiki_title_ptrs - this is expected for most entries
                    except ValueError as e:
                        if verbosity:
                            print(e, file=sys.stderr)
                            print(" Problem converting page view to an integer for {}".format(line), file=sys.stderr)
        except EOFError as e:
            #this happens sometimes, dunno why
            if verbosity:
                print(" Problem with end of file: {}. Used {} entries (should be {}: {}%. Skipping to next".format(e.args[-1],used, len(wiki_title_ptrs), used/len(wiki_title_ptrs) * 100), file=sys.stderr)
        if len(problem_lines):
            if verbosity>0:
                if verbosity<=2:
                    print(" Problem decoding {} lines, but these will be ones with strange accents etc, so should mostly not be taxa.".format(len(problem_lines)), file=sys.stderr)
                else:
                    print(" Problem decoding certain lines: the following lines have been ignored:\n{}".format("  \n".join(problem_lines)), file=sys.stderr)
    if verbosity:
        print(" NB: of {} WikiData taxon entries, {} ({:.2f}%) have pageview data for {} in '{}'. mem usage {:.1f} Mb".format(len(wiki_title_ptrs), used, used/len(wiki_title_ptrs) * 100, wikicode, wiki_visits_pagecounts_file if isinstance(wiki_visits_pagecounts_file, str) else wiki_visits_pagecounts_file.name, memory_usage_resource()), file=sys.stderr)

def calc_popularities_for_wikitaxa(wiki_items, popularity_function, verbosity=0, trim_highest=2):
    ''' calculate popularities for wikidata entries, pase on page size & page views
    you might want to trim the highest viewing figures, to avoid spikes. trimming 2 months will remove spikes 
    that crosses from the end of one month to the beginning of another
    
    Currently, popularity_function is unused
    '''
    from statistics import mean, StatisticsError
    used=0
    for data in wiki_items:
        try:
            #trim off the 2 highest values, to avoid spikes
            trMeanViews = mean(sorted([x for x in data['PGviews'] if x is not None],  reverse=True)[trim_highest:])
            data['pop'] = (float(data['PGsz']) * trMeanViews)**0.5 #take the sqrt transform
            used += 1
        except (StatisticsError, ValueError, KeyError):   #perhaps data is absent, a number is NA or we are trying to take a mean of an empty list - if so, ignore
            pass
    if verbosity:
        print(" NB: of {} WikiData taxon entries, {} ({:.2f}%) have popularity measures. mem usage {:.1f} Mb".format(len(wiki_items), used, used/len(wiki_items) * 100, memory_usage_resource()), file=sys.stderr)


    
def sum_popularity_over_tree(tree, OTT_ptrs=None, exclude=[], pop_store='pop', verbosity=0):
    """Add popularity indices for branch lengths based on a phylogenetic tree (and return the tree, or the number of root descendants).
    We might want to exclude some names from the popularity metric (e.g. exclude archosaurs, 
    to make sure birds don't gather popularity intended for dinosaurs). This is done by passing an
    array such as ['Dinosauria_ott90215', 'Archosauria_ott335588'] as the exclude argument.
    
    'tree' can be the name of a tree file or a dendropy tree object
    
    'pop_store' is the name of the attribute in which to store the popularity. If you wish to create a tree
    with popularity on the branches, you can pass in pop_store='edge_length'
    
    NB: if OTT_ptrs is given, then the popularity is stored in the object pointed to by OTT_ptrs[OTTid]['wd']['pop'], where
    OTTid can be extracted from the node label in the tree. If OTT_ptrs is None, then the popularity is stored in the node object 
    itself, in Node.data['wd']['pop'].
    popularity summed up and down the tree depends on the OpenTree structure, and is stored in OTT_ptrs[OTTid]['pop_ancst'] 
    (popularity summed upwards for all ancestors of this node) and OTT_ptrs[OTTid]['pop_dscdt'] (popularity summed over all descendants).
    To get a measure of the sum of both ancestor and descendant popularity, just add these together
    
    we also count up the *number* of edges above each node to the root and the number of those that have a popularity measure. These are stored in 
    
    OTT_ptrs[OTTid]['n_ancst'] and OTT_ptrs[OTTid]['n_pop_ancst']
    
    we also flag up the poor seed plants (Spermatophyta_ott1007992)- we could add a little to their pop value later
    
    """
    from dendropy import Tree
    
    if not isinstance(tree, Tree):
        tree = Tree.get(file=tree, schema='newick', suppress_edge_lengths=True, preserve_underscores=True, suppress_leaf_node_taxa=True)
    
    if verbosity:
        print(" Tree read for phylogenetic popularity calc: mem usage {:.1f} Mb".format(memory_usage_resource()), file=sys.stderr)
    
    #put popularity as edge length
    for node in tree.preorder_node_iter():
        if node.label in exclude:
            node.pop_store=0
        else:
            try:
                node.pop_store = float(OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['wd']['pop']) if OTT_ptrs else node.data['wd']['pop']
                node.has_pop = True
            except (LookupError, AttributeError, ValueError):
                node.pop_store=0
                node.has_pop = False
    
    #go up the tree from the tips, summing up the popularity indices beneath and adding the number of descendants
    for node in tree.postorder_node_iter():
        if node.is_leaf():
            node.descendants_popsum = 0
            node.n_descendants = 0
        try:
            node._parent_node.n_descendants += (1+node.n_descendants)
            node._parent_node.descendants_popsum += (node.pop_store + node.descendants_popsum)
        except AttributeError: #could be the first time we have checked the parent
            try:
                node._parent_node.n_descendants = (1 + node.n_descendants)
                node._parent_node.descendants_popsum = (node.pop_store + node.descendants_popsum)
            except AttributeError: #this could be the root, with node._parent_node = None
                root_descendants=node.n_descendants
    
    
    #go down the tree from the root, summing up the popularity indices above, and summing up numbers of nodes
    for node in tree.preorder_node_iter():
        if node.parent_node is None:
             #this is the root.
            node.seedplant = False
            node.n_ancestors = 0    
            node.n_pop_ancestors = 0    
            node.ancestors_popsum = 0.0   
        else:
            node.n_ancestors = node._parent_node.n_ancestors + 1
            node.ancestors_popsum = node._parent_node.ancestors_popsum + node.pop_store
            if getattr(node, 'has_pop', None):
                node.n_pop_ancestors = node._parent_node.n_pop_ancestors + 1
            else:
                node.n_pop_ancestors = node._parent_node.n_pop_ancestors            
            if node.label and node.label =='Spermatophyta':
                node.seedplant = True
                print("Found plant root", file=sys.stderr)
            else:
                node.seedplant = node._parent_node.seedplant
    
    #place these values into the OTT_ptrs structure
    if OTT_ptrs:
        for node in tree.preorder_node_iter():
            try:
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['pop_self'] = node.pop_store
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['pop_ancst'] = node.ancestors_popsum #nb, this includes popularity of self
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['pop_dscdt'] = node.descendants_popsum
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['n_ancst'] = node.n_ancestors
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['n_dscdt'] = node.n_descendants
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['n_pop_ancst'] = node.n_pop_ancestors
                OTT_ptrs[int(node.label.rsplit("_ott",1)[1])]['is_seed_plant'] = node.seedplant
            except (LookupError, AttributeError):
                pass
    return tree

if __name__ == "__main__":
    import argparse
    from os.path import basename

    parser = argparse.ArgumentParser(description='Map taxa from the OpenTree onto wikipedia taxa, and calculate measures of popularity from that. To calculate phylogenetic popularity, specify an --OpenTreeFile')
    parser.add_argument('OpenTreeTaxonomy', type=argparse.FileType('r', encoding='UTF-8'), help='The 325.6 MB Open Tree of Life taxonomy.tsv file, from http://files.opentreeoflife.org/ott/')
    parser.add_argument('wikidataDumpFile', type=argparse.FileType('rb'), help='The >4GB wikidata JSON dump, from http://dumps.wikimedia.org/wikidatawiki/entities/ (latest-all.json.bz2) ')
    parser.add_argument('wikipediaSQLDumpFile', type=argparse.FileType('rb'), help='The >1GB wikipedia -latest-page.sql.gz dump, from http://dumps.wikimedia.org/enwiki/latest/ (enwiki-latest-page.sql.gz) ')
    parser.add_argument('wikipedia_totals_bz2_pageviews', type=argparse.FileType('rb'), nargs='+', help='One or more bzipped "totals" pageview count files, from https://dumps.wikimedia.org/other/pagecounts-ez/merged/ (e.g. pagecounts-2016-01-views-ge-5-totals.bz2, or pagecounts*totals.bz2)')
    parser.add_argument('--OpenTreeFile', '-t', type=argparse.FileType('r', encoding='UTF-8'), help='If a newick-formatted treefile is given here, calculate the phylogenetic popularity by summing up and down the tree. Alternatively, you can run the raw output through calc_phylogenetic_popularity.py')
    parser.add_argument('--exclude', nargs='*', help='(optional) a number of taxa to exclude, such as Dinosauria_ott90215, Archosauria_ott335588')
    parser.add_argument('--csvoutfile', '-o', type=argparse.FileType('w', encoding='UTF-8'), default=sys.stdout, help='The file in which to save the output, as comma separated values')
    parser.add_argument('--wikilang', '-l', default='en', help='The language wikipedia to check, e.g. "en"')
    parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info: -v=normal. -vv also show entries with no wikipedia page -vvv also show entries with wikidata database IDs that are not present in OTT')
    
    args = parser.parse_args()
        
    sources = ['ncbi','if','worms','irmng','gbif'] #wikidata does not have irmng, but it is useful for other reasons, e.g. to get EoL ids
    OTT_ptrs = {} #this gets filled out
    source_ptrs = create_from_taxonomy(args.OpenTreeTaxonomy, sources, OTT_ptrs, args.verbosity)
    wiki_title_ptrs = add_wikidata_info(source_ptrs, args.wikidataDumpFile, args.wikilang, args.verbosity, None)
    identify_best_wikidata(OTT_ptrs, sources, args.verbosity)
    add_pagesize_for_titles(wiki_title_ptrs, args.wikipediaSQLDumpFile, args.verbosity)
    add_pageviews_for_titles(wiki_title_ptrs, args.wikipedia_totals_bz2_pageviews, args.wikilang, args.verbosity)
    calc_popularities_for_wikitaxa(wiki_title_ptrs.values(), "", args.verbosity)
    
    if args.OpenTreeFile:
        sum_popularity_over_tree(OTT_ptrs, args.OpenTreeFile, args.exclude, args.verbosity)
        startrows = ["OTT_ID", "PopAncestors", "PopDescendants", "NumAncestors", "NumDescendants", "NumPopAncestors"]
    else:
        startrows = ["OTT_ID"]
        
    nodewriter = csv.writer(args.csvoutfile, quoting=csv.QUOTE_MINIMAL)
    nodewriter.writerow(startrows + ["Qid", "PopBase", "PageSize"] + [basename(f.name).replace("-totals.bz2","") for f in args.wikipedia_totals_bz2_pageviews])
    for OTTid, data in OTT_ptrs.items():
        to_print = [OTTid]
        if args.OpenTreeFile:
            to_print.extend([data.get('pop_ancst'), data.get('pop_dscdt'), data.get('n_ancst'), data.get('n_dscdt'), data.get('n_pop_ancst')])
        if 'wd' in data:
            to_print.extend([data['wd'].get('Q'), data['wd'].get('pop'), data['wd'].get('PGsz')] + [v for v in (data['wd'].get('PGviews') or [])])
        nodewriter.writerow(to_print)