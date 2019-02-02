#!/usr/bin/env python3
'''
One off script to change to the new way of labelling images - WARNING - this makes
permanent DB changes and can only be run once (it is left here for reference). Please
read this initial documentation carefully

You are advised to run this piece by piece in an interactive terminal, on the development
server.

Instead of pics/12345.jpg, the new format uses

img/src/345/12345.jpg

where src is a number from src_flags, as defined in _OZglobals.py

For a server installation, yout might also want to change images.onezoom.org to point to
the correct dir (img, not pics), e.g. by altering nginx.conf

You will also need to make sure that the reservations table is the most recent one.
After running this, you may wish to remove the columns user_preferred_image and 
verified_preferred_image from the database (they are then redundent)

'''

import argparse
import re
import sys
import os
import shutil
import logging

top_level = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.path.pardir, os.path.pardir, os.path.pardir, os.path.pardir)

sys.path.append(os.path.abspath(os.path.join(top_level, "models")))
from _OZglobals import src_flags, eol_inspect_via_flags, image_status_labels

default_appconfig_file = "private/appconfig.ini"
parser = argparse.ArgumentParser(description='Transfer to new EoL V3')
parser.add_argument('--database', '-db', default=None, help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If not given, the script looks for the variable db.uri in the file {} (relative to the script location)'.format(default_appconfig_file))
parser.add_argument('--EOL_API_key', '-k', default=None, help='your EoL API key. If not given, the script looks for the variable api.eol_api_key in the file {} (relative to the script location)'.format(default_appconfig_file))

args = parser.parse_args()

if args.database is None:
    with open(os.path.join(top_level, default_appconfig_file)) as conf:
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
            elif conf_type == 'api':
                m = re.match('eol_api_key\s*=\s*(\S+)', line)
                if m:
                    args.EOL_API_key = m.group(1)

if args.database.startswith("sqlite://"):
    from sqlite3 import dbapi2 as sqlite
    db_connection = sqlite.connect(os.path.relpath(args.database[len("sqlite://"):], args.treedir))
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
    db_connection = pymysql.connect(
        user=match.group(1), passwd=pw, host=match.group(3), 
        db=match.group(4), port=3306, charset='utf8mb4')
    datetime_now = "NOW()"
    diff_minutes=lambda a,b: 'TIMESTAMPDIFF(MINUTE,{},{})'.format(a,b)
    subs="%s"


pic_path = os.path.join(top_level, "static/FinalOutputs/pics")
img_path = os.path.join(top_level, "static/FinalOutputs/img/{}".format(src_flags['eol_old']))
os.makedirs(img_path, exist_ok=True)


assert 'eol_old' in src_flags, "You need to use a new branch of the repo"

#change the old src=2 to the new src=eol_old
try:
    db_curs = db_connection.cursor()
    #transfer all old src ids to new
    db_curs.execute("UPDATE reservations SET user_preferred_image_src_id=user_preferred_image, user_preferred_image_src={} WHERE user_preferred_image >= 0".format(src_flags['eol_old']))
    db_curs.execute("UPDATE reservations SET user_preferred_image_src_id=-user_preferred_image, user_preferred_image_src={} WHERE user_nondefault_image > 0 AND user_preferred_image < 0".format(src_flags['onezoom_bespoke']))
    db_curs.execute("UPDATE reservations SET verified_preferred_image_src_id=verified_preferred_image, verified_preferred_image_src={} WHERE verified_preferred_image >= 0".format(src_flags['eol_old']))
    db_curs.execute("UPDATE reservations SET verified_preferred_image_src_id=-verified_preferred_image, verified_preferred_image_src={} WHERE user_nondefault_image > 0 AND verified_preferred_image < 0".format(src_flags['onezoom_bespoke']))
    db_connection.commit()
    
    db_curs.execute("UPDATE images_by_ott SET src={} WHERE src=2".format(src_flags['eol_old']))
    db_connection.commit()
    db_curs.close()
except:
    raise

db_curs = db_connection.cursor()
batch_size = 200
db_curs.execute("SELECT src_id FROM images_by_ott WHERE src={}".format(src_flags['eol_old']))
while True:
    #get the rows in batches
    rows = db_curs.fetchmany(batch_size)
    if not rows:
        break
    for row in rows:
        src_id = str(row[0])
        subdir = os.path.join(img_path, src_id[-3:])
        os.makedirs(subdir, exist_ok=True)
        f = os.path.join(pic_path, src_id+".jpg")
        if os.path.isfile(f):
            shutil.copyfile(f, os.path.join(subdir, src_id+".jpg"))

db_curs.close()


db_curs = db_connection.cursor()
sql = "UPDATE images_by_ott SET src={}, src_id=-src_id WHERE src=1 AND src_id < 0".format(src_flags['onezoom_bespoke'])
db_curs.execute(sql)
db_connection.commit()
db_curs.close()

img_path = os.path.join(top_level, "static/FinalOutputs/img/{}".format(src_flags['onezoom_bespoke']))
db_curs = db_connection.cursor()
batch_size = 200
db_curs.execute("SELECT src_id FROM images_by_ott WHERE src={}".format(src_flags['onezoom_bespoke']))
while True:
    #get the rows in batches
    rows = db_curs.fetchmany(batch_size)
    if not rows:
        break
    for row in rows:
        src_id = str(row[0])
        subdir = os.path.join(img_path, src_id[-3:])
        os.makedirs(subdir, exist_ok=True)
        f = os.path.join(pic_path, '-' + src_id+".jpg")
        if os.path.isfile(f):
            shutil.copyfile(f, os.path.join(subdir, src_id+".jpg"))

db_curs.close()


db_curs = db_connection.cursor()
sql = "UPDATE images_by_ott SET src={} WHERE src=1 AND src_id >= 0".format(src_flags['onezoom_via_eol'])
db_curs.execute(sql)
db_connection.commit()
db_curs.close()

img_path = os.path.join(top_level, "static/FinalOutputs/img/{}".format(src_flags['onezoom_via_eol']))
db_curs = db_connection.cursor()
batch_size = 200
db_curs.execute("SELECT src_id FROM images_by_ott WHERE src={}".format(src_flags['onezoom_via_eol']))
while True:
    #get the rows in batches
    rows = db_curs.fetchmany(batch_size)
    if not rows:
        break
    for row in rows:
        src_id = str(row[0])
        subdir = os.path.join(img_path, src_id[-3:])
        os.makedirs(subdir, exist_ok=True)
        f = os.path.join(pic_path, src_id+".jpg")
        if os.path.isfile(f):
            shutil.copyfile(f, os.path.join(subdir, src_id+".jpg"))

db_curs.close()
