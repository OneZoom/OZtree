#!/usr/bin/env python3
import argparse
import bz2
import configparser
import gzip
import json
import logging
import os
import re
import time
import requests
import sys

import urllib.request
from getEOL_crops import subdir_name
from db_helper import connect_to_database, read_config

# to get globals from ../../../models/_OZglobals.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir, os.path.pardir, os.path.pardir, "models")))
from _OZglobals import src_flags
import time

from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential

from PIL import Image

logger = logging.getLogger(__name__)

# Limit to English vernacular names for now
language = 'en'

def open_file_based_on_extension(filename, mode):
    # Open a file, whether it's uncompressed, bz2 or gz
    if filename.endswith(".bz2"):
        return bz2.open(filename, mode, encoding="utf-8")
    elif filename.endswith(".gz"):
        return gzip.open(filename, mode, encoding="utf-8")
    else:
        return open(filename, mode, encoding="utf-8")

def enumerate_lines_from_file(filename):
    # Enumerate the lines in a file, whether it's uncompressed, bz2 or gz
    with open_file_based_on_extension(filename, "rt") as f:
        for line_num, line in enumerate(f):
            yield line_num, line

def make_http_request_with_retries(url):
    """
    Make an HTTP GET request to the given URL with the given headers, retrying if we get a 429 rate limit error.
    """

    # See https://meta.wikimedia.org/wiki/User-Agent_policy
    wiki_http_headers = {
        "User-Agent": "OneZoomBot/0.1 (https://www.onezoom.org/; mail@onezoom.org) get-wiki-images/0.1"
    }

    retries = 6
    delay = 1
    for i in range(retries):
        r = requests.get(url, headers=wiki_http_headers)
        if r.status_code == 200:
            return r
        
        if r.status_code == 429:
            logger.warning(f"Rate limited on attempt {i+1}")
            time.sleep(delay)
            delay *= 2  # exponential backoff
        else:
            raise Exception(f"Error requesting {url}: {r.status_code} {r.text}")

    raise Exception(f"Failed to get {url} after {retries} attempts")


image_analysis_client = None

def get_image_crop_box(image_url):
    """
    Get the crop box for an image using the Azure Vision API.
    """
    global image_analysis_client

    # On the first call, create the image analysis client
    if not image_analysis_client:
        try:
            azure_vision_endpoint = config.get("azure_vision", "endpoint")
            azure_vision_key = config.get("azure_vision", "key")
        except configparser.NoOptionError:
            logger.error("Azure Vision API key not found in config file")
            sys.exit()

        image_analysis_client = ImageAnalysisClient(
            endpoint=azure_vision_endpoint,
            credential=AzureKeyCredential(azure_vision_key)
        )

    logger.info(f"Getting crop box for '{image_url}'")
    result = image_analysis_client.analyze_from_url(
        image_url,
        visual_features=[VisualFeatures.SMART_CROPS],
        smart_crops_aspect_ratios=[1.0],
    )

    return result.smart_crops.list[0].bounding_box

def get_images_from_json_item(json_item):
    """
    Get the image URLs from a Wikidata JSON item.
    """

    # P18 is the property for images
    if "P18" in json_item["claims"]:
        try:
            return [image["mainsnak"]["datavalue"]["value"] for image in json_item["claims"]["P18"]]
        except KeyError:
            # Some entries like Q5733335 have a P18 but no images. Ignore these.
            pass
    return None

def get_vernaculars_from_json_item(json_item):
    """
    Get the vernacular names from a Wikidata JSON item in a given language.
    """

    # P1843 is the property for vernacular names
    try:
        return [vernacular["mainsnak"]["datavalue"]["value"]["text"] for vernacular in json_item["claims"]["P1843"] if vernacular["mainsnak"]["datavalue"]["value"]["language"] == language]
    except (KeyError, IndexError):
        return None

def enumerate_dump_items_with_images(wikipedia_dump_file):
    """
    Enumerate the items in a Wikidata JSON dump that have images.
    """

    for _, line in enumerate_lines_from_file(wikipedia_dump_file):
        if not (line.startswith('{"type":')):
            continue
        json_item = json.loads(line.rstrip().rstrip(","))

        images = get_images_from_json_item(json_item)
        image = images[0] if images else None
        vernaculars = get_vernaculars_from_json_item(json_item)
        if image or vernaculars:
            qid = int(json_item["id"][1:])
            yield qid, image, vernaculars


def get_wikidata_json_for_qid(qid):
    """
    Use the Wikidata API to get the JSON for a given QID.
    This is faster than using the dump file when we only need a single item.
    Worth noting that this gets the latest version of the item, which may not be the same as the dump file.
    """

    wikidata_url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q{qid}&format=json"

    r = make_http_request_with_retries(wikidata_url)

    json = r.json()
    return json["entities"][f"Q{qid}"]

def get_image_license(escaped_image_name):
    """
    Use the Wikimedia API to get the license and artist for a Wikimedia image.
    """

    image_metadata_url = f"https://api.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata&titles=File%3a{escaped_image_name}&format=json&iiextmetadatafilter=License|LicenseUrl|Artist"

    r = make_http_request_with_retries(image_metadata_url)

    image_metadata = r.json()
    extmetadata = image_metadata["query"]["pages"]["-1"]["imageinfo"][0]["extmetadata"]

    # Strip the html tags from the artist
    artist = extmetadata["Artist"]["value"]
    artist = re.sub(r'<[^>]*>', '', artist)

    license = extmetadata["License"]["value"]
    try:
        license_url = extmetadata["LicenseUrl"]["value"]
        return f"{license} ({license_url})", f"© {artist}"
    except KeyError:
        # Public domain images typically don't have a license URL
        return f"{license}", f"© {artist}"

def get_preferred_image_url(escaped_image_name):
    """
    Use the wikimedia API to get the preferred image URL for a given image name.
    """

    # This returns JSON that contains the actual image URL in various sizes
    image_location_url = f"https://api.wikimedia.org/core/v1/commons/file/{escaped_image_name}"

    r = make_http_request_with_retries(image_location_url)

    image_location_info = r.json()
    image_url = image_location_info["preferred"]["url"]

    return image_url

def use_wiki_image_for_qid(ott, qid, image_name, output_dir, check_if_up_to_date=True):
    """
    Download a Wikimedia image for a given QID and save it to the output directory.
    We keep both the uncropped and cropped versions of the image, along with the crop info.
    """

    wiki_image_url_prefix = "https://commons.wikimedia.org/wiki/File:"

    # Wikimedia uses underscores instead of spaces in URLs
    escaped_image_name = image_name.replace(' ', '_')

    if check_if_up_to_date:
        # If we already have an image for this taxon, and it's the same as the one we're trying to download, skip it
        db_curs.execute("SELECT url FROM images_by_ott WHERE src=20 and ott={};".format(subs), ott)
        res = db_curs.fetchone()
        if res:
            url = res[0]
            existing_image_name = url[len(wiki_image_url_prefix):]
            if existing_image_name == escaped_image_name:
                logger.info(f"Image for {ott} is already up to date: {image_name}")
                return

    logger.info(f"Downloading image for ott={ott} (qid={qid}): {image_name}")

    license_string, artist = get_image_license(escaped_image_name)
    image_url = get_preferred_image_url(escaped_image_name)

    # We use the qid as the source id. This is convenient, although it does mean
    # that we can't have two wikidata images for a given taxon.
    image_dir = os.path.join(output_dir, str(src_flags['wiki']), subdir_name(qid))
    if not os.path.exists(image_dir):
        os.makedirs(image_dir)

    # Download the uncropped image
    uncropped_image_path = f"{image_dir}/{qid}_uncropped.jpg"
    urllib.request.urlretrieve(image_url, uncropped_image_path)

    # Get the crop box using the Azure Vision API
    crop_box = get_image_crop_box(image_url)

    # Crop and resize the image using PIL
    im = Image.open(uncropped_image_path)
    im = im.resize(
        (300, 300),
        box = (crop_box.x, crop_box.y, crop_box.x + crop_box.width, crop_box.y + crop_box.height)
    )
    im.save(f"{image_dir}/{qid}.jpg")

    # Save the crop info in a text file next to the image
    crop_info_path = f"{image_dir}/{qid}_cropinfo.txt"
    with open(crop_info_path, "w") as f:
        f.write(f"{crop_box.x},{crop_box.y},{crop_box.width},{crop_box.height}")

    # Delete any existing wiki images for this taxon from the database
    sql = "DELETE FROM images_by_ott WHERE ott={0} and src={0};".format(subs)
    db_curs.execute(sql, (ott, src_flags['wiki']))

    # Insert the new image into the database
    wikimedia_url = f"https://commons.wikimedia.org/wiki/File:{escaped_image_name}"
    sql = "INSERT INTO images_by_ott (ott, src, src_id, url, rating, rating_confidence, best_any, best_verified, best_pd, overall_best_any, overall_best_verified, overall_best_pd, rights, licence, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {1});".format(subs, datetime_now)
    db_curs.execute(sql, (ott, src_flags['wiki'], qid, 
                            wikimedia_url, 
                            25000,
                            None,
                            1,
                            1,
                            1,
                            1, 1, 1,
                            artist, license_string))
    db_connection.commit()

def save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars):
    """
    Save all vernacular names for a given QID to the database.
    Note that there can be multiple vernaculars for one language (e.g. "Lion" and "Africa Lion")
    """

    # Delete any existing wiki vernaculars for this taxon from the database
    sql = "DELETE FROM vernacular_by_ott WHERE ott={0} and src={0} and lang_primary={0};".format(subs)
    db_curs.execute(sql, (ott, src_flags['wiki'], language))

    for vernacular in vernaculars:
        logger.info(f"Setting vernacular for ott={ott} (qid={qid}): {vernacular}")

        # Insert the new vernacular into the database
        sql = "INSERT INTO vernacular_by_ott (ott, vernacular, lang_primary, lang_full, preferred, src, src_id, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {0}, {0}, {1});".format(subs, datetime_now)
        db_curs.execute(sql, (ott, vernacular, language, language, 1, src_flags['wiki'], qid))

    db_connection.commit()

def process_leaf_image(ott_or_taxon, image_name=None):
    # If ott_or_taxon is a number, it's an ott. Otherwise, it's a taxon name.
    sql = "SELECT ott,wikidata,name FROM ordered_leaves WHERE "
    if ott_or_taxon.isnumeric():
        sql += "ott={};".format(subs)
    else:
        sql += "name={};".format(subs)

    db_curs.execute(sql, ott_or_taxon)
    try:
        (ott, qid, name) = db_curs.fetchone()
    except TypeError:
        logger.error(f"'{ott_or_taxon}' not found in ordered_leaves table")
        return

    logger.info(f"Processing '{name}' (ott={ott}, qid={qid})")

    # If a specific image name is passed in, use it. Otherwise, we need to look it up.
    if not image_name:
        json_item = get_wikidata_json_for_qid(qid)
        images = get_images_from_json_item(json_item)
        # We use the first image, which is typically the preferred one
        image_name = images[0]
    use_wiki_image_for_qid(ott, qid, image_name, output_dir)

    vernaculars = get_vernaculars_from_json_item(json_item)
    save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars)

def process_clade_images(ott_or_taxon, dump_file):

    # Get the left and right leaf ids for the passed in taxon
    sql = "SELECT ott,name,leaf_lft,leaf_rgt FROM ordered_nodes WHERE "
    # If ott_or_taxon is a number, it's an ott. If it's a string, it's a taxon name.
    if ott_or_taxon.isnumeric():
        sql += "ott={};".format(subs)
    else:
        sql += "name={};".format(subs)
    db_curs.execute(sql, ott_or_taxon)
    try:
        (ott, name, leaf_left, leaf_right) = db_curs.fetchone()
    except TypeError:
        logger.error(f"'{ott_or_taxon}' not found in ordered_nodes table")
        return

    # Find all the leaves in the clade that don't have wiki images (ignoring images from other sources)
    sql = """
    SELECT wikidata, ordered_leaves.ott FROM ordered_leaves
    LEFT OUTER JOIN (SELECT ott,src,url FROM images_by_ott WHERE src={}) as wiki_images_by_ott ON ordered_leaves.ott=wiki_images_by_ott.ott
    WHERE url IS NULL AND ordered_leaves.id >= {} AND ordered_leaves.id <= {};
    """.format(subs, subs, subs)
    db_curs.execute(sql, (src_flags['wiki'], leaf_left, leaf_right))
    leaves_without_images = dict(db_curs.fetchall())
    logger.info(f"Found {len(leaves_without_images)} taxa without an image in the database")

    # Find all the leaves in the clade that don't have wiki vernaculars (ignoring vernaculars from other sources)
    sql = """
    SELECT wikidata, ordered_leaves.ott FROM ordered_leaves
    LEFT OUTER JOIN (SELECT ott,src,vernacular FROM vernacular_by_ott WHERE src={} and lang_primary={}) as wiki_vernacular_by_ott ON ordered_leaves.ott=wiki_vernacular_by_ott.ott
    WHERE vernacular IS NULL AND ordered_leaves.id >= {} AND ordered_leaves.id <= {};
    """.format(subs, subs, subs, subs)
    db_curs.execute(sql, (src_flags['wiki'], language, leaf_left, leaf_right))
    leaves_without_vernaculars = dict(db_curs.fetchall())
    logger.info(f"Found {len(leaves_without_vernaculars)} taxa without a vernacular in the database")

    for qid, image_name, vernaculars in enumerate_dump_items_with_images(dump_file):
        if image_name and qid in leaves_without_images:
            ott = leaves_without_images[qid]
            use_wiki_image_for_qid(ott, qid, image_name, output_dir, check_if_up_to_date=False)
        if vernaculars and qid in leaves_without_vernaculars:
            ott = leaves_without_vernaculars[qid]

            save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars)

def main():
    global db_connection, datetime_now, subs, db_curs, config, output_dir

    logging.debug('')  # Makes loggin work
    logger.setLevel(logging.INFO)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config_file', default=None, help='The configuration file to use. If not given, defaults to private/appconfig.ini')
    parser.add_argument('--output_dir', '-o', default=None, help="The location to save the cropped pictures (e.g. 'FinalOutputs/img'). If not given, defaults to ../../../static/FinalOutputs/img (relative to the script location). Files will be saved under output_dir/{src_flag}/{3-digits}/fn.jpg")

    subparsers = parser.add_subparsers(help='help for subcommand', dest="subcommand")

    parser_leaf = subparsers.add_parser('leaf', help='Process a single ott')
    parser_leaf.add_argument('ott_or_taxon', type=str, help='The leaf ott or taxon to process')
    parser_leaf.add_argument('image', nargs='?', type=str, help='The image to use for the given ott')

    parser_clade = subparsers.add_parser('clade', help='Process a full clade')
    parser_clade.add_argument('ott_or_taxon', type=str, help='The ott or taxon of the root of the clade')
    parser_clade.add_argument('dump_file', type=str, help='The wikidata JSON dump from which to get the images')
    
    args = parser.parse_args()

    config = read_config(args.config_file)
    database = config.get("db", "uri")

    if args.output_dir is None:
        args.output_dir = os.path.join( # up 3 levels from script, then down
            os.path.dirname(os.path.abspath(__file__)), 
            os.pardir,
            os.pardir,
            os.pardir,
            'static',
            'FinalOutputs',
            'img')
    output_dir = args.output_dir

    db_connection, datetime_now, subs = connect_to_database(database, None, None)
    db_curs = db_connection.cursor()

    if args.subcommand == "leaf":
        # Process one leaf, optionally forcing the specified image
        process_leaf_image(args.ott_or_taxon, args.image)
    elif args.subcommand == "clade":
        # Process all the images in the passed in clade
        process_clade_images(args.ott_or_taxon, args.dump_file)
    else:
        parser.print_help()
                            
if __name__ == "__main__":
    main()
