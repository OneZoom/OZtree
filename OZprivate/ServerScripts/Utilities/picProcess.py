#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# DESCRIPTION OF CODE FUNCTIONALITY

"""
    This code opens the OneZoom database and assigns sets of representative images to every interior node of the tree
    To use type python3 picProcess.py mysql://USERNAME:PASSWORD@localhost/DATABASENAME
    If you use Sequel Pro DB browser all this info will be stored in that and can be copied across
"""

# IMPORT PACKAGES
import os
import re
import sys
import argparse
import math
import copy
import random

# FUNCTIONS FOR OUTPUTTING INFO AND WARNINGS

def warning(*objs):
    import sys
    print("WARNING: ", *objs, file=sys.stderr)

def info(*objs):
    import sys
    try:
        if args.verbosity<1:
            return
    except:
        pass;
    print(*objs, file=sys.stderr)

# COMMAND LINE ARGUMENT PARSER

default_appconfig_file = "../../../private/appconfig.ini"

parser = argparse.ArgumentParser(description='Ripple preferred images up the tree in the database')
parser.add_argument('--database', '-db', default=None, help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If no password is given, it will prompt for one. If no --database option is given, it will look for one in {} (relative to the script location)'.format(default_appconfig_file))
parser.add_argument('--Images_name_table', default="images_by_name", help='The db table in which to get image ratings by name')
parser.add_argument('--Images_OTT_table', default="images_by_ott", help='The db table in which to get image ratings by OTT')
parser.add_argument('--OTT_node_table', default="ordered_nodes", help='The db table whose rows correspond to nodes in the tree. This script saves OTT ids for taxa with nice pictures in 24 columns of this table ("rep1".."rep8", "rtr1".."rtr8", & "rpd1".."rpd8"). Each row must also have a "parent" column giving the row number of the parent of this node)')
parser.add_argument('--OTT_leaf_table', default="ordered_leaves", help='The db table of leaves, containing a "parent" column, denoting the row number in the node table, and an "ott" column which can be used to match into the images table')
parser.add_argument('--verbosity', '-v', default=0, action="count", help='verbosity: output extra non-essential info')
args = parser.parse_args()

# look for appconfig if no database string given
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


# HANDLE THE DATABASE CURSOR OPENING FOR SQLITE AND MYSQL CASES

# you type python sqlite:// - look in config.ini of webtopy it's the same string
# query the ordered_leaves db table for EoL ids, and look up the most recently updated in vernacular_names and taxon_images
if args.database.startswith("sqlite://"):
    from sqlite3 import dbapi2 as sqlite
    db_connection = sqlite.connect(os.path.relpath(args.dbname[len("sqlite://"):], args.treedir))
    
elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
    import pymysql
    import re
    from getpass import getpass

    match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', args.database.strip())
    if match.group(2) == '':
        #enter password on the command line, if not given (more secure)
        pw = getpass("Enter the sql database password")
    else:
        pw = match.group(2)
    db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306)
else:
    warning("No recognized database specified: {}".format(args.database))
    sys.exit()

db_curs = db_connection.cursor()

# set seed from time
random.seed()

# *****************************************
# ******* THE MAIN CODE STARTS HERE *******
# *****************************************

"""
    In this version...
    I ignore the Images_name_table altogether
    The information saved in the final nodes table is the OTTID of the preferred image
    Rippling up is performed using the same algorithm as before based in image quality only
    Improvements could handle the other image table
    Improvements could use sponsorship info and/or popularity to imform the rippling up process
    this ripples up number of images - but not really needed right now - so not stored
    I assume no polytomies - this could be changed in a future version.
    I'm ignoring the rule that images should be shown even if they are bad, but only if the leaf is sponsored - I think it's a silly rule.
"""

# how it basically works in the old code

"""
    before this it calcs number of pics
    don't show if less than minQual (unless sponsored)
    if undefined set at minQual
    if it's a whole number (e.g. 30000, then take of penaltyInt and don't let it go below 25001
    
    Here's what the algorihm should do.
    1.) if a node has only 8 descending leaf with an image select them all
    2.) if a node has more than 8 descending leaves then pick proportional to richness with at least one from each
    3.) if according to 2.) we need more images than we have available then reduce the number of images accordingly and increase the other category accordingly
    4.) order the first two by quality and then by richness of the clade they come from
    5.) stripe the remaining images based on which parent they come from (e.g. 1(1),2(1),1(2),2(2),1(3),2(3),1(4),1(5)) if we need 3 from child 2 and 5 from child 1
    6.) the current algorthm just orders all images at the end, but later it could change - it also checks there are not two that are exactly the same image - this will be added later
    
    first we'll adjust all the ratings
    next we'll ripple up inh each ripple step we do
    if (not filled in) copy everything up
    else
    a) determine how many we want to replace
    how many do we want ideally
    how many do we have (discounting repeats)
    b) spread out the existing ones accordingly
    c) fill in with striping
    d) reorder the set changing only pairs that have different image ratings
    
"""

# DEFINE VARIABLES USED IN THE CODE

penaltyInt = 9000
# penalty for being rated as an integer value suggesting only one rating
num_ratings_needed = 8
# number of total ratings needed to escape any penalty to quality
minQual = 25000
# anything below this won't be shown
maxQual = 50000
# we won't allow random effects to send quality above this
swapTheshold = 2500
# any difference of less than this will not result in an order swap
randomVar = 100
# add a random number to the ratings with the above variance (0 means no random component)

# JOIN AND READ IN THE IMAGE AND LEAF TABLE
info("    ")
info("Joining the leaves and images tables")
sql="""
    SELECT {leaf_table}.parent, {image_table}.id, {image_table}.ott, {image_table}.rating , {image_table}.best_any , {image_table}.best_verified , {image_table}.best_pd , {image_table}.src_id , {image_table}.src , {image_table}.rating_confidence
    FROM {image_table}
    INNER JOIN {leaf_table}
    ON {image_table}.ott={leaf_table}.ott;
    """.format(leaf_table=args.OTT_leaf_table,image_table=args.Images_OTT_table)
db_curs.execute(sql)
Images_OTT_head = [i[0] for i in db_curs.description]
Images_OTT_data = db_curs.fetchall()

"""
info(Images_OTT_head)
for row in Images_OTT_data:
    info(row)
"""

# PRODUCE THE TRANSFORMED IMAGE RATINGS (AS THE DATABASE DATA IS IMMUTABLE)
info("Transforming the image ratings")
# we assume based on the above structure that the head will read as follows
# ['parent', 'id', 'ott', 'rating', 'best_any', 'best_verified', 'best_pd', 'src_id', 'src' , 'rating_confidence' ]
Images_OTT_data_T = [None for _ in range(len(Images_OTT_data))]
for row in range(len(Images_OTT_data)):
    
    Images_OTT_data_T[row] = list(Images_OTT_data[row]).copy()

    num_OK_data = 0
    num_problematic = 0
    if (Images_OTT_data_T[row][9] != None):
        if (Images_OTT_data_T[row][3] != None):
            # we have both a rating and a confidence
            # need to check consistency
            confidence_val = Images_OTT_data_T[row][9]
            confidence_val_tot = confidence_val >> 40
            confidence_val_5 = (confidence_val >> 4*8)-((confidence_val >> (8*5))<<8)
            confidence_val_4 = (confidence_val >> 3*8)-((confidence_val >> (8*4))<<8)
            confidence_val_3 = (confidence_val >> 2*8)-((confidence_val >> (8*3))<<8)
            confidence_val_2 = (confidence_val >> 1*8)-((confidence_val >> (8*2))<<8)
            confidence_val_1 = (confidence_val)-((confidence_val >> (8*1))<<8)
            confidence_val_tot_check = confidence_val_1 + confidence_val_2 + confidence_val_3 + confidence_val_4 + confidence_val_5
            if confidence_val_tot_check > 0:
                confidence_val_mean = 10000*(confidence_val_1 + 2 * confidence_val_2 + 3 * confidence_val_3 + 4 * confidence_val_4 + 5 * confidence_val_5)/(confidence_val_tot_check)
                if (confidence_val_tot_check != confidence_val_tot) or (math.fabs(confidence_val_mean-(Images_OTT_data_T[row][3]))>1.0):
                    num_problematic += 1
                    info("WARNING INCONSISTENT RATING INFORMATION USING CALCULATED VALUES")
                    info("for image source = ", Images_OTT_data_T[row][7])
                    info("and OTT id = ", Images_OTT_data_T[row][2])
                    if (confidence_val_tot_check != confidence_val_tot):
                        info("calculated total ratings = ",confidence_val_tot_check)
                        info("recorded total ratings = ",confidence_val_tot)
                    if (math.fabs(confidence_val_mean-(Images_OTT_data_T[row][3]))>1.0):
                        info("calculated mean = ",confidence_val_mean)
                        info("recorded mean = ",(Images_OTT_data_T[row][3]))
                    Images_OTT_data_T[row][3] = confidence_val_mean
                else:
                    num_OK_data += 1

    # don't show if less than minQual
    if (Images_OTT_data_T[row][3] < minQual):
        (Images_OTT_data_T[row][4]) = 0
        # this could be changed to F if we're doing the true and false thing with T and F
        # but actually we support either later on
        (Images_OTT_data_T[row][5]) = 0
        (Images_OTT_data_T[row][6]) = 0
    # if undefined set at minQual
    if (Images_OTT_data_T[row][3] == None):
        Images_OTT_data_T[row][3] = minQual
    # if it's a whole number (e.g. 30000, then take of penaltyInt and don't let it go below minQual
    # this is designed to take into account number of votes (improvements possible later)

    num_ratings = 0
    if (Images_OTT_data_T[row][9] != None):
        num_ratings = (Images_OTT_data_T[row][9]) >> 40
    if (num_ratings<num_ratings_needed):
        totalPenalty = math.floor(penaltyInt*((num_ratings_needed-num_ratings)/(num_ratings_needed)))
        if totalPenalty < 0:
            totalPenalty = 0
        Images_OTT_data_T[row][3] -= totalPenalty
        if (Images_OTT_data_T[row][3] < minQual):
            Images_OTT_data_T[row][3] = minQual
    if (randomVar >0):
        Images_OTT_data_T[row][3] = Images_OTT_data_T[row][3] + random.normalvariate(0.0, randomVar)
        if (Images_OTT_data_T[row][3] < minQual):
            Images_OTT_data_T[row][3] = minQual
        if (Images_OTT_data_T[row][3] > maxQual):
            Images_OTT_data_T[row][3] = maxQual
"""
info(Images_OTT_head)
for row in Images_OTT_data_T:
    info(row)
"""

# READ IN THE NODE DATABASE TABLE
info("Collecting data from nodes table")
sql = "SELECT id, parent, ott, leaf_lft , leaf_rgt FROM {}".format(args.OTT_node_table)
db_curs.execute(sql)
OTT_node_head = [i[0] for i in db_curs.description]
OTT_node_data = db_curs.fetchall()

"""
info(OTT_node_head)
for row in OTT_node_data:
    info(row)
"""

# ['id', 'parent', 'ott', 'leaf_lft', 'leaf_rgt'] - nodes
# ['parent', 'id', 'ott', 'rating', 'best_any', 'best_verified', 'best_pd', 'src_id', 'src'] - images



# BUILD A FUNCTION TO RIPPLE FROM UP FROM LEAVES TO FIRST NODES
# takes as an input "any" "verified" or "pd" and also the src column (a number)
# it will OVERWRITE any rippled up pictures it finds for the same OTTID
def ripple_leaf(type_in,src_in):
    info("rippling up from leaves to first nodes for {}".format(type_in))
    index_in = Images_OTT_head.index("best_{}".format(type_in))
    for row in range(len(Images_OTT_data_T)):
        # function loops over all images in Images_OTT_data_T
        if (Images_OTT_data_T[row][Images_OTT_head.index("src")] == src_in):
            if (Images_OTT_data_T[row][index_in] == 1) or (Images_OTT_data_T[row][index_in] == "T"):
                # that are valid images for the settings we've got
                # go to the index of the leaf that matches the OTTID
                temp_parent = Images_OTT_data_T[row][0] -1
                overwritten = 0;
            
                if (node_images[temp_parent][0] != None):
                    # check if we need to overwrite
                    if (Images_OTT_data_T[node_images[temp_parent][0]][Images_OTT_head.index("ott")] == Images_OTT_data_T[row][Images_OTT_head.index("ott")]):
                        # info("replacing ott {}".format(Images_OTT_data_T[row][Images_OTT_head.index("ott")]))
                        # it's the same OTT so needs to be overwritten
                        node_images[temp_parent][0] = row
                        overwritten = 1;

                if (node_images[temp_parent][1] != None):
                    # check if we need to overwrite
                    if (Images_OTT_data_T[node_images[temp_parent][1]][Images_OTT_head.index("ott")] == Images_OTT_data_T[row][Images_OTT_head.index("ott")]):
                        # it's the same OTT so needs to be overwritten
                        # info("replacing ott {}".format(Images_OTT_data_T[row][Images_OTT_head.index("ott")]))
                        node_images[temp_parent][1] = row
                        overwritten = 1;

                if (overwritten == 0):
                    if (node_images[temp_parent][0] == None):
                        node_images[temp_parent][0] = row
                    else:
                        node_images[temp_parent][1] = row
                    tot_OK_images[temp_parent] += 1

# BUILD A FUNCTION TO RIPPLE FROM UP TO ALL REMAINING NODES
# doesn't need to know the type of image being sorted beacuse that's already handled in the ripple from leaves to first nodes
def ripple_node():
    info("Rippling up from first nodes to higher nodes")
    for node_index in range(len(OTT_node_data)):
        node_id = len(OTT_node_data) - node_index - 1
        # the ordering of nodes in the database means one sweep will handle everything
        parent_node = OTT_node_data[node_id][1] - 1
        if parent_node < 0:
            #this is the root
            continue
        # first we order the present collection of images
        continue_looping = True
        while continue_looping:
            continue_looping = False
            for pic_index in range(0,7):
                #compare pic_index and pic_index + 1
                pic1 = node_images[node_id][pic_index]
                pic2 = node_images[node_id][pic_index+1]
                toSwap = False
                # decide if the images need swapping
                if (pic1 == None) and (pic2 != None):
                    toSwap = True
                if (pic1 != None) and (pic2 != None):
                    # we need to test the values
                    # loop at the image ratings
                    rating1 = Images_OTT_data_T[pic1][3]
                    rating2 = Images_OTT_data_T[pic2][3]
                    # IMPORTANT NOTE - PYTHON INDEXES ARRAYS FROM 0 BUT THE DATABASE INDEXES FROM 1
                    # SO THE ID VALUE SAVED FROM THE ORDERED DATABASE IS ONE MORE THAN THE INDEX
                    if (rating2 > (rating1+swapTheshold)):
                        toSwap = True
                if toSwap == True:
                    node_images[node_id][pic_index] = pic2
                    node_images[node_id][pic_index+1] = pic1
                    continue_looping = True
        # now we have the parent node
        if tot_OK_images[parent_node] == 0:
            if tot_OK_images[node_id] != 0:
                # we haven't yet added any information to that parent
                node_images[parent_node] = node_images[node_id].copy()
                tot_OK_images[parent_node] += tot_OK_images[node_id]
                # simply copy up the tree - nothing more needs doing
        else:
            # check before proceeding that we do have to do a merge
            if tot_OK_images[node_id] != 0:
                # we have already added information on that parent so need to combine
                # count how many images we have in the parent
                parent_images = tot_OK_images[parent_node]
                # count the parent total diversity
                parent_diversity = 1 + OTT_node_data[parent_node][4] - OTT_node_data[parent_node][3]
                # count current number of images availabe
                this_images = tot_OK_images[node_id]
                # count the current total diversity
                this_diversity = 1 + OTT_node_data[node_id][4] - OTT_node_data[node_id][3]
                # now we need to calculate how many to replace
                
                images_to_replace = 1 # this is the worst case scenario
                if (this_images + parent_images) <= 8:
                    images_to_replace = this_images

                # we've got space for them all
                else:
                    # we've got to do some work
                    temp_itr = math.floor(((8*this_diversity)/(parent_diversity))+0.5);
                    if images_to_replace < temp_itr:
                        images_to_replace = temp_itr
                    if images_to_replace >= 8:
                        images_to_replace = 7
                if images_to_replace > this_images:
                    images_to_replace = this_images
                # now we know how many images need to be replaced.
                parent_images_replace = 8-images_to_replace;
                if (parent_images_replace > parent_images):
                    parent_images_replace = parent_images
                tot_OK_images[parent_node] = parent_images_replace + images_to_replace;
                
                temp_node_images = [None for _ in range(8)]
                if (parent_images_replace < images_to_replace):
                    # start striping from the images_to_replace
                    upto_images = 0
                    upto_index = 0
                    for i in range(0, min(parent_images_replace,images_to_replace)):
                        temp_node_images[2*i] = node_images[node_id][i]
                        temp_node_images[2*i+1] = node_images[parent_node][i]
                        upto_images += 2
                        upto_index += 1
                    for i in range(upto_index,images_to_replace):
                        temp_node_images[upto_images] = node_images[node_id][i]
                        upto_images += 1
                else:
                    # start striping from the existing parent
                    upto_images = 0
                    upto_index = 0
                    for i in range(0, min(parent_images_replace,images_to_replace)):
                        temp_node_images[2*i] = node_images[parent_node][i]
                        temp_node_images[2*i+1] = node_images[node_id][i]
                        upto_images += 2
                        upto_index += 1
                    for i in range(upto_index,parent_images_replace):
                        temp_node_images[upto_images] = node_images[parent_node][i]
                        upto_images += 1

                # detect repeated images and delete them
                num_deleted = 0
                for i in range(8):
                    for j in range (i+1,8):
                        if (temp_node_images[i] != None) and (temp_node_images[j] != None):
                            # we need to check for whether the pair of images are the same
                            if (Images_OTT_data_T[temp_node_images[i]][7]) == (Images_OTT_data_T[temp_node_images[j]][7]):
                                if (Images_OTT_data_T[temp_node_images[i]][8]) == (Images_OTT_data_T[temp_node_images[j]][8]):
                                    # we have a repeated image to delete
                                    temp_node_images[j] = None
                                    num_deleted += 1

                # if we've deleted images we need to shunt the others up and potentially add more to replace them
                if num_deleted > 0:
                    continue_looping = True
                    while continue_looping:
                        continue_looping = False
                        for pic_index in range(0,7):
                            # compare pic_index and pic_index + 1
                            pic1 = temp_node_images[pic_index]
                            pic2 = temp_node_images[pic_index+1]
                            # decide if the images need swapping
                            if (pic1 == None) and (pic2 != None):
                                temp_node_images[pic_index] = pic2
                                temp_node_images[pic_index+1] = None
                                continue_looping = True

                    # we can fill in deleted images with replacements here
                    # I'm not going to bother optimising this little bit of code
                    
                    # first collect everything together
                    possible_reserves = [None for _ in range(16)]
                    for i in range(0,7):
                        possible_reserves[2*i] = node_images[parent_node][i]
                        possible_reserves[2*i+1] = node_images[node_id][i]

                    # now remove any repeats
                    for i in range(16):
                        for j in range (8):
                            if (possible_reserves[i] != None) and (temp_node_images[j] != None):
                                if (Images_OTT_data_T[possible_reserves[i]][7]) == (Images_OTT_data_T[temp_node_images[j]][7]):
                                    if (Images_OTT_data_T[possible_reserves[i]][8]) == (Images_OTT_data_T[temp_node_images[j]][8]):
                                        possible_reserves[i] = None
                    for i in range(16):
                        for j in range (i+1,16):
                            if (possible_reserves[i] != None) and (possible_reserves[j] != None):
                                if (Images_OTT_data_T[possible_reserves[i]][7]) == (Images_OTT_data_T[possible_reserves[j]][7]):
                                    if (Images_OTT_data_T[possible_reserves[i]][8]) == (Images_OTT_data_T[possible_reserves[j]][8]):
                                        possible_reserves[j] = None

                    # we now have a vector of reserves that might contain many nulls
                    for i in range(8):
                        if temp_node_images[i] == None:
                            for j in range(16):
                                if possible_reserves[j] != None:
                                    temp_node_images[i] = possible_reserves[j]
                                    possible_reserves[j] = None
                                    break

                # the calculations are done - overwrite the list of images
                node_images[parent_node] = temp_node_images.copy()

# SAVE WHAT WE'VE DONE TO THE DATABASE
# parse in image_cols so that we know where to save the data
def save_data(image_cols):

    # NULL OUT THE DATABASE FIRST
    info("Setting all picture summaries for all nodes to NULL")
    assignment = ["`{}`=NULL".format(col) for col in image_cols]
    sql = "UPDATE {} SET {};".format(args.OTT_node_table, ','.join(assignment))
    db_curs.execute(sql)
    db_connection.commit()

    # SWITCHING FINAL OUTPUTS TO OTTID
    info("Transforming final output into OTTID format")
    for row in range(len(node_images)):
        counter_temp = 0
        for element in range(8):
            if node_images[row][element] != None:
                node_images[row][element] = Images_OTT_data_T[node_images[row][element]][2]
                counter_temp += 1
                sql = "UPDATE ordered_nodes SET {} = '{}' WHERE id = '{}'".format(image_cols[element],node_images[row][element],row+1)
                db_curs.execute(sql)
    db_connection.commit()

# NOW CALL THE FUNCTIONS AND DO THE WORK





# for representative images that are the best overall
info("   ")
info("PERFORMING TASKS FOR ANY PICS")
info("Making python structure for rippled up data")
node_images = [[None for _ in range(8)] for _ in range(len(OTT_node_data))]
tot_OK_images = [0 for _ in range(len(OTT_node_data)+1)]
# add 1 because we're indexing from 1 in node data based on the parent of the other database table
ripple_leaf("any",2)
ripple_leaf("any",1)
ripple_node()
save_data(["rep1","rep2","rep3","rep4","rep5","rep6","rep7","rep8"])

# for representative images that are the best trusted images
info("   ")
info("PERFORMING TASKS FOR TRUSTED PICS")
info("Making python structure for rippled up data")
node_images = [[None for _ in range(8)] for _ in range(len(OTT_node_data))]
tot_OK_images = [0 for _ in range(len(OTT_node_data)+1)]
# add 1 because we're indexing from 1 in node data based on the parent of the other database table
ripple_leaf("verified",2)
ripple_leaf("verified",1)
ripple_node()
save_data(["rtr1","rtr2","rtr3","rtr4","rtr5","rtr6","rtr7","rtr8"])

# for representative images that are the best public domain images
info("   ")
info("PERFORMING TASKS FOR PD PICS")
info("Making python structure for rippled up data")
node_images = [[None for _ in range(8)] for _ in range(len(OTT_node_data))]
tot_OK_images = [0 for _ in range(len(OTT_node_data)+1)]
# add 1 because we're indexing from 1 in node data based on the parent of the other database table
ripple_leaf("pd",2)
ripple_leaf("pd",1)
ripple_node()
save_data(["rpd1","rpd2","rpd3","rpd4","rpd5","rpd6","rpd7","rpd8"])





