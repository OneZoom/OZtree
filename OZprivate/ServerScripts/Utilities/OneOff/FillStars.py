#!/usr/bin/env python3
# -*- coding: utf-8 -*-
''' 
Temporary hack to fill out the number of 5*, 4*, 3* etc votes from EoL by visiting the data object page

NB - this is a useful SQL command to set an old updated date for all the items that have no rating_confidence 
available: these are mostly objects which have a more recent version available, with a different data_object_ID.
Setting an old updated time means that they will be early in the queue for updating.

update eol_updated set updated='2015-08-07 23:58:49' where eol in (select ordered_leaves.eol from (images_by_ott join ordered_leaves on images_by_ott.ott=ordered_leaves.ott) where images_by_ott.rating_confidence is null);

and to list these updated ('old') rows

SELECT * FROM eol_updated WHERE updated='2015-08-07 23:58:49';

'''

import re
import requests
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import codecs

import argparse
parser = argparse.ArgumentParser(description='Temporary hack to add star rating (rating_confidence) to EoL images')
parser.add_argument('database', help='name of the db containing ott images table. The database is specified in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>')
parser.add_argument('--images_table', default=['images_by_ott'], nargs="+", help="The images tables, each must contain a 'src_id' column containing the eol data object ids.")
parser.add_argument('--eol_src_flag', default="2", help="The number in the 'src' field of the images table which identifies those images whose src_id is an eol data object id")
parser.add_argument('--retries', '-r', type=int, default=5, help='number of times to retry getting the image')
parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info')

args = parser.parse_args()


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
        pw = getpass("Enter the sql database password: ")
    else:
        pw = match.group(2)
    db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8')
    subs="%s"
else:
    warn("No recognized database specified: {}".format(args.database))
    sys.exit()

format_url="http://eol.org/data_objects/{}"
rating_subexp=r"(?:.+?(\d) star.+?^(\d+))"
rating_regexp=r"^<dl class=.rating_counts.>{0}{0}{0}{0}{0}".format(rating_subexp)

rating_flags=re.MULTILINE | re.DOTALL
sess = requests.Session()
retries = Retry(total=args.retries,
                backoff_factor=1,
                status_forcelist=[ 500, 502, 503, 504 ])
sess.mount('http://', HTTPAdapter(max_retries=retries))

db_curs = db_connection.cursor()
for im_tab in args.images_table:
    db_curs.execute("SELECT DISTINCT src_id FROM {} WHERE src_id IS NOT NULL AND src = {} ORDER BY (rating_confidence IS NOT NULL), updated DESC;".format(im_tab, subs), args.eol_src_flag)
    rows = db_curs.fetchall()
    for i, row in enumerate(rows):
        EOL_data_object_id = int(row[0])
        if args.verbosity:
            print("{}: looking for ratings for EoL data object {}".format(i, EOL_data_object_id))
        response = sess.get(format_url.format(EOL_data_object_id),timeout=10)
        m = re.search(rating_regexp, response.text, rating_flags)
        if m:
            results = [int(x) for x in m.groups()]
            if args.verbosity:
                print("...found {}".format(results))
            #convert to dict
            star_votes = dict(zip(results[0::2], results[1::2]))
            total_votes = sum(star_votes.values())
            summary = total_votes << 5*8
            for stars in range(5):
                truncate_votes = min(star_votes[stars+1], 2 ** 8 -1) #can't have more than 1 byte (255 votes) per star rating
                summary = summary | (truncate_votes << stars*8)
            db_curs.execute("UPDATE {0} SET rating_confidence={1} WHERE src_id = {1};".format(im_tab, subs), (summary, EOL_data_object_id))
            db_connection.commit()
    db_curs.close()