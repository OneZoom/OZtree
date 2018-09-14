# -*- coding: utf-8 -*-

#########################################################################
## This scaffolding model makes your app work on Google App Engine too
## File is released under public domain and you can use without limitations
#########################################################################

## if SSL/HTTPS is properly configured and you want all HTTP requests to
## be redirected to HTTPS, uncomment the line below:
# request.requires_https()
#set the default language
T.set_current_languages('en', 'en-en')
#ALL pages can set ?lang=XXX to override the browser default for translating strings
if request.vars.lang: 
    T.force(request.vars.lang)


## app configuration made easy. Look inside private/appconfig.ini
from gluon.contrib.appconfig import AppConfig
from gluon import current

#########################################################################
## Useful global variables
#########################################################################

## once in production, set is_testing=False to gain optimizations
## this will also set migration=False for all tables, so that the DB table definitions are fixed
is_testing = True

## get config params etc
if is_testing:
    #might want to load a different appconfig.ini file, which can be passed in during testing to the rocket server
    # (on the main server this is not used, and we default back to appconfig.ini
    if request.env.cmd_options and request.env.cmd_options.args[-1]:
        myconf = AppConfig(request.env.cmd_options.args[-1], reload=True)
    else:
        myconf = AppConfig(reload=True) #changes to appconfig.ini do not require restart
    T.is_writable = True #allow translators to add new languages e.g. on the test (beta) site, but not on prod
else:
    myconf = AppConfig() #faster to read once and never re-update
    T.is_writable = False

## thumbnail_url is a python function to return the url to get a thumbnail picture
## we also need to define a javascript equivalent for use on the client side
try:
    thumb_base_url = myconf.take('general.pics_dir')
except:
    thumb_base_url = URL('static','FinalOutputs/pics', scheme=True, host=True, extension=False)+"/"
#should probably move to base/src_id/src.jpg or even (better) base/src_id/src_lastdigit/src.jpg (to set ~ 10 000 files per dir, not 100 000)
def thumbnail_url(src, src_id, preferred_px=150, square=True):
    return "{}{}.jpg".format(thumb_base_url, src_id)
js_thumbnail_url = 'function(src, src_id, preferred_px, square) {{return "{}" + src_id + ".jpg";}}'.format(thumb_base_url)

name_length_chars = 190 ##max length for a species name is 190 chars (allows indexing. NB: max OTT name is 108 chars)


#########################################################################
## Set up database link
#########################################################################

import os.path
## if NOT running on Google App Engine use SQLite or other DB
DALstring = myconf.take('db.uri')
doMigration = myconf.take('db.migrate') in ['true', '1', 't', 'y', 'yes', 'True']
if DALstring.startswith('mysql://'):
    db = DAL(DALstring, 
        driver_args={'read_default_file':os.path.join(request.folder, 'private','my.cnf')}, 
        pool_size=myconf.take('db.pool_size', cast=int), 
        check_reserved=['all'], 
        migrate=doMigration,
        lazy_tables= not is_testing)
        ## ,fake_migrate_all=True) on the end can fix migration issues.
    ## allow mysql tinyint
    from gluon.dal import SQLCustomType
    boolean = SQLCustomType(
         type ='boolean',
         native='TINYINT(1)',
         encoder = (lambda x: 1 if x else 0),
         decoder = (lambda x: True if x else False)
    )

    db.placeholder = "%s"
else:
    db = DAL(DALstring, 
        pool_size=myconf.take('db.pool_size', cast=int), 
        check_reserved=['all'], 
        migrate=doMigration, 
        lazy_tables=True)
    db.placeholder = "?" #for sqlite


current.db = db

## by default give a view/generic.extension to all actions from localhost
## none otherwise. a pattern can be 'controller/function.extension'
response.generic_patterns = ['*'] if request.is_local else []
## choose a style for forms
response.formstyle = myconf.take('forms.formstyle')  # or 'bootstrap3_stacked' or 'bootstrap2' or other
response.form_label_separator = myconf.take('forms.separator')


## (optional) optimize handling of static files
# response.optimize_css = 'concat,minify,inline'
# response.optimize_js = 'concat,minify,inline'
## (optional) static assets folder versioning
# response.static_version = '0.0.0'
#########################################################################
## Here is sample code if you need for
## - email capabilities
## - authentication (registration, login, logout, ... )
## - authorization (role based authorization)
## - services (xml, csv, json, xmlrpc, jsonrpc, amf, rss)
## - old style crud actions
## (more options discussed in gluon/tools.py)
#########################################################################

from gluon.tools import Auth, Service, PluginManager

auth = Auth(db)
service = Service()
plugins = PluginManager()

## after auth = Auth(db)
## auth.settings.extra_fields['auth_user']= [
## Field('twitter_name',type = 'text')]
## before auth.define_tables(username=True)
## James: I got rid of this because twitter is now added to sponsorship table itself

## create all tables needed by auth if not custom tables
auth.define_tables(username=True, signature=False)

## configure email
try:
    mail = auth.settings.mailer
    mail.settings.server = myconf.take('smtp.server')
    mail.settings.sender = myconf.take('smtp.sender')
    mail.settings.login = myconf.take('smtp.login')
except:
    mail = None

## configure auth policy
auth.settings.registration_requires_verification = False
auth.settings.registration_requires_approval = False
auth.settings.reset_password_requires_verification = True

##restrict site to only logged in users
## https://groups.google.com/forum/#!topic/web2py/0j92-sPp4bc
##NB: useful url to add a guest user programmatically http://stackoverflow.com/questions/35504306/web2py-how-to-programmatically-register-users/35518991
#if not (request.url == auth.settings.login_url):
#    auth.requires_login()(lambda: None)()

## guests can't change the p/w
if auth.user and auth.user.get('username') is not None and auth.user.get('username') == 'guest':
    auth.settings.actions_disabled = ['reset_password', 'request_reset_password', 'change_password', 'profile']
                                      
#kill off silly messages
auth.messages.logged_in = None
auth.messages.logged_out = None

auth.settings.actions_disabled.append('register') 


#########################################################################
## Define your tables below (or better in another model file) for example
##
## >>> db.define_table('mytable',Field('myfield','string'))
##
## Fields can be 'string','text','password','integer','double','boolean'
##       'date','time','datetime','blob','upload', 'reference TABLENAME'
## There is an implicit 'id integer autoincrement' field
## Consult manual for more options, validators, etc.
##
## More API examples for controllers:
##
## >>> db.mytable.insert(myfield='value')
## >>> rows=db(db.mytable.myfield=='value').select(db.mytable.ALL)
## >>> for row in rows: print row.id, row.myfield
#########################################################################

## after defining tables, uncomment below to enable auditing
# auth.enable_record_versioning(db)

# csv tables read in for all species that could be sponsored
# should correspond to line 294 of OTTmapper2csv.py which creates the data: "id","ott","name","popularity","eol","wikidata"]
# then keys of ('ncbi', 1172), ('if', 596), ('worms', 123), ('irmng', 1347), ('gbif', 800)

db.define_table('ordered_leaves',
    Field('parent', type='integer', notnull=True), #index number into ordered_nodes
    Field('real_parent', type='integer', notnull=True), #index number into ordered_nodes, negative if this is a polytomy
    Field('name', type='string', length=name_length_chars), #this is not genus and species because not everything conforms to that 
    Field('extinction_date', type='double'), #in Ma
    Field('ott', type = 'integer'),
    Field('wikidata', type='integer'),
    Field('wikipedia_lang_flag', type='integer'), #which language wikipedia articles exist (enwiki=1, dewiki=2, eswiki=4, etc etc: listed in wikiflags in _OZglobals.py)
    Field('eol', type='integer'),
    Field('iucn', type='text'), #this could contain multiple bar-separated numbers (|), if we have a conflict. Conflicts are resolved in the IUCN table
    Field('raw_popularity', type='double'),
    Field('popularity', type='double'),
    Field('popularity_rank', type='integer'),
    #the following 5 fields are sources listed by the OpenTree
    Field('ncbi', type='integer'),
    Field('ifung', type='integer'),
    Field('worms', type='integer'),
    Field('irmng', type='integer'),
    Field('gbif', type='integer'),
    Field('ipni', type='integer'),
    
    #all the remaining fields are not filled out in the original data tables, but are filled out by later algorithms
    Field('price', type='integer'), #price in pence. Should not use floating point type because we want to group by this at some 
    format = '%(ott)s')

# csv file for ordered nodes allowing sets of leaves to be recovered using a nested
# set notation. This should correspond to line 434 and 455 of CSV_base_table_creator.py which creates the data:
# "ott","lft","rgt","name","popularity","eol","wikidata"
db.define_table('ordered_nodes',
    Field('parent', type='integer', notnull=True), #next 13 cols are indices into the ordered_nodes (first 3) and ordered_leaves tables (remaining 10)
    Field('real_parent', type='integer', notnull=True), #real parent, before polytomy breaking, negative if this is a polytomy
    Field('node_rgt', type='integer', notnull=True), #we might want to consider making these references rather than indexes, to enforce dependency
    Field('leaf_lft', type='integer', notnull=True),
    Field('leaf_rgt', type='integer', notnull=True),
    Field('name', type='string', length=name_length_chars), #scientific name
    Field('age', type='double'), # in Ma, e.g. chimp/human = 6.0
    Field('ott', type = 'integer'),
    Field('wikidata', type='integer'),
    Field('wikipedia_lang_flag', type='integer'), #
    Field('eol', type='integer'),
    Field('raw_popularity', type='double'),
    Field('popularity', type='double'),
    #the following 5 fields are sources listed by the OpenTree
    Field('ncbi', type='integer'),
    Field('ifung', type='integer'),
    Field('worms', type='integer'),
    Field('irmng', type='integer'),
    Field('gbif', type='integer'),
    Field('ipni', type='integer'),

    #all the remaining fields are not filled out in the original data tables, but are filled out by later algorithms
    #we might want to consider putting them in a different table, although they need recalculating every time the topology changes
    Field('vern_synth', type='text'), # a synthetic version of the vernacular name, e.g. Hamsters, Gerbils, True Mice, Rats and more
    Field('rep1', type='integer'), # rep1 - rep8 are the leaf otts for the 8 'representative' species pictured 
    Field('rep2', type='integer'), # these are chosen using some complex algorithm which depends on richness
    Field('rep3', type='integer'), # and quality of picture. The algorithm is implemented in OZprivate/ServerScripts/Utilities/picProcess.py
    Field('rep4', type='integer'), # and needs to be regularly rerun.
    Field('rep5', type='integer'),
    Field('rep6', type='integer'),
    Field('rep7', type='integer'),
    Field('rep8', type='integer'),
    Field('rtr1', type='integer'), # rtr1 - rtr8 are the leaf otts for the 8 'representative' species pictured 
    Field('rtr2', type='integer'), # that are guaranteed to be 'trusted'
    Field('rtr3', type='integer'), # 
    Field('rtr4', type='integer'), # 
    Field('rtr5', type='integer'),
    Field('rtr6', type='integer'),
    Field('rtr7', type='integer'),
    Field('rtr8', type='integer'),
    Field('rpd1', type='integer'), # rpd1 - rpd8 are the leaf otts for the 8 'representative' species pictured 
    Field('rpd2', type='integer'), # that are guaranteed to have a public domain image
    Field('rpd3', type='integer'), #
    Field('rpd4', type='integer'), #
    Field('rpd5', type='integer'),
    Field('rpd6', type='integer'),
    Field('rpd7', type='integer'),
    Field('rpd8', type='integer'),
    Field('iucnNE', type='integer'), #the numbers of IUCN categories among the leaves of this node
    Field('iucnDD', type='integer'),
    Field('iucnLC', type='integer'),
    Field('iucnNT', type='integer'),
    Field('iucnVU', type='integer'),
    Field('iucnEN', type='integer'),
    Field('iucnCR', type='integer'),
    Field('iucnEW', type='integer'),
    Field('iucnEX', type='integer'),
    Field('popleaf', type='integer'), #most popular leaf (index into ordered_leaves)
    Field('popleaf_ott', type='integer'), #ott (if present) of most popular leaf above (to speed up lookups)
    format = '%(ott)s')

# tables for common names - one name per line (allows multiple names for the same taxon)
# this could be obtained e.g. from EoL or IUCN. Most should be identified by ott, but
# some taxa have no ott id, so have to be identified (in another table) by name
db.define_table('vernacular_by_ott',
    Field('ott', type = 'integer', notnull=True, requires=IS_NOT_EMPTY()), # the opentree id for this taxon
    Field('vernacular', type='string', notnull=True, length=name_length_chars), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
    Field('lang_primary', type='string', notnull=True, length=3), #the 'primary' 2  or 3 letter 'lang' code for this name (e.g. 'en', 'cmn'). See http://www.w3.org/International/articles/language-tags/
    # can be constructed from sql by 
    #sql> update vernacular_by_ott set lang_primary=substring_index(lang_full,'-',1);
    Field('lang_full', type='string', notnull=True, length=20), #the longer 'lang' code for this name (e.g. 'en-gb, zh-hans, etc'), as lowecase. Should never be >20 chars.
    Field('preferred', type=boolean, notnull=True), #if there are several names for a lang, use this
    Field('src', type = 'integer', notnull=True), # 1=OneZoom, 2=EoL, 8=onezoom_special (short name). Others could be reserved e.g. for iucn
    Field('src_id', type = 'integer'), #the sourceid, e.g the EoL page id. 
    #NB sourceid is mainly for traceability. For a proper matching of e.g. eol to OTT, see ordered_leaves
    Field('updated', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    format = '%(ott)s_%(vernacular)s_%(lang)s')

db.define_table('vernacular_by_name',
    Field('name', type = 'string', notnull=True, length=name_length_chars, requires=IS_NOT_EMPTY()), 
    Field('vernacular', type='string', notnull=True, length=name_length_chars), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
   Field('lang_primary', type='string', notnull=True, length=3), #the 'primary' 2  or 3 letter 'lang' code for this name (e.g. 'en', 'cmn'). See http://www.w3.org/International/articles/language-tags/
    # can be constructed from sql by 
    #sql> update vernacular_by_ott set lang_primary=substring_index(lang_full,'-',1);
    Field('lang_full', type='string', notnull=True, length=20), #the longer 'lang' code for this name (e.g. 'en-gb, zh-hans, etc'), as lowecase. Should never be >20 chars.
    Field('preferred', type=boolean, notnull=True), #if there are several names for a lang, use this
    Field('src', type = 'integer', notnull=True), # 1=OneZoom, 2=EoL, 8=onezoom_special (short name). Others could be reserved e.g. for iucn
    Field('src_id', type = 'integer'), #the sourceid, e.g the EoL page id. 
    #NB sourceid is mainly for traceability. For a proper matching of e.g. eol to OTT, see ordered_leaves
    Field('updated', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    format = '%(name)s_%(vernacular)s_%(lang)s')

# tables for image references. These are mostly intended for leaves
# on the tree. It is more robust to populate nodes by picking the
# highest-scoring child leaf, using ordered_nodes. This can be
# done every time a new tree is generated
# e.g. to the EOL pages batch API. Note that this saves the 
# EOL data object ID, but not the image itself: this may need to be downloaded 
# separately, if you want a local store. 
db.define_table('images_by_ott',
    Field('ott', type='integer', notnull=True, requires=IS_NOT_EMPTY()),
    Field('src', type = 'integer', notnull=True),
    # 1=eol, 2=arkive, etc.

    Field('src_id', type = 'integer'),
    # a unique identifier for this picture (e.g. the EoL data_object_id).

    Field('url', type = 'text'),
    # the source url for this picture (e.g. http://media.eol.org/content/2015/04/05/06/22039_orig.jpg).

    Field('rating', type = 'integer'), 
    # an image rating. EOL 5 star ratings are mapped to unsigned 2 byte integers by multiplying by 10,000
    # so that 1 star = 10,000 & 5 star = 50,000, which allows 0-10,000 for bespoke marking of terrible photos
    # and 50,000-65,535 for bespoke marking of amazing photos.
    
    Field('rating_confidence', type = 'bigint'), 
    # A measure of the confidence in the rating. This measure is dependent on the source. For EoL
    # images, the lowest 5 bytes in the number store the number of votes for each star. and the
    # higher bytes store the total number of votes. This rather specific algorithm allows us to keep the
    # as a generic bigint, without having to specifically code 5 eol-specific  
    # numbers into the database. Since the total number of votes cast occupies the highest bits, 
    # sorting by confidence is equivalent to sorting by number of votes (but with ties broken by number
    # of 5* votes, then 4*, etc etc. Hacky. But clever.

    Field('rights', type = 'text'), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
    # e.g. "© Scott Loarie". Can be of long length as we don't need to index this
    
    Field('licence', type = 'string', length=name_length_chars), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
    # e.g. "http://creativecommons.org/licenses/by/2.0/". We might need to index this
    
    Field('updated', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),

    *[Field('{}best_{}'.format(prefix,suffix), type = boolean, notnull=True) for suffix in image_status_labels for prefix in ("","overall_")],
    #define fields for each type in image_status_labels, i.e. best_any, best_verified, best_pd. If True, this image is the 
    # best to choose for this src (any=best regardless of type, verified=best that has been verified by an expert, pd=best public domain image
    # also define overall_best_any, overall_best_verified, overall_best_pd, which indicate the best image regardless of src.
    # Note that this means you should only have one 'True' value set in e.g. overall_best_any for all rows that share an ott id.

    format = '%(ott)s')

db.define_table('images_by_name',
    Field('name', type='string', length=name_length_chars, requires=IS_NOT_EMPTY()), #needs to be of same charset as 'name' in ordered_leaves & nodes
    Field('src', type = 'integer', notnull=True),
    Field('src_id', type = 'integer'),
    Field('url', type = 'text'),
    Field('rating', type = 'integer'), 
    Field('rating_confidence', type = 'bigint'), 
    Field('rights', type = 'text'), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
    Field('licence', type = 'string', length=name_length_chars), #in mySQL, need to set this to charset utf8mb4 so that all the weird unicode characters are saved correctly
    Field('updated', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    *[Field('{}best_{}'.format(prefix,suffix), type = boolean, notnull=True) for suffix in image_status_labels for prefix in ("","overall_")],
    format = '%(name)s')

#we want to keep track of last updated times for each ott, but can't store this in the 
#image or vernacular section, because some otts will be checked and have no pictures / names
db.define_table('eol_updated',
    Field('eol', type='integer', notnull=True, unique=True, requires=IS_NOT_EMPTY()),
    Field('updated', type = 'datetime', notnull=True, requires= IS_DATETIME()),
    #Some EoL pages may have moved to a different id, or have been permanently deleted (API calls return "unavailable page id").
    #It is useful to keep track of these for monitoring purposes, e.g. so we can update our mapping in ordered_XX or correct on Wikidata
    #if an eol ID has been deleted rather than moved, we should set this to None / NULL
    Field('real_eol_id', type = 'integer'),
    format = '%(eol)s', migrate=is_testing)

# table for IUCN status: this can get updated by a call to the IUCN API
# it is useful for populating the metadata on the tree. There is some semi-duplicated
# information here, because the ott->iucn mapping also exists (through wikidata or EoL).
# in ordered_leaves, although that table can have multiple IUCN ids separated by |
# Note that we don't need an 'updated' field for each row, as we update all these
# in a single batch from the IUCN API.
db.define_table('iucn',
    Field('ott', type='integer', unique=True, requires=IS_NOT_EMPTY()),
    Field('iucn', type='integer'), #can be empty if e.g. this is an extinct species not in IUCN
    Field('status_code', type = 'string', length=10), #LC, VN, etc.
    format = '%(iucn)s', migrate=is_testing)

# Table for availability of IPNIs in Kew's Plants of the World Online portal (PoWO):
# this contains IPNIs which have live pages of the form 
# http://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:<ipni_id>
# It should be filled out by importing the file sent from Kew
db.define_table('PoWO',
    Field('ipni', type='string', length=20, unique=True, requires=IS_NOT_EMPTY()), #e.g. 391732-1
    Field('ipni_int', type='integer', unique=True, requires=IS_NOT_EMPTY()), #same but with no hyphen => int
    format = '%(ipni)s')

# this table defines the OTTIDs that are banned from sponsorship
db.define_table('banned',
    Field('ott', type = 'integer', notnull=True, requires=IS_NOT_EMPTY()),
    Field('cname', type='string', length=name_length_chars),     
    #this is simply used to help remember what the OTT_IDs are
    format = '%(ott)s_%(cname)s')

# this table handles reservations, ledger and verified in a single table
# to remove any sensitive information (e.g. before sending to 3rd parties)
# you should make a local copy and do UPDATE reservations SET user_id=NULL, e_mail=NULL, twitter_name=NULL, allow_contact=NULL, user_sponsor_lang=NULL, user_sponsor_kind=NUll, user_sponsor_name=NULL, user_donor_name=NULL, user_more_info=NULL, user_message_OZ=NULL, user_giftaid=NULL, user_paid=NULL, PP_transaction_code=NULL, PP_e_mail=NULL, PP_first_name=NULL, PP_second_name=NULL, PP_town=NULL, PP_country=NULL, PP_house_and_street=NULL, PP_postcode=NULL, sale_time=NULL, verified_paid=NULL, asking_price=NULL;
# also make sure not to export expired_reservations
db.define_table('reservations',
                
    Field('OTT_ID', type = 'integer', unique=True, requires=IS_NOT_EMPTY()),
    # this field is the open tree ID associated with page views and reservations
    Field('name', type='text'),
    # scientific name (not necessarily genus, species, since some leaves have extra info
    # this is essentially redundant, since the OTT_ID should give us a name, but it is useful to know
    Field('num_views', type = 'integer', requires=IS_NOT_EMPTY()),
    # these are general useful stats for a page
    Field('last_view', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    Field('reserve_time', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    Field('user_registration_id', type = 'text'), #eventually this will correspond to a number in the registration_id field of the auth_user table (which should be initially filled out using OZfunctions/__make_user_code, but for the moment we generate a new UUID for each treeview session
    # these handle auto reservation of pages
                             
    Field('user_id', type = 'reference auth_user' , requires=IS_EMPTY_OR(IS_IN_DB(db, 'auth_user.id','%(first_name)s %(last_name)s'))),
    # points to user table - built in      
    Field('e_mail', type = 'text',requires=IS_EMPTY_OR(IS_EMAIL())),
    Field('twitter_name', type = 'text'),
    Field('allow_contact', type = boolean),
    # in case they don't want to log in to process this.            
    Field('user_sponsor_lang', type = 'string', length=30),
    # in case they don't want to log in to process this.
    Field('user_sponsor_kind', type = 'string', length=4, requires=IS_EMPTY_OR(IS_IN_SET(['by','for']))),
    # self explanatory for sponsorship kind 'by' or 'for' a person. If the 
    Field('user_sponsor_name', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30))),
    # name of person as appears on leaf. Needs to be verified
    Field('user_donor_title', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30))),
    # title of donor (Mr, Mrs, Dr, etc - needed for giftaid). . 
    Field('user_donor_name', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30))),
    # name of donor (different to user_sponsor_name if sponsored for someone). 
    Field('user_donor_show', type = boolean),
    # True if user doesn't mind online acknowledgment (e.g. on donors page). Prob shouldn't use title
    Field('user_more_info', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(maxsize=30))), 
    # optional extra info about a person
    Field('user_nondefault_image', type = 'integer'),
    #has the user chosen a non-default image? 0 or 1. Should prob be boolean type instead.
    Field('user_preferred_image', type='integer', requires= IS_EMPTY_OR(IS_INT_IN_RANGE(1,1e100))),
    # an option for users to recommend an EOL ID as the best image. Should normally be filled
    Field('user_updated_time', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),  
    # need to know when it was last updated to check for user updates         
    Field('user_paid', type = 'double', requires = IS_EMPTY_OR(IS_DECIMAL_IN_RANGE(0,1e100))), 
    # the amount they actually paid in total (I think it would be silly not to give the option to increase the amount)   
    Field('user_message_OZ', type = 'text', requires=(IS_LENGTH(maxsize=250))),
    # message for OZ e.g. to show on funding website or to request converstaion about url etc.
    Field('user_giftaid', type = boolean),
    # can we collect gift aid?
               
    # paypal returned information
    Field('PP_transaction_code', type = 'text'),
    Field('PP_e_mail', type = 'string', length=200),
    # another e-mail just in case we need it for verification
    Field('PP_first_name', type = 'text'),
    Field('PP_second_name', type = 'text'),
    # name to help with sponsorship text verification
    Field('PP_town', type = 'text'),
    Field('PP_country', type = 'text'),
    # address to help with further info verification
    Field('PP_house_and_street', type = 'text'),
    Field('PP_postcode', type = 'text'),
    # save the two above only if they have agreed to give us gift aid

    Field('sale_time', type = 'text'),
    # seems professional to know when they paid and wise to keep it separate from expiry date
                
    # a verified copy of what's in the sponsor table. Can also use this to check if this entry has been sponsored and verified
    Field('verified_kind', type = 'string', length=4, requires=IS_EMPTY_OR(IS_IN_SET(['by','for']))),
    # matches 'user_sponsor_kind'
    Field('verified_name', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30)), widget=SQLFORM.widgets.text.widget), 
    # matches 'user_sponsor_name'
    Field('verified_donor_title', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30))),
    # matches 'user_donor_title'
    Field('verified_donor_name', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(minsize=1,maxsize=30))),
    # matches 'user_donor_name'
    Field('verified_more_info', type='string', length=40, requires=IS_EMPTY_OR(IS_LENGTH(maxsize=30)), widget=SQLFORM.widgets.text.widget), 
    # matches 'user_more_info'
    Field('verified_preferred_image', type='integer', requires = IS_EMPTY_OR(IS_INT_IN_RANGE(1,1e100))),
    # matches 'user_preferred_image', or may be modified by hand by an admin. 
    # Can only be null if there was no image (not even an already-downloaded OneZoom one) 
    # when the user sponsored. If the user picked a non default image, then this 
    # field is still filled out, but user_nondefault_image should be 1.
    Field('verified_time', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    # if verified_time = NULL then details haven't been verified
    Field('verified_paid', type = 'text'), 
    # has then amount paid been matched to paypal e-mail
    Field('verified_url', type = 'text'),  
    # url for those that agree to have one            
    Field('live_time', type = 'datetime', requires= IS_EMPTY_OR(IS_DATETIME())),
    # the time when we emailed/tweeted them (left as 'live_time' for historical reasons)
                                
    Field('admin_comment', type = 'text'),            
    # comments for any purpose edited by us  
    Field('sponsorship_duration_days',type = 'integer'),
    # the expiry date in days beyond sale time            
    Field('asking_price', type = 'double', requires = IS_EMPTY_OR(IS_DECIMAL_IN_RANGE(0,1e100))), 
    # price in pounds - good idea to hang on to this for accounting purposes and verification the numbers add up later
    Field('partner_percentage', type = 'double', requires = IS_EMPTY_OR(IS_DECIMAL_IN_RANGE(0,1e100))), 
    # percentage of this donation that is diverted to a OZ partner like Linn Soc (after paypal fees are deducted) 
    Field('partner_name', type = 'string', length=40),
    # a standardised name for the partner (or multiple partners if it comes to that - would then assume equal split between partners)
    Field('deactivated', type = 'text'),
    # true if this row in the reservations table has been deliberately deactivated for any reason other than expiry e.g. complaint / species disappears etc.
                       
    format = '%(OTT_ID)s_%(name)s'),            

#a duplicate of the reservations table to store old reservations. This table need never be sent to 3rd parties
db.define_table('expired_reservations', 
    Field('OTT_ID', type = 'integer', unique=False, requires=IS_NOT_EMPTY()), 
    *[f.clone() for f in db.reservations if f.name != 'OTT_ID' and f.name!='id'],
    format = '%(OTT_ID)s_%(name)s', migrate=is_testing)

# this table defines the current pricing cutoff points
db.define_table('prices',
    Field('price', type = 'integer', unique=True, requires=IS_NOT_EMPTY()),
    Field('current_cutoff', type = 'double'),
    Field('n_leaves', type = 'integer'),
    format = '%(price)s_%(n_leaves)s')

# this table collects data for recently 'visited' nodes (i.e. requested through the API) 
db.define_table('visit_count',
    Field('ott', type = 'integer', notnull=True, unique=True),
    Field('detail_fetch_count', type = 'integer'),
    Field('search_count', type = 'integer'),
    Field('leaf_click_count', type = 'integer'),
    format = '%(ott)s', migrate=is_testing)

# this table collects a list of search terms so we can optimise search
db.define_table('search_log',
    Field('search_string', type='string', notnull=True, unique=True, length=name_length_chars), #this should be utf8mb4
    Field('search_count', type = 'integer', notnull=True),
    format = '%(search_string)s', migrate=1)

# This table buffers recently 'visited' EoL taxa (visited through the window popup or via the copyright link)
# taxa in this table are stored until at least 1 minute after the taxon is visited, and then read by the EOL update 
# script (EoLQueryPicsNames.py) to check for updates to the crop location, ratings, etc. Once checked, the taxon
# is deleted from the table, so this should contain only those taxa that need checking. The EoLQueryPicsNames.py script
# requires ott ids, and looks up the corresponding eol ids from the ordered_leaves and ordered_nodes tables.
# However, there are some cases where we want to fill this array in advance, even through the entries may not exist
# in the ordered_leaves / nodes table. In this case, we can provide an alternative eol ID in the eol column
db.define_table('eol_inspected',
    Field('ott', type = 'integer'),
    Field('name', type='string', length=name_length_chars), #only used if no OTT
    Field('eol', type = 'integer'), #usually null, unless we want a backup number in the case of no ott match in ordered_leaves/nodes
    Field('via', type = 'integer', notnull=True),
    Field('inspected', type = 'datetime', notnull=True, requires=IS_DATETIME()),
    format = '%(ott)s_%(name)s', migrate=is_testing)

# this table contains info to provide a list of interesting places to sponsor. 
db.define_table('sponsor_picks',
    Field('identifier', type = 'string', unique=True, length=20, notnull=True), #a unique identifier: if a number this refers to an OTT id
    Field('display_order', type = 'integer', unique=True), #What order to display them in on the page. If NULL, this is disabled
    Field('name', type='text', notnull=True), #the name that appears on the webpage. May be translated
    Field('subtext', type='text'), #optional subtext to explain the list. May be translated
    Field('thumb_url', type='text'), #a url to a thumbnail picture. If NULL, use the thumb_src and thumb_src_id fields below
    Field('thumb_src', type='integer'), #details of a potential thumbnail picture - a number from src_flags, e.g. 1 for OneZoom, 2 for Eol, etc.
    Field('thumb_src_id', type='integer'), #details of a potential thumbnail picture - the identifier within src, e.g. the data_object id for EoL
    Field('otts', type='text'), #a comma-separated list of ott ids. If NULL, generate a list of OTTs by converting the identifier field above to an integer and using the sponsor_node page. Otherwise use the sponsor_handpick page
    Field('vars', type='text'), #a JSON string used to add variables to the linked web page, e.g. {'n':12} to increase the number of species in each price category, or {'user_more_info':'sponsor info'} or {'partner':partner_identifier} - where partner_identifier matches that value from the partners table below.
    format = '%(identifier)s_%(name)s', migrate=is_testing)

# this table lists potential OneZoom 'partners' with whom we might share profits
db.define_table('partners',
    Field('partner_identifier', type = 'string', unique=True, length=20, notnull=True), #a unique alphanumeric identifier, e.g. LinnSoc
    Field('name', type='text', notnull=True), #the name, e.g. 'the Linnean Society of London',as in "50% will go to {{name}}" - this may be translated
    Field('url', type='text'), #a url to give people further info about the sponsorship scheme on the partner's web site
    Field('general_url', type='text'), #a url to give people general info about the partner
    Field('logo', type='text'), #a url to a logo, e.g. used on sponsorship page
    Field('small_logo', type='text'), #a url to a small version of their logo (displayed at ~ 100x50 px), e.g. used on the main OneZoom viewer
    Field('details', type='text'), #more info for sponsors, e.g. what the money goes towards. May be translated.
    Field('percentage', type = 'double', notnull=True),
    Field('giftaid', type = boolean, notnull=True), #can we collect gift aid?
    Field('default_more_info', type='string', length=30), #what appears by default in the sponsorship text, e.g. "supporting the Linnean Society"
    Field('popular_locations_json', type='text'), #a JSON string used to fill the popular species menu (the popular_locations variable passed to treeviewer/layout.html). This is an long array containing elements which are either strings (which give menu headers) or dicts as {"OTT":1234,"en":"English name",...}. No carriage returns or single quotes allowed.
    Field('allow_own_site', type = boolean), #If True, allow a site like www.onezoom.org/life/partnername/
    format = '%(name)s', migrate=is_testing)

# this table maps partners to node or leaf OTTs. When sponsorship windows
# are opened on the main OZ website we check whether the 
db.define_table('partner_taxa',
    Field('partner_identifier', type = 'string', length=20, notnull=True), #a unique alphanumeric identifier, e.g. LinnSoc
    Field('ott', type='text'), #an ott: on the main OZ site, descendants of these IDs will have this partner set
    Field('is_leaf', type = boolean, notnull=True), #is this a leaf? Helps us choose whether to look in leaf or node table
    Field('deactived', type = boolean, notnull=True), #allows us to keep details in the DB but not to do sponsorship. However, it is more efficient to delete them from this table
    format = '%(partner_identifier)s', migrate=is_testing)

#some tables for tours
#one row per tour, to store e.g. the name of the tour
db.define_table('tours',
    Field('identifier', type = 'string', unique=True, length=20, notnull=True), #a unique alphanumeric identifier, e.g. LinnSoc
    Field('name', type='text', notnull=True), #the name, to go before 'TreeTour', e.g. 'Iridescence' - this may be translated
    Field('description', type='text'), #a description of the tour
    Field('rating', type='double'), #average user rating
    format = '%(identifier)s', migrate=is_testing)

#the list of stops for each tour: one row per stop, giving ids into the tourstops table
db.define_table('tourorders',
    Field('identifier', type = 'string', length=20, notnull=True), #a unique alphanumeric identifier, e.g. LinnSoc
    Field('transition', type = 'string', length=20), #the transition to this stop from the previous one
    Field('node_fullzoom', type = boolean), #when we transition to here, should we zoom so the node fills the screen?
    Field('stop_number', type='integer', notnull=True), #the 0-based order of this stop in the defined tour
    Field('stop_id', type='integer', notnull=True), #the id in the tourstops table corresponding to this tour
    format = '%(identifier)s_%(stop_number)s', migrate=is_testing)


db.define_table('tourstops',
    Field('ott', type='integer', notnull=True), #the ott of this taxon
    Field('description', type = 'text'), #text to show at this stop
    Field('video', type = 'string', length=20), #the youtube video number, if there is a video
    format = '%(identifier)s_%(stop_number)s', migrate=is_testing)
    
#a list of API users, added by hand
db.define_table('API_users',
    Field('APIkey', type = 'string', length=32, unique=True, notnull=True),
    Field('API_user_name', type = 'text'), # who this API user is
    Field('max_taxa_per_query', type='integer'), #set this to NULL or 0 to deactivate this API user
    Field('max_returns_per_taxon', type='integer'),
    format = '%(APIkey)s', migrate=is_testing)

#a record of the amounts of API use, by user
db.define_table('API_use',
    Field('APIkey', type = 'string',  unique=True, length=32), #which key was used
    Field('API', type = 'string', length=100), #which API was used, e.g. popularity/list
    Field('start_date', type = 'datetime', notnull=True, requires=IS_DATETIME()), #when we started recording this data
    Field('end_date', type = 'datetime', requires=IS_DATETIME()), #when we stopped recording this data (if NULL, this is still recording)
    Field('n_calls', type = 'bigint', default=1), # number of times API called
    Field('n_taxa', type = 'bigint', default=0), # number of taxa requested (divide by n_calls to get av taxa per call)
    Field('n_returns', type = 'bigint', default=0), # number of taxa returned (divide by n_calls to get av taxa per call)
    format = '%(APIkey)s_%(API)s', migrate=is_testing)

# add extra indexes on OTT_ID etc in tables. Index name (ott_index) is arbitrary 
# http://stackoverflow.com/questions/4601138/what-is-the-significance-of-the-index-name-when-creating-an-index-in-mysql
if db._uri.startswith("sqlite://"):
    db.executesql('CREATE INDEX IF NOT EXISTS ott_index ON ordered_nodes (ott);')
    db.executesql('CREATE INDEX IF NOT EXISTS ott_index ON ordered_leaves (ott);')
    db.executesql('CREATE INDEX IF NOT EXISTS ott_index ON banned (ott);')
    db.executesql('CREATE INDEX IF NOT EXISTS ott_index ON reservations (OTT_ID);')
    db.executesql('CREATE INDEX IF NOT EXISTS eol_index ON ordered_nodes (eol);')
    db.executesql('CREATE INDEX IF NOT EXISTS eol_index ON ordered_leaves (eol);')
    db.executesql('CREATE INDEX IF NOT EXISTS name_index ON ordered_nodes (name);')
    db.executesql('CREATE INDEX IF NOT EXISTS name_index ON ordered_leaves (name);')
#note mysql does not allow IF NOT EXISTS for index creation. Indexes may need to be added manually. See 
# http://stackoverflow.com/questions/36602374/web2py-how-to-call-a-call-a-function-on-table-creation
# for mysql, try this one-off command
"""
#set stupid mysql to use full 4 byte unicode (https://mathiasbynens.be/notes/mysql-utf8mb4)

drop procedure if exists MakeFullUnicode;

DELIMITER //

CREATE PROCEDURE MakeFullUnicode(tablename CHAR(50), columnname CHAR(50))

  BEGIN
    DECLARE char_set TEXT;
    DECLARE vtype TEXT;
    
    SELECT character_set_name, column_type INTO char_set, vtype FROM information_schema.`COLUMNS` 
        WHERE table_schema = SCHEMA() AND table_name = tablename AND column_name = columnname;
    IF char_set != 'utf8mb4' THEN 
      SET @sql_cmd = CONCAT('ALTER TABLE ', tablename,' CONVERT TO CHARACTER SET utf8mb4;');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('ALTER TABLE ', tablename,' CHANGE ', columnname, ' ', columnname, ' ', vtype, ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('REPAIR TABLE ', tablename, ';');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('OPTIMIZE TABLE ', tablename, ';');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
    END IF;
  END //

DELIMITER ;

#with an innoDB server, you may get ignorable errors like 'The storage engine for the table doesn't support repair'
call MakeFullUnicode('vernacular_by_ott', 'vernacular');
call MakeFullUnicode('vernacular_by_name', 'vernacular');
call MakeFullUnicode('images_by_ott', 'rights');
call MakeFullUnicode('images_by_ott', 'licence');
call MakeFullUnicode('images_by_name', 'rights');
call MakeFullUnicode('images_by_name', 'licence');
call MakeFullUnicode('search_log', 'search_string');

# note make sure that the name column in vernacular_by_name and the name column in ordered_leaves and ordered_nodes are of the same character set otherwise search can get incredibly slow even with indexes.



DROP   INDEX ott_index           ON banned;
CREATE INDEX ott_index           ON banned (ott)                      USING HASH;

DROP   INDEX ott_index           ON iucn;
CREATE INDEX ott_index           ON iucn (ott)                        USING HASH;

DROP   INDEX iucn_index          ON iucn;
CREATE INDEX iucn_index          ON iucn (status_code)                USING HASH;

DROP   INDEX ott_index           ON images_by_ott;
CREATE INDEX ott_index           ON images_by_ott (ott, best_any)     USING HASH;

DROP   INDEX overall_any_index   ON images_by_ott;
CREATE INDEX overall_any_index   ON images_by_ott (overall_best_any)  USING HASH;

DROP   INDEX name_index          ON images_by_name;
CREATE INDEX name_index          ON images_by_name (name, best_any)   USING HASH;

DROP   INDEX overall_any_index   ON images_by_name;
CREATE INDEX overall_any_index   ON images_by_name (overall_best_any) USING HASH;

DROP   INDEX src_index           ON images_by_ott;
CREATE INDEX src_index           ON images_by_ott (src, src_id);

DROP   INDEX src_index           ON images_by_name;
CREATE INDEX src_index           ON images_by_name (src, src_id);

DROP   INDEX rating_index        ON images_by_ott;
CREATE INDEX rating_index        ON images_by_ott(rating);

DROP   INDEX rating_index        ON images_by_name;
CREATE INDEX rating_index        ON images_by_name(rating);

DROP   INDEX ott_index           ON vernacular_by_ott;
CREATE INDEX ott_index           ON vernacular_by_ott (ott, lang_primary, preferred, src) USING HASH;

DROP   INDEX name_index          ON vernacular_by_name;
CREATE INDEX name_index          ON vernacular_by_name (name, lang_primary, preferred, src);

DROP   INDEX ott_index           ON reservations;
CREATE INDEX ott_index           ON reservations (OTT_ID)           USING HASH;

DROP   INDEX user_kind_index     ON reservations;
CREATE INDEX user_kind_index     ON reservations (user_sponsor_kind) USING HASH;

DROP   INDEX verified_index      ON reservations;
CREATE INDEX verified_index      ON reservations (verified_kind)    USING HASH;

DROP   INDEX verifiedtime_index  ON reservations;
CREATE INDEX verifiedtime_index  ON reservations (verified_time);

DROP   INDEX user_time_index     ON reservations;
CREATE INDEX user_time_index     ON reservations (user_updated_time);

DROP   INDEX PP_e_mail_index     ON reservations;
CREATE INDEX PP_e_mail_index     ON reservations (PP_e_mail)        USING HASH;

DROP   INDEX donor_name_index    ON reservations;
CREATE INDEX donor_name_index    ON reservations (verified_donor_name) USING HASH;

DROP   INDEX eol_index           ON eol_updated;
CREATE INDEX eol_index           ON eol_updated (eol)               USING HASH;

DROP   INDEX updated_index       ON eol_updated;
CREATE INDEX updated_index       ON eol_updated (updated);

DROP   INDEX ott_index           ON visit_count;
CREATE INDEX ott_index           ON visit_count (ott)               USING HASH;

DROP   INDEX lang_primary_index  ON vernacular_by_name;
CREATE INDEX lang_primary_index  ON vernacular_by_name (lang_primary);

DROP   INDEX lang_full_index     ON vernacular_by_name;
CREATE INDEX lang_full_index     ON vernacular_by_name (lang_full);

DROP   INDEX lang_primary_index  ON vernacular_by_ott;
CREATE INDEX lang_primary_index  ON vernacular_by_ott (lang_primary);

DROP   INDEX lang_full_index     ON vernacular_by_ott;
CREATE INDEX lang_full_index     ON vernacular_by_ott (lang_full);

DROP   INDEX preferred_index     ON vernacular_by_name;
CREATE INDEX preferred_index     ON vernacular_by_name (preferred);

DROP   INDEX preferred_index     ON vernacular_by_ott;
CREATE INDEX preferred_index     ON vernacular_by_ott (preferred);

DROP            INDEX vernacular_index       ON vernacular_by_name;
CREATE          INDEX vernacular_index       ON vernacular_by_name (vernacular);

DROP            INDEX vernacular_index       ON vernacular_by_ott;
CREATE          INDEX vernacular_index       ON vernacular_by_ott (vernacular);

DROP            INDEX ft_vernacular_index    ON vernacular_by_name;
CREATE FULLTEXT INDEX ft_vernacular_index    ON vernacular_by_name (vernacular);

DROP            INDEX ft_vernacular_index    ON vernacular_by_ott;
CREATE FULLTEXT INDEX ft_vernacular_index    ON vernacular_by_ott (vernacular);

# some indexes for sponsor searching

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (verified_name);

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (verified_donor_name);

DROP            INDEX sponsor_info_index     ON reservations;
CREATE          INDEX sponsor_info_index     ON reservations (verified_more_info);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (verified_name);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (verified_donor_name);

DROP            INDEX ft_sponsor_info_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_info_index  ON reservations (verified_more_info);

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (user_sponsor_name);

DROP            INDEX sponsor_info_index     ON reservations;
CREATE          INDEX sponsor_info_index     ON reservations (user_more_info);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (user_sponsor_name);

DROP            INDEX ft_sponsor_info_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_info_index  ON reservations (user_more_info);

DROP   INDEX ipni_index          ON PoWO;
CREATE INDEX ipni_index          ON PoWO (ipni_int)         USING HASH;

DROP   INDEX string_index    ON search_log;
CREATE INDEX string_index    ON search_log (search_string)   USING HASH;

DROP   INDEX identifier_index    ON partners;
CREATE INDEX identifier_index    ON partners (partner_identifier)   USING HASH;

DROP   INDEX key_index           ON API_users;
CREATE INDEX key_index           ON API_users (APIkey)     USING HASH;

DROP   INDEX key_index           ON API_use;
CREATE INDEX key_index           ON API_use (APIkey)       USING HASH;

DROP   INDEX API_index           ON API_use;
CREATE INDEX API_index           ON API_use (API)          USING HASH;

DROP   INDEX date_index          ON API_use;
CREATE INDEX date_index          ON API_use (end_date)     USING HASH;

# The following are the indexes for ordered leaves & ordered nodes, useful to re-do after a new tree is imported 

DROP   INDEX price_index         ON ordered_leaves;
CREATE INDEX price_index         ON ordered_leaves (price);

DROP   INDEX ipni_index          ON ordered_nodes;
CREATE INDEX ipni_index          ON ordered_nodes (ipni)    USING HASH;

DROP   INDEX ipni_index          ON ordered_leaves;
CREATE INDEX ipni_index          ON ordered_leaves (ipni)   USING HASH;

DROP   INDEX ott_index           ON ordered_nodes;
CREATE INDEX ott_index           ON ordered_nodes (ott)     USING HASH;

DROP   INDEX ott_index           ON ordered_leaves;
CREATE INDEX ott_index           ON ordered_leaves (ott)    USING HASH;

DROP   INDEX eol_index           ON ordered_nodes;
CREATE INDEX eol_index           ON ordered_nodes (eol)     USING HASH;

DROP   INDEX eol_index           ON ordered_leaves;
CREATE INDEX eol_index           ON ordered_leaves (eol)    USING HASH;

DROP   INDEX wiki_index          ON ordered_nodes;
CREATE INDEX wiki_index          ON ordered_nodes (wikidata)  USING HASH;

DROP   INDEX wiki_index          ON ordered_leaves;
CREATE INDEX wiki_index          ON ordered_leaves (wikidata) USING HASH;

DROP   INDEX parent_index        ON ordered_nodes;
CREATE INDEX parent_index        ON ordered_nodes (parent)  USING HASH;

DROP   INDEX parent_index        ON ordered_leaves;
CREATE INDEX parent_index        ON ordered_leaves (parent) USING HASH;

DROP   INDEX real_parent_index   ON ordered_nodes;
CREATE INDEX real_parent_index   ON ordered_nodes (real_parent)  USING HASH;

DROP   INDEX real_parent_index   ON ordered_leaves;
CREATE INDEX real_parent_index   ON ordered_leaves (real_parent) USING HASH;

DROP   INDEX raw_pop_index       ON ordered_nodes;
CREATE INDEX raw_pop_index       ON ordered_nodes (raw_popularity);

DROP   INDEX raw_pop_index       ON ordered_leaves;
CREATE INDEX raw_pop_index       ON ordered_leaves (raw_popularity);

DROP   INDEX pop_index           ON ordered_nodes;
CREATE INDEX pop_index           ON ordered_nodes (popularity);

DROP   INDEX pop_index           ON ordered_leaves;
CREATE INDEX pop_index           ON ordered_leaves (popularity);

DROP   INDEX poprank_index       ON ordered_leaves;
CREATE INDEX poprank_index       ON ordered_leaves (popularity_rank);

DROP   INDEX name_index          ON ordered_leaves;
CREATE INDEX name_index          ON ordered_leaves (name);

DROP   INDEX name_index          ON ordered_nodes;
CREATE INDEX name_index          ON ordered_nodes (name);

DROP            INDEX name_fulltext_index ON ordered_nodes;
CREATE FULLTEXT INDEX name_fulltext_index ON ordered_nodes (name);

DROP            INDEX name_fulltext_index ON ordered_leaves;
CREATE FULLTEXT INDEX name_fulltext_index ON ordered_leaves (name);

"""
