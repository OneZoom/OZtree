#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Looks for EoL ids in a database table, finds the least recently updated ones, and 
gradually queries them, 15 ids at a time.

queries leaves for images and common names, and nodes for just common names

NB: the images for higher-level taxa are untrustworthy, so we just get pictures for leaves, not nodes, and allow
our own algorithm to percolate images to higher levels.

test with e.g. for humans, 7 spot ladybird, and placental mammals

./EoLQueryPicsNames.py -ott 770315 343294 683263
'''

import os
import stat
import sys
import re
import csv
import time
import random
import requests
import html
import argparse
import codecs
from collections import OrderedDict
from datetime import datetime
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from itertools import islice

## Local packages
from getEOL_crops import get_credit, get_file_from_json_struct, warn
# to get globals from ../../../models/_OZglobals.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir, os.path.pardir, os.path.pardir, "models")))
from _OZglobals import src_flags, eol_inspect_via_flags, image_status_labels

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''


name_length_chars = 190
loop_starttime = 0
loop_num=0
cache_ttl_hack = random.randint(1000, 50000)

def info(*objs):
    """
    if you use this you have to define a global variable 'verbosity'
    """
    try:
        if verbosity<1:
            return
    except:
        pass;
    print(*objs, file=sys.stdout, flush=True)

def store_vote_ratings_in_bytes(ratings):
    """
    As described in db.py: A measure of the confidence in the rating of images: the lowest 5 bytes in 
    the number store the number of votes for each star, and the higher bytes store the total number of votes.
    Expects a dictionary like {'1': 0, '2': 0, '3': 4, '4': 0, '5': 6}
    """
    try:
        total =  (ratings['1'] + ratings['2'] + ratings['3'] + ratings['4'] + ratings['5']) << (5*8)
        total += (ratings['5'] << 4*8)
        total += (ratings['4'] << 3*8)
        total += (ratings['3'] << 2*8)
        total += (ratings['2'] << 1*8)
        total += (ratings['1'] << 0*8)
    except:
        total = None
    return(total)

def lookup_and_save_bespoke_EoL_images(eol_dataobject_to_ott, sess, API_key, db_connection, images_table, loop_seconds=None):
    """
    Given a mapping of EOL data object ids to OTT ids, call the EoL data object API repeatedly for all these 
    EOL ids to get source and crop info. Save the image as 'onezoom' type in the images table, with an updated time 
    
    We also put a delay in here to avoid overloading the EoL API
    """
    db_cursor = db_connection.cursor()
    loop_seconds=loop_seconds or 5.0 #don't mind blatting EoL for a small set of bespoke images
    global loop_num
    global loop_starttime
    global cache_ttl_hack

    #sort this in case we have multiple doIDs for a single ott (e.g. a public domain one)
    ott2eol = {ott:[] for ott in eol_dataobject_to_ott.values()}
    for eol, OTTid in eol_dataobject_to_ott.items():
        ott2eol[OTTid].append(eol)
    
    try:    
        for OTTid, eol_doIDs in ott2eol.items():
            images_for_eol = {}
            for eol_doID in eol_doIDs:
                loop_num+=1
                if time.time() - loop_starttime < loop_seconds:
                    wait = abs(loop_seconds - (time.time() - loop_starttime))
                    info("Waiting {} seconds so that next query occurs at least {} seconds later".format(wait, loop_seconds))
                    time.sleep(wait)
                loop_starttime = time.time()
                url = "http://eol.org/api/data_objects/1.0/{}.json".format(eol_doID); #see http://eol.org/api/docs/pages
                cache_ttl_hack = cache_ttl_hack + 1 if cache_ttl_hack<50000 else 1000
                pages_params = {
                    'key'            : API_key,
                    'taxonomy'       : 'false',
                    'language'       : 'en',
                    'cache_ttl'      : cache_ttl_hack, #only cache for X secs
                }
                
                #NB we must replace all rows of images for this OTTid
                #On pass 1 we can get the common names as well as a verified image (vetted = 1)
                response = sess.get(url,params=pages_params, timeout=10)
                if verbosity > 2:
                    info("Getting {}".format(response.url))
                if response:
                    data = response.json()
                    if data.get('dataObjects'):
                        #this is where we do most of the hard work figuring out which images to use & flag up
                        d=data['dataObjects'][0]
                        images_for_eol[eol_doID]={'best_{}'.format(s):0 for s in image_status_labels}
                        images_for_eol[eol_doID]['json']=d
                        images_for_eol[eol_doID]['any']=d['dataRating']*10000
                        if d['vettedStatus']=='Trusted':
                            images_for_eol[eol_doID]['verified']=d['dataRating']*10000
                        if get_credit(d, eol_doID, verbosity)[1].endswith('\u009C'):
                            images_for_eol[eol_doID]['pd']=d['dataRating']*10000

            for best_column in image_status_labels:
                valid_imgs = [i for i in images_for_eol.values() if best_column in i]
                if valid_imgs:
                    max(valid_imgs, key=lambda d: d.get(best_column))['best_{}'.format(best_column)] = 1

            delete_old=True
            for eol_doID, image_info in images_for_eol.items():
                if image_info['best_any'] or image_info['best_verified'] or image_info['best_pd']:
                    copyinfo = get_file_from_json_struct(image_info['json'], args.output_dir, args.thumbnail_size, args.add_percent, verbosity)
                    if copyinfo is not None:
                        #we have succeeded in downloading at least one new image, so we can proceed to delete the old stuff etc
                        if delete_old:
                            sql = "DELETE FROM {0} WHERE ott={1} AND src={1};".format(images_table, subs)
                            dummy = db_cursor.execute(sql, (OTTid,src_flags['onezoom']))
                            delete_old=False

                        sql = "INSERT INTO {0} (ott, src, src_id, url, rating, rating_confidence, best_any, best_verified, best_pd, overall_best_any, overall_best_verified, overall_best_pd, rights, licence, updated) VALUES ({1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {1}, {2});".format(images_table, subs, datetime_now)
                        db_cursor.execute(sql, (OTTid, src_flags['onezoom'], eol_doID, 
                                                image_info['json'].get('eolMediaURL'), 
                                                int(round(image_info['json']['dataRating']))*10000,
                                                store_vote_ratings_in_bytes(image_info['json'].get('dataRatings')),
                                                1 if image_info['best_any'] else 0,
                                                1 if image_info['best_verified'] else 0,
                                                1 if image_info['best_pd'] else 0,
                                                0, 0, 0, #set best overall to false, will be checked in a second
                                                copyinfo[0], copyinfo[1]))
                    else:
                        raise IOError("Could not download or crop file from data in '{}'.".format(image_info['json']['eolMediaURL']))
                   
            info("= Stored user-specified image for ott {} (eol data object {}) =".format(OTTid, eol_doID))
            #now reset the overall fields (need to check all the values for this OTT
            sql = "UPDATE {0} set overall_best_any = 0, overall_best_verified = 0, overall_best_pd = 0 WHERE ott = {1}".format(images_table, subs)
            db_cursor.execute(sql, OTTid)
            for column in ('best_any', 'best_verified', 'best_pd'):
                sql = "UPDATE {0} set `overall_{1}` = 1 where ott = {2} and {1} = 1 ORDER BY rating DESC, rating_confidence DESC, src ASC LIMIT 1".format(images_table, column, subs)
                db_cursor.execute(sql, OTTid)
            db_connection.commit()
            info("= Updated overall best flags for ott {} =".format(OTTid))
            
    except requests.exceptions.Timeout:
        warn('socket timed out - URL {}'.format(url))
    except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as error:
        warn('Data not retrieved because {}\nURL: {}'.format(error, url))
    except requests.exceptions.RetryError:
        warn('Failed retrying - URL {}'.format(url))
    db_cursor.close()



def lookup_and_save_auto_EoL_info(eol_page_to_ott, sess, API_key, db_connection, 
                             images_table, names_table, loop_seconds=None):
    '''
    Given a mapping of EOL to OTT ids, call the EoL batch API for all these EOL ids to get best images and vernacular names.
    If images_table is none, then only look for (and save) vernacular names. Save the updated time both in the 
    images, and names tables. If there are no EoL ids returned for an OTT, we should delete these entries from the DB
    
    This should return None on failure, otherwise a dict with keys for the EoL ids that have been updated, and values 
    for the potentially new eol IDs returns from the api (these are usually the same as the keys). If the API has
    returned "unavailable page id", then the value will be None, indicating we should flag up the "not_available" field in eol_updated
    
    We also put a delay in here to avoid overloading the EoL API.
    
    '''
    loop_seconds=loop_seconds or 60.0
    global loop_num
    global loop_starttime
    global cache_ttl_hack
    loop_num+=1
    if time.time() - loop_starttime < loop_seconds:
        wait = abs(loop_seconds - (time.time() - loop_starttime))
        info("Waiting {} seconds so that next query occurs at least {} seconds later".format(wait, loop_seconds))
        time.sleep(wait)
    loop_starttime = time.time()
    info("== Loop {} ({}) ==> list of eol_pageID: ottIDs to check for {} are {}".format(loop_num, time.asctime(time.localtime(loop_starttime)), "names" if images_table is None else "images & names", eol_page_to_ott))
    EOLids = list(eol_page_to_ott.keys())
    OTTids = [int(eol_page_to_ott[k]) for k in EOLids]
    url = "http://eol.org/api/pages/1.0.json" #see http://eol.org/api/docs/pages
    cache_ttl_hack = cache_ttl_hack + 1 if cache_ttl_hack<50000 else 1000
    pages_params = {
        'batch'          : 'true',
        'id'             : ",".join([str(i) for i in EOLids]),
        'key'            : API_key,
        'images_per_page': 1 if images_table is not None else 0,     # only look at the first image
        'videos_per_page': 0,
        'sounds_per_page': 0,
        'maps_per_page'  : 0,
        'texts_per_page' : 0,
        'iucn'           : 'false',
        'licenses'       : 'pd|cc-by|cc-by-sa', #change this to get objects distributed under different licences
        'details'        : 'true',
        'references'     : 'false',
        'synonyms'       : 'false',
        'taxonomy'       : 'false',
        'language'       : 'en',
        'cache_ttl'      : cache_ttl_hack, #only cache for X secs. This doesn't work in the EoL API
        
        #the next 2 can be subsequently overwritten on a second pass if we also want to get unverified pictures: 
        #EOL says: If 'vetted' is given a value of '1', then only trusted content will be returned. 
        # If 'vetted' is '2', then only trusted and unreviewed content will be returned (untrusted content will not be returned).
        # If 'vetted' is '3', then only unreviewed content will be returned.
        # If 'vetted' is '4', then only untrusted content will be returned. The default is to return all content.
        'vetted'         : 1,
        'common_names'   : 'true'
    }

    req={}
    try:
        #NB we must replace all rows of images for this OTTid
        #On pass 1 we can get the common names as well as a verified image (vetted = 1)
        prepped = requests.Request('GET',url,params=pages_params).prepare()
        if verbosity > 2:
            info("Getting {}".format(prepped.url))
        req['verified'] = sess.send(prepped, timeout=10)
        if images_table:
            pages_params.update({'vetted':3, 'common_names': 'false'}) #don't bother getting common names, we have those already
            prepped = requests.Request('GET',url,params=pages_params).prepare() #get unreviewed images (might be better quality)
            if verbosity > 2:
                info("Getting {}".format(prepped.url))
            req['unreviewed'] = sess.send(prepped, timeout=10)

            pages_params.update({'vetted':2, 'common_names': 'false', 'licenses':'pd'}) 
            prepped = requests.Request('GET',url,params=pages_params).prepare() #get pd images
            if verbosity > 2:
                info("Getting {}".format(prepped.url))
            req['pd'] = sess.send(prepped, timeout=10)
    except requests.exceptions.Timeout:
        warn('socket timed out - URL {}'.format(prepped.url))
        return None
    except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as error:
        warn('Data not retrieved because {}\nURL: {}'.format(error, prepped.url))
        return None
    except requests.exceptions.RetryError:
        warn('Failed retrying - URL {}'.format(prepped.url))
        return None

    completed_eols = {} #will be returned
    db_cursor = db_connection.cursor()
    image_ranking_tables = {ott:{} for ott in OTTids} if images_table else {} #a set of 'tables', one for each ott, to help us choose which images to download/use for this OTT
    image_information = {} #accompanying information for each new data object ID saved into an image_ranking_tables
    for req_focus, get_result in req.items():
        try:
            for EOLid, data in get_result.json().items():
                EOLid = int(EOLid)
                if 'identifier' not in data:
                    #this is probably "unavailable page id"
                    completed_eols[EOLid] = None
                else:
                    completed_eols[EOLid]=int(data['identifier'])
                    if EOLid  != completed_eols[EOLid]:
                        warn("The requested EOL id ({}) has changed to {}. The mapping of OTT to EOL ids may need updating".format(EOLid, data['identifier']))
                    OTTid = eol_page_to_ott[EOLid]
                    if 'vernacularNames' in data:
                        #remove all the outdated names for this ott (don't care if there are none)
                        sql = "DELETE FROM {0} WHERE ott={1} AND src={1};".format(names_table, subs)
                        dummy = db_cursor.execute(sql, (OTTid,src_flags['eol']))
            
                        for nm in data['vernacularNames']:
                            vernacular = html.unescape(nm['vernacularName'])
                            try:
                                #lang_primary is the 'primary' letter (lowercase) language, e.g. 'en', 'cmn'
                                lang_primary = nm['language'].split('-')[0].lower()
                                if len(vernacular) > name_length_chars:
                                    warn("vernacular name for EOL {} (ott {}) > {} characters.\nTruncating".format(EOLid, OTTid, name_length_chars))
                                if lang_primary=='en' and (vernacular.startswith("A ") or vernacular.startswith("a ")):
                                    #ignore english vernaculars like "a beetle" 
                                    continue
                                sql = "INSERT INTO {0} (ott, vernacular, lang_primary, lang_full, preferred, src, src_id, updated) VALUES ({1}, {1}, {1}, {1}, {1}, {1},{1}, {2});".format(names_table, subs, datetime_now)
                                db_cursor.execute(sql, (OTTid, vernacular[:name_length_chars], lang_primary, nm['language'].lower(), 1 if nm.get('eol_preferred') else 0, src_flags['eol'],EOLid))
                            except:
                                warn("problem inserting vernacular name for EOL {} (ott {})".format(EOLid, OTTid))
                        db_connection.commit()
                    if images_table:
                        if 'dataObjects' not in data:
                            warn("API failure - the api is not returning data objects for OTT {}, so we are skipping image checking for this ott".format(OTTid))
                            image_ranking_tables[OTTid] = None
                        elif len(image_ranking_tables[OTTid]) == 0:
                            #create the ranking table:
                            # For each OTT, we want a table which contains the (up to) 3 new images specified by the API,
                            # as well as the existing image entries for this OTT in our own database.
                            # We will eventually rank these by image rating, but ensure that new images always have the highest 
                            # rating if they have an appropriate image.
                            # Making a table like this means that if we fail to get an image from EoL, we can get the next best
                            #  ranked image, eventually reverting to the previously downloaded ones if necessary
                            image_ranking_table = image_ranking_tables[OTTid] #this will contain the image ranking table
                            db_fields1 = ['src', 'rating']
                            db_fields2 = ['best_'+l for l in image_status_labels]
                            sql="SELECT {0} FROM `{1}` WHERE ott = {2} AND src_id={2}".format(
                                ",".join(db_fields1 + db_fields2),
                                 images_table,
                                 subs)
                            db_cursor.execute(sql, (OTTid, src_flags['eol']))
                            
                            for r in db_cursor.fetchall():
                                DOid, rating = int(r[0]), float(r[1])/10000.0
                                is_best = {l:r[len(db_fields1)+i] for i,l in enumerate(db_fields2)}
                                #Make the ranking table of previously downloaded images, putting original ratings
                                # only where the image is marked as 'best' for that type, e.g. if doIDs are 1,2:
                                #{ -1 : {best_any: 0, best_pd: 2.5, best_verified: 2.0},
                                #{ -2 : {best_any: 4.1, best_pd: 0, best_verified: 0} 
                                #NB: previously downloaded images are given a negative data object id, to distinguish them from 
                                #the about-to-be downloaded ones
                                image_ranking_table[-DOid]={lab: rating if is_best[colname] else 0 for colname,lab in zip(db_fields2, image_status_labels)}
                            if verbosity > 1 and len(image_ranking_table):
                                info("Created table of previously downloaded EoL images for ott {} (objects {})".format(ott, image_ranking_table.keys()))
                        if image_ranking_tables[OTTid] is not None:
                            image_ranking_table = image_ranking_tables[OTTid]
                            #just use the first object from each API call (if there is one)
                            if len(data['dataObjects']):
                                d=data['dataObjects'][0]
                                image_id = d['dataObjectVersionID']
                                #we store ratings as integers from 10000-50000, which always makes them higher than existing
                                image_rating = float(d['dataRating'])*10000.0
                                #create a dict for the data object ID index if it doesn't exist
                                if image_id not in image_ranking_table:
                                    image_ranking_table[image_id]={s:0 for s in image_status_labels}
                                row = image_ranking_table[image_id]
                                row["any"] = image_rating
                                if d['vettedStatus']=='Trusted':
                                    row['verified'] = image_rating
                                if req_focus=='pd':
                                    row['pd'] = image_rating
                                image_information[image_id]={'data_object':d, 'page_id': data.get("identifier"), "sci_name":data.get("scientificName")}
        except (AttributeError,ValueError):
            #there is no valid json in get_result
            warn("Problem interpreting json from the string returned from the EoL API for {} ({} request) so aborting the current OTT batch. Json string is\n {}".format(get_result.url, req_focus, get_result))
            db_cursor.close() 
            return None
    db_cursor.close() 

    #Now go through the image tables for each OTT, and see if we can get the best for each type
    for ott, image_ranking_table in image_ranking_tables.items():
        if image_ranking_table is not None:
            db_cursor = db_connection.cursor()
            #save the info for the images we have got in here
            got_img = {label:None for label in image_status_labels}
            for image_label in image_status_labels:
                for loop in range(len(image_status_labels)*2):
                    if len(image_ranking_table) == 0:
                        #no images, previous or new
                        break
                        
                    #sort by rating (desc)
                    best_image_id, best_image_ranks = sorted(image_ranking_table.items(), key=lambda row: row[1][image_label], reverse=True)[0]
                    if (loop == 0) and best_image_id < 0:
                        #If the top value at the start of ranking is a previously downloaded image, it must mean 
                        # there was a previously downloaded image were no API hits for this type of image, and the best_image_id
                        # refers to an out-of-date image which should be left to be deleted
                        if verbosity > 1:
                            info("No EoL images in the API for ott {}: but we had old ones (e.g. data object {}), which will be deleted".format(ott, -best_image_id))
                        break

                    if best_image_ranks[image_label]==0:
                        break #we have hit rock bottom: there are no rated images of this type, so don't download any

                    else:
                        if (best_image_id < 0) or (best_image_id in got_img.values()):
                            #we already have the image (downloaded previously)
                            got_img[image_label] = best_image_id
                        else:
                            #this still needs downloading
                            try:
                                image_info = image_information[best_image_id]
                                info("= Getting data object {} for ott {} (eol page {}) ({}) =".format(best_image_id, ott, image_info['page_id'], image_info['sci_name']))
                                image_info['copyinfo'] = get_file_from_json_struct(image_info['data_object'], args.output_dir, args.thumbnail_size, args.add_percent, verbosity)
                                if image_info['copyinfo'] is not None:
                                    #Got it!
                                    got_img[image_label] = best_image_id
                                else:
                                    #couldn't get this image, so delete it from the image_ranking_table (no loop will get it) and re-try
                                    del image_ranking_table[best_image_id]
                            except:
                                raise
                    if got_img[image_label] is not None:
                        break
            #now we have everything, we can delete and insert from the DB
            #invert the mapping, so we have {1234:['any','pd'], ...}
            image_ids = {}
            for k, v in got_img.items():
                if v is not None:
                    image_ids.setdefault(v, set()).add(k)
            old_ids_to_keep = {-src:v for src,v in image_ids.items() if src < 0}
            new_ids_to_add =  {src:v for src,v in image_ids.items() if src >= 0}
            

            #first delete old stuff if not used
            sql = "DELETE FROM `{0}` WHERE ott={1} AND src={1}".format(images_table, subs)
            if len(old_ids_to_keep):
                sql += " AND src_id NOT IN ({})".format(",".join([subs] * len(old_ids_to_keep)))
            db_cursor.execute(sql, ([ott,src_flags['eol']] + list(old_ids_to_keep.keys())))
            for image_id, labels in old_ids_to_keep.items():
                best_cols = {(prefix + "best_" + l):(1 if (l in labels and prefix=="") else 0) for l in image_status_labels for prefix in ("overall_","")}
                sql = "UPDATE `{0}` SET {1} WHERE ott={1} AND src_id={1} AND src={1} ".format(
                    images_table,
                    ",".join("`{}` = {}".format(v,subs) for v in best_cols.keys()),
                    subs)
                db_cursor.execute(sql, list(best_cols.values()) + [ott, src_flags['eol'], image_id])
            
            for image_id, labels in new_ids_to_add.items():
                image_info = image_information[image_id]
                best_cols = {(prefix + "best_" + l):(1 if (l in labels and prefix=="") else 0) for l in image_status_labels for prefix in ("overall_","")}
                sql = "INSERT INTO `{0}` (ott, src, src_id, url, rating, rating_confidence, {1}, rights, licence, updated) VALUES ({2}, {2}, {2}, {2}, {2}, {2}, {3}, {2}, {2}, {4});".format(
                    images_table,
                    ",".join("`{}`".format(k) for k in best_cols.keys()),
                    subs,
                    ",".join([subs] * len(best_cols)),
                    datetime_now)
                db_cursor.execute(sql, [ott, src_flags['eol'], image_id, 
                                        image_info['data_object'].get('eolMediaURL'), 
                                        int(round(image_info['data_object'].get('dataRating' or 0)*10000)),
                                        store_vote_ratings_in_bytes(image_info['data_object'].get('dataRatings'))] +
                                       list(best_cols.values()) + 
                                       [image_info['copyinfo'][0], 
                                        image_info['copyinfo'][1]])
            db_connection.commit()
        
            #now reset the overall fields (need to check all the values for this OTT)
            best_cols = {("overall_best_" + l):0 for l in image_status_labels}
            sql = "UPDATE `{0}` set {1} WHERE ott = {2}".format(images_table, ",".join("`{}`={}".format(c, subs) for c in best_cols.keys()), subs)
            db_cursor.execute(sql, list(best_cols.values()) + [ott])
            for column in ('best_'+l for l in image_status_labels):
                sql = "UPDATE {0} set `overall_{1}` = 1 where ott = {2} and {1} = 1 ORDER BY rating DESC, rating_confidence DESC, src ASC LIMIT 1".format(images_table, column, subs)
                db_cursor.execute(sql, ott)
            db_connection.commit()

            db_cursor.close()    
    return completed_eols


def save_eol_to_ott(eol_page_to_ott, sess, API_key, db_connection, images_table, inspected_table):
    if len(eol_page_to_ott):
        EoLdone = lookup_and_save_auto_EoL_info(
            eol_page_to_ott, sess, API_key, db_connection, images_table, names_table=args.save_names_table, loop_seconds=args.loop_seconds)
        if EoLdone is not None:
            db_curs = db_connection.cursor()
            for old_eol, new_eol in EoLdone.items():
                ott = eol_page_to_ott[old_eol]
                sql = "INSERT INTO `{0}` (eol, updated, real_eol_id) VALUES ({1},{2},{1}) ON DUPLICATE KEY UPDATE updated={2}, real_eol_id={1}".format(args.save_update_times_table, subs, datetime_now)
                db_curs.execute(sql, (int(old_eol), None if new_eol is None else int(new_eol), None if new_eol is None else int(new_eol)))
                if inspected_table is not None:
                    sql = "DELETE FROM `{}` WHERE ott = {}".format(inspected_table, subs)
                    db_curs.execute(sql, int(ott))
            db_connection.commit()
            db_curs.close()


#To DO - we also need to do this for images_by_name and vernacular_by_name
def check_OTTs(otts, sess, API_key, db_connection, batch_size, all_tables, inspected_table=None):
    """
    Take a list of otts and look them up in batches (could be either for nodes (names only) or leaves (also images)
    if 'inspected_table' is given, remove these otts from the inspected table after checking.
    """
    opentree_id_batches = [set(otts[i:i+batch_size]) for i in range(0, len(otts), batch_size)]
    for batch in opentree_id_batches:
        #do 2 passes, one for tables where images are needed, one for tables where images_table should be set to None (only names)
        for table, im_table in all_tables.items():
            if len(batch):
                #split the IDs requested into batches of N. Save the updated time afterwards, if the lookup has been successful
                eol_page_to_ott = {}
                db_curs = db_connection.cursor()
                sql = "SELECT eol,ott FROM `{}` WHERE ott IN ({})".format(table, ",".join([subs] * len(batch)))
                db_curs.execute(sql, list(batch))
                for r in db_curs.fetchall():
                    if r[0] and r[1]:
                        eol, ott=int(r[0]), int(r[1])
                        eol_page_to_ott[eol]=ott
                        #remove from batch: any otts remaining after checking in ordered_nodes/leaves
                        #can probably be deleted. Best to do this here rather than after EoL API lookup,
                        #because if the lookup fails, we want to keep the ott in the inspected table
                        batch.discard(ott)
                db_curs.close()
                save_eol_to_ott(eol_page_to_ott, sess, API_key, db_connection, im_table, inspected_table)

        if inspected_table is not None:
            # There may still be some otts left - e.g. orphans (present on a previous tree) or force-harvests. 
            # If so, we may need to delete them from the original table.
            
            #first tackle the force harvests that only need the name checking
            if len(batch):
                db_curs = db_connection.cursor()
                eol_page_to_ott = {}
                sql = "SELECT eol,ott FROM `{}` WHERE via = {} AND ott IN ({}) AND eol is not NULL".format(inspected_table, subs, ",".join([subs] * len(batch)))
                db_curs.execute(sql, [eol_inspect_via_flags["name"]]+ list(batch))
                for r in db_curs.fetchall():
                    if r[0] and r[1]:
                        eol, ott = int(r[0]), int(r[1])
                        eol_page_to_ott[eol]=ott
                        batch.discard(ott)
                db_curs.close()
                save_eol_to_ott(eol_page_to_ott, sess, API_key, db_connection, None, inspected_table)

            #now tackle the ones that need both name and image checking
            if len(batch):
                db_curs = db_connection.cursor()
                eol_page_to_ott = {}
                sql = "SELECT eol,ott FROM `{}` WHERE ott IN ({}) AND eol is not NULL".format(inspected_table, ",".join([subs] * len(batch)))
                db_curs.execute(sql, list(batch))
                for r in db_curs.fetchall():
                    if r[0] and r[1]:
                        #this has a default eol ID in the inspected table, but has not matched the 
                        eol, ott = int(r[0]), int(r[1])
                        eol_page_to_ott[eol]=ott
                        batch.discard(ott)
                db_curs.close()
                save_eol_to_ott(eol_page_to_ott, sess, API_key, db_connection, im_table, inspected_table)

            #any remaining in batch are orphans, and can be deleted
            if len(batch):
                db_curs = db_connection.cursor()
                if verbosity > 1:
                    info("Found {} orphan taxa in the inspection list (not in the current tree) - deleting the following otts:\n{}".format(len(batch), batch))
                sql = "DELETE FROM `{}` WHERE ott in ({});".format(inspected_table, ",".join([subs] * len(batch)))
                db_curs.execute(sql, list(batch))
                db_connection.commit()
                db_curs.close()
            
            
def check_recently_inspected(sess, API_key, db_connection, batch_size, all_tables, inspected_table):
    """
    Look at the 'eol_inspected' table for items that were inspected > 5 minutes ago, and run these through the checking script.
    Delete from the table if they are checked.
    We carry out this as a function so that it can be injected into long running loops
    """
    db_curs = db_connection.cursor()
    db_curs.execute("SELECT ott from {} WHERE {} >= 5 ORDER BY `{}`;".format(inspected_table, diff_minutes('inspected', datetime_now), 'inspected'))
    otts = [int(r[0]) for r in db_curs.fetchall()]
    db_curs.close()
    if len(otts):
        if verbosity > 1:
            info("Found {} recently inspected EoL taxa - refreshing these".format(len(otts)))
        #check these OTT ids in the leaf and nodes tables
        check_OTTs(otts, sess, API_key, db_connection, batch_size, all_tables, inspected_table)
if __name__ == "__main__":

    default_appconfig_file = "../../../private/appconfig.ini"

    parser = argparse.ArgumentParser(description='Save best EoL image (data object) id and common name for taxa in a database')
    parser.add_argument('--database', '-db', default=None, help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If not given, the script looks for the variable db.uri in the file {} (relative to the script location)'.format(default_appconfig_file))
    parser.add_argument('--output_dir', '-o', default=None, help="The location to save the cropped pictures (e.g. 'FinalOutputs/pics'). If not given, defaults to ../../../static/FinalOutputs/pics (relative to the script location)")
    parser.add_argument('--UPDATE_FROM_RESERVATIONS', action="store_true", help='If given, update only the "OneZoom" pictures from the reservations table')
    parser.add_argument('--opentree_id', '-ott', type=int, nargs='+', default=[], help='If given, only check and download best names (and possibly best images) for these OpenTree ids')
    parser.add_argument('--bespoke_eol_image', '-eol', type=int, nargs='+', default=[], help='If given, should be the same number as the number of ott ids given. The script will check and download these specific images from their Encyclopedia of Life data object ids, lebelling them as "onezoom" sources (src={}) rather than "eol" sources (src={})'.format(src_flags['onezoom'], src_flags['eol']))
    parser.add_argument('--read_vnames_pics', '-vnp', default=["ordered_leaves"], nargs='+', help='The names of the db tables containing a column "eol" which stores the eol IDs to check for pictures and vernacular names')
    parser.add_argument('--read_vnames_only', '-vno', default=["ordered_nodes"], nargs='+', help='The name of the db tables containing a column "eol" which stores the eol IDs to check for just vernacular names')
    parser.add_argument('--save_images_table', '-i', default="images_by_ott", help='The name of the db table in which to save image information')
    parser.add_argument('--save_names_table', '-n', default="vernacular_by_ott", help='The name of the db table in which to save vernacular name information')
    parser.add_argument('--save_update_times_table', '-u', default="eol_updated", help='The name of the db table in which to save information about when eol ids have been updated')
    parser.add_argument('--eol_inspected_table', '-e', default="eol_inspected", help='The name of the db table containing ott ids for eol taxa that have been inspected recently (so may need updating)')
    parser.add_argument('--verbosity', '-v', action="count", default=None, help='verbosity: output extra non-essential info')
    parser.add_argument('--add_percent', '-a', default=12.5, type=float, help='extra percentage each side to expand the crop, if possible, useful e.g. if a circular crop is required, to try and avoid trimming corners off')
    parser.add_argument('--thumbnail_size', '-s', type=int, choices=range(1, 8001), default=150, help='maximum width in pixels of thumbnail produced')
    #parser.add_argument('--force_size', '-z', action="store_true", help="force the thumbnail to be the maximum size (don't allow smaller thumbnails for small pictures)")
    parser.add_argument('--retries', '-r', type=int, default=5, help='number of times to retry getting the image')
    parser.add_argument('--loop_seconds', '-t', type=int, default=None, help='number of seconds between API calls (to avoid bombing EoL API)')
    parser.add_argument('--EOL_API_key', '-k', default=None, help='your EoL API key. If not given, the script looks for the variable api.eol_api_key in the file {} (relative to the script location)'.format(default_appconfig_file))
    parser.add_argument('--script', action="store_true", help="Don't use 'getpass' to get the password, so it can be scriptified")
    args = parser.parse_args()
    if args.verbosity is None:
        if len(args.opentree_id):
            args.verbosity = 1
        else:
            args.verbosity = 0        
    verbosity = args.verbosity
    
    sys.stdout = codecs.getwriter('utf8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf8')(sys.stderr.detach())

    if args.database is None or args.EOL_API_key is None:
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
                elif conf_type == 'api' and args.EOL_API_key is None:
                    m = re.match('eol_api_key\s*=\s*(\S+)', line)
                    if m:
                        args.EOL_API_key = m.group(1)
                    
    if args.output_dir is None:
        args.output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../static/FinalOutputs/pics')
                    
        
    #make a single http session, which we can tweak
    s = requests.Session()
    retries = Retry(total=args.retries,
                    backoff_factor=1,
                    status_forcelist=[ 500, 502, 503, 504 ])
    s.mount('http://', HTTPAdapter(max_retries=retries))
    
    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
        datetime_now = "datetime('now')";
        subs="?"
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
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

    batch_size=15
    if args.UPDATE_FROM_RESERVATIONS:
        db_curs = db_connection.cursor()
        db_curs.execute("SELECT verified_preferred_image,OTT_ID from reservations WHERE verified_preferred_image IS NOT NULL AND (deactivated IS NULL or deactivated = '');")
        eol_DOid_to_ott = {int(r[0]):int(r[1]) for r in db_curs.fetchall() if r[0] and r[1]}
        db_curs.close()
        lookup_and_save_bespoke_EoL_images(eol_DOid_to_ott, s, args.EOL_API_key, db_connection, args.save_images_table, loop_seconds=args.loop_seconds)
        
    elif args.bespoke_eol_image:
        if len(args.bespoke_eol_image) != len(args.opentree_id):
            warn("If you are hand-chosing an image for onezoom, you have to give the same total number of ott ids as eol data object ids, but you have given totals of {} and {} respectively".format(len(args.opentree_id), len(args.bespoke_eol_image)))
            sys.exit()
        eol_DOid_to_ott = {int(args.bespoke_eol_image[i]):int(args.opentree_id[i]) for i in range(len(args.opentree_id))}
        lookup_and_save_bespoke_EoL_images(eol_DOid_to_ott, s, args.EOL_API_key, db_connection, args.save_images_table, loop_seconds=args.loop_seconds)
        #don't bother saving the update time - this might not even have an eol page id anyway (we only need a doID)
    else:
        #we are getting stuff from ordered_leaves or ordered_nodes
        
        #create map of table_names => image_table_name, where image_table_name=None for tables which only do vn checking
        #must make sure image tables are first
        im_tables = [(args.read_vnames_pics, args.save_images_table),(args.read_vnames_only, None)]
        all_tables = OrderedDict([(table,im_tab) for tables,im_tab in im_tables for table in tables])
        if args.opentree_id:
            #we are getting a bespoke set of ott ids via the command-line, so just re-check these
            check_OTTs(args.opentree_id, s, args.EOL_API_key, db_connection, batch_size, all_tables)
        else:
            # Look for eol ids in the input tables that do not match eol ids in the eol_updated table.
            #  These require immediate querying via the API, with 
            #  the entries that require names and images (i.e. leaves) checked first.
            # Once all have been checked, look in the images table for the least recently updated images
            #  that also have an ott in any of the input tables.
            big_batch=batch_size*100 #to avoid many slow db queries, get a big_batch from the db and split it into smaller ones for the API
            info("Automatic mode - will first look at unchecked EoL IDs then update existing (any recently inspected on OneZoom will be updated first)")
            while True:
                try:
                    #first look for unchecked eol IDs in ordered_leaves or ordered_nodes (i.e. if the count of eol ids > count when joined with updated
                    for eolott_table, im_table in all_tables.items():
                        while True:
                            batches = []
                            db_curs = db_connection.cursor()
                            sql = "SELECT(SELECT count(eol) FROM {0}) - (SELECT count(1) FROM {0} INNER JOIN {1} on {0}.eol = {1}.eol)".format(eolott_table, args.save_update_times_table)
                            db_curs.execute(sql)
                            if db_curs.fetchall()[0][0] == 0:
                                info("All EoL ids have been checked at least once: switching to update mode")
                                db_curs.close()
                                break
                            #there are some eol IDs that have not been checked: get them in batches
                            #we have a current problem that batches which contain an EoL ID which is "no longer available" causes the entire batch to fail
                            info("Checking EoL ids that have never been looked at: getting a big batch")
                            sql = "SELECT ott, eol, popularity FROM {0} WHERE eol IS NOT NULL AND NOT EXISTS (SELECT(1) FROM {1} WHERE {0}.eol = {1}.eol) ORDER BY popularity DESC LIMIT {2}".format(eolott_table, args.save_update_times_table, big_batch)
                            db_curs.execute(sql)
                            rows=True
                            while rows:
                                #get the rows in batches
                                rows = db_curs.fetchmany(batch_size)
                                batches.append({r[1]:r[0] for r in rows if r[0] and r[1]})
                            db_curs.close()
    
                            for eol_page_to_ott in batches:
                                #within each loop, do an additional check in case there have been any recent inspections of stuff
                                #these will all get done first, in sequential batches
                                check_recently_inspected(s, args.EOL_API_key, db_connection, batch_size, all_tables, args.eol_inspected_table)

                                #now go ahead and do the batch lookup
                                EoLdone = lookup_and_save_auto_EoL_info(
                                    eol_page_to_ott, s, args.EOL_API_key, db_connection, images_table=im_table, names_table=args.save_names_table, loop_seconds=args.loop_seconds)
                                if EoLdone is not None:
                                    db_curs = db_connection.cursor()
                                    for old_eol, new_eol in EoLdone.items():
                                        ott = eol_page_to_ott[old_eol]
                                        sql = "INSERT INTO `{0}` (eol, updated, real_eol_id) VALUES ({1},{2},{1}) ON DUPLICATE KEY UPDATE updated={2}, real_eol_id={1}".format(args.save_update_times_table, subs, datetime_now)
                                        db_curs.execute(sql, (int(old_eol), None if new_eol is None else int(new_eol), None if new_eol is None else int(new_eol)))
                                    db_connection.commit()
                                    db_curs.close()
    
                      
                    
                    # Once we have knocked off all the taxa in ordered_nodes or ordered_leaves that have never been checked
                    # (i.e. have an eol id in leaves/nodes but are not in eol_updated) then we want to do some updating of
                    # existing entries, or ones in the recently inspected table.
                    #
                    # Search through the oldest updated eol id that is still in one of the ordered_leaves/nodes tables.
                    info("Updating info for EoL ids: getting a big batch")
                    db_curs = db_connection.cursor()
                    sql = "select eols_in_tree.ott, eols_in_tree.eol, eols_in_tree.table_index from ("
                    sql += " UNION ALL ".join(["(select eol, ott, {} AS table_index FROM {} WHERE eol IS NOT NULL)".format(i, list(all_tables.keys())[i]) for i in range(len(all_tables))])
                    sql += ") eols_in_tree INNER JOIN eol_updated ON eols_in_tree.eol = eol_updated.eol"
                    sql += " ORDER BY eol_updated.updated LIMIT {}".format(big_batch)
                    db_curs.execute(sql)
                    batch_queue = [] #store a set of batches to send to the api
                    table_batch_buffer = {} #keep a list of the numbers in each batch here, until they get large enough to stick into the queue
                    for row in db_curs.fetchall():
                        ott = int(row[0])
                        eol = int(row[1])
                        table_name = list(all_tables.keys())[row[2]]
                        #Add to the appropriate batch. Once any batches get to size batch_size, stick them in the queue
                        if table_name not in table_batch_buffer:
                            table_batch_buffer[table_name] = {}
                        table_batch_buffer[table_name][eol]=ott
                        if len(table_batch_buffer[table_name]) == batch_size:
                            batch_queue.append({'table_name':table_name, 'eol_page_to_ott':table_batch_buffer.pop(table_name)})
                    for table_name in table_batch_buffer.keys():
                        batch_queue.append({'table_name':table_name, 'eol_page_to_ott':table_batch_buffer[table_name]})
                    db_curs.close()
                    
                    #now we can go through the batches
                    for batch in batch_queue:
                        #within each loop, do an additional check in case there have been any recent inspections of stuff
                        check_recently_inspected(s, args.EOL_API_key, db_connection, batch_size, all_tables, args.eol_inspected_table)

                        if len(batch['eol_page_to_ott']):
                            EoLdone = lookup_and_save_auto_EoL_info(
                                batch['eol_page_to_ott'], s, args.EOL_API_key, db_connection, images_table=all_tables[batch['table_name']], names_table=args.save_names_table, loop_seconds=args.loop_seconds)
                            if EoLdone is not None:
                                db_curs = db_connection.cursor()
                                for old_eol, new_eol in EoLdone.items():
                                    ott = batch['eol_page_to_ott'][old_eol]
                                    sql = "INSERT INTO `{0}` (eol, updated, real_eol_id) VALUES ({1},{2},{1}) ON DUPLICATE KEY UPDATE updated={2}, real_eol_id={1}".format(args.save_update_times_table, subs, datetime_now)
                                    db_curs.execute(sql, (int(old_eol), None if new_eol is None else int(new_eol), None if new_eol is None else int(new_eol)))
                                db_connection.commit()
                                db_curs.close()
                except Exception as e:
                    raise
                    warn("There is a problem: {}. Waiting 30 mins before retrying.".format(e))
                    time.sleep(60*30)
