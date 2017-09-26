#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>

a simple script to identify pictures on the database that for some reason have not been downloaded

NB - to instead identify otts in the images_by_ott table that have no "best_any" set, try

select ott from (select ott, sum(best_any) as s from images_by_ott group by ott) t where s = 0;
'''

import os
import sys
import re
import csv

if __name__ == "__main__":
    default_appconfig_file = "../../../private/appconfig.ini" 
    import argparse
    import os.path
    parser = argparse.ArgumentParser(description="A temporary script to check which images are in the images_by_ott table but which don't have a jpg file. It outputs the ott ids in batches, which can be passed to EoLQueryPicsNames.py")
    parser.add_argument('--database', default=None, help='name of the db containing the images_by_ott table, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>')
    parser.add_argument('--pic_dir', default=None, help='the place where the pictures are kept')
    parser.add_argument('--batch_size', "-b", type=int, default=100, help='the number of ott ids to output')
    parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info')
    args = parser.parse_args()
    verbosity = args.verbosity
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

    if args.pic_dir is None:
        args.pic_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../static/FinalOutputs/pics')
    
    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
        datetime_now = "datetime('now')";
        to_timestamp=lambda colname: "CAST(`{}` AS INT)".format(colname)
        subs="?"
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        import re
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/(.*)', args.database.strip())
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
    sql = "SELECT src_id, ott from `{}` where (src=1 or src=2) group by src_id, ott".format('images_by_ott')
    db_curs.execute(sql)
    batch=set()
    for row in db_curs:
        if not os.path.isfile(os.path.join(args.pic_dir, str(row[0])+".jpg")):
            batch.add(str(int(row[1])))
            if (len(batch) == args.batch_size):
                print(" ".join(batch))
                batch.clear()
    if len(batch):
        print(" ".join(batch))
        