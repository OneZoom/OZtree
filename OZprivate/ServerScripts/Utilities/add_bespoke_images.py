#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This script adds a set of "bespoke" images to the OneZoom site, either adding to
or completely replacing the existing images. This allows OneZoom users to
customise their own version of OneZoom. If running from a docker image, the
image should be saved to a new version (e.g. customised_image)  using e.g.

docker commit --change="CMD /sbin/my_init" running_onezoom myorg/customised_image
"""
import argparse
import collections
import fileinput
import itertools
import json
import logging
import operator
import os
import subprocess
import shutil
import sys
import re
import urllib.request

from getpass import getpass
from iptcinfo3 import IPTCInfo
import pymysql

app_base_dir = os.path.join(
    os.path.abspath(os.path.dirname(__file__)), os.path.pardir, os.path.pardir, os.path.pardir)
sys.path.append(os.path.join(app_base_dir, "models"))
sys.path.append(os.path.join(app_base_dir, "modules"))

from _OZglobals import src_flags
import img

logger = logging.getLogger(__name__)

default_appconfig_file = os.path.join(app_base_dir, "private", "appconfig.ini")
picProcess = os.path.join(os.path.abspath(os.path.dirname(__file__)), "picProcess.py")

Img = collections.namedtuple("Img", "path, name, ott, rating, rights, licence, url, pd")

class Images:
    image_list = collections.defaultdict(dict)

    def add(self, path, default_rating, context=None, force_pd=False):
        """
        Add an image to the list, looking up the name using the OpenTree TNRS if no OTT
        ID is present in the file name. If force_pd=True, flag this as a public domain
        image.
        """
        pd = False
        fn = os.path.basename(path)
        m = re.match(r"(\d*)[_ ]*(ott_?(\d+))?[_ ]*(.+)\.jpe?g$", fn, re.IGNORECASE)
        if not m:
            raise ValueError(f"File {filename} does not match the expected pattern")
        rating, ott, name = m.group(1), m.group(3), m.group(4)
        name = name.replace("_", " ")
        # Look in IPTC IIM data
        iptc = IPTCInfo(path, force=True)
        source = iptc["source"] or None
        copyright = iptc["copyright notice"] or None
        copyright = copyright.decode() if copyright else None
        if copyright and re.match(r"(public domain)|(CC0)", copyright, re.IGNORECASE):
            pd = True
        if force_pd and not pd:
            pd = True
            if not copyright:
                copyright = ""
            else:
                copyright += (" " if  copyright.endswith(".") else ". ")
            copyright += "Released into the public domain"
        credit = iptc["credit"] or None
        image = Img(
            path=path,
            name=name,
            ott=int(ott) if ott else None,
            rating=int(rating) if rating else int(default_rating),
            rights=credit.decode() if credit else None,
            licence=copyright,
            url=source.decode() if source else None,
            pd=pd,
        )
        logger.debug(f"Found {image}")
        self.image_list[context][name] = image
    
        
    def find_otts(self):
        for context, images in self.image_list.items():
            logger.debug(f"Context '{context}'")
            unmapped_names = [k for k, v in images.items() if not v.ott]
            n_batch = 250  # Batch into requests of 250 names per taxon context
            for i in range(0, len(unmapped_names), n_batch):
                logger.debug(f"Getting max of {n_batch} OTTs starting from name {i}")
                data = {"context_name": context} if context else {}
                data["names"] = unmapped_names[i:i + n_batch]
                req = urllib.request.Request(
                    "https://api.opentreeoflife.org/v3/tnrs/match_names",
                    data=json.dumps(data).encode(), # e.g. "names":["Aster","Barnadesia"]
                    headers={"content-type": "application/json"},
                )
                tnrs = json.load(urllib.request.urlopen(req))
                for match in tnrs["results"]:
                    image = images[match["name"]]
                    matches = match["matches"]
                    if len(matches) > 1:
                        logging.warning(f"{img.name} matches more than one OTT id: ignoring")
                    elif len(matches) < 1:
                        logging.warning(f"{img.name} not matched against any OTT id: ignoring")
                    else:
                        images[match["name"]] = image._replace(
                            ott=matches[0]["taxon"]["ott_id"])

    def save(self, db_connection, src_flag=None, delete_existing=False):
        """
        Copy and rename the image files and add details to the database, in alphabetical
        order. If delete_existing, remove the existing image details from the database.
        
        """
        if src_flag is None:
            src_flag = src_flags['bespoke']
        src = int(src_flag)
        min_src_id = 0
        db_curs = db_connection.cursor()
        db_curs.execute(f"SELECT MAX(src_id) FROM images_by_ott WHERE src = {src_flag};")
        r = db_curs.fetchone()
        if r and r[0] is not None:
            min_src_id = int(r[0]) + 1
        db_curs.close()
                    
        images = [i for v in self.image_list.values() for i in v.values() if i.ott]
        images.sort(key=operator.attrgetter("name"))
        
        if delete_existing:
            logger.debug("Deleting exising images from database")
            db_curs = db_connection.cursor()
            db_curs.execute("TRUNCATE images_by_ott;")
            db_curs.close()

        
        
        db_image_fields = [f for f in Img._fields if f not in ("path", "name", "pd")]
        
        img_dir = os.path.join(app_base_dir, img.local_path)
        db_curs = db_connection.cursor()
        for i, image in enumerate(images):
            logger.debug(f"Adding image of {image.name} (ott {image.ott}) to database")
            ott = image.ott
            src_id = min_src_id + i
            save_to = os.path.join(img_dir, img.thumb_path(src, src_id))
            os.makedirs(save_to, exist_ok=True)
            shutil.copy(image.path, img.thumb_url(img_dir, src, src_id))
            # Now do DB manipulations
            best_cols = ["best_any", "best_verified"]
            if image.pd:
                best_cols.append("best_pd")
            sql = ",".join([f"{cname}=0, overall_{cname}=0" for cname in best_cols])
            logger.debug(
                f"Running `UPDATE images_by_ott SET {sql} WHERE ott={image.ott};`")
            db_curs.execute(f"UPDATE images_by_ott SET {sql} WHERE ott={image.ott};")
            db_vals = {"src": str(src), "src_id": str(src_id), "updated": "NOW()"}
            db_vals.update({"best_pd" : "0", "overall_best_pd" : "0"})  # Poss overwritten below
            db_vals.update({name: "1" for name in best_cols})
            db_vals.update({"overall_" + name: "1" for name in best_cols})
            for field in db_image_fields:
                val = getattr(image, field)  
                if val is not None:
                    db_vals[field] = f"'{val}'" if val == str(val) else str(val)
            db_k, db_v = ",".join(db_vals.keys()), ",".join(db_vals.values())
            logger.debug(
                f"Running `INSERT INTO images_by_ott ({db_k}) VALUES ({db_v});`")
            db_curs.execute(f"INSERT INTO images_by_ott ({db_k}) VALUES ({db_v});")
        db_connection.commit()
        db_curs.close()


def get_db_connection(dbstring=None, port=3306, charset='utf8mb4'):
    """
    dbstring should be of the form mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
    """
    if dbstring is None:
        fn = os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)
        with open(fn) as conf:
            conf_type=None
            for line in conf:
            #look for [db] line, followed by uri
                m = re.match(r'\[([^]]+)\]', line)
                if m:
                    conf_type = m.group(1)
                if conf_type == 'db' and dbstring is None:
                    m = re.match('uri\s*=\s*(\S+)', line)
                    if m:
                        dbstring = m.group(1)
        if dbstring is None:
            raise ValueError(f"Could not find a database string in {fn}")
    if not dbstring.startswith("mysql://"):
        raise ValueError(get_db_connection.__doc__)
        
    match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', dbstring.strip())
    if match.group(2) == '':
        #enter password on the command line, if not given (more secure)
        if args.script:
            pw = input("pw: ")
        else:
            pw = getpass("Enter the sql database password: ")
    else:
        pw = match.group(2)
    return pymysql.connect(
        user=match.group(1),
        passwd=pw,
        host=match.group(3),
        db=match.group(4),
        port=port,
        charset=charset,
    )
    
def check_and_modify_appconfig():
    """
    Modify the appconfig file to make sure we are using local images
    """
    needs_modifying = False
    fn = os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)
    with open(fn, "rt") as f:
        for line in f:
            if re.match(r"\s*url_base\s*=", line):
                needs_modifying = True
                break
    if needs_modifying:
        backup_ext = ".bak"
        logger.warning(
            f"Modifying {fn} to ensure local images used. " +
            f"Original saved with '{backup_ext}' extension.")
        with fileinput.input(files=[fn], backup=backup_ext, inplace=True) as f:
            for line in f:
                if not re.match(r"\s*url_base\s*=", line):
                    print(line.rstrip())

def get_contexts():
    # Make POST request and return set of standard taxon contexts
    logger.debug("Getting taxon contexts from OpenTree:")
    request = urllib.request.urlopen(
        'https://api.opentreeoflife.org/v3/tnrs/contexts', data=b'')
    data = json.load(request)
    return {context for values in data.values() for context in values}

def main(args):
    taxon_contexts = None
    console = logging.StreamHandler()
    logger.addHandler(console)
    if args.verbosity <= 0:
        logger.setLevel(logging.WARN)
    elif args.verbosity == 1:
        logger.setLevel(logging.INFO)
    elif args.verbosity > 1:
        logger.setLevel(logging.DEBUG)
        taxon_contexts = get_contexts()
        logger.debug(str(taxon_contexts))

    src_flag = args.src_flag if args.src_flag is None else src_flags['bespoke']
    # Find the images in image_dir
    images = Images()
    dir = args.image_dir
    if dir is None:
        raise ValueError("You must specify a directory containing jpg images")
    db_conn = get_db_connection(args.database)
    check_and_modify_appconfig()
    logger.debug(f"Scanning {dir} for image files")
    with os.scandir(dir) as a:
        for entry in a:
            if not entry.name.startswith('.'):
                if entry.is_dir():
                    context = entry.name
                    if taxon_contexts is None:
                        taxon_contexts = get_contexts()
                    if context not in taxon_contexts:
                        logger.warning(f"Unrecognised taxon context: {context}")
                    else:
                        with os.scandir(os.path.join(dir, context)) as b:
                            for entry in b:
                                if (not entry.name.startswith('.')
                                    and re.search(r"\.jpe?g$", entry.name)
                                ):
                                    images.add(
                                        os.path.join(dir, context, entry.name),
                                        args.default_rating,
                                        context=context,
                                        force_pd=args.force_public_domain,
                                    )
                else:
                    images.add(
                        os.path.join(dir, entry.name),
                        args.default_rating,
                        force_pd=args.force_public_domain,
                    )
    
    images.find_otts()
    images.save(db_conn, src_flag=src_flag, delete_existing=args.delete_existing)
    if not args.skip_processing:
        logger.info(f"running {picProcess}: this may take some time")
        subprocess.run(
            [picProcess] + (["-" + "v"*args.verbosity] if args.verbosity else []))
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "image_dir",
        nargs="?",
        default=None,
        help="A dir of jpgs, or dirs of jpgs named by OpenTree 'contexts' (e.g. All_life)",
        # taxon contexts can be obtained as per
        # https://github.com/OpenTreeOfLife/germinator/wiki/TNRS-API-v3#contexts
        )
    parser.add_argument(
        "--force_public_domain",
        action="store_true",
        help=(
            "Flag up all the added images as public domain for OneZoom, otherwise "
            "images are treated as public domain only if their IPTC 'copyright notice' "
            "contains the words 'public domain' or 'CC0'. If this flag is specified, "
            "but the copyright notice does not contain these terms, the licence text "
            "will have 'Released into the public domain' appended."
        )
    )
    parser.add_argument(
        "--src_flag",
        help="The src_flag number to use in the db. Defaults to {src_flags['bespoke']}"
    )
    parser.add_argument(
        "--default_rating",
        type=int,
        default=25000,
        help="The default rating to give each image, if not specified in the filename."
    )
    parser.add_argument(
        "--database",
        help=(
            "A database string of the format `mysql://<user>:<pass>@host/<db>`." +
            f"If None use the db.uri string defined in {default_appconfig_file}"
        )
    )
    parser.add_argument(
        "--delete_existing",
        "-d",
        action="store_true",
        help="Delete references to existing images in the database",
    )
    parser.add_argument(
        "--skip_processing",
        "-s",
        action="store_true",
        help="Do not run picProcess.py, to calculates representative pics on internal nodes",
    )
    parser.add_argument(
        '--script',
        action="store_true",
        help="Don't use 'getpass' to get the password, so it can be scriptified",
    )
    parser.add_argument('--verbosity', "-v", action="count", default=0,
        help="Verbosity level (specifying 2, or -vv, will print a list of concepts)")
    
    main(parser.parse_args())
