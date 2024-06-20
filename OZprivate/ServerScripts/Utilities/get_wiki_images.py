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

def get_preferred_or_first_image_from_json_item(json_item):
    """
    Get the first preferred image, or the first image if there are no preferred images, from a Wikidata JSON item.
    """

    # P18 is the property for images
    try:
        images = [{
            "name": claim["mainsnak"]["datavalue"]["value"],
            "preferred": 1 if claim["rank"] == "preferred" else 0
        } for claim in json_item["claims"]["P18"]]
    except KeyError as e:
        # Some entries don't have images at all. Others like Q5733335 have a P18 but no images in it.
        return None

    image = next((image for image in images if image["preferred"]), None)
    if not image:
        # Fall back to the first non-preferred image if there are no preferred images
        image = images[0]

    return image

def get_vernaculars_from_json_item(json_item):
    """
    Get the vernacular names from a Wikidata JSON item in a given language.
    """

    # P1843 is the property for vernacular names
    try:
        lang_and_vernaculars = []
        known_canonical_vernaculars = set()
        for claim in json_item["claims"]["P1843"]:
        # for val in [vernacular_claim["mainsnak"]["datavalue"]["value"] for vernacular_claim in json_item["claims"]["P1843"]]:

            vernacular_info = {
                "name": claim["mainsnak"]["datavalue"]["value"]["text"],
                "language": claim["mainsnak"]["datavalue"]["value"]["language"],
                "preferred": 1 if claim["rank"] == "preferred" else 0
            }

            # There are often multiple vernaculars that only differ in case or punctuation.
            # We only want to keep one of each for a given language.
            canonical_vernacular = vernacular_info["language"] + "," + ''.join(filter(str.isalnum, vernacular_info["name"])).lower()
            if canonical_vernacular in known_canonical_vernaculars:
                continue
            known_canonical_vernaculars.add(canonical_vernacular)

            lang_and_vernaculars.append(vernacular_info)
        return lang_and_vernaculars
    except (KeyError, IndexError):
        return None

def enumerate_dump_items_with_images_or_vernaculars(wikipedia_dump_file):
    """
    Enumerate the items in a Wikidata JSON dump that have images.
    """

    for _, line in enumerate_lines_from_file(wikipedia_dump_file):
        if not (line.startswith('{"type":')):
            continue
        json_item = json.loads(line.rstrip().rstrip(","))

        image = get_preferred_or_first_image_from_json_item(json_item)
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

def get_image_license_info(escaped_image_name):
    """
    Use the Wikimedia API to get the license and artist for a Wikimedia image.
    """

    image_metadata_url = f"https://api.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata&titles=File%3a{escaped_image_name}&format=json&iiextmetadatafilter=License|LicenseUrl|Artist"

    r = make_http_request_with_retries(image_metadata_url)

    license_info = {}
    try:
        image_metadata = r.json()
        extmetadata = image_metadata["query"]["pages"]["-1"]["imageinfo"][0]["extmetadata"]

        license_info["artist"] = extmetadata["Artist"]["value"]
        # Strip the html tags from the artist
        license_info["artist"] = re.sub(r'<[^>]*>', '', license_info["artist"])

        license_info["license"] = extmetadata["License"]["value"]

        # If the license doesn't start with "cc" or "pd", we can't use it
        if not license_info["license"].startswith("cc") and not license_info["license"].startswith("pd"):
            logger.warning(f"Unacceptable license for '{escaped_image_name}': {license_info['license']}")
            return None
    except KeyError:
        return None
    
    try:
        license_info["license_url"] = extmetadata["LicenseUrl"]["value"]
    except KeyError:
        # Public domain images typically don't have a license URL
        license_info["license_url"] = None
    
    return license_info

def get_image_url(escaped_image_name):
    """
    Use the wikimedia API to get the image URL for a given image name.
    """

    # This returns JSON that contains the actual image URLs in various sizes
    image_location_url = f"https://api.wikimedia.org/core/v1/commons/file/{escaped_image_name}"

    r = make_http_request_with_retries(image_location_url)

    image_location_info = r.json()
    # Note that 'preferred' here refers to the preferred image *size*, not the preferred image itself
    image_url = image_location_info["preferred"]["url"]

    return image_url

def save_wiki_image_for_qid(ott, qid, image, src, rating, output_dir, check_if_up_to_date=True):
    """
    Download a Wikimedia image for a given QID and save it to the output directory.
    We keep both the uncropped and cropped versions of the image, along with the crop info.
    """

    wiki_image_url_prefix = "https://commons.wikimedia.org/wiki/File:"

    # Wikimedia uses underscores instead of spaces in URLs
    escaped_image_name = image["name"].replace(' ', '_')

    if check_if_up_to_date:
        # If we already have an image for this taxon, and it's the same as the one we're trying to download, skip it
        db_curs.execute("SELECT url FROM images_by_ott WHERE src={} and ott={};".format(subs, subs), (src, ott))
        res = db_curs.fetchone()
        if res:
            url = res[0]
            existing_image_name = url[len(wiki_image_url_prefix):]
            if existing_image_name == escaped_image_name:
                logger.info(f"Image for {ott} is already up to date: {image['name']}")
                return

    logger.info(f"Processing image for ott={ott} (qid={qid}): {image['name']}")

    license_info = get_image_license_info(escaped_image_name)
    if not license_info:
        logger.warning(f"Couldn't get license or artist for '{escaped_image_name};. Ignoring it.")
        return
    
    is_public_domain = license_info["license"] in {"pd", "cc0"}
    license_string = f"{license_info['license']} ({license_info['license_url']})" if license_info["license_url"] else license_info["license"]

    image_url = get_image_url(escaped_image_name)

    # We use the qid as the source id. This is convenient, although it does mean
    # that we can't have two wikidata images for a given taxon.
    image_dir = os.path.join(output_dir, str(src), subdir_name(qid))
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
    db_curs.execute(sql, (ott, src))

    # Insert the new image into the database
    wikimedia_url = f"https://commons.wikimedia.org/wiki/File:{escaped_image_name}"
    sql = "INSERT INTO images_by_ott (ott, src, src_id, url, rating, rating_confidence, best_any, best_verified, best_pd, overall_best_any, overall_best_verified, overall_best_pd, rights, licence, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {0}, {1});".format(subs, datetime_now)
    db_curs.execute(sql, (ott, src, qid, 
                            wikimedia_url, 
                            rating,
                            None,
                            1, # We only have one for the given src, so it's the best
                            1, # We're assuming that all wiki images are verified (i.e. shows correct species)
                            1 if is_public_domain else 0, # Only set this to 1 if the image is public domain
                            1, 1, 1, # These will need to be adjusted based on all images for the taxon
                            license_info["artist"],
                            license_string))
    db_connection.commit()

def save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars):
    """
    Save all vernacular names for a given QID to the database.
    Note that there can be multiple vernaculars for one language (e.g. "Lion" and "Africa Lion")
    """

    # Delete any existing wiki vernaculars for this taxon from the database
    sql = "DELETE FROM vernacular_by_ott WHERE ott={0} and src={0};".format(subs)
    db_curs.execute(sql, (ott, src_flags['wiki']))

    for vernacular in vernaculars:
        logger.info(f"Setting '{vernacular['language']}' vernacular for ott={ott} (qid={qid}): {vernacular['name']}")

        # The wikidata language could either be a full language code (e.g. "en-us") or just the primary code (e.g. "en")
        # We need to make sure that lang_primary is just the primary code
        lang_primary = vernacular["language"].split("-")[0]

        # Insert the new vernacular into the database
        sql = "INSERT INTO vernacular_by_ott (ott, vernacular, lang_primary, lang_full, preferred, src, src_id, updated) VALUES ({0}, {0}, {0}, {0}, {0}, {0}, {0}, {1});".format(subs, datetime_now)
        db_curs.execute(sql, (ott, vernacular["name"], lang_primary, vernacular["language"].split("-")[0], vernacular["preferred"], src_flags['wiki'], qid))

    db_connection.commit()

def process_leaf(ott_or_taxon, image_name=None, rating=None):
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

    # Three cases for the rating:
    # - If it's passed in for a bespoke image, use it
    # - If it's not passed in for a bespoke image, use 40000
    # - for non-bespoke images, use 35000
    if not rating:
        rating = 40000 if image_name else 35000

    # If a specific image name is passed in, use it. Otherwise, we need to look it up.
    # Also, if an image is passed in, we categorize it as a bespoke image, not wiki.
    json_item = get_wikidata_json_for_qid(qid)
    if image_name:
        image = { "name": image_name }
        src = src_flags['onezoom_bespoke']
    else:
        image = get_preferred_or_first_image_from_json_item(json_item)
        src = src_flags['wiki']
    save_wiki_image_for_qid(ott, qid, image, src, rating, output_dir)

    vernaculars = get_vernaculars_from_json_item(json_item)
    save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars)

def process_clade(ott_or_taxon, dump_file):

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
    LEFT OUTER JOIN (SELECT ott,src,vernacular FROM vernacular_by_ott WHERE src={}) as wiki_vernacular_by_ott ON ordered_leaves.ott=wiki_vernacular_by_ott.ott
    WHERE vernacular IS NULL AND ordered_leaves.id >= {} AND ordered_leaves.id <= {};
    """.format(subs, subs, subs, subs)
    db_curs.execute(sql, (src_flags['wiki'], leaf_left, leaf_right))
    leaves_without_vernaculars = dict(db_curs.fetchall())
    logger.info(f"Found {len(leaves_without_vernaculars)} taxa without a vernacular in the database")

    for qid, image, vernaculars in enumerate_dump_items_with_images_or_vernaculars(dump_file):
        if image and qid in leaves_without_images:
            ott = leaves_without_images[qid]
            save_wiki_image_for_qid(ott, qid, image, src_flags['wiki'], 35000, output_dir, check_if_up_to_date=False)
        if vernaculars and qid in leaves_without_vernaculars:
            ott = leaves_without_vernaculars[qid]

            save_all_wiki_vernaculars_for_qid(ott, qid, vernaculars)

def main():
    global db_connection, datetime_now, subs, db_curs, config, output_dir, language

    logging.debug('')  # Makes loggin work
    logger.setLevel(logging.INFO)

    parser = argparse.ArgumentParser(description=__doc__)

    subparsers = parser.add_subparsers(help='help for subcommand', dest="subcommand")

    def add_common_args(parser):
        parser.add_argument('--config_file', default=None, help='The configuration file to use. If not given, defaults to private/appconfig.ini')
        parser.add_argument('--output_dir', '-o', default=None, help="The location to save the cropped pictures (e.g. 'FinalOutputs/img'). If not given, defaults to ../../../static/FinalOutputs/img (relative to the script location). Files will be saved under output_dir/{src_flag}/{3-digits}/fn.jpg")

    parser_leaf = subparsers.add_parser('leaf', help='Process a single ott')
    parser_leaf.add_argument('ott_or_taxon', type=str, help='The leaf ott or taxon to process')
    parser_leaf.add_argument('image', nargs='?', type=str, help='The image to use for the given ott')
    parser_leaf.add_argument('rating', nargs='?', type=int, help='The rating for the image (defaults to 40000)')
    add_common_args(parser_leaf)

    parser_clade = subparsers.add_parser('clade', help='Process a full clade')
    parser_clade.add_argument('ott_or_taxon', type=str, help='The ott or taxon of the root of the clade')
    parser_clade.add_argument('dump_file', type=str, help='The wikidata JSON dump from which to get the images')
    add_common_args(parser_clade)
    
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
        process_leaf(args.ott_or_taxon, args.image, args.rating)
    elif args.subcommand == "clade":
        # Process all the images in the passed in clade
        process_clade(args.ott_or_taxon, args.dump_file)
    else:
        parser.print_help()
                            
if __name__ == "__main__":
    main()
