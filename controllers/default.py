# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations
import datetime
import re

from OZfunctions import nice_species_name, get_common_name, get_common_names, sponsorable_children_query, language, __check_version, __make_user_code
""" Some settings for sponsorship"""
try:
    reservation_time_limit = myconf.take('sponsorship.reservation_time_limit_mins') * 60.0
except:
    reservation_time_limit = 360.0 #seconds
try:
    unpaid_time_limit = myconf.take('sponsorship.unpaid_time_limit_mins') * 60.0
except:
    unpaid_time_limit = 2.0*24.0*60.0*60.0 #seconds

"""Standard web2py stuff"""

from datetime import timedelta

def index():
    """
    here we should find a random selection of things with highly-rated photos which have not been sponsored, and pass them in.
    also check for the best rated photos for sponsorship, and pass those in.
    """
    return dict()

@auth.requires_membership(role='manager')
def index_uikit():
    """
    A test version of the frontpage using UIkit 3 (https://getuikit.com) rather than boostrap
    """
    return dict()

def user():
    """
    exposes:
    http://..../[app]/default/user/login
    http://..../[app]/default/user/logout
    http://..../[app]/default/user/register
    http://..../[app]/default/user/profile
    http://..../[app]/default/user/retrieve_password
    http://..../[app]/default/user/change_password
    http://..../[app]/default/user/manage_users (requires membership in
    http://..../[app]/default/user/bulk_register
    use @auth.requires_login()
        @auth.requires_membership('group name')
        @auth.requires_permission('read','table name',record_id)
    to decorate functions that need access control
    """

    #from http://www.web2pyslices.com/slice/show/1642/login-with-username-and-email - allow username OR email (to allow 'guest' account
    if 'login' in request.args:
        db.auth_user.username.label = T("Username or Email")
        auth.settings.login_userfield = 'username'
        if request.vars.username and not IS_EMAIL()(request.vars.username)[1]:
            auth.settings.login_userfield = 'email'
            request.vars.email = request.vars.username
            request.post_vars.email = request.vars.email
            request.vars.username = None
            request.post_vars.username = None
 
        return dict(form=auth())
 
    return dict(form=auth())

def call():
    """
    exposes services. for example:
    http://..../[app]/default/call/jsonrpc
    decorate with @services.jsonrpc the functions to expose
    supports xml, json, xmlrpc, jsonrpc, amfrpc, rss, csv
    """
    return service()

""" generally useful functions """

def time_diff(startTime,endTime):
    return (endTime-startTime)

""" main leaf sponsorship routine """

def sponsor_leaf():
    """ 
        this function will take open tree ID and from that ...
        1.) figure out status of leaf and return the correct page
            these options will all forward to different pages (the view is listed in square brackets), selected in the following order:

            * maintenance [spl_maintenance.html] - the site is in maintenance mode, and we don't want to allow any access to reservations data

            * no status set [spl_error.html] - something went very wrong

                The following can be shown even when sponsorship is turned off
            * sponsored [spl_sponsored.html] - it's already been sponsored
            * invalid [spl_invalid.html] - not an actual sponsorable OTTid
            * banned [spl_banned.html] - cannot sponsor this
            * available on main site [spl_elsewhere.html] - it may be available but this onezoom instance doesn't allow sponsorship (e.g. in a museum)
            
                The following can only be shown if sponsorship is on.
            * unverified [spl_unverified.html] - it's already been sponsored but the details haven't been verified yet
            * unverified waiting for payment [spl_waitpay.html] - has been sponsored but paypal hasn't sent us confirmation (could be that they didn't actually pay, so may become free after a few days)


                The following are only shown when sponsorship is allowed and not in maintenance mode
            * reserved [spl_reserved.html] - another user was active on this page recently and it's being reserved for them for a few minutes
            * available [sponsor_leaf.html] - the leaf is fully available, so proceed
            * available only to user [sponsor_leaf.html] - it's available but for this user only
        it will also provide the current best picture for that taxon (if one exists)
        2.) update the 'reserved' table with new numbers of views and view times / user ids etc.
        3.) collect the name, price and EOL ids from the database and return them to the page
        4.) look up the partner_taxa table, find the ranges of leaf ids that will trigger a partner deal,
            check if this leaf id is within any range, and if so, find the partner_identifier and return the
            details to the page for that partner (taken from the partners table).

        database info that needs to be handled by this function
        
            OTT_ID
            name
        
            num_views
            last_view
            reserve_time
            user_registration_id
    
            user_id (? - later)
            e_mail
            twitter_name
            allow_contact
        
            user_sponsor_kind
            user_sponsor_name
            user_more_info
            user_preferred_image
            user_updated_time
            user_paid
            user_message_OZ

        This function DOES NOT need up update the sponsor or verified info tables because these are handled separately. Additionally, e-mail, address and name as well as receipt should be captured from Paypal """

    try:
        maint = int(myconf.take('sponsorship.maintenance_mins'))
    except:
        maint = 0
    if maint:
        response.view = request.controller + "/spl_maintenance." + request.extension
        return dict(mins=str(maint))

    max_price = db.prices.price.max()
    max_global_price = db().select(max_price).first()[max_price] / 100
    min_price = db.prices.price.min()
    min_global_price = db().select(min_price).first()[min_price] / 100
    
    from json import dumps
    if (request.vars.get('form_reservation_code')):
        form_reservation_code = request.vars.form_reservation_code
    else:
        form_reservation_code = __make_user_code()
    # initialise status flag (it will get updated if all is OK)
    status = ""
    # sometimes (e.g. museum display on main OZ site) we shut off sponsoring without using appconfig
    # which we do by passing a url param
    try:
        allow_sponsorship = myconf.take('sponsorship.allow_sponsorship') in ['true', '1', 't', 'y', 'yes', 'True'] and not request.vars.no_sponsoring
    except:
        allow_sponsorship = False
    # initialise other variables that will be parsed on to the page
    EOL_ID = -1
    species_name = common_name = the_name = None
    release_time = 0 #when this will become free, in seconds
   
    # todo this function should probably handle asking_price and set it from ordered_leaves
    try:
        EoL_API_key=myconf.take('api.eol_api_key')
    except:
        EoL_API_key=""

    # now search for OTTID in the leaf table
    try:
        OTT_ID_Varin = int(request.vars.get('ott'))
        leaf_entry = db(db.ordered_leaves.ott == OTT_ID_Varin).select().first()
        common_name = get_common_name(OTT_ID_Varin)
        species_name = leaf_entry.name
        long_name = nice_species_name(leaf_entry.name, common_name, html=True, leaf=True, the=False)
        the_long_name = nice_species_name(leaf_entry.name, common_name, html=True, leaf=True, the=True)
    except:
        OTT_ID_Varin = None
        leaf_entry = {}
    if ((not leaf_entry) or              #invalid if not in ordered_leaves
        (leaf_entry.ott is None) or      #invalid if no OTT ID
        (' ' not in leaf_entry.name)):   #invalid if not a species name (e.g. no space/underscore)
        response.view = request.controller + "/spl_invalid." + request.extension
        return dict(OTT_ID = OTT_ID_Varin, species_name = leaf_entry.get('name'))
    
    #we might come into this with an established partner set in request.vars (e.g. LinnSoc)
    partner = request.vars.get('partner')
    """
    TO DO & CHECK
    if partner is None:
        #check through partner_taxa for leaves that might match this one
        partner = db((~db.partner_taxa.deactived) & 
                     (db.partner_taxa.is_leaf == True) &
                     (db.partner_taxa.ott == OTT_ID_Varin)
                    ).select(db.partner_taxa.partner_identifier).first()
    if partner is None:
        #pull out potential partner *nodes* that we might need to check
        #also check if this leaf lies within any of the node ranges
        partner = db((~db.partner_taxa.deactived) & 
                     (db.partner_taxa.is_leaf == False) &
                     (OTT_ID_Varin >= db.ordered_nodes.leaf_lft) &
                     (OTT_ID_Varin <= db.ordered_nodes.leaf_rgt) &
                     (db.ordered_nodes.ott == db.partner.ott).first()
                    ).select(db.partner_taxa.partner_identifier) #this should include a join with ordered_nodes to get the ranges, and a select
    """
    try:
        if partner is None:
            raise AttributeError
        partner_data = db(db.partners.partner_identifier == partner).select(db.partners.ALL).first().as_dict() #this could be null
    except AttributeError:
        partner_data = {}
        
    # this is a real ID (may be banned) but can get the data
    EOL_ID = leaf_entry.eol

    # find out if the leaf is banned
    # now search in db for ottid in banned
    isbanned = db(db.banned.ott == OTT_ID_Varin).count()
    # this will be >=1 if banned and 0 if not banned
    # we need to update the reserved table here so find the id (regardless of banned / maintenance status)
    reservation_query = db(db.reservations.OTT_ID == OTT_ID_Varin)
    reservation_entry = reservation_query.select().first()
    if reservation_entry is None:
        # there is no row in the database for this case so add one
        if (isbanned != 0):
            # update with full viewing data but no reservation as banned
            db.reservations.insert(
                OTT_ID = OTT_ID_Varin,
                name=leaf_entry.name,
                last_view=request.now,
                num_views=1
            )
            # this line does not insert any leger id because no transaction has taken place yet
            # that entry in the db is allowed to be blank
        elif not allow_sponsorship:
            # update but don't reserve
            db.reservations.insert(
                OTT_ID = OTT_ID_Varin,
                name=leaf_entry.name,
                last_view=request.now,
                num_views=1)
        else:
            status = "available"
            # update with full reservation
            db.reservations.insert(
                OTT_ID = OTT_ID_Varin,
                name=leaf_entry.name,
                last_view=request.now,
                num_views=1,
                reserve_time=request.now,
                user_registration_id =form_reservation_code)
            # this line does not insert any leger id because no transaction has taken place yet
            # that entry in the db is allowed to be blank
    else:
        # there is already a row in the database so update
        reservation_query.update(last_view=request.now, num_views=reservation_entry.num_views+1)

        # this may be available (because valid) but could be sponsored, unverified, reserved or available still 
        # easiest cases to rule out are relating sponsored and unverified cases. In either case they would appear in the leger
        ledger_user_name = reservation_entry.user_sponsor_name
        ledger_PP_transaction_code = reservation_entry.PP_transaction_code
        ledger_verified_time = reservation_entry.verified_time
        # the way we know something is fully sponsored is if PP transaction code is filled out  
        #nb. this could be with us typing "yet to be paid" in which case verified_paid can be NULL 
        # so "verified paid " should not be used as a test of whether something is available or not
        # For forked sites, we do not pass PP transaction code (confidential), so we have to check first if 
        # verified.
        # Need to have another option here if verified_time is too long ago - we should move this to the expired_reservations table and clear it.
        if (ledger_verified_time):
            status = "sponsored"
        elif allow_sponsorship and not isbanned:
            if (ledger_user_name):
            # something has been filled in
                if (ledger_PP_transaction_code):
                    #we have a code (or have reserved this taxon)
                    status = "unverified"
                else:
                    # unverified and unpaid - test time
                    startTime = reservation_entry.reserve_time
                    endTime = request.now
                    timesince = ((endTime-startTime).total_seconds())
                    # now we check if the time is too great
                    if (timesince < (unpaid_time_limit)):
                        status = "unverified waiting for payment"
                    else:
                        # we've waited too long and can zap the personal data previously in the table then set available
                        reservation_query.update(user_id=None, e_mail=None, twitter_name=None, allow_contact=None, user_sponsor_kind=None, user_sponsor_name=None, user_more_info=None, user_nondefault_image=None, user_preferred_image=None, user_updated_time=None, user_paid=None, user_message_OZ=None, user_giftaid=None, user_registration_id=None, PP_transaction_code=None, PP_e_mail=None, PP_first_name=None, PP_second_name=None, PP_town=None, PP_country=None, PP_house_and_street=None, PP_postcode=None, verified_kind=None, verified_name=None, verified_more_info=None, verified_preferred_image=None, verified_time=None, verified_paid=None, verified_url=None, live_time=None, admin_comment=None, sponsorship_duration_days=None, asking_price=None, deactivated=None, sale_time=None, partner_name=None, partner_percentage=None)
                        #note that this e.g. clears deactivated taxa, etc etc.
                        status = "available"
            else:
                # the page has no user name entered but is also not valid or banned - it could only be reserved or available
                # first thing is to determine time difference since reserved
                startTime = reservation_entry.reserve_time   
                endTime = request.now
                if (startTime == None):
                    status = "available"
                    # reserve the leaf because there is no reservetime on record
                    reservation_query.update(reserve_time=request.now, user_registration_id=form_reservation_code)
                else:
                    # we need to compare times to figure out if there is a time difference
                    timesince = ((endTime-startTime).total_seconds())
                    if (timesince < (reservation_time_limit)):
                        release_time = reservation_time_limit - timesince
                        # we may be reserved if it wasn't us
                        if(form_reservation_code == reservation_entry.user_registration_id):
                            # it was the same user anyway so reset timer
                            status = "available only to user"
                            reservation_query.update(reserve_time=request.now)
                        else:
                            status = "reserved"
                    else:
                        # it's available still
                        status = "available"
                        # reserve the leaf because there is no reservetime on record
                        reservation_query.update(reserve_time = request.now, user_registration_id = form_reservation_code)
    #re-do the query since we might have added the row ID now
    reservation_entry = reservation_query.select().first()
    if reservation_entry is None:
        raise HTTP(400,"Error: row is not defined. Please try reloading the page")

    #get the best picture for this ott, if there is one.
    default_image = db((db.images_by_ott.ott == OTT_ID_Varin) & (db.images_by_ott.overall_best_any == True)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,  db.images_by_ott.rights, db.images_by_ott.licence).first()
    #also look at the nondefault images if present
    if reservation_entry.user_nondefault_image:
        doID = reservation_entry.verified_preferred_image
        user_image = db(db.images_by_ott.src_id == doID).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id, db.images_by_ott.rights, db.images_by_ott.licence).first()
    else:
        user_image=None

    #once we have got this far (not invalid or error), we can show certain pages
    #even in maintenance mode or where allow_sponsorship is not True, e.g. if
    #a leaf is already sponsored, or is banned from sponsorship
    if status == "sponsored":
        response.view = request.controller + "/spl_sponsored." + request.extension
        return dict(species_name = species_name, js_species_name = dumps(species_name), common_name = common_name, js_common_name = dumps(common_name.capitalize() if common_name else None), long_name = long_name, default_image = default_image, user_image=user_image, verified_kind=reservation_entry.verified_kind, verified_name=reservation_entry.verified_name, verified_more_info=reservation_entry.verified_more_info)
    elif status.startswith("unverified"):
        if status == "unverified waiting for payment":
            response.view = request.controller + "/spl_waitpay." + request.extension    
            return dict(species_name = species_name,  the_long_name = the_long_name, unpaid_time_limit_hours= int(unpaid_time_limit/60.0/60.0))
        else:
            response.view = request.controller + "/spl_unverified." + request.extension
            return dict(species_name = species_name)
    elif isbanned:
        response.view = request.controller + "/spl_banned." + request.extension
        return dict(species_name = species_name, js_species_name = dumps(species_name), common_name = common_name, js_common_name = dumps(common_name.capitalize() if common_name else None), long_name = long_name, default_image = default_image, user_image=user_image)
    elif not allow_sponsorship:
        response.view = request.controller + "/spl_elsewhere." + request.extension
        return dict(species_name = species_name, the_long_name = the_long_name)
        
    elif status == "reserved":
        response.view = request.controller + "/spl_reserved." + request.extension
        return dict(species_name = species_name, the_long_name = the_long_name, release_time = release_time)

    
    elif status.startswith("available"):
        #potentially sponsorable
        try:
            leaf_price = 0.01*float(leaf_entry.price) #in the leaf table, price is in pence, not a float, to allow binning
            #can sponsor here, go through to the main sponsor_leaf page
            form = SQLFORM(db.reservations, reservation_entry, 
                fields=['e_mail','allow_contact','twitter_name',
                    'user_sponsor_kind','user_sponsor_name','user_more_info','user_paid','user_message_OZ',
                    'user_nondefault_image', 'user_preferred_image','user_giftaid'],
                deletable = False)
            form.custom.widget.user_sponsor_name["requires"] = IS_LENGTH(minsize=1,maxsize=30)
            form.custom.widget.user_sponsor_kind["requires"] = IS_IN_SET(['by','for'])
            form.custom.widget.user_paid["requires"] = IS_FLOAT_IN_RANGE(leaf_price, 99999, dot=".", 
                error_message=XML("Please donate at least £{:.2f} to sponsor this leaf, or you could simply ".format(leaf_price)))
            
        
            if form.process(session=None, formname='test').accepted:
                #response.flash = 'temp form accepted' # debug
                reservation_query.update(
                    reserve_time=request.now,
                    user_sponsor_lang = (request.env.http_accept_language or '').lower(),
                    asking_price=(leaf_price),
                    user_updated_time=request.now,
                    sponsorship_duration_days=365*4+1,
                    partner_name=partner_data.get('partner_identifier'),
                    partner_percentage=partner_data.get('partner_percentage'))
                # now need to do our own other checks
                v = {'ott':OTT_ID_Varin}
                if request.vars.get('embed'):
                    v['embed'] = request.vars.get('embed')
                redirect(URL("default", "paypal", vars=v))
        
            elif form.errors:
               response.flash = 'please check the errors shown in red'
            else:
               #the form should simply be shown
               pass
            return dict(form = form, id=reservation_entry.id, OTT_ID = OTT_ID_Varin, EOL_ID = EOL_ID, eol_src= src_flags['eol'], species_name = species_name, js_species_name = dumps(species_name), common_name = common_name, js_common_name = dumps(common_name.capitalize() if common_name else None), the_long_name = the_long_name, leaf_price = leaf_price, form_reservation_code=form_reservation_code, percent_crop_expansion = percent_crop_expansion, default_image = default_image, partner_data = partner_data, EoL_API_key=EoL_API_key, max_global_price=max_global_price, min_global_price=min_global_price)
        except TypeError: #leaf_entry.price is None, treat as banned
            response.view = request.controller + "/spl_banned." + request.extension
            return dict(species_name = species_name, js_species_name = dumps(species_name), common_name = common_name, js_common_name = dumps(common_name.capitalize() if common_name else None), long_name = long_name, default_image = default_image, user_image=user_image)
        
    else:
        #should never happen
        response.view = request.controller + "/spl_error." + request.extension
        return dict()


def sponsor_leaf_redirect():
    """
    simply provides a link to jump out of an iframe
    """    
    return(dict(ott=request.vars.ott))

def sponsor_replace_page():
    """
    The page displayed once the sponsor has jumped out to paypal in another frame
    """
    try:
        OTT_ID_Varin = int(request.vars.get('ott'))
        row = db(db.reservations.OTT_ID == OTT_ID_Varin).select(db.reservations.OTT_ID,
                                                                db.reservations.name,
                                                                db.reservations.user_sponsor_kind,
                                                                db.reservations.user_sponsor_name,
                                                                db.reservations.user_more_info,
                                                                db.reservations.user_paid,
                                                                db.reservations.PP_transaction_code).first()
        if row is None:
            raise IndexError("Could not match against a row in the database")
        return(dict(data=row))
    except:
        raise HTTP(400,"Sorry, something went wrong")
    
def paypal():
    """
    redirects the user to a paypal page that (if completed) should trigger paypal to in turn
    visit an OZ page (pp_process_post.html) to confirm the payment has gone through - this is called an IPN
    If there are problems, https://developer.paypal.com/docs/classic/ipn/integration-guide/IPNOperations/
    gives details for how to debug.
    """
    import urllib
    error=""
    try:
        OTT_ID_Varin = int(request.vars.get('ott'))
        row = db((db.reservations.OTT_ID == OTT_ID_Varin) & ((db.reservations.PP_transaction_code == None) | (db.reservations.PP_transaction_code == 'reserved'))).select(db.reservations.name, db.reservations.user_paid).first()
        if row is None or row.user_paid is None or row.user_paid < 0:
            raise IndexError("Could not match against a row in the database")
        try:
            paypal_url = myconf.take('paypal.url')
            if not paypal_url:
                raise ValueError('blank paypal config')
        except:
            paypal_url = 'https://www.sandbox.paypal.com'
        try:
            paypal_notify_string = '&notify_url=' + myconf.take('paypal.notify_url') + '/pp_process_post.html/'+str(OTT_ID_Varin)
        except:
            paypal_notify_string = ''
        paypal_url += ('/cgi-bin/webscr' +
                       '?cmd=_donations&business=mail@onezoom.org' +
                       '&item_name=Donation+to+OneZoom+('+urllib.quote(row.name)+')'+
                       '&item_number=leaf+sponsorship+-+'+urllib.quote(row.name)+
                       '&return=' + URL("sponsor_thanks.html", scheme=True, host=True) +
                       paypal_notify_string +
                       '&amount=' + urllib.quote('{:.2f}'.format(row.user_paid))+
                       '&currency_code=GBP')
    except:
        error="we couldn't find your leaf sponsorship information."
        return(dict(error=error, ott=request.vars.get('ott') or '<no available ID>'))
    redirect(paypal_url)

# TODO enabling edits and intelligent behaviour if a logged in user goes back to their own leaf    

def search_name():
    return dict()

def sponsored():
    """
    a simple paged list of recently sponsored species
    """
    if len(request.args): page=int(request.args[0])
    else: page=0
    items_per_page=20
    tot=None
    query = (db.reservations.verified_time != None) & ((db.reservations.deactivated == None) | (db.reservations.deactivated == ""))
    if (request.vars.omit_nopics):
        query = query & (db.reservations.verified_preferred_image != None)
    if (request.vars.getfirst('search_mesg')):
        sanitized = "".join([ch for ch in request.vars.getfirst('search_mesg') if ch.isalnum()])
        query = query & (db.reservations.user_message_OZ.contains(sanitized))
    if (request.vars.sum):
        sum = db.reservations.user_paid.sum()
        tot = db(query).select(sum).first()[sum]
    rows = db(query).select(
                           db.reservations.OTT_ID,
                           db.reservations.name,
                           db.reservations.user_nondefault_image,
                           db.reservations.verified_kind,
                           db.reservations.verified_name,
                           db.reservations.verified_more_info,
                           db.reservations.verified_preferred_image,
                           orderby=~db.reservations.verified_time|db.reservations.reserve_time);

    curr_rows = rows[(page*items_per_page):(1+(page+1)*items_per_page)]
    pds=set()
    sci_names = {r.OTT_ID:r.name for r in curr_rows}
    html_names = {ott:nice_species_name(sci_names[ott], vn, html=True, leaf=True, first_upper=True, break_line=2) for ott,vn in get_common_names(sci_names.keys(), return_nulls=True).iteritems()}
    #store the default image info (e.g. to get thumbnails, attribute correctly etc)
    default_images = {r.ott:r for r in db(db.images_by_ott.ott.belongs(sci_names.keys()) & (db.images_by_ott.best_any==1)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,  db.images_by_ott.rights, db.images_by_ott.licence, orderby=~db.images_by_ott.src)}
    #also look at the nondefault images if present
    doIDs = [r.verified_preferred_image for r in curr_rows if r.user_nondefault_image != 0]
    user_images = {r.ott:r for r in db(db.images_by_ott.src_id.belongs(doIDs)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id, db.images_by_ott.rights, db.images_by_ott.licence, orderby=~db.images_by_ott.src)}
    if (request.vars.highlight_pd):
        pds.add(None) #ones without a src_id are public doman
        pds |= set([l['src_id'] for k,l in default_images.items() if unicode(l['licence'], 'utf8').endswith(u'\u009C')]) #all pd pics should end with \u009C on the licence
        pds |= set([l['src_id'] for k,l in user_images.items() if unicode(l['licence'], 'utf8').endswith(u'\u009C')]) #all pd pics should end with \u009C on the licence
    return dict(rows=curr_rows, page=page, items_per_page=items_per_page, tot=tot, vars=request.vars, pds=pds, html_names=html_names, user_images=user_images, default_images=default_images)

def donor_list():
    '''list donors by name. Check manage/SHOW_SPONSOR_SUMS.html to see what names to add.
    '''
    if len(request.args): page=int(request.args[0])
    else: page=0
    items_per_page=20
    grouped_imgs = "GROUP_CONCAT(if(`user_nondefault_image`,`verified_preferred_image`,NULL))"
    grouped_otts = "GROUP_CONCAT(`OTT_ID`)"
    sum_paid = "SUM(`user_paid`)"
    n_leaves = "COUNT(1)"
    groupby = "IFNULL(verified_donor_name,id)"
    rows = db(db.reservations.verified_time != None).select(
              grouped_imgs,
              grouped_otts, 
              sum_paid,
              n_leaves,
              db.reservations.verified_donor_name,
              #the following fields are only of use for single displayed donors
              db.reservations.name,
              db.reservations.user_nondefault_image,
              db.reservations.verified_kind,
              db.reservations.verified_name,
              db.reservations.verified_more_info,
              groupby=groupby, orderby= sum_paid + " DESC, verified_time, reserve_time")
    curr_rows = rows[(page*items_per_page):(1+(page+1)*items_per_page)]
    sci_names = {int(r[grouped_otts]):r.reservations.name for r in curr_rows if r[n_leaves]==1} #only get sci names etc for unary sponsors
    html_names = {ott:nice_species_name(sci_names[ott], vn, html=True, leaf=True, first_upper=True, break_line=2) for ott,vn in get_common_names(sci_names.keys(), return_nulls=True).iteritems()}
    otts = [int(ott) for r in curr_rows for ott in r[grouped_otts].split(",") if r[grouped_otts]]
    #store the default image info (e.g. to get thumbnails, attribute correctly etc)
    default_images = {r.ott:r for r in db(db.images_by_ott.ott.belongs(otts) & (db.images_by_ott.overall_best_any==1)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,  db.images_by_ott.rights, db.images_by_ott.licence, orderby=~db.images_by_ott.src)}
    #also look at the nondefault images if present
    doIDs = [int(img) for r in curr_rows for img in (r[grouped_imgs] or '').split(",") if img]
    user_images = {r.ott:r for r in db(db.images_by_ott.src_id.belongs(doIDs)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id, db.images_by_ott.rights, db.images_by_ott.licence, orderby=~db.images_by_ott.src)}
    return dict(rows=curr_rows, n_col_name=n_leaves, otts_col_name=grouped_otts, paid_col_name=sum_paid, page=page, items_per_page=items_per_page, vars=request.vars, html_names=html_names, user_images=user_images, default_images=default_images)



def sponsor_picks() : #this is a private function
    """
    Here we define a set of hand-picked nodes,listed in an (ordered) dictionary. If a node is
    accessed via a numeric key, the key is an ott, and the node can be displayed using the 
    sponsor_node function. Otherwise it is a bespoke collection, displayed using sponsor_handpicks
    """
    from collections import OrderedDict
    pick=OrderedDict()
    
    pick[244265]={'name':'Mammals', 'thumb_src': thumbnail_url(src_flags["eol"], 27053125), 'vars':{'n':8}}
        
    pick[81461]={'name':'Birds', 'thumb_src':thumbnail_url(src_flags["eol"], 26823956), 'vars':{'n':8}}

    pick[35888]={'name':'Lizards and snakes', 'thumb_src':thumbnail_url(src_flags["eol"], 26814956), 'vars':{'n':8}}

    pick[773483]={'name':'Ray-finned fishes', 'thumb_src':thumbnail_url(src_flags["eol"], 5817441), 'vars':{'n':8}}

    pick[7368]={'name':'Cephalopods', 'thumb_src':thumbnail_url(src_flags["eol"], 26819085), 'vars':{'n':12}}

    pick[133665]={'name':'Dragonflies and Damselflies', 'thumb_src':thumbnail_url(src_flags["eol"], 16893200), 'vars':{'n':8}}

    pick[965954]={'name':'Butterflies and moths', 'thumb_src':thumbnail_url(src_flags["eol"], 1997597), 'vars':{'n':12}}

    pick[568878]={'name':'Orchids', 'thumb_src':thumbnail_url(src_flags["eol"], 5829089), 'vars':{'n':12}}

    pick[208036]={'name':'Rose family (apples etc.)', 'thumb_src':thumbnail_url(src_flags["eol"], 26851969), 'vars':{'n':8}}

    pick[584111]={'name':'Cactus family', 'thumb_src':thumbnail_url(src_flags["eol"], 5830878), 'vars':{'n':12}}
    
    pick['da']={'name':"David Attenborough's list", 'subtext':"These species are named after him, or were in Attenborough's Ark, or are among the Top 10 species he'd choose to save.", 'thumb_src':thumbnail_url(src_flags["eol"], 13144348), 'otts':
        [3615204, 5846196, 3317844, 2981913, 5143980, 5146215, 566865, 1061679, 469465, 842080, 3600603, 459017, 644245, 313069, 74731, 164229]}
    
    pick['trail2016']={'name':"List for the Ancestor's Trail", 'subtext':'The <a href="http://www.ancestorstrail.org.uk">Ancestor&rsquo;s Trail</a> is partnering with us to promote sponsorship on the OneZoom tree of life: our list contains many species mentioned in the <a href="http://www.ancestorstale.net">Ancestor&rsquo;s Tale</a> (see <a href="sponsored?search_mesg=AT16&sum=true">those sponsored already</a>).', 'thumb_src':URL("static","images/AncestorsTrail.jpg"),  'vars':{'n':12, 'user_more_info':'Ancestor’s Trail', 'user_message_OZ':'AT16'}, 'otts':[10703, 78499, 164229, 175270, 199355, 292504, 306795, 342738, 392933, 412685, 453575, 473106, 510762, 511973, 516305, 542509, 558069, 558087, 589951, 616365, 637537, 659136, 677382, 680963, 709966, 721280, 739941, 746542, 781510, 781600, 796672, 799124, 801608, 801627, 801808, 813103, 840875, 887701, 896431, 904101, 905267, 962377, 986959, 995038, 1033356, 1048188, 1062222, 1091028, 3422746]}

    #save 'ott':123 in pick[xxx].vars
    for key, val in pick.items():
        if 'vars' not in val:
            val['vars']={}
        try:
            val['page'] = 'sponsor_node'
            val['vars']['ott'] = abs(key)
        except TypeError:
            val['page'] = 'sponsor_handpicks'
            val['vars']['group_name'] = key
    return pick
    
def sponsor():
    languages = []
    count = db.vernacular_by_ott.lang_full.count()
    for row in db(db.vernacular_by_ott.preferred == True).select(db.vernacular_by_ott.lang_full, count, groupby=db.vernacular_by_ott.lang_full, orderby=~count):
        lang_data = language(row.vernacular_by_ott.lang_full)
        if lang_data:
            languages.append({'abbrev':row.vernacular_by_ott.lang_full, 'en':lang_data[0].capitalize(), 'native':lang_data[1].capitalize()})
    return dict(pick=sponsor_picks(), languages=languages, n_species =  db(db.ordered_leaves).count())


def sponsor_node_price():
    """
    This refines the base_query to pick <max> leaves for a price band, for use in a 'subpage' (paged row) 
    By default ranks by popularity. If price_pence is blank, this returns the 'contact us' details.
    
    This query is the one that we think slows down the website, because people click on nodes high up
    in the tree, and a badly-formed query will need to sort millions of leaves according to the image ranking.
    
    For this reason, we make 2 queries, firstly for leaves with an image, ranked by image rating, and then 
    (if we don't get enough results returned) for leaves without an image, ranked by popularity
    """
    try:
        if request.vars.get('id'):
            query = sponsorable_children_query(int(request.vars.id), qtype="id")
        elif request.vars.get('ott'):
            query = sponsorable_children_query(int(request.vars.ott), qtype="ott")
        else:
            raise
        n = int(request.vars.get('n') or 6)
        start = int(request.vars.get('start') or 0)
        if request.vars.get('price'):
            price_pence = int(request.vars.get('price'))
        else:
            price_pence = None
        query = (db.ordered_leaves.price==price_pence) & query

        if price_pence is None or price_pence > 750:
            rows_with_images = db(query & (db.images_by_ott.overall_best_any)).select(
                db.ordered_leaves.ott,
                db.ordered_leaves.name,
                db.images_by_ott.src,
                db.images_by_ott.src_id,
                db.images_by_ott.rights,
                db.images_by_ott.licence,
                join = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                limitby = (start, start+n+1), #add an extra on so we can see if there are any more
                orderby = "images_by_ott.rating DESC")
            image_urls = {species.ordered_leaves.ott:thumbnail_url(species.images_by_ott.src, species.images_by_ott.src_id) for species in rows_with_images if (species.images_by_ott.src == src_flags['onezoom']) or (species.images_by_ott.src == src_flags['eol'])}
            image_attributions = {species.ordered_leaves.ott:(' / '.join([t for t in [species.images_by_ott.rights, species.images_by_ott.licence] if t])) for species in rows_with_images}
            otts = [species.ordered_leaves.ott for species in rows_with_images]
            sci_names = {species.ordered_leaves.ott:species.ordered_leaves.name for species in rows_with_images}
            
            extra_needed = (n+1) - len(rows_with_images)
            if extra_needed > 0:            #not enough leaves with images. We need to get ones without images too
                count = db.ordered_leaves.ott.count()
                total_with_images = db(query & (db.images_by_ott.overall_best_any)).select(
                    count, 
                    join = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott)
                ).first()[count]
                start = start - total_with_images + len(rows_with_images)
                assert start >= 0
                rows_without_images = db(query & (db.images_by_ott.ott == None)).select(
                    db.ordered_leaves.ott, 
                    db.ordered_leaves.name,
                    left = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                    limitby=(start, start+extra_needed),
                    orderby = "ordered_leaves.popularity DESC")
                otts.extend([species.ott for species in rows_without_images])
                sci_names.update({species.ott:species.name for species in rows_without_images})
        else:
            #for cheap leaves, reverse the order and show rows without images first
            rows_without_images = db(query & (db.images_by_ott.ott == None)).select(
                db.ordered_leaves.ott, 
                db.ordered_leaves.name,
                left = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                limitby=(start, start+n+1), #add an extra on so we can see if there are any more
                orderby = "ordered_leaves.ott") #much faster to sort by a simple integer. We don't care for the £5 ones what the order is.
            otts = [species.ott for species in rows_without_images]
            sci_names = {species.ott:species.name for species in rows_without_images}
            image_urls = image_attributions = {}
            extra_needed = (n+1) - len(rows_without_images)
            if extra_needed > 0:            #not enough leaves with images. We need to get ones without images too
                count = db.ordered_leaves.ott.count()
                total_without_images = db(query & (db.images_by_ott.ott == None)).select(
                    count, 
                    left = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott)
                ).first()[count]
                start = start - total_without_images + len(rows_without_images)
                assert start >= 0
                rows_with_images = db(query & (db.images_by_ott.overall_best_any)).select(
                    db.ordered_leaves.ott, 
                    db.ordered_leaves.name,
                    db.images_by_ott.src,
                    db.images_by_ott.src_id,
                    db.images_by_ott.rights,
                    db.images_by_ott.licence,
                    join = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                    limitby=(start, start+extra_needed), 
                    orderby = "images_by_ott.rating ASC")
                image_urls = {species.ordered_leaves.ott:thumbnail_url(species.images_by_ott.src, species.images_by_ott.src_id) for species in rows_with_images if (species.images_by_ott.src == src_flags['onezoom']) or (species.images_by_ott.src == src_flags['eol'])}
                image_attributions = {species.ordered_leaves.ott:(' / '.join([t for t in [species.images_by_ott.rights, species.images_by_ott.licence] if t])) for species in rows_with_images}
                otts.extend([species.ordered_leaves.ott for species in rows_with_images])
                sci_names.update({species.ordered_leaves.ott:species.ordered_leaves.name for species in rows_with_images})

        #now construct the vernacular names
        html_names = {ott:nice_species_name(sci_names[ott], vn, html=True, leaf=True, first_upper=True) for ott,vn in get_common_names(otts, return_nulls=True).iteritems()}
        return dict(otts=otts, image_urls=image_urls, html_names = html_names, attributions=image_attributions, price_pence = price_pence)
        
    except:
        raise
        pass
    return dict(otts=[])
        
        
def sponsor_node():
    """
    This picks <max> leaves per price band, and removes already sponsored leaves from the search    
    By default ranks by popularity. We pass on any request.vars so that we can use embed, form_reservation_code, etc.
    """
    try:
        if request.vars.get('id'):
            query = sponsorable_children_query(int(request.vars.id), qtype="id")
            common_name = get_common_name(db.ordered_nodes[int(request.vars.id)].ott, db.ordered_nodes[int(request.vars.id)].name)
        elif request.vars.get('ott'):
            ott = int(request.vars.ott)
            query = sponsorable_children_query(ott, qtype="ott")
            common_name = get_common_name(ott)
        else:
            raise
        #global var 'partners' is defined at the top of the file, for request.vars.partner=='LinnSoc', 'Kew', etc.
        #partner = db(db.partners.identifier == request.vars.get('partner')).select().first() #this could be null
        #partner = partner.as_dict() if partner else {}
        
        first25 = db(query).select(limitby=(0, 25), orderby=db.ordered_leaves.name)
        if len(first25) > 0:
            prices_pence = sorted([r.price for r in db().select(db.prices.price)])
            prices_pence.append("")
            return(dict(prices_pence=prices_pence, first25=first25, vars=request.vars, common_name=common_name, partner=partner, error=None))
        else:
            return(dict(vars=request.vars, common_name=common_name, partner=partner, error="Sorry, there are no species you can sponsor in this group"))
    except:
        return(dict(vars=request.vars, partner=partner, error="Sorry, you passed in an ID that doesn't seem to correspond to a group on the tree"))

def sponsor_node_redirect():
    """
    simply provides a link to jump out of an iframe
    """    
    return(dict(id=request.vars.get('id'), ott=request.vars.get('ott')))

def sponsor_handpicks():
    """
    This differs from sponsor_node because it uses pre-selected lists of taxa, that have been 
    hand picked by a manager (e.g. for David Attenborough's Birthday list). We should possibly 
    be storing these in a database, but for the moment we get them from the sponsor_picks() function.
    They should not need to be paged
    """
    valid_dict = sponsor_picks()
    orderby = "images_by_ott.rating DESC"
    if request.vars.group_name in valid_dict and len(valid_dict[request.vars.group_name]['otts']):
        #this doesn't distinguish between sponsored and unsponsored, which is what we want
        query = db.ordered_leaves.ott.belongs(valid_dict[request.vars.group_name]['otts'])
    else:
        return dict(error="Error: no group given")
    try:
        max_returned = int(request.vars.n)
    except:
        max_returned = 8
    from collections import OrderedDict
    
    if db(query) > 0:
        prices_pence = sorted([r.price for r in db().select(db.prices.price)]) + [None]
        otts = OrderedDict()
        image_urls = {}
        sci_names = {}
        html_names = {}
        for p in prices_pence:
            if (p):
                if (float(p)/100).is_integer():
                    price_pounds = '{:.0f}'.format(p/100.0)
                else:
                    price_pounds = '{:.2f}'.format(p/100.0)
            else:
                price_pounds = "contact us"
            rows = db(query &
                      (db.ordered_leaves.price==p) & 
                      ((db.images_by_ott.overall_best_any == True) | (db.images_by_ott.overall_best_any == None))
                      ).select(db.ordered_leaves.ott, 
                               db.ordered_leaves.name,
                               db.images_by_ott.src,
                               db.images_by_ott.src_id,
                               left = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                               orderby = orderby)
            otts[price_pounds] = [r.ordered_leaves.ott for r in rows]
            image_urls.update({species.ordered_leaves.ott:thumbnail_url(species.images_by_ott.src, species.images_by_ott.src_id) for species in rows if (species.images_by_ott.src == src_flags['onezoom']) or (species.images_by_ott.src == src_flags['eol'])})
            sci_names.update({species.ordered_leaves.ott:species.ordered_leaves.name for species in rows})

        #Now find the vernacular names for all these species
        all_otts = [ott for price in otts for ott in otts[price]]
        if all_otts:
            html_names = {ott:nice_species_name(sci_names[ott], vn, html=True, leaf=True, first_upper=True) for ott,vn in get_common_names(all_otts, return_nulls=True).iteritems()}
            rows = db(db.reservations.OTT_ID.belongs(all_otts) & (db.reservations.verified_time != None)).select(db.reservations.OTT_ID, db.reservations.verified_kind, db.reservations.verified_name)
            reserved = {r.OTT_ID:[r.verified_kind, r.verified_name] for r in rows}
                    
        return(dict(otts=otts, image_urls=image_urls, html_names=html_names, reserved=reserved, vars=request.vars, error=None))
    else:
        return(dict(otts=[], vars=request.vars, error="Sorry, there are no species you can sponsor in this group"))

def list_sponsorable_children():
    """
    This lists children in alphabetical order, paged
    """
    items_per_page=500
    try:
        page=int(request.args[0])
    except: 
        page=0
        
    try:
        if request.vars.get('id'):
            query = sponsorable_children_query(int(request.vars.id), qtype="id")
        elif request.vars.get('ott'):
            query = sponsorable_children_query(int(request.vars.ott), qtype="ott")
        limitby=(page*items_per_page,(page+1)*items_per_page+1)
        species = db(query).select(db.ordered_leaves.ott, 
                                   db.ordered_leaves.name,
                                   db.ordered_leaves.price,
                                   limitby= limitby, 
                                   orderby= db.ordered_leaves.name)
        return(dict(species=species,page=page,items_per_page=items_per_page, error=""))

    except:
        return(dict(species=[],page=page, items_per_page=items_per_page, error="Sorry, you passed in an ID that doesn't seem to correspond to a group on the tree"))


def pp_process_post():
    """
    Should only ever be visited by paypal, to confirm the payment has been made. For debugging problems, see
    https://developer.paypal.com/docs/classic/ipn/integration-guide/IPNOperations/
     
    If paypal.save_to_tmp_file_dir in appconfig.ini is e.g. '/var/tmp' then save a temp file called
    www.onezoom.org_paypal_OTTXXX_TIMESTAMPmilliseconds.json to that dir
    """
    try:
        OTT_ID_Varin = int(request.args[0])
        if OTT_ID_Varin <= 0:
            raise ValueError("Passed in OTT is not a positive integer")
        reservation_query = ((db.reservations.OTT_ID == OTT_ID_Varin) & 
                             (db.reservations.user_sponsor_name != None) & 
                             (db.reservations.user_paid > 4.5)
                            )
        
        #it must be the case that this row exists in the db and that it has at a minimum a
        # user_sponsor_name and a user_paid > £4.50
        try:
            paid = float(request.vars.mc_gross)
        except:
            paid = None
        updated = db(reservation_query &
                     #check the fields we are about to update are null (if not, this could be malicious)
                     (db.reservations.PP_first_name == None) &
                     (db.reservations.PP_second_name == None) &
                     (db.reservations.PP_town == None) &
                     (db.reservations.PP_country == None) &
                     (db.reservations.PP_e_mail == None) &
                     (db.reservations.verified_paid == None) &
                     ((db.reservations.PP_transaction_code == None) | (db.reservations.PP_transaction_code == 'reserved')) &
                     (db.reservations.sale_time == None)
                    ).update(PP_first_name = request.vars.get('first_name'),
                             PP_second_name = request.vars.get('last_name'),
                             PP_town = ", ".join([t for t in [request.vars.get('address_city'), request.vars.get('address_state')] if t]),
                             PP_country = request.vars.get('address_country'),
                             PP_e_mail = request.vars.get('payer_email'),
                             verified_paid = paid,
                             PP_transaction_code = request.vars.get('txn_id'),
                             sale_time = request.vars.get('payment_date')
                            )
        if not updated:
            raise NameError('No row updated: some details may already be filled out, or the OTT/name/paid may be invalid')
        #should only update house/st and postcode if giftaid is true
        db(reservation_query & 
           (db.reservations.user_giftaid == True) &
           (db.reservations.PP_house_and_street == None) &
           (db.reservations.PP_postcode == None)
        ).update(
            PP_house_and_street = request.vars.get('address_street'),
            PP_postcode = request.vars.get('address_zip')
        )
        err = None
    except Exception as e:
        err = e
    try:
        if myconf.take('paypal.save_to_tmp_file_dir'):
            import os
            import time
            from json import dumps
            
            with open(
                os.path.join(
                    myconf.take('paypal.save_to_tmp_file_dir'),
                    "{}{}_paypal_OTT{}_{}.json".format(
                        "PP_" if err is None else "PP_ERROR_",
                        "".join([char if char.isalnum() else "_" for char in request.env.http_host]),
                        OTT_ID_Varin,
                        int(round(time.time() * 1000)))),
                    "w") as json_file:
                json_file.write(dumps(request.vars))
    except:
        pass

    #TO DO
    #To check this is really from PP, we should post the message back to https://ipnpb.paypal.com/cgi-bin/webscr
    #as per the request-response flow described at https://developer.paypal.com/docs/classic/ipn/integration-guide/IPNImplementation/
    #e.g. 
    #
    #from gluon.tools import fetch
    #pp_post_vars = request.post_vars
    #pp_post_vars['cmd'] = '_notify-validate'
    #headers = {'content-type': 'application/x-www-form-urlencoded', 'host': 'www.paypal.com'}
    #r = fetch(https://ipnpb.paypal.com/cgi-bin/webscr, data=pp_post_vars, headers=headers, user_agent="WEB2PY-IPN-VerificationScript")
    ##check that r contains "VERIFIED"
    
    if err:
        raise HTTP(400, e.message) #should flag up to PP that there is a problem with this transaction
    else:
        return(dict(vars=request.vars, args=request.args))

""" these empty controllers are for other OneZoom pages"""

def sponsor_thanks():
    return dict()

def endorsements():
    return dict()

def impacts():
    redirect(URL('default', 'endorsements.html'))
    return dict()

def impact():
    redirect(URL('default', 'endorsements.html'))
    return dict()

def installations():
    return dict()

def developer():
    return dict()

#def future():
#    return dict()

def about():
    return dict()

def about_old():
    return dict()

def data_sources():
    return dict()

def how():
    return dict()

def team():
    return dict()

def milestones():
    return dict()

def about_plus_data():
    return dict()

#def gallery():
#    return dict()

def terms():
    return dict()

def dataprotection_and_privacy():
    return dict()

def FAQ():
    return dict(n_species =  db(db.ordered_leaves).count())

def tree_index():
    return dict()

### REDIRECTS ###

def AT16():
    redirect(URL('default', 'sponsor_handpicks?n=12&group_name=trail2016&user_message_OZ=AT16&user_more_info=Ancestor’s+Trail+2016'))

""" Legacy features pointing into static pages with their own JS"""

def ADEPD_birds_nunes_etal_2015():
    redirect(URL('static', 'OZLegacy/ADEPD_birds_nunes_etal_2015.htm', vars=(request.vars)))
    return dict()
def amphibians():
    redirect(URL('static', 'OZLegacy/amphibians.htm', vars=(request.vars)))
    return dict()
def birds():
    redirect(URL('static', 'OZLegacy/birds.htm', vars=(request.vars)))
    return dict()
def custom_SFU():
    redirect(URL('static', 'OZLegacy/custom_SFU.htm', vars=(request.vars)))
    return dict()
def EDGE_birds_VEi38fwj():
    redirect(URL('static', 'OZLegacy/EDGE_birds_VEi38fwj.htm', vars=(request.vars)))
    return dict()
def EDGE_birds():
    redirect(URL('static', 'OZLegacy/EDGE_birds.htm', vars=(request.vars)))
    return dict()
def embed():
    redirect(URL('static', 'OZLegacy/embed.htm', vars=(request.vars)))
    return dict()
def embeded_ADEPD_birds_nunes_etal_2015():
    redirect(URL('static', 'OZLegacy/embeded_ADEPD_birds_nunes_etal_2015.htm', vars=(request.vars)))
    return dict()
def embeded_EDGE_birds():
    redirect(URL('static', 'OZLegacy/embeded_EDGE_birds.htm', vars=(request.vars)))
    return dict()
def embeded_EDGE_birds():
    redirect(URL('static', 'OZLegacy/embeded_EDGE_birds.htm', vars=(request.vars)))
    return dict()
def embeded_EDGE_birds2():
    redirect(URL('static', 'OZLegacy/embeded_EDGE_birds2.htm', vars=(request.vars)))
    return dict()
def embeded_mammals():
    redirect(URL('static', 'OZLegacy/embeded_mammals.htm', vars=(request.vars)))
    return dict()
def embeded_plants():
    redirect(URL('static', 'OZLegacy/embeded_plants.htm', vars=(request.vars)))
    return dict()
def embeded_tetrapods():
    redirect(URL('static', 'OZLegacy/embeded_tetrapods.htm', vars=(request.vars)))
    return dict()
def Euphorbia_2014():
    redirect(URL('static', 'OZLegacy/Euphorbia_2014.htm', vars=(request.vars)))
    return dict()
def fish():
    redirect(URL('static', 'OZLegacy/fish.htm', vars=(request.vars)))
    return dict()
def mammals():
    redirect(URL('static', 'OZLegacy/mammals.htm', vars=(request.vars)))
    return dict()
def OneZoom_Tree_of_life_explorer_Android_license():
    redirect(URL('static', 'OZLegacy/OneZoom_Tree_of_life_explorer_Android_license.pdf'))
    return dict()
def plants_Soltis1():
    redirect(URL('static', 'OZLegacy/plants_Soltis1.htm', vars=(request.vars)))
    return dict()
def plants_Soltis2():
    redirect(URL('static', 'OZLegacy/plants_Soltis2.htm', vars=(request.vars)))
    return dict()
def plants():
    redirect(URL('static', 'OZLegacy/plants.htm', vars=(request.vars)))
    return dict()
def porifera():
    redirect(URL('static', 'OZLegacy/porifera.htm', vars=(request.vars)))
    return dict()
def River_project_James_S_2015_1ksd19efj():
    redirect(URL('static', 'OZLegacy/River_project_James_S_2015_1ksd19efj.htm', vars=(request.vars)))
    return dict()
def Squamates_Pyron():
    redirect(URL('static', 'OZLegacy/Squamates_Pyron.htm', vars=(request.vars)))
    return dict()
def tetrapods_ballweg_arctic():
    redirect(URL('static', 'OZLegacy/tetrapods_ballweg_arctic.htm', vars=(request.vars)))
    return dict()
def tetrapods_SFU():
    redirect(URL('static', 'OZLegacy/tetrapods_SFU.htm', vars=(request.vars)))
    return dict()
def tetrapods():
    redirect(URL('static', 'OZLegacy/tetrapods.htm', vars=(request.vars)))
    return dict()
def vascularplants_tank2013nature():
    redirect(URL('static', 'OZLegacy/vascularplants_tank2013nature.htm', vars=(request.vars)))
    return dict()

#error pages

#legacy for the site pages - redirect old links to more relevant new links
def software():
    redirect(URL('default', 'developer.html'))
    return dict()

def impact():
    redirect(URL('default', 'impacts.html'))
    return dict()

def licence():
    redirect(URL('default', 'developer.html'))
    return dict()

def news():
    redirect(URL('default', 'milestones.html'))
    return dict()


### Controllers for OneZoom viz pages ###
### For programming purposes, these views are in views/treeviewer NOT views/default as might be expected

def remove_location_arg(args):
    """
    remove the last item from the args array if it is a location string
    """
    if len(args) and args[-1].startswith('@'):
        return args.pop()
    else:
        return None

def remove_partner_arg(args):
    """
    remove the first item from the args array if it is a partner string i.e. not 'tours'
    """
    if len(args) and args[0] != 'tour':
        return args.pop(0)
    else:
        return None

def life_text():
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return dict(page_info = {'tree': text_tree(remove_location_arg(request.args))})

def text_tree(location_string):
    """
    A text representation. NB: The 'normal' pages also have the text-only data embedded in them, for SEO reasons
    """
    #target_string must consist only of chars that are allowed in web2py arg
    # array (i.e. in the path: see http://stackoverflow.com/questions/7279198
    # this by default restricts it to re.match(r'([\w@ -]|(?<=[\w@ -])[.=])*')
    #So we use @ as a separator between species and prepend a letter to the 
    #ott number to indicate extra use for this species (e.g. whether to remove it)
    #e.g. @Hominidae=770311@Homo_sapiens=d770315@Gorilla_beringei=d351685
    # The target string is contained in the location_string, copied from args[-1]
    # which has all the string up to the '?' or '#'
    #we have to use both the name and the ott number to get the list of species. 
    #NB: both name or ott could have multiple matches.
    from collections import OrderedDict

    base_ott=base_name=''
    try:
        taxa=location_string.split("@")[1:]
        for t in taxa:
            if t and re.search("=[a-z]", t)==None: #take the first one that doesn't have an ott = [letter]1234
                base_name, sep, base_ott = t.partition("=")
                if base_ott:
                    base_ott = int(base_ott)
    except:
        #ignore all parsing errors and just show the root
        pass
    
    base_taxa_are_leaves = None
    base_rows = []
    #ott takes priority: if we have an ott, use that, and ignore the rest. We don't care if the name doesn't match
    if base_ott: 
        base_rows = db(db.ordered_nodes.ott == base_ott).select(db.ordered_nodes.ALL)     #by default, look at nodes first
        if len(base_rows):
            base_taxa_are_leaves = False
        else:
            base_rows = db(db.ordered_leaves.ott == base_ott).select(db.ordered_leaves.ALL)
            if len(base_rows):
                base_taxa_are_leaves = True
    #if there is no ott, or it doesn't match try matching on the name instead.
    if len(base_rows)==0 and base_name:
        try:
            row_id = int(base_name) #only works if we have a name which is a positive or negative number - which indicates a row number to use
            response.meta.robots = 'noindex, follow' #don't index this page: it has no ott or name!
            if row_id < 0:
                base_rows = db(db.ordered_leaves.id == -row_id).select(db.ordered_leaves.ALL)
                base_taxa_are_leaves = True
            elif row_id > 0:
                base_rows = db(db.ordered_nodes.id == row_id).select(db.ordered_nodes.ALL)
                base_taxa_are_leaves = False
                
        except:
            base_rows = db(db.ordered_nodes.name == base_name).select(db.ordered_nodes.ALL)
            if len(base_rows):
                base_taxa_are_leaves = False
            else:
                base_rows = db(db.ordered_leaves.name == base_name).select(db.ordered_leaves.ALL)
                if len(base_rows):
                    base_taxa_are_leaves = True
    if len(base_rows)==0:
        base_rows = db(db.ordered_nodes.parent < 1).select(db.ordered_nodes.ALL) #this should always match the root
        base_taxa_are_leaves=False

    #we construct a nested heirarchy, and an 'info' dictionary, indexed by id (negative for leaves)
    bases = {}
    info = {}
    for row in base_rows:
        if row.real_parent != 0:
            data = db(db.ordered_nodes.id == abs(row.real_parent)).select(db.ordered_nodes.ott, db.ordered_nodes.name).first()
            if data:
                info[row.real_parent] = data
        #find the rows that have this as a parent
        base = OrderedDict()
        if base_taxa_are_leaves:
            info[-row.id]=row
            info[-row.id]['best_image'] = db((db.images_by_ott.ott == row.ott) & (db.images_by_ott.overall_best_any == True)).select(db.images_by_ott.ALL).first()
            bases[-row.id]=base
        else:
            info[row.id]=row
            bases[row.id]=base
        
            #since the base is a node, we can iterate down it to find descendants
            for row1 in db(db.ordered_nodes.real_parent == row.id).select(db.ordered_nodes.id, db.ordered_nodes.ott, db.ordered_nodes.leaf_lft, db.ordered_nodes.leaf_rgt, db.ordered_nodes.name, orderby =~ db.ordered_nodes.id):
                info[row1.id]=row1
                base[row1.id]=list1=OrderedDict()
                for row2 in db(db.ordered_nodes.real_parent == row1.id).select(db.ordered_nodes.id, db.ordered_nodes.ott, db.ordered_nodes.leaf_lft, db.ordered_nodes.leaf_rgt, db.ordered_nodes.name, orderby =~ db.ordered_nodes.id):
                    info[row2.id]=row2
                    list1[row2.id]=list2=OrderedDict()
                    for row3 in db(db.ordered_nodes.real_parent == row2.id).select(db.ordered_nodes.id, db.ordered_nodes.ott, db.ordered_nodes.leaf_lft, db.ordered_nodes.leaf_rgt, db.ordered_nodes.name, orderby =~ db.ordered_nodes.id):
                        info[row3.id]=row3
                        list2[row3.id]=list3=OrderedDict()
                        for row4 in db(db.ordered_nodes.real_parent == row3.id).select(db.ordered_nodes.id, db.ordered_nodes.ott, db.ordered_nodes.leaf_lft, db.ordered_nodes.leaf_rgt, db.ordered_nodes.name, orderby =~ db.ordered_nodes.id):
                            info[row4.id]=row4
                            list3[row4.id]=list4=OrderedDict()
                        for row4 in db(db.ordered_leaves.real_parent == row3.id).select(db.ordered_leaves.id, db.ordered_leaves.ott, db.ordered_leaves.name):
                            info[-row4.id]=row4
                            list3[-row4.id]=None
                    for row3 in db(db.ordered_leaves.real_parent == row2.id).select(db.ordered_leaves.id, db.ordered_leaves.ott, db.ordered_leaves.name):
                        info[-row3.id]=row3
                        list2[-row3.id]=None
                for row2 in db(db.ordered_leaves.real_parent == row1.id).select(db.ordered_leaves.id, db.ordered_leaves.ott, db.ordered_leaves.name):
                    info[-row2.id]=row2
                    list1[-row2.id]=None
            for row1 in db(db.ordered_leaves.real_parent == row.id).select(db.ordered_leaves.id, db.ordered_leaves.ott, db.ordered_leaves.name):
                info[-row1.id]=row1
                base[-row1.id]=None
    
    #now we have constructed the heirarchy, we can get the other info and fill it in 
    otts =[row.ott for row in info.values() if row.ott]
    names=[row.name for row in info.values() if row.name]
    only_names = [row.name for row in info.values() if row.name and not row.ott]

    vernacular_otts = get_common_names(otts)
    vernacular_names= get_common_names(only_names, OTT=False)

    iucn = {}
    rows = db(db.iucn.ott.belongs(otts)).select(db.iucn.ott, db.iucn.status_code, db.iucn.iucn)
    for row in rows:
        if row.ott not in iucn:
            iucn[row.ott] = row.status_code
    

    for id, i in info.items():
        #construct a string appropriate for an OZ url, e.g. @Homo_sapiens=770315 or @Homo_sapiens or @=770315 or 
        i['arg'] = ''
        if i['name'] and re.match(r'[^_0-9]', i['name']): #names with only digits+underscore are not stable names
            i['arg'] += re.sub(r'[^-\w.]', '_', i['name'])
        if i['ott']:
            i['arg'] += "=" + str(int(i['ott']))
        if i['arg']:
            i['url'] = URL(args="@" + i['arg'], url_encode=False, scheme=True, host=True)
        else:
            i['url'] = URL(args="@" + str(int(id)), url_encode=False, scheme=True, host=True)
        
        if i['name'] and not i['name'].endswith("_"):
            i['sciname'] = i['name'].replace('_',' ')
        try:
            i['vernacular']= vernacular_otts[i['ott']]
        except:
            try:
                i['vernacular']= vernacular_names[i['name']]
            except:
                pass
        if i.get('vernacular') or i.get('sciname'):
            i['htmlname'] = nice_species_name(i.get('sciname'), i.get('vernacular'), html=True, leaf= (id<=0))
        else:
            i['htmlname'] = SPAN("unnamed {} {}".format('group' if id>=0 else 'species', abs(id)), _class="unnamed")
        if i['ott'] in iucn:
            i['iucn']= iucn[i['ott']]
    
    if len(bases):
        main_taxon = min(bases.keys())
        if info[main_taxon]['arg']:
            response.canonical = info[main_taxon].url
    return dict(bases=bases, info=info)

def life_text_init_taxa(text_tree):
    return [taxon for taxon in [text_tree['info'][k].get("vernacular") or text_tree['info'][k].get("sciname") or "OTT"+str(text_tree['info'][k].get("ott")) for k in text_tree['bases']] if taxon]


def treeview_info(has_text_tree=True):
    """
    Return the information used by the normal tree viewer. We parse the information from the URL
    (e.g. anything after the '@' sign) so that we can construct the correct text tree)
    """
    location = remove_location_arg(request.args)
    partner  = remove_partner_arg(request.args)
    page_info={'partner': partner, 'version':__check_version()}
    if len(request.args) and request.args[0] == 'tour':
        #could have been life/trail2016/tour/newtour/@Mammalia or simply life/trail2016/tour/@Mammalia
        tour_name = None if len(request.args)==1 else request.args[1]
        page_info.update({'subtitle': 'Tours',
                   'tourname': tour_name #only *-=. and alphanumeric in args, so can use this in js
                   })
    if has_text_tree:
        tt = text_tree(location)
        page_info.update({'tree': tt, 'title_name': ", ".join(life_text_init_taxa(tt))})
    return dict(page_info = page_info, form_reservation_code=__make_user_code())

def life():
    """
    The standard OneZoom app
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info()

def life_MD():
    """
    The museum display version, which is sandboxed (and has no underlying text tree with links hidden by JS)
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info(has_text_tree=False)

def life_expert():
    """
    The expert version, with screenshot buttons etc
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info()

def AT():
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info()

def trail2016():
    """
    The 2016 trail version, which sets some defaults for popup tabs, e.g.
    user_more_info=Ancestor's+Trail+2016&user_message_OZ=AT16
    so that these defaults are passed to the sponsorship page
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info()

def linnean():
    """
    The Linnean Society version, with partner sponsorship
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info()

#def old_kew():
#    """
#    Like the standard, but show the tab for Plants of the World Online from Kew
#    and have this as the default (first) tab open
#    TO DO: default to the view centring on plants
#    """
#    response.view = "treeviewer" + "/" + request.function + "." + request.extension
#    merged_dict = {}
#    merged_dict.update(viewer_UI())
#    merged_dict['tabs'] = [ #override
#        {'id':'wiki',    'name':'Wiki',                 'icon':URL('static','images/W.svg')},
#        {'id':'eol',     'name':'Encyclopedia of Life', 'icon':URL('static','images/EoL.png')},
#        {'id':'iucn',    'name':'Conservation',         'icon':URL('static','images/IUCN_Red_List.svg')},
#        {'id':'ncbi',    'name':'Genetics',             'icon':URL('static','images/DNA_icon.svg')},
#        {'id':'powo',    'name':'Kew'},
#        {'id':'ozspons', 'name':'Sponsor'}].update(life())
#    return merged_dict

""" Some controllers that simply redirect to other OZ viewer pages, for brevity """
def gnathostomata():
    redirect(URL('default', 'life.html/@Gnathostomata=278114', url_encode=False))

#def kew_plants():
#    """
#    redirect to the land plants
#    """
    redirect(URL('default', 'kew.html/@Embryophyta?init=jump', url_encode=False))

#def kew_fungi():
#    """
#    redirect to the fungi plants
#    """
#    redirect(URL('default', 'kew.html/@Embryophyta?init=jump', url_encode=False))

