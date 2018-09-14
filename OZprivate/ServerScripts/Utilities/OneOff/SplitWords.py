#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Takes all the vernacular and species names and split them into separate words for indexing purposes
(to get around the lack of fulltext indexes with words < 3 chars)
'''

import os
import stat
import sys
import re
import csv
import time
import random
import argparse
import codecs

# to get globals from ../../../models/_OZglobals.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir, os.path.pardir, os.path.pardir, "models")))
#from _OZglobals import 
#from OZfunction import 
__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''


if __name__ == "__main__":

    default_appconfig_file = "../../../../private/appconfig.ini"

    parser = argparse.ArgumentParser(description='Save best EoL image (data object) id and common name for taxa in a database')
    parser.add_argument('--database', '-db', default=None, help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If not given, the script looks for the variable db.uri in the file {} (relative to the script location)'.format(default_appconfig_file))
    args = parser.parse_args()
    
    #sys.stdout = codecs.getwriter('utf8')(sys.stdout.detach())
    #sys.stderr = codecs.getwriter('utf8')(sys.stderr.detach())

    if args.database is None:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)) as conf:
            conf_type=None
            for line in conf:
            #look for [db] line, followed by uri
                m = re.match(r'\[([^]]+)\]', line)
                if m:
                    conf_type = m.group(1)
                if conf_type == 'db' and args.database is None:
                    m = re.match('uri\s*=\s*(\S+)', line)
                    if m:
                        args.database = m.group(1)
                    
        
    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
        datetime_now = "datetime('now')";
        subs="?"
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', args.database.strip())
        if match.group(2) == '':
            #enter password on the command line, if not given (more secure)
            if args.script:
                pw = input("pw: ")
            else:
                from getpass import getpass
                pw = getpass("Enter the sql database password: ")
        else:
            pw = match.group(2)
        db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
        datetime_now = "NOW()"
        diff_minutes=lambda a,b: 'TIMESTAMPDIFF(MINUTE,{},{})'.format(a,b)
        subs="%s"
    else:
        warn("No recognized database specified: {}".format(args.database))
        sys.exit()

    db_curs = db_connection.cursor()
    sql = u"INSERT INTO search_log (search_string, search_count) VALUES ({0}, {0})".format('%s')
    db_curs.execute(sql, (u'💩', 6))
    db_connection.commit()
    db_curs.close()
