#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Take a database string and a set of CSV files with common names, as "sciname,ottid,common_name", and add these to the database,
with lang=<selected language>

e.g.
cd data/Metadata
../../ServerScripts/Utilities/setOZnames_from_csv.py mysql://OZ:lalalala159@127.0.0.1/oz OZ_*.csv Deepfin_nodes.csv PrimatesSpringer_extra_nodes.csv YansBase_*

'''

import os
import sys
import re
import csv
from collections import OrderedDict
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)
sys.stderr = codecs.getwriter('utf8')(sys.stderr.buffer)

if __name__ == "__main__":

    src_flags = {'onezoom':1, 'eol':2, 'wikidata':3, 'iucn':4, 'arkive':5}
    
    
    import argparse
    parser = argparse.ArgumentParser(description='Upload vernacular names into the database from a set of csv files')
    parser.add_argument('database', help='Name of the db, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>')
    parser.add_argument('vernacular_names_csv', nargs='+', help='a number of csv files, containing "sciname,ottid,common_name" (either sciname or ottid may be absent, but not both).')
    parser.add_argument('--language', '-l', default="en", help='The language that the common names are in, as used in the EoL "laguage" field (e.g. "en" for english, "fr" for french, etc.')
    parser.add_argument('--keep_old', '-k', action="store_true", help='do not delete the old OZ common names from the db')
    parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra info')
    args = parser.parse_args()
    
    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
        datetime_now = "datetime('now')";
        to_timestamp=lambda colname: "CAST(`{}` AS INT)".format(colname)
        subs="?"
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        import re
        match = re.match(r'mysql://([^:]+):([^@]+)@([^/]+)/(.*)', args.database.strip())
        db_connection = pymysql.connect(user=match.group(1), passwd=match.group(2), host=match.group(3), db=match.group(4), port=3306, charset='utf8')
        datetime_now = "NOW()"
        subs="%s"
        to_timestamp=lambda colname: "UNIX_TIMESTAMP(`{}`)".format(colname)
    else:
        warn("No recognized database specified: {}".format(args.database))
        sys.exit()
    
    db_curs = db_connection.cursor()

    if args.keep_old == False:
        for tab in ('vernacular_by_ott', 'vernacular_by_name'):
            db_curs.execute("DELETE FROM `{0}` WHERE src = {1} AND lang = {1}".format(tab, subs), (int(src_flags['onezoom']), args.language))
            print("Deleted {} names from {}".format(db_curs.rowcount, tab))
        db_connection.commit()

    #read csv files
    new_list_of = {'ott': set(), 'name':set()}
    
    n_names = OrderedDict([(name,0) for name in args.vernacular_names_csv])
    for fn in n_names.keys():
        with open(fn, encoding='utf-8') as fh:
            reader = csv.reader(fh)
            for vernacular_row in reader:
                #vernacular_row should have [0]=name, [1]=ott [2]=vernacular (en)
                if len(vernacular_row)<3:
                    if args.verbosity:
                        print("less than 3 items in row {}: ({}) - ignoring".format(reader.line_num, vernacular_row))
                else:
                    if vernacular_row[2]:
                        match=0
                        if vernacular_row[1]: #look up ott first
                            db_curs.execute("SELECT ott,name from ordered_leaves WHERE ott = {}".format(subs), (int(vernacular_row[1]),))
                            match = db_curs.rowcount
                            if match < 1:
                                db_curs.execute("SELECT ott,name from ordered_nodes WHERE ott = {}".format(subs), (int(vernacular_row[1]),))
                                match = db_curs.rowcount
                        if match < 1 and vernacular_row[0]:
                            db_curs.execute("SELECT ott,name from ordered_leaves WHERE name = {}".format(subs), (vernacular_row[0],))
                            match = db_curs.rowcount
                            if match < 1:
                                db_curs.execute("SELECT ott,name from ordered_nodes WHERE name = {}".format(subs), (vernacular_row[0],))
                                match = db_curs.rowcount
                        if match > 0:
                            result = db_curs.fetchall()
                            otts = set([r[0] for r in result if r[0]]) #look for unique values
                            names = set([r[1] for r in result  if r[1]]) #look for unique values
                            if otts:
                                if len(otts) == 1:
                                    ott = int(otts.pop())
                                    preferred = 1 if ((len(names) == 1) and (names.pop().lower() == vernacular_row[0].lower())) else 0
                                    db_curs.execute("INSERT INTO `vernacular_by_ott` (ott, vernacular, lang, preferred, src, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {1})".format(subs, datetime_now), (ott, vernacular_row[2],args.language, preferred, src_flags['onezoom']))
                                    n_names[fn] += db_curs.rowcount
                                    new_list_of['ott'].add(ott)
                                    db_connection.commit()
                                else:
                                    print("!More than one ott number ({}) matched in the db for the row: {} - ignoring".format(otts, vernacular_row))
                            elif names:
                                if len(names) == 1:
                                    name = names.pop()
                                    db_curs.execute("INSERT INTO `vernacular_by_name` (name, vernacular, lang, preferred, src, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {1})".format(subs, datetime_now), (name, vernacular_row[2], args.language, 0, src_flags['onezoom']))
                                    n_names[fn] += db_curs.rowcount
                                    new_list_of['name'].add(name)
                                    db_connection.commit()
                                else:
                                    print("!More than one scientific name ({}) matched in the db for the row: {} - ignoring".format(names, vernacular_row))
                            else:
                                print("!!Line {} ({}) in file '{}' matched a row in ordered_leaves/nodes, but neither an ott or name was returned".format(reader.line_num, vernacular_row, fn))
                                continue
                        else:
                            print("Could not find a db match in ordered_leaves or ordered_nodes for line {} ({}) in file '{}'".format(reader.line_num, vernacular_row, fn))
                    else:
                        #print("skipped {}", vernacular_row)
                        pass
        print("== Inserted {} names from {} (total: {}) ==".format(n_names[fn],fn, sum(n_names.values())))
    
    #now we have all the info, mark the preferred ones
    for ott_or_name, lst in new_list_of.items():
        for identifier in lst:
            db_curs.execute("SELECT id,preferred,vernacular from vernacular_by_{0} WHERE {0} = {1} AND src = {1} AND lang = {1} ORDER BY id;".format(ott_or_name, subs), (identifier, src_flags['onezoom'], args.language))
            results = db_curs.fetchall()
            if len(results)==1:
                db_curs.execute("UPDATE vernacular_by_{} set preferred = 1 where id = {};".format(ott_or_name, subs), (results[0][0],))
                db_connection.commit()
            elif len(results) > 1:
                preferred = [r for r in results if int(r[1]) == 1] #how many for this ott are marked as 'preferred'?
    
                #We are OK if only 1 is already set to 'preferred'
                if len(preferred) == 1:
                    continue
    
                #otherwise look for the scientific name, so we can output it in the warnings
                db_curs.execute("SELECT name from ordered_nodes where {0} = {1} UNION SELECT name from ordered_leaves where {0} = {1};".format(ott_or_name, subs), (identifier, identifier))
                scinames = set([r[0] for r in db_curs.fetchall()])
                
                #If none are marked as preferred, set the last matched one
                if len(preferred) == 0:
                    last = results[-1] #the last one in the results column, i.e. with the highest id number
                    print("The {} '{}' {} has multiple vernacular names, none of which are preferred: {}. Setting the last ({}) to the preferred name".format(ott_or_name, identifier, list(scinames), [r[2] for r in results], last[2]))
                    db_curs.execute("UPDATE vernacular_by_{0} set preferred = 1 where id = {1}".format(ott_or_name, subs), (last[0],))
    
                #If more than one is marked as preferred, unset preferred status on all but the last one
                else:
                    print("The {} '{}' {} has multiple vernacular names, more than one of which matches both ott and scientific name names: {}. Setting the last ({}) to the preferred name".format(ott_or_name, identifier, list(scinames), [r[2] for r in results], preferred.pop()[2]))
                    db_curs.execute("UPDATE vernacular_by_{} SET preferred = 0 WHERE id IN ({})".format(ott_or_name, ",".join([str(int(p[0])) for p in preferred])))
                db_connection.commit()