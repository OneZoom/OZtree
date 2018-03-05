#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
A one-off script to correct vernacular names already in the DB
'''

import os
import sys
import re
import csv
import html
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)
sys.stderr = codecs.getwriter('utf8')(sys.stderr.buffer)

if __name__ == "__main__":

    import argparse
    parser = argparse.ArgumentParser(description='Test a mysql database')
    parser.add_argument('database', help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>')
    parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info')
    args = parser.parse_args()
    verbosity = args.verbosity
    
    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
        datetime_now = "datetime('now')";
        to_timestamp=lambda colname: "CAST(`{}` AS INT)".format(colname)
        subs="?"
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        import re
        match = re.match(r'mysql://([^:]+):([^@]+)@([^/]+)/([^?]*)', args.database.strip())
        db_connection = pymysql.connect(user=match.group(1), passwd=match.group(2), host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
        datetime_now = "NOW()"
        subs="%s"
        to_timestamp=lambda colname: "UNIX_TIMESTAMP(`{}`)".format(colname)
    else:
        sys.exit("No recognized database specified: {}".format(args.database))
    
    db_curs = db_connection.cursor()
    sql = "SELECT id, vernacular from `vernacular_by_ott` order by id"
    
    names = []
    db_curs.execute(sql)
    for row in db_curs:
        names.append([row[0], html.unescape(row[1])])
    if args.verbosity:
        print("Read {} rows (e.g. {})".format(len(names), names[:5]))

    for n in names:
        try:
            db_curs.execute("UPDATE vernacular_by_ott SET vernacular = %s WHERE id=%s", (n[1], n[0]))
        except:
            print("error setting" + n[1] + " for " + str(n[0]))
            raise 
    db_connection.commit()