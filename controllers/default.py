# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations
import collections
import datetime
import hashlib
import itertools
import re
import random
import urllib.parse
import urllib.request
import json
from collections import OrderedDict

import ozmail
from sponsorship import (
    sponsorship_enabled, reservation_total_counts, clear_reservation, get_reservation,
    reservation_validate_basket_fields,
    reservation_add_to_basket, reservation_confirm_payment, reservation_expire,
    sponsorship_expiry_soon_date,
    sponsorship_email_reminders, sponsor_verify_url,
    sponsorship_restrict_contact, sponsor_renew_request_logic,
    sponsorship_config, sponsorable_children_query)

from usernames import usernames_associated_to_email, donor_name_for_username

from partners import partner_identifiers_for_reservation_name

from OZfunc import (
    nice_name, nice_name_from_otts, get_common_name, get_common_names, __release_info,
    language, __make_user_code, raise_incorrect_url, require_https_if_nonlocal, add_the,
    otts2ids, nodes_info_from_array, nodes_info_from_string, extract_summary)
import img

""" Some settings for sponsorship"""
def get_paypal_url():
    try:
        url = myconf.take('paypal.url')
        if not url:
            raise ValueError('blank paypal config')
        return url
    except:
        return 'https://www.sandbox.paypal.com'

""" generally useful functions """

def time_diff(startTime,endTime):
    return (endTime-startTime)

"""Standard web2py stuff"""

def index():
    """
    Collect all information required for the home page
    """
    # OTTs from the tree_startpoints table
    startpoints_ott_map, hrefs, images, titles, text_titles = {}, {}, {}, {}, {}
    carousel, anim, threatened = [], [], []
    for r in db(
            (db.tree_startpoints.category.startswith('homepage')) &
            (db.tree_startpoints.partner_identifier == None)
        ).select(
            db.tree_startpoints.ott, db.tree_startpoints.category,
            db.tree_startpoints.image_url, db.tree_startpoints.tour_identifier,
            orderby = db.tree_startpoints.id):
        key = r.tour_identifier or str(r.ott)
        if r.category.endswith("main"):
            carousel.append(key)
        elif r.category.endswith("anim"):
            anim.append(key)
        elif r.category.endswith("red"):
            threatened.append(key)
        if r.image_url:
            images[key] = {'url': r.image_url}
        if r.tour_identifier:
            hrefs[key] = URL('life/' + r.tour_identifier)
            title = db(db.tours.identifier == r.tour_identifier).select(db.tours.name).first()
            text_titles[key] = title.name if title else r.tour_identifier
        else:
            text_titles[key] = ""
        if r.ott:
            # We might still want to find e.g. an image, even if we are looking at a tour
            startpoints_ott_map[r.ott] = key

    # Pick 5 random threatened spp 
    random.seed(request.now.month*100 + request.now.day)
    if len(threatened) > 5:
        threatened = random.sample(threatened, 5)
    image_required = set(carousel + threatened)
    keys = set(anim) |  image_required
    # Remove the unused threatened ones
    startpoints_ott_map = {k: v for k, v in startpoints_ott_map.items() if v in keys}
    
    # OTTs from the reservations table (i.e. sponsored)
    query = (db.reservations.verified_time != None) & \
        ((db.reservations.deactivated == None) | (db.reservations.deactivated == "")) & \
        (db.reservations.verified_preferred_image_src != None)
    sponsored_rows = db(query).select(
        db.reservations.OTT_ID,
        db.reservations.name,
        db.reservations.user_nondefault_image,
        db.reservations.verified_kind,
        db.reservations.verified_name,
        db.reservations.verified_more_info,
        db.reservations.verified_preferred_image_src,
        db.reservations.verified_preferred_image_src_id,
        orderby=~db.reservations.verified_time|db.reservations.reserve_time,
        limitby=(0, 20)
        )
    
    spon_leaf_otts = set()
    sponsored_by_ott = {}
    for r in sponsored_rows:
        sponsored_by_ott[r.OTT_ID] = r
        hrefs[r.OTT_ID] = URL('life/@=%d' % r.OTT_ID, url_encode=False)
        spon_leaf_otts.add(r.OTT_ID)
        titles[r.OTT_ID] = r.name
    for ott, key in startpoints_ott_map.items():
        if key not in hrefs:
            hrefs[key] = URL('life/@=%d' % ott, url_encode=False)
    
    # Names
    st_leaf_otts, st_node_otts, has_vernacular = set(), set(), set()
    st_leaf_for_node_otts = {}
    # Look up scientific names for startpoint otts
    for r in db(db.ordered_leaves.ott.belongs(startpoints_ott_map.keys())).select(
            db.ordered_leaves.ott, db.ordered_leaves.name):
        st_leaf_otts.add(r.ott)
        titles[r.ott] = r.name
    # Look up scientific names and best PD image otts for all startpoint otts
    for r in db(db.ordered_nodes.ott.belongs(list(startpoints_ott_map.keys()))).select(
            db.ordered_nodes.ott, db.ordered_nodes.name, db.ordered_nodes.rpd1):
        st_node_otts.add(r.ott)
        if startpoints_ott_map[r.ott] in image_required:
            st_leaf_for_node_otts[r.rpd1] = startpoints_ott_map[r.ott]
        titles[r.ott] = r.name
    # Add or change to vernacular names in the titles
    for ott, vn in get_common_names(titles.keys(), return_nulls=True).items():
        # Do one thing for the startpoints (simple names) ...
        startpoint_key = startpoints_ott_map.get(ott, None)
        if startpoint_key:
            if not text_titles[startpoint_key]:
                if vn is not None:
                    has_vernacular.add(startpoint_key)
                text_titles[startpoint_key] = nice_name(
                    (titles[ott] if vn is None else None), vn, html=True,
                    is_species=ott not in st_node_otts, break_line=2)
        # ... and another for the sponsored items (both common and sci in the string)
        if vn is not None:
            has_vernacular.add(ott)
        titles[ott] = nice_name(
            titles[ott], vn, html=True, is_species=ott not in st_node_otts, 
            first_upper=True, break_line=1)
    titles.update(text_titles)

    # Images
    # Startpoint images
    otts = st_leaf_otts | set(st_leaf_for_node_otts.keys())
    for r in db(
            (db.images_by_ott.ott.belongs(otts)) & (db.images_by_ott.overall_best_pd==1)
        ).select(
            db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id):
        key = startpoints_ott_map.get(r.ott, None) or st_leaf_for_node_otts.get(r.ott, None)
        if key not in images:
            images[key] = {'url': img.thumb_url(thumb_base_url, r.src, r.src_id)}
    # Sponsored images
    for r in db(
            (db.images_by_ott.ott.belongs(spon_leaf_otts)) & (db.images_by_ott.overall_best_any==1)
        ).select(
            db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,
            db.images_by_ott.rights, db.images_by_ott.licence):
        reservations_row = sponsored_by_ott[r.ott]
        if reservations_row.user_nondefault_image:
            images[r.ott] = {'url': img.thumb_url(
                thumb_base_url,
                reservations_row.verified_preferred_image_src,
                reservations_row.verified_preferred_image_src_id)}
        else:
            images[r.ott] = {
                'url': img.thumb_url(thumb_base_url, r.src, r.src_id),
                'rights':r.rights,
                'licence': r.licence.split('(')[0]}
    blank = {'url': URL('static','images/noImage_transparent.png')}
    for key in titles.keys():
        if key not in images:
            images[key] = blank

    return dict(
        n_species=db(db.ordered_leaves).count(),
        n_images=db(db.images_by_ott).count(),
        quotes=[
            db(db.quotes.quality >= 190).select(db.quotes.ALL, orderby='<random>', limitby=(0, 2)),
            db((db.quotes.quality < 190) & (db.quotes.quality >= 100)).select(db.quotes.ALL, orderby='<random>', limitby=(0, 8))
            ],
        news=[
            dict(
                heading=row.text_date if row.text_date else row.news_date.strftime("%d %B %Y").lstrip('0'),
                body=row.html_description.replace(' class="thumbnail"', ' style="display:none"'),
                thumbnail_href=row.thumbnail_href,
                more_href=URL("timeline.html#news-item{}".format(row.id))
            )
            for row in db().select(db.news.ALL, orderby =~ db.news.news_date, limitby = (0, 5))
        ],
        carousel=carousel, anim=anim, threatened=threatened, sponsored=sponsored_rows,
        hrefs=hrefs, images=images, html_names=titles, has_vernacular=has_vernacular, add_the=add_the,
        n_total_sponsored=reservation_total_counts('donors'),
        n_sponsored_leaves=reservation_total_counts('otts'),
        menu_splash_images={
            sub_menu[0]:URL('static', 'images/oz-newssplash-%s.jpg' % sub_menu[0].lower().replace("for ", ""))
            for sub_menu in response.menu
        }
    )

def footer_sponsor_items():
    """
    Three hardcoded images for groups that can be sponsored - appears on every page =>
    should not make a db request
    """
    return dict()


def homepage_animation_template():
    """
    The html fragment used as a template for the embedded animation on the homepage
    """
    return dict()

@require_https_if_nonlocal()
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

## General pages ##

def custom_400():
    return {}

def custom_404():
    return {}

## Main leaf sponsorship routines ##

def sponsor_leaf():
    """
    The main sponsorship page, which does most of the validation
    """
    return sponsor_leaf_check(
        use_form_data=(request.extension == "load"), form_data_to_db=False)
    
def sponsor_leaf_check(use_form_data, form_data_to_db):
    """ 
    Take an open tree ID and from that ...
    1. figure out status of leaf and return the correct page
        these options will all forward to different pages (view listed in square
        brackets below), selected in the following order:

        * maintenance [spl_maintenance.html] - the site is in maintenance mode,
            and we don't want to allow any access to reservations data

        * no status set [spl_error.html] - something went very wrong

      Shown even when sponsorship is turned off
        * sponsored [spl_sponsored.html] - it's already been sponsored
        * invalid [spl_invalid.html] - not an actual sponsorable OTTid
        * banned [spl_banned.html] - cannot sponsor this
        * available on main site [spl_elsewhere.html] - it may be available but this
            onezoom instance doesn't allow sponsorship (e.g. in a museum)
        
      Shown if sponsorship is on.
        * unverified [spl_unverified.html] - it's already been sponsored but the
            details haven't been verified yet
        * unverified waiting for payment [spl_waitpay.html] - has been sponsored but
            paypal hasn't sent us confirmation (could be that they didn't actually
            pay, so may become free after a few days)


      Shown when sponsorship is allowed and not in maintenance mode
        * reserved [spl_reserved.html] - another user was active on this page
            recently and it's being reserved for them for a few minutes
        * available [sponsor_leaf.html] - the leaf is fully available, so proceed
        * available only to user [sponsor_leaf.html] - available for this user only
    
    (the function also provides the current best picture for that leaf if one exists)

    2. Update the reservations table with new # of views, last view time / user ids etc.
    3. Collect the name, price and EOL ids from the database and return them to the page
    4. Look up the partner_taxa table, find the ranges of leaf ids that will trigger a
        partner deal, check if this leaf id is within any range, and if so, find the
        partner_identifier and return the details to the page for that partner
        (taken from the partners table) ### NOT YET DONE ###

    Database info that needs to be handled by this function:
    
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
        user_preferred_image_src
        user_preferred_image_src_id
        user_updated_time
        user_paid
        user_message_OZ
        user_donor_hide

    This function DOES NOT need to update the sponsor or verified info tables because
    these are handled separately. Additionally, e-mail, address and name as well as
    receipt should be captured from Paypal
    """
    try:
        OTT_ID_Varin = int(request.vars.get('ott'))
    except (TypeError, ValueError):
        raise HTTP(400, "Error: invalid ott parameter")

    if (request.vars.get('form_reservation_code')):
        form_reservation_code = request.vars.form_reservation_code
    else:
        form_reservation_code = __make_user_code()

    status, status_param, reservation_row, leaf_entry = get_reservation(
        OTT_ID_Varin,
        form_reservation_code,
        update_view_count=(request.function == 'sponsor_leaf' and request.extension == "html"),
    )
    
    if status == "maintenance":
        response.view = request.controller + "/spl_maintenance." + request.extension
        return dict(mins=status_param)

    elif status == 'invalid':  # must define some null vars
        response.view = request.controller + "/spl_invalid." + request.extension
        return dict(OTT_ID=OTT_ID_Varin, species_name=leaf_entry.name)

    else:
        # initialise other variables that will be passed on to the page
       
        try:
            EoL_API_key=myconf.take('api.eol_api_key')
        except:
            EoL_API_key=""

        common_name = get_common_name(OTT_ID_Varin)
        # Fetch partner data if available
        partner = request.vars.get('partner')
        try:
            if partner is None:
                raise AttributeError
            partner_data = db(db.partners.partner_identifier == partner).select(
                db.partners.ALL).first().as_dict()  # NB: this could be null
        except AttributeError:
            partner_data = {}

        iucn_code = getattr(
            db(db.iucn.ott == OTT_ID_Varin).select(db.iucn.status_code).first(),
            'status_code',
            None)

        long_name = nice_name(leaf_entry.name, common_name, html=True, is_species=True, the=False)
        the_long_name = nice_name(leaf_entry.name, common_name, html=True, is_species=True, the=True)

        #get the best picture for this ott, if there is one.
        query = (db.images_by_ott.ott == OTT_ID_Varin)
        query &= (db.images_by_ott.overall_best_any == True)
        default_image = db(query).select(
            db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,
            db.images_by_ott.rights, db.images_by_ott.licence).first()
        #also look at the nondefault images if present
        if reservation_row and reservation_row.user_nondefault_image:
            src_id = reservation_row.verified_preferred_image_src_id
            src = reservation_row.verified_preferred_image_src
            query = (db.images_by_ott.src_id == src_id) & (db.images_by_ott.src == src)
            user_image = db(query).select(
                db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id, 
                db.images_by_ott.rights, db.images_by_ott.licence).first()
        else:
            user_image=None

    #once we have got this far, we can show certain pages
    #even in maintenance mode or where allow_sponsorship is not True, e.g. if
    #a leaf is already sponsored, or is banned from sponsorship

    if status == "banned" or leaf_entry.price is None:
        response.view = request.controller + "/spl_banned." + request.extension
        return dict(
            species_name    = leaf_entry.name,
            js_species_name = json.dumps(leaf_entry.name),
            common_name     = common_name,
            js_common_name  = json.dumps(common_name.capitalize() if common_name else None),
            long_name       = long_name,
            default_image   = default_image,
            user_image      = user_image,
        )

    if not sponsorship_enabled():
        if status.startswith("available"):
            response.view = request.controller + "/spl_elsewhere." + request.extension
        else:
            response.view = request.controller + "/spl_elsewhere_not." + request.extension
        return dict(
            species_name    = leaf_entry.name,
            js_species_name = json.dumps(leaf_entry.name),
            js_common_name  = json.dumps(common_name.capitalize() if common_name else None),
            the_long_name   = the_long_name,
            iucn_code       = iucn_code,
            default_image   = default_image,
            ott             = OTT_ID_Varin)

    # From here on we assume we have a reservation row
    if reservation_row is None:
        raise HTTP(400, "Error: row is not defined. Please try reloading the page")

    if status == "sponsored":
        response.view = request.controller + "/spl_sponsored." + request.extension
        return dict(
            species_name      = leaf_entry.name,
            js_species_name   = json.dumps(leaf_entry.name),
            common_name       = common_name,
            js_common_name    = json.dumps(common_name.capitalize() if common_name else None),
            long_name         = long_name,
            iucn_code         = iucn_code,
            default_image     = default_image,
            user_image        = user_image,
            verified_kind     = reservation_row.verified_kind,
            verified_name     = reservation_row.verified_name,
            verified_more_info= reservation_row.verified_more_info)

    if status.startswith("unverified"):
        if status == "unverified waiting for payment":
            unpaid_time_limit = sponsorship_config()['unpaid_time_limit']
            response.view = request.controller + "/spl_waitpay." + request.extension    
            return dict(
                species_name=leaf_entry.name,
                the_long_name=the_long_name,
                unpaid_time_limit_hours= int(unpaid_time_limit/60.0/60.0))
        else:
            response.view = request.controller + "/spl_unverified." + request.extension
            return dict(species_name = leaf_entry.name)

    if status == "reserved":
        response.view = request.controller + "/spl_reserved." + request.extension
        return dict(
            species_name    = leaf_entry.name,
            the_long_name   = the_long_name,
            release_time    = status_param)

    if status.startswith("available"):
        response.view = request.controller + "/sponsor_leaf." + request.extension
        # Can sponsor here, so go through to the main sponsor_leaf page
        form = None
        validated = None
        price = 0.01*float(leaf_entry.price)
        if use_form_data:
            # This is the real form
            form = SQLFORM(db.reservations, reservation_row, 
                fields=[
                    ## List all fields that will be updated by sponsor leaf
                    # Writable by the user
                    'e_mail','allow_contact','twitter_name', 'user_sponsor_kind',
                    'user_sponsor_name', 'user_more_info', 'user_donor_title',
                    'user_donor_name', 'user_donor_hide', 'user_paid', 'user_message_OZ',
                    'user_nondefault_image', 'user_preferred_image_src',
                    'user_preferred_image_src_id','user_giftaid', 'user_sponsor_lang',
                    'user_addr_house', 'user_addr_postcode',
                    'sponsorship_story',
                    # writeable=False -> filled out on validation
                    'name', 'reserve_time', 'asking_price', 'user_updated_time',
                    'asking_price', 'user_updated_time', 'sponsorship_duration_days',
                    'partner_name', 'partner_percentage'
                    ],
                # These fields aren't stored in the database, just make the form work
                extra_fields=[
                    Field('user_addr_nonuk'),
                    Field('user_addr_internationaladdr'),
                ],
                deletable = False)
            if form.accepts(
                    request.vars, # use both GET + POST vars: GET vars passed when accessed via LOAD
                    session=None,
                    formname="main_sponsor_form",
                    dbio=form_data_to_db,
                    onvalidation=lambda x: valid_spons(x, leaf_entry.name, price, partner_data)):                    
                validated = True # indicates to follow the form submission to paypal
                # Force the user_donor_hide and allow_contact fields to be 0 not NULL
                # Weirdly we can't do this using the DAL: update(user_donor_hide = 0)
                # puts NULL rather than 0 in the DB, so we hack it using raw SQL
                if not form.vars.user_donor_hide:
                    db.executesql(f"UPDATE reservations SET user_donor_hide = 0 where id = {int(reservation_row.id)}")
                if not form.vars.allow_contact:
                    db.executesql(f"UPDATE reservations SET allow_contact = 0 where id = {int(reservation_row.id)}")
            elif form.errors:
                validated = False
            else:
                pass  # Simply show the form

        max_price = db.prices.price.max()
        max_global_price = db().select(max_price).first()[max_price] / 100
        min_price = db.prices.price.min()
        min_global_price = db().select(min_price).first()[min_price] / 100
        return dict(
            form                  = form,
            validated             = validated,
            id                    = reservation_row.id,
            OTT_ID                = OTT_ID_Varin,
            EOL_ID                = leaf_entry.get('eol', -1),
            species_name          = leaf_entry.name,
            js_species_name       = json.dumps(leaf_entry.name),
            common_name           = common_name,
            js_common_name        = json.dumps(common_name.capitalize() if common_name else None),
            the_long_name         = the_long_name,
            iucn_code             = iucn_code,
            price                 = 0.01*float(leaf_entry.price),
            default_image         = default_image,
            form_reservation_code = form_reservation_code,
            percent_crop_expansion= percent_crop_expansion,
            partner_data          = partner_data,
            EoL_API_key           = EoL_API_key,
            max_global_price      = max_global_price,
            min_global_price      = min_global_price)
        
    # should never get to this part
    response.view = request.controller + "/spl_error." + request.extension
    return dict(OTT_ID = OTT_ID_Varin)


def sponsor_pay():
    """
    Actually save the payment details in the db, and then redirect to a payments system, 
    e.g. paypal
    """
    result = sponsor_leaf_check(use_form_data=True, form_data_to_db=True)
    if not result.get('validated', None):
        # Keep trying to validate, using the sponsor_leaf views
        return result
    else:
        # Jump out to paypal
        db_saved = result['form'].vars
        OTT_ID_str = str(int(result['OTT_ID'])) # this is the only field not in the form
        try:
            # redirect the user to a paypal page that (if completed) triggers paypal to then visit
            # an OZ page, confirming payment: this is called an IPN. Details in pp_process_post.html
            try:
                notify_url = myconf.take('paypal.notify_url') + '/pp_process_post.html'
            except:
                notify_url = URL("pp_process_post.html", scheme=True, host=True)
            redirect(get_paypal_url() + (
                '/cgi-bin/webscr'
                '?cmd=_donations'
                '&business=mail@onezoom.org'
                '&item_name=Donation+to+OneZoom+({sp_name})'
                '&item_number=leaf+sponsorship+-+{sp_name}'
                '&return={ret_url}'
                '{notify_string}'
                '&amount={amount}'
                '&currency_code=GBP'.format(
                     sp_name=urllib.parse.quote(db_saved.name),
                     ret_url=URL("sponsor_thanks.html", scheme=True, host=True),
                     notify_string='&notify_url=%s/%s' % (notify_url, OTT_ID_str),
                     amount=urllib.parse.quote('{:.2f}'.format(db_saved.user_paid)))))
        except:
            raise
            error="we couldn't find your leaf sponsorship information."
            response.view = request.controller + "/sponsor_pay." + request.extension
            return(dict(error=error, ott=request.vars.get('ott') or '<no available ID>'))


def valid_spons(form, species_name, price_pounds, partner_data):
    """
    Do all this using custom validation as some is quite intricate
    """
    # Do general basket_fields validation
    for k, v in reservation_validate_basket_fields(form.vars).items():
        setattr(form.errors, k, v)

    try:
        if float(form.vars.user_paid) < price_pounds:
            form.errors.user_paid = T("Please donate at least £%s to sponsor this leaf, or you could simply choose another leaf") % ("{:.2f}".format(price_pounds), )
    except:
        form.errors.user_paid = T("Please enter a valid number")

    # calculate writable=False vars, to insert
    form.vars.name = species_name
    form.vars.reserve_time = form.vars.user_updated_time = request.now
    form.vars.user_sponsor_lang = (request.env.http_accept_language or '').lower()
    form.vars.asking_price = price_pounds
    form.vars.sponsorship_duration_days=sponsorship_config()['duration_days']
    form.vars.partner_name=partner_data.get('partner_identifier')
    form.vars.partner_percentage=partner_data.get('percentage')
    

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
        row = db(db.reservations.OTT_ID == OTT_ID_Varin).select(
            db.reservations.OTT_ID,
            db.reservations.name,
            db.reservations.user_sponsor_kind,
            db.reservations.user_sponsor_name,
            db.reservations.user_more_info,
            db.reservations.user_paid,
            db.reservations.PP_transaction_code).first()
        if row is None:
            raise IndexError(T("Could not match against a row in the database"))
        return(dict(data=row))
    except TypeError:
        raise_incorrect_url(URL('index', scheme=True, host=True), T("Error - you gave no OTT number.") + " " + T("Go back to the home page"))
    except Exception as e:
        raise_incorrect_url(URL('index', scheme=True, host=True), str(e) + ". " + T("Go back to the home page"))

# TODO enabling edits and intelligent behaviour if a logged in user goes back to their own leaf    


def sponsor_renew_request():
    """
    Request a renewal link emailed to you.
    """
    form = FORM(
        LABEL("E-mail or Username"),
        INPUT(_name='user_identifier', _class="uk-input uk-margin-bottom"),
        INPUT(_type='submit', _class="oz-pill pill-leaf"))
    if form.accepts(request.vars, session=None):
        response.flash = sponsor_renew_request_logic(
            form.vars.user_identifier.strip(),
            mailer=ozmail.get_mailer()
        )
    return dict(
        form=form,
    )

def sponsor_unsubscribe():
    """
    User didn't want any more e-mails
    """
    try:
        if sponsor_verify_url(request):
            username = request.args[0]
        else:
            session.flash = "Invalid request for %s" % request.args[0]
            redirect(URL('sponsor_renew_request'))
            return(dict())
    except IndexError:
        session.flash = "Invalid request: Missing token"
        redirect(URL('sponsor_renew_request'))
        return(dict())

    sponsorship_restrict_contact(username)
    session.flash = "You have been unsubscribed from all future e-mails about your sponsorships"
    redirect(URL('sponsor_renew_request'))
    return(dict())


def sponsor_renew():
    '''list items currently sponsored by a user
    '''
    expiry_soon_date = sponsorship_expiry_soon_date()
    sponsorship_renew_discount = sponsorship_config()['renew_discount']

    try:
        if sponsor_verify_url(request):
            username = request.args[0]
        else:
            session.flash = "Invalid renewal request for %s" % request.args[0]
            redirect(URL('sponsor_renew_request'))
            return(dict())
    except IndexError:
        session.flash = "Invalid renewal request: Missing token"
        redirect(URL('sponsor_renew_request'))
        return(dict())

    # Check allow_sponsorship state
    if not sponsorship_enabled():
        raise_incorrect_url(URL('index', scheme=True, host=True), "Can't renew sponsorship from here." + T("Go back to the home page"))

    # Get / re-cycle notify URL, including basket_code for this potential transaction
    if 'notify_url' in request.vars:
        notify_url = request.vars['notify_url']
        if '/basket/' not in notify_url:
            raise ValueError("Invalid notify_url: %s" % notify_url)
    else:
        try:
            notify_url = myconf.take('paypal.notify_url') + '/pp_process_post.html'
        except:
            notify_url = URL("pp_process_post.html", scheme=True, host=True)
        notify_url += '/basket/%s' % __make_user_code()

    # Get active, expiring reservations
    active_rows, expiring_rows, rows_by_ott = ([], [], {})
    for r in db(
                (db.reservations.username == username) &
                (db.reservations.verified_time != None) &
                (db.reservations.PP_transaction_code != None)  # i.e has been bought
            ).select(
                db.reservations.ALL,
                orderby="sponsorship_ends",
            ):
        rows_by_ott[r.OTT_ID] = r
        if r.sponsorship_ends >= expiry_soon_date:
            active_rows.append(r)
        else:
            expiring_rows.append(r)

    # Get expired reservations, including who now owns it
    expired_rows = []
    expired_statuses = {}
    for r in db((db.expired_reservations.username == username)).select(
                db.expired_reservations.ALL,
                orderby="expired_reservations.sponsorship_ends",
            ):
        if r.OTT_ID in rows_by_ott:
            # Already have a row for this one, no need to create another
            continue
        rows_by_ott[r.OTT_ID] = r
        expired_rows.append(r)

        # Try reserving each
        status, _, new_reservation, _ = get_reservation(
            r.OTT_ID,
            # NB: Use the username as our form_reservation_code
            hashlib.sha256(username.encode('utf8')).hexdigest(),
        )
        if status == "maintenance":
            response.view = request.controller + "/spl_maintenance." + request.extension
            return dict(mins=myconf.take('sponsorship.maintenance_mins'))

        expired_statuses[r.OTT_ID] = dict(
            status=status,
            reservation=new_reservation,
            prev_reservation=r,
        )

    # Sponsored images
    images = {}
    for r in db(
            (db.images_by_ott.ott.belongs(rows_by_ott.keys())) & (db.images_by_ott.overall_best_any==1)
        ).select(
            db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,
            db.images_by_ott.rights, db.images_by_ott.licence):
        images[r.ott] = {
            'url': img.thumb_url(thumb_base_url, r.src, r.src_id),
            'rights':r.rights,
            'licence': r.licence.split('(')[0]}

    prices = {}
    for r in db(db.ordered_leaves.ott.belongs(rows_by_ott.keys())).select(
                db.ordered_leaves.ott,
                db.ordered_leaves.price,
                db.banned.ott,
                left=db.banned.on(db.banned.ott == db.ordered_leaves.ott),
            ):
        if r.banned.ott is not None or r.ordered_leaves.price is None:
            # No price for banned / unpriced leaves
            pass 
        elif r.ordered_leaves.ott in expired_statuses:
            # No discount if expired
            prices[r.ordered_leaves.ott] = dict(price=r.ordered_leaves.price, discount=None)
        else:
            # Discount items currently owned
            prices[r.ordered_leaves.ott] = dict(
                price=int(r.ordered_leaves.price * (1 - sponsorship_renew_discount)),
                discount=r.ordered_leaves.price - int(r.ordered_leaves.price * (1 - sponsorship_renew_discount)),
            )

    most_recent = None
    for r in itertools.chain(active_rows, expiring_rows, expired_rows):
        # Use most_recent to derive global user details, e.g. name, gift aid status.
        if most_recent is None:
            most_recent = r

        # If there's a nondefault image, replace with that
        if r.user_nondefault_image:
            images[r.OTT_ID] = {'url': img.thumb_url(
                thumb_base_url,
                r.verified_preferred_image_src,
                r.verified_preferred_image_src_id)}

    # Fetch data for partners so we can use it on the Gift Aid form
    all_partner_identifiers = set()
    for r in itertools.chain(active_rows, expiring_rows, expired_rows):
        # NB: We're not picking out partners that are being bought, but we'd have to replicate the functionality in JS if so
        all_partner_identifiers.update(partner_identifiers_for_reservation_name(r.partner_name))
    all_partner_data = db(db.partners.partner_identifier.belongs(all_partner_identifiers)).select()

    vars = request.vars

    # Extract details from most recent item if unpopulated
    if most_recent:
        if "user_donor_title" not in vars:
            vars['user_donor_title'] = most_recent.user_donor_title
        if "user_donor_name" not in vars:
            vars['user_donor_name'] = most_recent.user_donor_name
        if "user_addr_nonuk" not in vars:
            # Gift aid not populated yet
            vars['user_giftaid'] = most_recent.user_giftaid
            if not most_recent.user_giftaid:
                # Not a giftaider, copy nothing
                pass
            if most_recent.user_addr_postcode is None and most_recent.user_addr_house is not None:
                # No postcode --> international user
                vars['user_addr_nonuk'] = True
                vars.user_addr_internationaladdr = most_recent.user_addr_house
            else:
                # UK giftaider
                vars['user_addr_nonuk'] = False
                vars.user_addr_house = most_recent.user_addr_house
                vars.user_addr_postcode = most_recent.user_addr_postcode

    # De-anonymise details if they're starred
    if (vars.user_addr_internationaladdr or '').startswith('****'):
        vars.user_addr_internationaladdr = most_recent.user_addr_house
    if (vars.user_addr_house or '').startswith('****'):
        vars.user_addr_house = most_recent.user_addr_house
    if (vars.user_addr_postcode or '').startswith('****'):
        vars.user_addr_postcode = most_recent.user_addr_postcode

    # If there's a form submission, validate it
    # NB: This is highly ugly, but the alternative is making a FORM dynamically
    #     with the relevant fields, or inventing widgets to support the checkboxes.
    form = collections.namedtuple("FakeForm", ["vars", "errors"])(
        vars=vars,
        errors=reservation_validate_basket_fields(vars),
    )
    if 'amount_extra' in form.vars:
        if int(form.vars['amount_extra']) < 0:
            form.errors['amount_extra'] = T("Extra donation can't be negative")
    if 'amount' in form.vars:
        calc_amount = int(form.vars['amount_extra']) * 100
        for k, v in form.vars.items():
            if not k.startswith('oz_renew_'):
                continue
            ott = int(k.split("_", 3)[2])

            if ott not in prices:
                form.errors[k] = "OTT %d not sponsorable" % ott
            else:
                calc_amount += prices[ott]['price']
        if '{:.2f}'.format(calc_amount / 100) != form.vars['amount']:
            form.errors['amount'] = T("Total sponsorship amount doesn't match")

    # If got this far without errors, good to submit to paypal
    if 'cmd' in form.vars and len(form.errors) == 0 and calc_amount > 0:
        basket_code = notify_url.split('/basket/', 2)[1]
        for k, v in form.vars.items():
            if not k.startswith('oz_renew_'):
                continue
            ott = int(k.split("_", 3)[2])

            if ott in expired_statuses:
                # We want to buy a fresh reservation, not the expired one
                reserve_row = expired_statuses[ott]['reservation']
                prev_reservation_id = expired_statuses[ott]['prev_reservation'].id
            else:
                reserve_row = rows_by_ott[ott]
                prev_reservation_id = None
            reservation_add_to_basket(basket_code, reserve_row, dict(
                # Update user_donor_hide in DB (NB: If field missing, checkbox is unchecked)
                user_donor_hide=bool(form.vars.get("oz_user_donor_hide_%d" % ott, False)),
                prev_reservation_id=prev_reservation_id,
                user_giftaid=form.vars.user_giftaid,
                user_addr_house=form.vars.user_addr_house,
                user_addr_postcode=form.vars.user_addr_postcode,
            ))
        raise HTTP(307, "Redirect", Location=get_paypal_url() + '/cgi-bin/webscr')
    else:
        # Anonymise details if they match most-recent
        if form.vars.user_addr_internationaladdr and form.vars.user_addr_internationaladdr == most_recent.user_addr_house:
            form.vars.user_addr_internationaladdr = '*' * 20
        if form.vars.user_addr_house and form.vars.user_addr_house == most_recent.user_addr_house:
            form.vars.user_addr_house = '*' * 20
        if form.vars.user_addr_postcode and form.vars.user_addr_postcode == most_recent.user_addr_postcode:
            form.vars.user_addr_postcode = '**** ' + most_recent.user_addr_postcode[-3:]

    return dict(
        all_row_categories=[
            dict(title=T("Active sponsorships"), is_open=False, defselect=False, rows=active_rows, status={}),
            dict(title=T("Sponsorships expiring soon"), is_open=True, defselect=True, rows=expiring_rows, status={}),
            dict(title=T("Expired sponsorships"), is_open=True, defselect=True, rows=expired_rows, status=expired_statuses),
        ],
        sci_names={k:r.name for k, r in rows_by_ott.items()},
        html_names={
            ott:nice_name(rows_by_ott[ott].name, vn, html=True, is_species=True, first_upper=True, break_line=2)
            for ott,vn in get_common_names(rows_by_ott.keys(), return_nulls=True).items()
        },
        images=images,
        prices=prices,
        most_recent=most_recent,  # NB: May be None if there's no reservations
        username=username,
        notify_url=notify_url,
        all_partner_data=all_partner_data,
        form=form,
    )


def sponsored():
    """
    a simple paged list of recently sponsored species
    """
    if len(request.args): page=int(request.args[0])
    else: page=0
    items_per_page=20
    tot=None
    resv = db.reservations
    query = (resv.verified_time != None)
    query &= ((resv.deactivated == None) | (resv.deactivated == ""))
    if (request.vars.omit_nopics):
        query = query & (resv.verified_preferred_image_src != None)
    if (request.vars.getfirst('search_mesg')):
        sanitized = "".join(
            [ch for ch in request.vars.getfirst('search_mesg') if ch.isalnum()])
        query = query & (resv.user_message_OZ.contains(sanitized))
    if (request.vars.sum):
        sum = resv.user_paid.sum()
        tot = db(query).select(sum).first()[sum]
    limitby=(page*items_per_page,(page+1)*items_per_page+1)
    curr_rows = db(query).select(
        resv.OTT_ID,
        resv.name,
        resv.user_nondefault_image,
        resv.verified_kind,
        resv.verified_name,
        resv.verified_more_info,
        resv.verified_preferred_image_src,
        resv.verified_preferred_image_src_id,
        orderby=~resv.verified_time|resv.reserve_time,
        limitby=limitby
        )

    pds = set()
    html_names = nice_name_from_otts([r.OTT_ID for r in curr_rows], leaf_only=True, html=True, first_upper=True, break_line=2)
    #store the default image info (e.g. to get thumbnails, attribute correctly etc)
    default_images = {r.ott:r for r in db(db.images_by_ott.ott.belongs(html_names.keys()) & (db.images_by_ott.overall_best_any==1)).select(db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,  db.images_by_ott.rights, db.images_by_ott.licence, orderby=~db.images_by_ott.src)}
    #also look at the nondefault images if present - 
    user_images = {}
    for r in curr_rows:
        if r.user_nondefault_image:
            user_images[r.OTT_ID] = db(
                (db.images_by_ott.src_id==r.verified_preferred_image_src_id) &
                (db.images_by_ott.src==r.verified_preferred_image_src)
                ).select(
                    db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,
                    db.images_by_ott.rights, db.images_by_ott.licence,
                    orderby=~db.images_by_ott.src).first()
    if (request.vars.highlight_pd):
        pds.add(None) #ones without a src_id are public doman
        pds |= set(
            l['src_id']
            for k, l in default_images.items()
            if l and l['licence'].endswith(u'\u009C')) #all pd pics should end with \u009C on the licence
        pds |= set( 
            l['src_id']
            for k, l in user_images.items()
            if l and l['licence'].endswith(u'\u009C') #all pd pics should end with \u009C on the licence
        )
    return dict(rows=curr_rows, page=page, items_per_page=items_per_page, tot=tot, vars=request.vars, pds=pds, html_names=html_names, user_images=user_images, default_images=default_images)


def donor():
    """Individual donor page"""
    if len(request.args) == 0:
        redirect(URL('donor_list'))
        return dict()
    username = request.args[0]
    page = int(request.args[1]) if len(request.args) > 1 else 0
    items_per_page=100
    limitby=(page*items_per_page,(page+1)*items_per_page+1)

    rows = db(
        (db.reservations.username == username) &
        ((db.reservations.user_donor_hide == None) | (db.reservations.user_donor_hide != True)) &
        (db.reservations.verified_time != None)).select(
        db.reservations.ALL,
        orderby="verified_time, reserve_time",
        limitby=limitby,
    )
    most_recent = None
    rows_by_ott = {}
    total_paid = 0
    for r in rows:
        rows_by_ott[r.OTT_ID] = r
        most_recent = r
        total_paid += r.user_paid
    if most_recent is None:
        raise HTTP(400, "Unknown user %s" % username)

    # Gold/silver/bronze
    sponsor_status = None
    for amount, v in [(0, None), (150, 'silver'), (1000, 'gold')]:
        if total_paid > amount:
            sponsor_status = v

    # Sponsored images
    images = {}
    for r in db(
            (db.images_by_ott.ott.belongs(rows_by_ott.keys())) & (db.images_by_ott.overall_best_any==1)
        ).select(
            db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id,
            db.images_by_ott.rights, db.images_by_ott.licence):
        images[r.ott] = {
            'url': img.thumb_url(thumb_base_url, r.src, r.src_id),
            'rights':r.rights,
            'licence': r.licence.split('(')[0],
        }

    return dict(
        args=request.args,
        vars=request.vars,
        page=page,
        items_per_page=items_per_page,
        rows=rows,
        html_names=nice_name_from_otts(rows_by_ott.keys(), html=True, leaf_only=True, first_upper=True, break_line=2),
        images=images,
        most_recent=most_recent,
        sponsor_status=sponsor_status,
    )


def donor_list():
    '''list donors by name. Check manage/SHOW_SPONSOR_SUMS.html to see what names to add.
    '''
    if len(request.args): page=int(request.args[0])
    else: page=0
    items_per_page=20
    grouped_img_src = "GROUP_CONCAT(if(`user_nondefault_image`,`verified_preferred_image_src`,NULL))"
    grouped_img_src_id = "GROUP_CONCAT(if(`user_nondefault_image`,`verified_preferred_image_src_id`,NULL))"
    grouped_otts = "GROUP_CONCAT(`OTT_ID`)"
    grouped_donor_names = "GROUP_CONCAT(`verified_donor_name`)"
    sum_paid = "COALESCE(SUM(`user_paid`),0)"
    n_leaves = "COUNT(1)"
    groupby = "username"
    limitby=(page*items_per_page,(page+1)*items_per_page+1)
    donor_rows = []
    max_groupby = 75  # The max number of sponsorships per username
    for r in db(
        # We can't do user_donor_hide == False as this is converted to IS NULL by web2py
        # (bug?), so we do user_donor_hide != True
        ((db.reservations.user_donor_hide == None) | (db.reservations.user_donor_hide != True)) &
        (db.reservations.verified_time != None) &
        (db.reservations.username != None)
    ).select(
              grouped_img_src,
              grouped_img_src_id,
              grouped_otts,
              grouped_donor_names,
              sum_paid,
              n_leaves,
              db.reservations.verified_donor_name,
              db.reservations.user_nondefault_image,
              db.reservations.username,
              #the following fields are only of use for single displayed donors
              db.reservations.verified_kind,
              db.reservations.verified_name,
              db.reservations.verified_more_info,
              groupby=groupby, orderby=sum_paid + " DESC, verified_time, reserve_time",
              limitby=limitby,
    ):
        # Only show max 75 sponsored species, to avoid clogging page and also because of
        # a low default group_concat_max_len which will restrict the number of otts anyway
        # (note, the number shown may be < 75 as ones without images are not thumbnailed)
        _, donor_name = donor_name_for_username(r.reservations.username)
        if donor_name:
            num_sponsorships = r[n_leaves]
            ott_enum = enumerate(r[grouped_otts].split(","))
            img_src_enum = enumerate((r[grouped_img_src] or '').split(","))
            img_src_id_enum = enumerate((r[grouped_img_src_id] or '').split(","))
            donor_rows.append({
                "donor_name": donor_name,
                "use_otts": [int(ott) for i, ott in ott_enum if i < max_groupby],
                "num_sponsorships": num_sponsorships,
                "img_srcs": [x for i, x in img_src_enum if i < max_groupby],
                "img_src_ids": [x for i, x in img_src_id_enum if i < max_groupby],
                "sum_paid": r[sum_paid],
                "verified_kind": r.reservations.verified_kind if num_sponsorships == 1 else None,
                "verified_name": r.reservations.verified_name if num_sponsorships == 1 else None,
                "verified_more_info": r.reservations.verified_name if num_sponsorships == 1 else None,
            })
    names_for = [r['use_otts'][0] for r in donor_rows if r["num_sponsorships"] == 1]
    html_names = nice_name_from_otts(names_for, html=True, leaf_only=True, first_upper=True, break_line=2)
    otts = [ott for r in donor_rows for ott in r['use_otts']]
    #store the default image info (e.g. to get thumbnails, attribute correctly etc)
    images = {
        r.ott:r
        for r in db(
            db.images_by_ott.ott.belongs(otts) & (db.images_by_ott.overall_best_any==1)
        ).select(
            db.images_by_ott.ott,
            db.images_by_ott.src,
            db.images_by_ott.src_id,
            db.images_by_ott.rights,
            db.images_by_ott.licence,
            orderby=~db.images_by_ott.src
        )
    }
    #also look at the nondefault images if present
    for r in donor_rows:
        for ott, img_src, img_src_id in zip(r["use_otts"], r["img_srcs"], r["img_src_ids"]):
            if img_src is not None and img_src_id is not None:
                row = db((db.images_by_ott.src == img_src) & (db.images_by_ott.src_id == img_src_id)).select(
                    db.images_by_ott.ott, db.images_by_ott.src, db.images_by_ott.src_id, 
                    db.images_by_ott.rights, db.images_by_ott.licence).first()
                if row:
                    images[row.ott] = row
    return dict(
        donor_rows=donor_rows,
        images=images,
        page=page,
        items_per_page=items_per_page,
        vars=request.vars,
        html_names=html_names,
        cutoffs=[1000000,1000,150,0], # define gold, silver, and bronze sponsors
    )



def sponsor_picks(sponsor_suggestion=None):
    """
    Get the list of hand-picked nodes, from the sponsor_picks table. If a node has a
    identifier which is a positive integer, this refers to an ott, and the node can be
    displayed using the sponsor_node function. Otherwise it is a bespoke collection,
    displayed using sponsor_handpicks.
    The sponsor_suggestion parameter filters which picks are chosen to be returned:
    * if an integer, it is one (or a combination) of the bitflags defined in
        sponsor_suggestion_flags
    * if it is a string, it indicates a specific sponsor_picks identifier (group name,
        e.g. "trail2016" to be picked)
    """

    #save 'ott':123 in pick[xxx].vars
    pick = {}
    sp_tab = db.sponsor_picks
    query = (sp_tab.display_order is not None)
    try:
        query &= (sp_tab.identifier == (sponsor_suggestion+""))
    except TypeError:
        pass  # sponsor_suggestion was a number
    for row in db(query).select(orderby=sp_tab.display_order):
        if (row.display_flags is None or sponsor_suggestion is None or
               row.display_flags & sponsor_suggestion):
            val = {v:row[v] for v in sp_tab.fields}
            try:
                val['vars']=loads(row.vars)
            except:
                val['vars']={}
            if not row.thumb_url and row.thumb_src is not None:
                val['thumb_url']=img.thumb_url(thumb_base_url, row.thumb_src,row.thumb_src_id)
            if row.identifier.isdigit():
                val['vars']['ott'] = row.identifier = int(row.identifier)
                val['page'] = 'sponsor_node'
            else:
                val['page'] = 'sponsor_handpicks'
                val['vars']['group_name'] = row.identifier
            pick[row.identifier] = val
    return pick
    
def sponsor():
    return dict(pick=sponsor_picks(
        sponsor_suggestion=sponsor_suggestion_flags['sponsor_by']))

def treecards():
    prices = []
    accumulate = 0
    for row in db(db.prices).select(db.prices.ALL, orderby=db.prices.price):
        accumulate += row.n_leaves
        prices.append(
            {'price_pounds': row.price/100, 'n': row.n_leaves, 'cumulative': accumulate})
    for p in prices:
        p['quantile'] = p['cumulative']/accumulate
    return dict(
        pick=sponsor_picks(sponsor_suggestion=sponsor_suggestion_flags['sponsor_for']),
        prices=prices)



def sponsor_node_price():
    """
    Pick <max> leaves for a price band, and return data for the price bands.
    By default ranks by popularity. If price_pence is blank, this returns the 'contact us' details.
    
    IMPORTANT NOTE: this query has the potential to slow down the website when someone
      clicks on a node high up in the tree: a badly-formed query will end up sorting
      millions of leaves according to the image ranking. For this reason, we make 2
      queries, firstly for leaves with an image, ranked by image rating, and then 
      (if we don't get enough results returned) for leaves without an image, ranked
      by popularity.
    """
    price_levels_pence = {
        row.price: (str(row.class_description), str(row.price_description))
        for row in db().select(
            db.prices.price,
            db.prices.class_description,
            db.prices.price_description,
        )
    }
    lowest_price_pence = min(price_levels_pence.keys())
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

        # Use some shortcuts
        img_tab = db.images_by_ott
        leaf_tab = db.ordered_leaves
        if price_pence is None or price_pence > lowest_price_pence:
            rows_with_img = db(query & (img_tab.overall_best_any)).select(
                db.ordered_leaves.ott,
                db.ordered_leaves.name,
                img_tab.src,
                img_tab.src_id,
                img_tab.rights,
                img_tab.licence,
                join=img_tab.on(img_tab.ott == leaf_tab.ott),
                limitby=(start, start+n+1), # add an extra one to check if more required
                orderby=~img_tab.rating)
            otts = [r.ordered_leaves.ott for r in rows_with_img]
            sci_names = {
                r.ordered_leaves.ott: r.ordered_leaves.name for r in rows_with_img}
            image_urls = {
                r.ordered_leaves.ott: img.thumb_url(thumb_base_url, r.images_by_ott.src, r.images_by_ott.src_id)
                for r in rows_with_img
            }
            image_attributions = {
                r.ordered_leaves.ott: (' / '.join(
                    [t for t in [r.images_by_ott.rights, r.images_by_ott.licence] if t]))
                        for r in rows_with_img}
            
            extra_needed = (n+1) - len(rows_with_img)
            if extra_needed > 0:            #not enough leaves with images. We need to get ones without images too
                count = db.ordered_leaves.ott.count()
                total_with_images = db(query & (db.images_by_ott.overall_best_any)).select(
                    count, 
                    join = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott)
                ).first()[count]
                start = start - total_with_images + len(rows_with_img)
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
                rows_with_img = db(query & (db.images_by_ott.overall_best_any)).select(
                    db.ordered_leaves.ott, 
                    db.ordered_leaves.name,
                    db.images_by_ott.src,
                    db.images_by_ott.src_id,
                    db.images_by_ott.rights,
                    db.images_by_ott.licence,
                    join = db.images_by_ott.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                    limitby=(start, start+extra_needed), 
                    orderby = "images_by_ott.rating ASC")
                image_urls = {
                    species.ordered_leaves.ott: img.thumb_url(thumb_base_url, species.images_by_ott.src, species.images_by_ott.src_id)
                    for species in rows_with_img
                }
                image_attributions = {species.ordered_leaves.ott:(' / '.join([t for t in [species.images_by_ott.rights, species.images_by_ott.licence] if t])) for species in rows_with_img}
                otts.extend([species.ordered_leaves.ott for species in rows_with_img])
                sci_names.update({species.ordered_leaves.ott:species.ordered_leaves.name for species in rows_with_img})

        #now construct the vernacular names
        html_names = {ott:nice_name(sci_names[ott], vn, html=True, is_species=True, first_upper=True) for ott,vn in get_common_names(otts, return_nulls=True).items()}
        return dict(
            otts=otts,
            image_urls=image_urls,
            html_names = html_names,
            attributions=image_attributions,
            price_pence = price_pence,
            price_levels_pence=price_levels_pence,
            sponsorship_enabled = sponsorship_enabled(),
        )

    except:
        raise_incorrect_url(URL(vars={'id': 1, 'price': ""}, scheme=True, host=True),
            T("Sorry, you passed in no ID or one that doesn't seem to correspond to a group on the tree."))
        
        
def sponsor_node():
    """
    This picks <max> leaves per price band, and removes already sponsored leaves from the search    
    By default ranks by popularity. We pass on any request.vars so that we can use popup, form_reservation_code, etc.
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
            raise HTTP(400, "No ott or id given")
        #'partner' should match a partner_identifier listed in the db.partners table.
        if request.vars.partner:
            partner = db(db.partners.partner_identifier == request.vars.partner).select().first() #this could be null
        else:
            partner = None    
        first25 = db(query).select(limitby=(0, 25), orderby=db.ordered_leaves.name)
        if len(first25) > 0:
            prices_pence = sorted([r.price for r in db().select(db.prices.price)])
            prices_pence.append("")
            return(dict(prices_pence=prices_pence, first25=first25, vars=request.vars, common_name=common_name, partner=partner, error=None))
        else:
            return(dict(vars=request.vars, common_name=common_name, partner=partner, error="Sorry, there are no species you can sponsor in this group"))
    except:
        raise_incorrect_url(URL(vars={'id':1}, scheme=True, host=True),
            T("Sorry, you passed in no ID or one that doesn't seem to correspond to a group on the tree."))

def sponsor_node_redirect():
    """
    simply provides a link to jump out of an iframe
    """    
    return(dict(id=request.vars.get('id'), ott=request.vars.get('ott')))

def sponsor_handpicks():
    """
    This differs from sponsor_node because it uses pre-selected lists of taxa, that have been 
    hand picked by a manager (e.g. for David Attenborough's Birthday list).
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
    
    if db(query).count() > 0:
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
            image_urls.update({
                species.ordered_leaves.ott: img.thumb_url(thumb_base_url, species.images_by_ott.src, species.images_by_ott.src_id)
                for species in rows
                if species.images_by_ott.src
            })
            sci_names.update({species.ordered_leaves.ott:species.ordered_leaves.name for species in rows})

        #Now find the vernacular names for all these species
        all_otts = [ott for price in otts for ott in otts[price]]
        if all_otts:
            html_names = {ott:nice_name(sci_names[ott], vn, html=True, is_species=True, first_upper=True) for ott,vn in get_common_names(all_otts, return_nulls=True).items()}
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

    price_levels_pence = {
        row.price: row.price_description
        for row in db().select(
            db.prices.price,
            db.prices.price_description,
        )
    }
    try:
        if request.vars.get('id'):
            query = sponsorable_children_query(int(request.vars.id), qtype="id")
        elif request.vars.get('ott'):
            query = sponsorable_children_query(int(request.vars.ott), qtype="ott")
        limitby=(page*items_per_page,(page+1)*items_per_page+1)
        species = db(query).select(db.ordered_leaves.ott, 
                                   db.ordered_leaves.name,
                                   db.ordered_leaves.price,
                                   limitby=limitby, 
                                   orderby=db.ordered_leaves.name)
        return dict(
            species=species,
            page=page,
            items_per_page=items_per_page,
            price_levels_pence=price_levels_pence,
            sponsorship_enabled = sponsorship_enabled(),
            error=""
        )

    except:
        return dict(
            species=[],
            page=page,
            items_per_page=items_per_page,
            price_levels_pence=price_levels_pence,
            sponsorship_enabled = sponsorship_enabled(),
            error="Sorry, you passed in an ID that doesn't seem to correspond to a group on the tree",
        )


def pp_process_post():
    """
    Only visited by paypal, to confirm the payment has been made. For debugging problems, see
    https://developer.paypal.com/docs/api-basics/notifications/ipn/IPNImplementation/
     
    If paypal.save_to_tmp_file_dir in appconfig.ini is e.g. '/var/tmp' then save a temp
    file called `www.onezoom.org_paypal_OTTXXX_TIMESTAMPmilliseconds.json` to that dir
    
    If called with no args, return nothing, so as not to excite interest
    """
    import urllib

    if len(request.args) == 0:
        return {}
    try:
        # Make sure this request came from paypal
        paypal_url = get_paypal_url().replace('//www', '//ipnpb')
        paypal_resp = urllib.request.urlopen(urllib.request.Request(
            paypal_url + '/cgi-bin/webscr',
            # NB: Web2Py guarantees that the request body has been rewound for us
            b"cmd=_notify-validate&" + request.body.read(),
            headers={
                'content-type': 'application/x-www-form-urlencoded',
            }))
        if paypal_resp.code != 200:
            raise ValueError("Invalid IPN response code: %d" % paypal_resp.code)
        paypal_resp = paypal_resp.read().decode('ascii')
        if paypal_resp != 'VERIFIED':
            raise ValueError("Invalid IPN response: %s" % paypal_resp)

        # Decide whether to use basket mode or OTT mode
        if request.args[0] == 'basket':
            reservation_confirm_payment(request.args[1], int(float(request.vars.mc_gross) * 100), dict(
                sale_time=request.vars.get('payment_date'),
                PP_first_name=request.vars.get('first_name'),
                PP_second_name=request.vars.get('last_name'),
                PP_town=", ".join([t for t in [request.vars.get('address_city'), request.vars.get('address_state')] if t]),
                PP_country=request.vars.get('address_country'),
                PP_e_mail=request.vars.get('payer_email'),
                PP_transaction_code=request.vars.get('txn_id'),
                # NB: These get cleared if user_giftaid isn't set
                PP_house_and_street=request.vars.get('address_street'),
                PP_postcode=request.vars.get('address_zip'),
            ))
        else:
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
                         # JL: PayPal says that a replay from the server is something you should expect, so not necessarily true
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
                                 sponsorship_ends = request.now + datetime.timedelta(days=365*4+1),  ## 4 Years
                                 sale_time = request.vars.get('payment_date')
                                )
            if not updated:
                raise NameError('No row updated: some details may already be filled out, or the OTT/name/paid may be invalid')
        err = None
    except Exception as e:
        err = e
    if myconf.take('paypal.save_to_tmp_file_dir'):
        import os
        import time
        error_dir = myconf.take('paypal.save_to_tmp_file_dir')
        os.makedirs(error_dir, exist_ok=True)

        with open(
            os.path.join(
                error_dir,
                "{}{}_paypal_OTT{}_{}.json".format(
                    "PP_" if err is None else "PP_ERROR_",
                    "".join([char if char.isalnum() else "_" for char in request.env.http_host]),
                    '_'.join(request.args),
                    int(round(time.time() * 1000)))),
                "w") as json_file:
            out = request.vars.copy()
            request.body.seek(0)
            out['__request_body'] = request.body.read().decode('utf-8')
            if err:
                import traceback
                out['__oz_error'] = str(err)
                out['__oz_traceback'] = traceback.format_exception(None, err, err.__traceback__)
            json_file.write(json.dumps(out, indent=2))
    if err:
        raise HTTP(400, err) #should flag up to PP that there is a problem with this transaction
    else:
        return(dict(vars=request.vars, args=request.args))

def embed_edit():
    form = FORM(
        LABEL("E-mail address"),
        INPUT(_type='email', requires=[IS_NOT_EMPTY(), IS_EMAIL()], _name='email', _class="uk-input uk-margin-bottom"),
        INPUT(_type='hidden', _name='url', _value=URL('life', scheme=True, host=True)),
        INPUT(_type='submit', _value="Send e-mail", _class="oz-pill pill-leaf"),
        _id="form_embed_email",
    )

    if form.accepts(request.vars, session=None, keepvalues=True):
        mail, reason=ozmail.get_mailer()
        if mail is None:
            response.flash = '%s, so cannot send email' % reason
        else:
            mailargs = ozmail.template_mail('embed_code', dict(
                url=form.vars.url,
            ), to=form.vars.email)
            mail.send(**mailargs)
            response.flash = "E-mail with embed code sent"
    return dict(
        form=form,
    )

""" these empty controllers are for other OneZoom pages"""

def introduction():
    return dict(release_info=__release_info())

def work_with_us():
    return dict()

def full_guide():
    return dict()

def sponsor_user_manage():
    out = dict()
    out.update(sponsor_renew_request())
    return out

def otop_intro():
    return dict()

def sponsor_thanks():
    return dict()

def endorsements():
    quotes = {}
    rows = db().select(db.quotes.ALL, orderby = ~db.quotes.quality | db.quotes.id)
    for r in rows:
        if r.category in quotes:
            quotes[r.category].append(r)
        else:
            quotes[r.category] = [r]
    return dict(quotes=quotes)

def impacts():
    redirect(URL('default', 'endorsements'))

def impact():
    redirect(URL('default', 'endorsements'))

def installations():
    redirect(URL('education', 'installations'))

def developer():
    return dict(release_info=__release_info())

def about():
    return dict(release_info=__release_info())

def data_sources():
    return dict(img_url = lambda src, src_id: img.thumb_url(thumb_base_url, src, src_id))

def how():
    return dict()

def colkey():
    return dict()

def team():
    return dict()

def timeline():
    news = db().select(db.news.ALL, orderby =~ db.news.news_date)
    return dict(news = news)

def terms():
    return dict()

def accessibility():
    return dict()

def FAQ():
    price_levels_pence = sorted([row.price for row in db().select(db.prices.price)])
    return dict(n_species =  db(db.ordered_leaves).count(), second_cheapest_price_pence=price_levels_pence[1])

def gallery():
    return dict()

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
            data = db(db.ordered_nodes.id == abs(row.real_parent)).select(db.ordered_nodes.ALL).first()
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
            i['htmlname'] = nice_name(i.get('sciname'), i.get('vernacular'), html=True, is_species=(id<=0))
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
    page_info={'partner': partner}
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
    Temporarily redirect for darwin & dinos exhibit
    """
    redirect(URL(
        'default', 'life_MDtouch/@Vertebrata=801601?ssaver=600&otthome=801601',
        url_encode=False))

def lifeMD():
    """
    A helper function. At some point we want to replace life_MD with this
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return dict(
        screensaver_otts=[991547, 81461, 99252, 770315],
        **treeview_info(has_text_tree=False))
    
def life_MDtouch():
    """
    The museum display version for touchscreens, which is sandboxed
    (and has no underlying text tree with links hidden by JS)
    """
    return lifeMD()

def life_MDmouse():
    """
    The museum display version for mouse operated systems, which is sandboxed
    (and has no underlying text tree with links hidden by JS)
    """
    return lifeMD()

def life_treasure():
    """
    The treasure hunt version, which is sandboxed (and has no underlying text tree with links hidden by JS)
    """
    otts = [int(ott) for ott in request.vars.getlist('treasure_taxa') if ott.isdigit()]
    ids = otts2ids(otts)
    id_by_ott = OrderedDict()
    for ott in otts:
        if ott in ids['leaves']:
            id_by_ott[ott]=ids['leaves'][ott]
        elif ott in ids['nodes']:
            id_by_ott[ott]=ids['nodes'][ott]

    mappings = nodes_info_from_string('','')
    leaf_cols = mappings['colnames_leaves']
    node_cols = mappings['colnames_nodes']
    data = nodes_info_from_array(
        ids['leaves'].values(),
        ids['nodes'].values(),
        include_names_in=request.vars.lang or request.env.http_accept_language or 'en',
        include_sponsorship=False)
    # organise data keyed by ott
    formatted_name_by_ott = {}
    vernacular_by_ott={k:v for k,v in data['vernacular_by_ott']}
    for row in data['leaves']:
        ott = row[leaf_cols['ott']]
        if ott:
            formatted_name_by_ott[ott] = nice_name(
                scientific=row[leaf_cols['name']],
                common=vernacular_by_ott.get(ott, None),
                html=True,
                is_species=True,
                first_upper=True)
    for row in data['nodes']:
        ott = row[node_cols['ott']]
        if ott:
            formatted_name_by_ott[ott] = nice_name(
                scientific=row[node_cols['name']],
                common=vernacular_by_ott.get(ott, None),
                html=True,
                is_species=False,
                first_upper=True)

    
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return dict(
        treasure_id_by_ott=id_by_ott,
        formatted_name_by_ott=formatted_name_by_ott,
        **treeview_info(has_text_tree=False))

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

def otop():
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info(has_text_tree=False)

def otop_MD():
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    return treeview_info(has_text_tree=False)

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

def list_controllers():
    """
    In testing mode only, list all controllers
    Code taken from from applications/admin/controllers/default.py
    """
    from gluon.compileapp import find_exposed_functions
    from gluon.admin import apath
    request.extension = "json" #force return to always be json
    if is_testing:
        data = safe_read(apath('%s/controllers/%s' % (request.application, request.controller) + ".py", r=request))
        items = find_exposed_functions(data)
        return dict(errors=[], controllers = items and sorted(items) or [])
    else:
        return dict(errors=['To list all controllers, please switch is_testing to True in db.py'])

def safe_open(a, b):
    if PY2 or 'b' in b:
        return open(a, b)
    else:
        return open(a, b, encoding="utf8")
        
def safe_read(a, b='r'):
    safe_file = safe_open(a, b)
    try:
        return safe_file.read()
    finally:
        safe_file.close()
