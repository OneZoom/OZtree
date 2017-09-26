#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
a simple script to show how to use python to connect to a myysql (or sqlite) database and save / retrieve stuff
'''

import os
import sys
import re
import csv

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
        match = re.match(r'mysql://([^:]+):([^@]+)@([^/]+)/(.*)', args.database.strip())
        db_connection = pymysql.connect(user=match.group(1), passwd=match.group(2), host=match.group(3), db=match.group(4), port=3306, charset='utf8')
        datetime_now = "NOW()"
        subs="%s"
        to_timestamp=lambda colname: "UNIX_TIMESTAMP(`{}`)".format(colname)
    else:
        warn("No recognized database specified: {}".format(args.database))
        sys.exit()
    
    test_table = 'banned'
    db_curs = db_connection.cursor()
    sql = "SELECT * from `{}`".format(test_table)
    db_curs.execute(sql)
    for row in db_curs.fetchall():
        print(row)