#!/usr/bin/env python3
# -*- coding: utf-8 -*-
""" gets the entire IUCN dataset from their API at
http://apiv3.iucnredlist.org/api/v3/species/page
and saves the most recent status in the iucn database table,
then percolates these up the tree into the iucnXX fields
of ordered_nodes 

As a start, the IUCN ids are obtained from ordered_leaves. Some of the rows have multiple IUCN ids, where wikidata and
EoL disagree somehow. If this is the case we try to match on exact scientific name. If no match on name can be made
for these taxa, a warning is output

we should have all IUCN species-level taxa in the tree, so as a check, we output any that do not match
"""
import os
import sys
import re
import json
import argparse
import requests
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''

IUCN_statuses = { #values returned by the API
    'NE':'NE', #not evaluated: the default
    'LC':'LC',
    'VU':'VU',
    'NT':'NT',
    'DD':'DD',
    'EN':'EN',
    'CR':'CR',
    'LR/nt':'NT',#old value for 'near threatened' (~726sp)
    'LR/cd':'NT',#previously 'conservation dependent', now just merged into NT (~152 spp)
    'LR/lc':'LC',#old value for 'least concern' (~525 spp)
    'LRnt':'NT',
    'LRcd':'NT',
    'LRlc':'LC',
    'EX':'EX',
    'EW':'EW'}
uppercase_statuses = {k.upper():v for k,v in IUCN_statuses.items()} #useful to aid case insensitivity

def warning(*objs):
    import sys
    print("WARNING: ", *objs, file=sys.stderr)

def info(*objs):
    import sys
    try:
      if args.verbosity<1:
          return
    except:
      pass;
    print(*objs, file=sys.stderr)

def getIUCNData_from_API(sess):
    url = "http://apiv3.iucnredlist.org/api/v3/species/page/"; #see http://apiv3.iucnredlist.org/api/v3/docs
    params = {'token':"9bb4facb6d23f48efbf424bb05c0c1ef1cf6f468393bc745d42179ac4aca5fee"}; #replace with your own token key.
    page=0
    data=[]
    while True:
   
        info('Getting page {} of IUCN data from the IUCN API'.format(page))
        try:
            result = sess.get(url + str(page), params=params, timeout=10).json()
            if result['count'] == 0:
                return(data)
            else:
                data += result['result']
        except requests.exceptions.Timeout:
            sys.exit('socket timed out - URL {}'.format(url))
        except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as error:
            sys.exit('Data not retrieved because {}\nURL: {}'.format(error, url))
        page+=1  

default_appconfig_file = "../../../private/appconfig.ini"

parser = argparse.ArgumentParser(description='Save IUCN status in the database')
parser.add_argument('--database', '-db', help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If no password is given, it will prompt for one. If no --database option is given, it will look for one in {} (relative to the script location)'.format(default_appconfig_file))
parser.add_argument('--IUCN_table', default="iucn", help='The db table in which to place the IUCN status')
parser.add_argument('--OTT_leaf_table', default="ordered_leaves", help='The db table containing at least an "ott" column a "name" column, and an "iucn" column, to mine for IUCN matches')
parser.add_argument('--OTT_node_table', default="ordered_nodes", help='The db table containing columns a "name" column, and an "iucn" column, to mine for IUCN matches')
parser.add_argument('--IUCN_file', type=argparse.FileType('r', encoding='UTF-8'), help="A file, the json output from the IUCN API. If given, we won't get data from the API")
parser.add_argument('--UPDATE_NODES_ONLY', action="store_true", help="Don't query the IUCN API: only percolate the current scores upwards")
parser.add_argument('--SAVE_IUCN_FILE', type=argparse.FileType('w', encoding='UTF-8'), default=None, help="save the downloaded iucn file here")
parser.add_argument('--verbosity', '-v', default=0, action="count", help='verbosity: output extra non-essential info')
args = parser.parse_args()

# look for appconfig if no database string given
if args.database is None:
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)) as conf:
        conf_type=None
        for line in conf:
        #look for [db] line, followed by uri
            m = re.match(r'\[([^]]+)\]', line)
            if m:
                conf_type = m.group(1)
            if conf_type == 'db':
                m = re.match('uri\s*=\s*(\S+)', line)
                if m:
                    args.database = m.group(1)

#query the ordered_leaves db table for EoL ids
if args.database.startswith("sqlite://"):
    from sqlite3 import dbapi2 as sqlite
    db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
    subs="?"
elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
    import pymysql
    import re
    from getpass import getpass
    match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/(.*)', args.database.strip())
    if match.group(2) == '':
        #enter password on the command line, if not given (more secure)
        pw = getpass("Enter the sql database password")
    else:
        pw = match.group(2)
    db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8')
    subs="%s"
else:
    warning("No recognized database specified: {}".format(args.database))
    sys.exit()


db_curs = db_connection.cursor()

if not args.UPDATE_NODES_ONLY:
    if args.IUCN_file:
        IUCN_API_data = json.loads(args.IUCN_file.read())
    else:
        #make a single http session, which we can tweak
        s = requests.Session()
        retries = Retry(total=5,
                        backoff_factor=1,
                        status_forcelist=[ 500, 502, 503, 504 ])
        s.mount('http://', HTTPAdapter(max_retries=retries))
        IUCN_API_data = getIUCNData_from_API(s)
        if args.SAVE_IUCN_FILE:
            with args.SAVE_IUCN_FILE as f:
                f.write(json.dumps(IUCN_API_data).replace("},","},\n"))
    
    table_data = {} #save the values in here, and only write to the DB at the end
    iucn2ott =   {} #much faster to save all the IUCN details in a lookup array
    unique_iucn=set()
    db_curs.execute("SELECT ott,iucn from `{0}` WHERE iucn IS NOT NULL;".format(args.OTT_leaf_table))
    for r in db_curs:
        for iucn in r[1].split("|"):
            if int(iucn) in iucn2ott:
                iucn2ott[int(iucn)].append(int(r[0]))
            else:
                iucn2ott[int(iucn)]=[int(r[0])]
           
    print("iucn2ott: {} entries".format(len(iucn2ott)))
    matched_by_name = matched_by_id = subsp =0
    missed_names = {}
    for i, spp in enumerate(IUCN_API_data):
        IUCN_id = spp['taxonid']
        unique_iucn.add(int(IUCN_id))
        if int(IUCN_id) in iucn2ott:
            otts = iucn2ott[int(IUCN_id)]
            for ott in otts:
                if ott in table_data:
                    #iucn already exists for this ott
                    table_data[ott].append(spp)
                else:
                    matched_by_id += 1
                    table_data[ott] = [spp]
        else:
            #no iucn match in our DB
            if spp['infra_rank'] is None and spp['population'] is None:
                #we should really be matching this
                if args.verbosity>2:
                    info("Missing match for {}, so trying to match via scientific name".format(spp['scientific_name']))
                nm = spp['scientific_name']
                if nm in missed_names:
                    missed_names[nm].append(spp)
                else:
                    missed_names[nm]=[spp]
            else:
                subsp+=1             
    db_curs.execute("SELECT name,ott,extinction_date from `{0}` WHERE ott IS NOT NULL AND name IS NOT NULL   ;".format(args.OTT_leaf_table))
    for row in db_curs:
        if row[0] in missed_names:
             #only use this is there is not already an iucn for this spp.
            if int(row[1]) not in table_data:
                if args.verbosity>1:
                    info("Found match for {} via name!".format(row[0]))
                table_data[int(row[1])] = missed_names[row[0]]
                matched_by_name += 1
        if row[2] and int(row[1]) not in table_data:
            #this is an extinct species
            table_data[int(row[1])] = [{'category':"EX"}]
    print("species matched by ott id: {} / {} unique IUCN ids".format(matched_by_id, len(unique_iucn)))     
    print("remaining species matched by name: {} / {} names without an obvious ott".format(matched_by_name, len(missed_names)))     
    print("total ott matches ~ {} ({} in table)".format(matched_by_name + matched_by_id, len(table_data)))     
    print("remaining unmatched ~ {} (not including ~{} below the species level) entries".format(len(unique_iucn)-len(table_data), subsp))
    
    db_curs.execute("TRUNCATE TABLE {}".format(args.IUCN_table))
    
    #now just find an IUCN status for each ott
    for ott, matches in table_data.items():
        iucn='NE' #the default
        #look for all the categories for this taxon
        categories = [uppercase_statuses[row['category'].upper()] for row in matches]
        if len(set(categories))==1: #if there are multiple entries with the same category, we don't care
            iucn=categories[0]
        else:
            #multiple iucn matches with different iucn statuses. So try matching each by name
            db_curs.execute("SELECT name from `{}` WHERE ott={};".format(args.OTT_leaf_table, int(ott)))
            name = db_curs.fetchone()[0]
            name_matches = [m for m in matches if m['scientific_name'] == name]
            if len(name_matches) == 0:
                #a very few cases here, usually where the OpenTree uses an alternative genus name. So as a heuristic, match on the epithet
                name_matches = [m for m in matches if m['scientific_name'].split(" ")[1] == name.split(" ")[1]]
            categories = [uppercase_statuses[row['category'].upper()] for row in name_matches]
            if len(set(categories))==1: #if there are multiple entries with the same category, we don't care
                iucn=categories[0]
                matches=name_matches
            else:
                info("Could not find a unique iucn status code for taxon with ott = {}".format(ott))
        if iucn != 'NE':
            #Save all categories except 'not evaluated', which is the assumed default (for most species)
            sql = "INSERT INTO {0} (ott, iucn, status_code) VALUES ({1}, {1}, {1});".format(args.IUCN_table, subs)
            db_curs.execute(sql, [ott, matches[0].get('taxonid'), iucn])
    db_connection.commit()

#PERCOLATION TO CREATE NODE SUMMARIES
iucn_values = set(IUCN_statuses.values())
iucn_columns = {s:'iucn'+s for s in iucn_values}

info("Setting all IUCN summaries for all nodes to 0")
assignment = ["`{0}`=0".format(col) for col in iucn_columns.values()]
sql = "UPDATE {0} SET {1};".format(args.OTT_node_table, ','.join(assignment))
db_curs.execute(sql)

#Set parents of leaves. get IUCN using an inner join on iucn.ott with ordered_leaves.ott
# and restrict it to each IUCN value (not including NE). Count these up for each parent (node id), and 
# finally assign these counts to the appropriate parent in ordered_nodes
for status, colname in iucn_columns.items():
    info("Filling IUCN summary for '{}' (column='{}') for immediate parents of leaves".format(status, colname))
    if status != 'NE':
        sql="""
UPDATE {node_table} 
JOIN 
(
  SELECT {leaf_table}.parent, count({leaf_table}.parent) as cnt
  FROM {leaf_table} INNER JOIN {iucn_table} ON {iucn_table}.ott={leaf_table}.ott AND {iucn_table}.status_code = '{iucn_cat}'
  GROUP BY {leaf_table}.parent
) joined_table ON {node_table}.id = joined_table.parent
SET {iucn_col}=joined_table.cnt;""".format(leaf_table=args.OTT_leaf_table, node_table=args.OTT_node_table, iucn_table=args.IUCN_table, iucn_cat=status, iucn_col=colname)
        db_curs.execute(sql)
    else:
        #We must also count up the otts not in the IUCN table: these are 'NE'
        sql="""
UPDATE {node_table} 
JOIN 
(
  SELECT parent, count(parent) as cnt
  FROM {leaf_table} WHERE {leaf_table}.ott IS NULL OR {leaf_table}.ott NOT IN (
    SELECT {iucn_table}.ott FROM {iucn_table}
    )
  GROUP BY {leaf_table}.parent
) joined_table ON {node_table}.id = joined_table.parent
SET iucnNE=joined_table.cnt;""".format(leaf_table=args.OTT_leaf_table, node_table=args.OTT_node_table, iucn_table=args.IUCN_table)
        db_curs.execute(sql)
db_connection.commit()

#Now we have all the basic numbers in ordered_leaves, so we percolate these up the tree
#Taxa in the table come from a tree that has been ladderized ascending (smaller taxa first), 
# so if we go backwards through the ids, we should always find children before their parents. 
#We can check because the total iucn counts on the root node should be equal to the number of leaves
info("Percolating IUCN statuses up the node tree")
db_curs.execute("DROP PROCEDURE IF EXISTS iucn_percolate_up")
sql="""CREATE PROCEDURE iucn_percolate_up()
BEGIN
DECLARE i INT DEFAULT 0;
SELECT MAX(id) into i FROM {node_table};
WHILE i>1 DO
  UPDATE {node_table} to_update, {node_table} update_from SET {assignment} WHERE update_from.id = i AND to_update.id=update_from.parent; 
  SET i = i - 1;
END WHILE;
END;""".format(node_table=args.OTT_node_table, assignment=",".join(["to_update.{0}=to_update.{0}+update_from.{0}".format(cat) for cat in iucn_columns.values()]))
db_curs.execute(sql)
db_connection.commit()
db_curs.callproc("iucn_percolate_up")
db_connection.commit()
