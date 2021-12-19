#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
This script takes a list of EoL data object IDs and queries the EoL API to get a filename and (potentially) a crop location, then downloads the full image file from EoL, crops it according to the crop positions, plus a certain percentage (if specified), and saves the jpg under the data object name, with copyright string and rating attached via EXIF tags. It requires the python package piexif (easy_install piexif OR pip install piexif) and the 'mogrify' command from the imagemagick suite (http://www.imagemagick.org/script/index.php)

ServerScripts/Utilities/getEOL_crops.py --DOid 7370441 --output_dir ../static/FinalOutputs/img/3 -v

To download all EoL data objects from a csv metadata file, where the EOL data object ID is in the (default) 5th column of the csv file try e.g.

ServerScripts/Utilities/getEOL_crops.py --file data/Metadata/EOL_leaf_common_names_and_picIDs.csv --csvfield 5 --output_dir ../static/FinalOutputs/img/3 -v

Note that you might want to force overwriting old files with the -w option, if you think any have changed.

If you want to create PNG files with circular cropped transparency (e.g. as in http://www.imagemagick.org/discourse-server/viewtopic.php?f=2&t=15492&p=54769&hilit=circle+mask#p54769)

convert XXX.jpg \( +clone -threshold -1 -negate -fill white -draw "circle 100,100 100,0" \) \
-alpha off -compose copy_opacity -composite XXX.png

To insert exif tags to a non-eol image try

python -c 'import piexif; piexif.insert(piexif.dump({"0th":{piexif.ImageIFD.Copyright:"© Sigrid März / CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/)".encode("utf8"), piexif.ImageIFD.Rating:40000}, "Exif":{}}), "Bolborhynchus_lineola.jpg")'

or 

python -c 'import piexif; piexif.insert(piexif.dump({"0th":{piexif.ImageIFD.Copyright:"© Frédéric Debruille".encode("utf8"), piexif.ImageIFD.Rating:45000}, "Exif":{}}), "Masdevallia-carruthersiana.jpg")'

"""
import os
import re
import sys
import filecmp
import logging

logger = logging.getLogger(__name__)
logging.EXTREME_DEBUG = logging.DEBUG - 1
logging.addLevelName(logging.EXTREME_DEBUG, "DEBUG++")

def convert_rating(rating):
    """
    Convert a 1-5 float rating (or blank string) to integer 10000-50000, which fits in
    an unsigned 2 byte number"""
    if rating == "":
        rating = 2.5
    return int(round(float(rating) * 10000))

def subdir_name(doID):
    """
    Make a valid subdirectory name in which to save images, based on the last 3 chars of
    the data object ID
    """
    subdir = str(doID)[-3:]
    assert os.path.sep not in subdir
    assert subdir not in (os.curdir, os.pardir)
    return subdir

def trimname(name):
    import html
    #take an author name and make it nicer
    name = html.unescape(name)
    name = re.sub(r'^\s*creator:?', '', name, flags=re.IGNORECASE) #common idiom to start wikicommons authors with e.g. Creator: Joseph Smit
    name = name.strip();
    name = re.sub(r'^(?:<.+?>)*unknown(?:<.+?>)*$', '', name, flags=re.IGNORECASE) #strip "unknown" and tags
    return name

def get_credit(json_dict, doID):
    '''return tuple of rights, license, e.g. ("© Scott Loarie", "CC-BY 3.0 (http://creativecommons.org/licenses/by/3.0/)")'''
    EOL_cc_rights_line = re.compile(",?\s*licensed under [\w\s]+ License license: (https?://creativecommons.org/licenses/[^)]+)", flags=re.I)
    licence = form_licence_from_url(json_dict['license'], doID)
    rights = ""

    if "rights" or "rightsHolder" in json_dict:
        rights = json_dict.get("rights", json_dict.get("rightsHolder", None))
        m = EOL_cc_rights_line.search(rights)
        if m:
            rights = EOL_cc_rights_line.sub("", rights)
            licence = form_licence_from_url(m.group(1), doID)
        logger.debug("RIGHTS for {}: {}".format(doID, json_dict['rights']))

    else:
    #must look in agents for person to credit
        json_agents = json_dict['agents']
        hardcoded = {"27690785":"André Karwath", '27690213':'Peter Scheunis', '26796822':'Knutschie', '26782099':'US National Parks Service', '27704397':'Stavenn','26808924':'Gorgo','26797569':'Rileypie', '26780634':'Dr. James P. McVey', '26814813':'Albert Kok', '26792737':'Jackie Reid','26844939':'Karl O. Stetter', '26844563':'Devonpike', '27081657':'Tokumi', '26823956':'Kitkatcrazy', '26817197':'Jos van Adrichem'}
        re_subs = {r'User at wikivoyage old\|\(WT-shared\)':''}
        valid_creator_types = ['photographer', 'fotografo', 'fotograaf', 'creator', 'author']
        try:
            rights = hardcoded[doID]
        except KeyError:
            creators = dict()
            for agent in json_agents:
                if agent['role'] in valid_creator_types:
                    cname = trimname(agent['full_name'])
                    for swapfrom,swapto in re_subs.items():
                        cname = re.sub(swapfrom, swapto, cname)
                    creators[agent['role']] = cname
            creators = [creators[a] for a in valid_creator_types if creators.get(a)]
            if len(creators) == 0:
                logger.info("No creator found for {} (source {}): {}".format(
                    doID, json_dict.get('source',None), json_agents))
            else:
                rights = ", ".join(creators)
                if len(creators) > 1:
                    logger.info("More than one type of creator not found in {}, returning {}: {}".format(identifier, ", ".join(creators), json_agents))
    if re.search(r'public domain$', licence) and re.search(r'^Original uploader was ', rights):
        rights = "" #try to kill off 'Original uploader' text, allowed for pd images, and probably misleading
    else:
        rights = re.sub(r'^\s*copyright\s*', '', rights, flags=re.I)
        rights = re.sub(r'^\s*©\s*', '', rights, flags=re.I)
        rights = u'© ' + rights;
    return(rights, licence)

def form_licence_from_url(url, doID):
    cc = re.compile(r'http://creativecommons.org/licenses/([-\w]+)/([\.\d]+)', re.IGNORECASE)
    pdmark = re.compile(r'http://creativecommons.org/publicdomain/mark/([\.\d]+)|Public\s*Domain', re.IGNORECASE)
    pd = re.compile(r'http://creativecommons.org/licenses/publicdomain/', re.IGNORECASE)
    
    m=pd.match(url)
    if m:
        return u'Released into the public domain\u009C'; 
    m=pdmark.match(url)
    if m:
        return u'Marked as being in the public domain\u009C';
    m=cc.match(url)
    if m:
        return 'CC-'+m.group(1).upper() + " " + m.group(2) + ' (' + url + ')';
    else:
        
        raise NameError("Could not match licence statement in '{}' for doID {}".format(url, doID))

def get_file_from_doID(doID, sess, output_dir, thumbnail_size, EOL_API_key, add_percent=12.5, force_overwrite=True):
    """
    Get a file using an EoL data object ID, querying the api to get url and crop coords.
    output_fn will have .jpg appended. Directories are created as necessary
    """
    import requests
    image_final = os.path.join(output_dir, str(doID) + '.jpg')
    if os.path.isfile(image_final) and not force_overwrite:
        logger.info("File {} already exists, ignoring.".format(image_final))
        return
    url = "http://eol.org/api/data_objects/1.0/{}.json".format(doID)
    logger.debug("Querying API for data object {} @ {}.".format(doID, url))
    try:
        r = sess.get(url, timeout=10,
            params={'cache_ttl':100, 'key':EOL_API_key, 'taxonomy':'false'})
    except requests.exceptions.Timeout:
        logger.warning('Socket timed out - URL {}'.format(url))
        return
    except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as error:
        logger.warning('Data not retrieved because {}\nURL: {}'.format(error, url))
        return

    EOLdata=r.json()['taxon']
    if len(EOLdata["dataObjects"]) > 0:
        if (len(EOLdata["dataObjects"]) > 1):
            logger.error("Something's odd: more than one data object was returned")
        else:
            dobj = EOLdata["dataObjects"][0]
            if "dataObjectVersionID" not in dobj:
                logger.error("Something's odd: no dataObjectVersionID in the data obj")
            elif str(dobj["dataObjectVersionID"]) != str(doID):
                logger.error("Something's odd: the returned data object ID is different"
                " from the requested one ({} vs {})".format(doID, dobj["dataObjectVersionID"]))        
            else:
                get_file_from_json_struct(dobj, output_dir, doID, thumbnail_size, add_percent)

def get_file_from_json_struct(data_obj_json_struct, output_dir, fn, thumbnail_size, add_percent=12.5):
    """
    Get and crop a file using data present in an EoL json response, which includes object ID, crop info, etc
    Return the rights & license, or None if something failed.  Directories are created as necessary
    """
    #NB: image_cols = ['dataObjectVersionID','eolMediaURL','vettedStatus','dataRating','crop_x', 'crop_y', 'crop_width']
    #note that crop_width is in percent ****
    import shutil
    from subprocess import call
    import urllib.request
    import urllib.error

    import piexif

    CONVERT = shutil.which('convert') #needed in windows, to get the correct 'convert' command
    d=data_obj_json_struct
    fn = str(fn)
    os.umask(0o002) #set group write so that the normal login has same rights as the web server 
    os.makedirs(output_dir, exist_ok=True)
    if 'eolMediaURL' not in d:
        logger.error("'eolMediaURL' must be present in data object {}.".format(d))
        return None
    try:
        output_fn = os.path.join(output_dir, fn)
        image_orig = output_fn + '_orig.jpg'
        image_intermediate = output_fn + '_tmp.jpg'
        image_final = output_fn + '.jpg'
        logger.info("Downloading {} to {}.".format(d['eolMediaURL'], image_orig))
        try:
            urllib.request.urlretrieve(d['eolMediaURL'], image_orig)
            os.chmod(image_orig, 0o664) #allow both the webserver and the web2py user (both in the same group) to overwrite these files
        except urllib.error.HTTPError as err:
            if err.code == 404:
                logger.warning("404: File '{0}' missing for data object {1} @ http://eol.org/data_objects/{1}".format(d['eolMediaURL'], image_orig))
                return None
            else:
                raise
        #calculate fractions as proportion of square thumbnail
        try:
            initial_thumb_px = float(d['crop_width'])
            if initial_thumb_px < 1:
                raise KeyError  # The crop_width is not really a valid value: pretend it wasn't there
            crop_top_fraction = float(d['crop_y'])/initial_thumb_px
            crop_bottom_fraction = (float(d['height']) - float(d['crop_y']) - initial_thumb_px)/initial_thumb_px
            crop_left_fraction = float(d['crop_x'])/initial_thumb_px
            crop_right_fraction = (float(d['width']) - float(d['crop_x']) - initial_thumb_px)/initial_thumb_px
            
            min_crop_fraction = min(crop_top_fraction, crop_bottom_fraction, crop_left_fraction, crop_right_fraction)
            if min_crop_fraction < 0:
                #the crop is right against the corner, and we cannot make it bigger
                top = str(int(round(float(d['crop_y']))))
                left = str(int(round(float(d['crop_x']))))
                size = str(int(round(float(d['crop_width']))))
                if add_percent>0:
                    logger.debug("Cannot expand crop for data object {} by {}%: image is against the edge.".format(fn, add_percent))
            else:
                if min_crop_fraction > add_percent/100.0:
                    min_crop_fraction = add_percent/100.0
                else:
                    if add_percent>0:
                        logger.debug("NOTICE: Cannot expand crop for data object {} by {}%: borders are not large enough, so using {}%.".format(fn, add_percent, min_crop_fraction*100))
                min_crop_pixels = min_crop_fraction * initial_thumb_px
                top = str(int(round(float(d['crop_y']) - min_crop_pixels)))
                left = str(int(round(float(d['crop_x']) - min_crop_pixels)))
                size = str(int(round(initial_thumb_px + 2*min_crop_pixels)))
                logger.log(logging.EXTREME_DEBUG, "crop info: {}...{}, {}".format(initial_thumb_px, 2*min_crop_pixels, size))
            cmd = [CONVERT, image_orig, '-crop', size+'x'+size+'+'+left+'+'+top, '+repage', 
                   '-resize', str(thumbnail_size)+'x'+str(thumbnail_size), image_intermediate
                   ]
            logger.debug("Custom crop: {}.".format(" ".join(cmd)))
        except KeyError:
            #hasn't got crop info: use default
            cmd = [CONVERT, image_orig, '-gravity', 'Center', 
                   '-resize', str(thumbnail_size)+'x'+str(thumbnail_size)+'^', "-extent", str(thumbnail_size)+'x'+str(thumbnail_size), image_intermediate
                   ]
            logger.debug("Default crop: {}.".format(" ".join(cmd)))
        call(cmd)
        r, l = get_credit(d, fn)
        copyright_str = ' / '.join([r, l])
        rating = convert_rating(d['dataRating']) #EXIF 'Rating' is 16bit unsigned, i.e. 0-65535. EoL ratings are 0-5 floating point, so for ease of mapping we multiply EOL ratings by 10,000 to get ratings from 0-50,000
        #call(['exiftool', '-q', '-codedcharacterset=utf8', '-IPTC:Contact='+'http://eol.org/data_objects/'+fn, '-IPTC:Credit='+r, '-IPTC:CopyrightNotice='+l, '-overwrite_original', '-m', image_orig])
        piexif.insert(piexif.dump({"0th":{piexif.ImageIFD.Copyright:copyright_str.encode("utf8"), piexif.ImageIFD.Rating:rating}, "Exif":{}}), image_intermediate)
        logger.info("Downloaded with rating {} and cropped into {}".format(rating, image_intermediate))
    except OSError as e: 
        logger.error("Cannot call 'convert' properly: {}\n Have you installed Imagemagick?".format(e))      
        return None
    try:
        os.remove(image_orig)
        os.chmod(image_intermediate, 0o664) #allow both www & web2py to overwrite, etc
        if os.path.exists(image_final) and filecmp.cmp(image_intermediate, image_final, shallow=False):
            logger.info("Deleted large original, but cropped version is identical to old image ({}), so not replacing".format(image_final))
            os.remove(image_intermediate)
        else:
            os.replace(image_intermediate, image_final)
            logger.info("Deleted large original and moved cropped image from {} into {}".format(image_intermediate, image_final))
    except OSError as e: 
        logger.warning("Could not remove the original downloaded file, or move the new file to its final place: {} \nPerhaps EoL has a problem.".format(e))      
        return None
    return (r,l)

if __name__ == "__main__":
    import requests
    from requests.packages.urllib3.util.retry import Retry
    from requests.adapters import HTTPAdapter
    import argparse
    import csv

    class writeable_dir(argparse.Action):
        def __call__(self,parser, namespace, values, option_string=None):
            prospective_dir=values
            if not os.path.isdir(prospective_dir):
                raise argparse.ArgumentTypeError("writeable_dir:{0} is not a valid path".format(prospective_dir))
            if os.access(prospective_dir, os.W_OK):
                setattr(namespace,self.dest,prospective_dir)
            else:
                raise argparse.ArgumentTypeError("writeable_dir:{0} is not a writeable dir".format(prospective_dir))

    default_appconfig_file = "../../../private/appconfig.ini"
    parser = argparse.ArgumentParser(description='Download and crop images from Encyclopedia of Life data object IDs.')
    parser.add_argument('--file',  type=argparse.FileType('r'), help='A csv file containing EOL data_object ids')
    parser.add_argument('--start_after', type=int, help='An EOL data_object id: processing will skip until this id is encountered. This allows us to pick up from an aborted run')
    parser.add_argument('--csvfield',  type=int, default=1, help='Treat the file as a csv file, and pick this field from each row')
    parser.add_argument('--DOid',  type=int, nargs='*', help='An EOL data object ID')
    parser.add_argument('--output_dir', '-o', default='./', action=writeable_dir, help='Base dir to which to write images')
    parser.add_argument('--omit_suffix_dir', '-s', action="store_true", help='To avoid folders containing hundreds of thousands of files, we normally put images within a subdirectory, labelled with the last 3 characters of the filename. Giving this flag will stop this behaviour')
    parser.add_argument('--add_percent', '-a', default=12.5, type=float, help='extra percentage each side to expand the crop, if possible, useful e.g. if a circular crop is required, to try and avoid trimming corners off')
    parser.add_argument('--thumbnail_size', '-t', type=int, choices=range(0, 1000), default=150, help='maximum width in pixels of thumbnail produced')
    #parser.add_argument('--force_size', '-z', action="store_true", help="force the thumbnail to be the maximum size (don't allow smaller thumbnails for small pictures)")
    parser.add_argument('--force_overwrite', '-f', action="store_true", help='download and crop even if the image file already exists')
    parser.add_argument('--retries', '-r', type=int, default=5, help='number of times to retry getting the image')
    parser.add_argument('--verbosity', '-v', action="count", default=0, help='verbosity: output extra non-essential info')
    parser.add_argument('--EOL_API_key', '-k', default=None, help='your EoL API key. If not given, the script looks for the variable api.eol_api_key in the file {} (relative to the script location)'.format(default_appconfig_file))
    args = parser.parse_args()
    if args.verbosity <= 0:
        logging.basicConfig(level=logging.WARN) 
    elif args.verbosity == 1:
        logging.basicConfig(level=logging.INFO) 
    elif args.verbosity == 2:
        logging.basicConfig(level=logging.DEBUG) 
    elif args.verbosity > 2:
        logging.basicConfig(level=logging.EXTREME_DEBUG) #super-verbose output 
    
    if args.EOL_API_key is None:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)) as conf:
            conf_type=None
            for line in conf:
            #look for [db] line, followed by uri
                m = re.match(r'\[([^]]+)\]', line)
                if m:
                    conf_type = m.group(1)
                if conf_type == 'api' and args.EOL_API_key is None:
                    m = re.match('eol_api_key\s*=\s*(\S+)', line)
                    if m:
                        args.EOL_API_key = m.group(1)

    #make a single http session, which we can tweak
    s = requests.Session()
    retries = Retry(total= args.retries,
                    backoff_factor=2,
                    status_forcelist=[ 500, 502, 503, 504 ])
    s.mount('http://', HTTPAdapter(max_retries=retries))
                
    if args.omit_suffix_dir: 
        save_dir = lambda DOid: args.output_dir
    else:
        save_dir = lambda DOid: os.path.join(args.output_dir, subdir_name(DOid))
    
    if args.DOid:
        for d in args.DOid:
            get_file_from_doID(d, s, save_dir(d), args.thumbnail_size, args.EOL_API_key,
                               args.add_percent, args.force_overwrite)
    if args.file:
        with args.file as f:
            reader = csv.reader(f)
            for line in reader:
                if len(line) > args.csvfield-1:
                    try:
                        if (args.start_after is None):
                            d=str(int(line[args.csvfield-1]))
                            get_file_from_doID(d, s, save_dir(d), args.thumbnail_size, args.EOL_API_key, 
                                               args.add_percent, args.force_overwrite)
                        else:
                            try:
                                if args.start_after == int(line[args.csvfield-1]):
                                    args.start_after = None
                            except ValueError:
                                pass
    
                    except ValueError:
                        if line[args.csvfield-1] != '':
                            try:
                                logger.warning("Could not convert '{}' to an EoL data object ID".format(line[args.csvfield-1]))
                            except:
                                logger.warning("Could not convert field {} to an EoL data object ID for line :'{}'".format(args.csvfield-1, ",".join(line)))
                    except IndexError:
                        logger.warning("Could not get index {} from {}".format(args.csvfield,line))              
    
