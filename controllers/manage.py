# -*- coding: utf-8 -*-
import re
import subprocess

import ozmail
import OZfunc
import img
import warnings
import usernames
import sponsorship

@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def index():
    '''this is a page to give quick links to all the management routines'''
    request.is_local or request.requires_https() #require https unless local
    return dict()

@auth.requires(lambda: auth.has_membership('manager') or auth.has_membership('translator'))
def edit_language():
    """ Edit language file, copied from admin/controllers/default.py """
    import os
    import re
    import time
    from gluon.languages import (read_dict, write_dict, to_native)
    from gluon.utils import md5_hash
    if len(request.args) == 0:
        raise HTTP(400 , "No language provided") 
    if re.match(request.args[0], r'[^\w\.\-]') is None:
        filename = os.path.join(request.folder,"languages",request.args[0] + ".py")
        if os.path.isfile(filename):
            response.title = "OneZoom language strings for " + request.args[0]
            strings = read_dict(filename)
        
            if '__corrupted__' in strings:
                form = SPAN(strings['__corrupted__'], _class='error')
                return dict(filename=filename, form=form)
        
            keys = sorted(strings.keys(), key=lambda x: to_native(x).lower())
            rows = []
            rows.append(H2(T('Original/Translation')))
        
            for key in keys:
                name = md5_hash(key)
                s = strings[key]
                (prefix, sep, key) = key.partition('\x01')
                if sep:
                    prefix = SPAN(prefix + ': ', _class='tm_ftag')
                    k = key
                else:
                    (k, prefix) = (prefix, '')
        
                _class = 'untranslated' if k == s else 'translated'
                if len(s) <= 40 and '\n' not in s:
                    elem = INPUT(_type='text', _name=name, value=s,
                                 _size=70, _class=_class)
                else:
                    elem = TEXTAREA(_name=name, value="\n"+s, _cols=80,
                                    _rows=5, _class=_class)
        
                # Making the short circuit compatible with <= python2.4
                k = (s != k) and k.replace('\n','¶') or B(k.replace('\n','¶'))
                new_row = DIV(LABEL(prefix, k, _style="font-weight:normal; display:block;"),
                              CAT(elem, '\n', TAG.BUTTON(
                                  IMG(_src=URL("static","images","close_red.png"),_width="20",_height="20"), XML('&nbsp;'), T('Delete'),
                                  _onclick='return delkey("%s")' % name,
                                  _class='btn')), _id=name, _class='span6 well well-small')
        
                rows.append(DIV(new_row, _class="row-fluid"))
            rows.append(DIV(INPUT(_type='submit', _value=T('Update'), _class="btn btn-primary"), _class='controls'))
            form = FORM(*rows)
            if form.accepts(request.vars, keepvalues=True):
                strs = dict()
                for key in keys:
                    name = md5_hash(key)
                    with warnings.catch_warnings(record=True) as w:
                        try:
                            if form.vars[name] == chr(127):
                                continue
                        except UnicodeWarning:
                            if form.vars[name] == oldchr(127):
                                continue
                    strs[key] = form.vars[name]
                write_dict(filename, strs)
                session.flash = T('file saved on %(time)s', dict(time=time.ctime()))
                redirect(URL(r=request, args=request.args))
            return dict(filename=filename, form=form)

@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SHOW_SPONSOR_SUMS():
    '''list the sponsors by amount
    '''
    cols = dict(donor_name = db.reservations.verified_donor_name,
                e_mail = db.reservations.e_mail,
                username = db.reservations.username,
                grouped_otts = "GROUP_CONCAT(`OTT_ID`)",
                sum_paid = "SUM(`user_paid`)",
                count = db.reservations.id.count()
                )
    groupby = "IFNULL(username, id)"
    if request.vars['group_includes_name']:
        groupby += ", IFNULL(verified_donor_name,id)"
    rows = db(db.reservations.verified_time != None).select(
        cols['donor_name'], 
        cols['e_mail'], 
        cols['username'], 
        cols['grouped_otts'], 
        cols['sum_paid'],
        cols['count'],
        groupby=groupby, orderby= cols['sum_paid'] + " DESC")
    return dict(rows = rows, cols=cols)

@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SPONSOR_VALIDATE():
    """
    Show sponsorship details, by default shows only non-validated ones, unless ?show=all or ?show=validated
    
    the way we know something is fully sponsored is if PP transaction code is filled out - nb. this could be with us typing 'yet to be paid' in which case verified paid can be NULL so should not be used as a test of whether something is available or not
    
    needs to not be banned
    needs to have a sale time
    needs to not have a verified time
    
    set common
    set IUCN
    set EOL preferred
    
    e-mail when confirmed or not
    6 verified fields to update
    admin comment
    
    """
    try:
        page=int(request.args[0])
    except:
        page=0
    try:
        items_per_page=int(request.vars.n)
        if items_per_page<1:
            raise ValueError
    except:
        items_per_page=10
    
    limitby=(page*items_per_page,(page+1)*items_per_page+1)

    query = None
    if request.vars.show == 'validated':
        query = ((db.reservations.PP_transaction_code != None) & 
                ((db.reservations.verified_time != None) |
                (db.reservations.verified_kind != None) |
                (db.reservations.verified_name != None) |
                (db.reservations.verified_more_info != None) |
                (db.reservations.verified_preferred_image_src != None) |
                (db.reservations.verified_preferred_image_src_id != None)
                ))
    elif request.vars.show == 'all':
        query = (db.reservations.PP_transaction_code != None)
    elif request.vars.show == 'unvalidated':
        pass
    elif isinstance(request.vars.show, str):
        otts = request.vars.show.replace(" ", "").split(",")
        otts = [int(ott) for ott in otts if ott.isdigit()]  # Only keep the integers
        if len(otts) > 0:
            query = (db.reservations.OTT_ID.belongs(otts))
    if query is None:
        query =  ((db.reservations.PP_transaction_code != None) & 
                 (db.reservations.verified_time == None) &
                 (db.reservations.verified_kind == None) &
                 (db.reservations.verified_name == None) &
                 (db.reservations.verified_more_info == None) &
                 (db.reservations.verified_preferred_image_src == None) &
                 (db.reservations.verified_preferred_image_src_id == None))

    rows = db(query).select(db.reservations.id,limitby=limitby, orderby=~db.reservations.user_updated_time) #NB can't order by sale time as it is from paypal, and not in a standard datatime format
    return dict(rows=[r.id for r in rows], page=page, vars=request.vars, items_per_page=items_per_page)

@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SPONSOR_UPDATE():
    # This displays each row of the SPONSOR_VALIDATE page, and therefore
    # needs to be called with single row id
    read_only_cols = [
        'id',
        'OTT_ID',
        'name',
        'e_mail',
        'twitter_name',
        'user_sponsor_lang',
        'user_donor_title',
        'user_donor_name',
        'user_sponsor_kind',
        'user_sponsor_name',
        'user_more_info',
        'user_nondefault_image',
        'user_preferred_image_src',
        'user_preferred_image_src_id',
        'user_message_OZ',
        'user_donor_hide',
        'user_paid',
        'PP_first_name',
        'PP_second_name',
        'PP_town',
        'PP_country',
        'PP_e_mail',
        'verified_paid',
        'asking_price',
        'emailed_re_sponsorship',
        'tweeted_re_sponsorship',
        'reserve_time',
    ]
    write_to_cols = [
        'username',
        'verified_kind',
        'verified_donor_title',
        'verified_donor_name',
        'verified_name',
        'verified_more_info',
        'verified_preferred_image_src',
        'verified_preferred_image_src_id',
        'admin_comment',
        'deactivated'
    ]
    row_id = request.args[0]
    row = db(db.reservations.id==row_id).select(*[db.reservations[n] for n in read_only_cols+write_to_cols]).first()
    username, other_sponsorship_otts = usernames.find_username(row, return_otts=True, allocate_species_name=True)
    read_only = {k:row[k] for k in read_only_cols}
    read_only['percent_crop_expansion'] = percent_crop_expansion
    EOLrow = db(db.ordered_leaves.ott == row['OTT_ID']).select(db.ordered_leaves.eol).first()
    if EOLrow is not None:
        read_only['EOL_ID'] = EOLrow['eol']
    else:
        read_only['EOL_ID'] = None
    read_only['common_name'] = OZfunc.get_common_name(
        read_only['OTT_ID'], lang=read_only['user_sponsor_lang'])
    read_only['html_name'] = OZfunc.nice_name(
        read_only['name'], read_only['common_name'], html=True, is_species=True, break_line=2)
    # Only stick variables in the form that will be updated by the verified page
    try:
        EoL_API_key = myconf.take('api.eol_api_key')
    except:
        EoL_API_key=""
        response.flash="You should really set an eol_api_key in your appconfig.ini file"
    form = SQLFORM(
        db.reservations,
        db.reservations(row_id),
        _id='form_{}'.format(row_id),
        submit_button="OK",
        fields = write_to_cols,
        deletable = False,
    )
    to_be_validated = False
    ret_text=None
    if form.process(onsuccess=None).accepted:
        if request.vars.get('new_username'):
            if other_sponsorship_otts:
                response.flash = 'Added to an existing username'
            else:
                response.flash = 'Created a new username'
        #update the validated_time here, and hack round the fact that various fields are set to NULL if passed in as a blank
        db.reservations[row_id]=dict(
            verified_time=request.now,
            verified_more_info=request.vars.get('verified_more_info'),
            verified_donor_title=request.vars.get('verified_donor_title'),
            verified_donor_name=request.vars.get('verified_donor_name'),
        )
        
        #grab important information
        twittername_t = read_only['twitter_name']
        verified_name_t = request.vars.verified_name
        username_t = request.vars.username
        verified_donor_title_t = request.vars.get('verified_donor_title')
        verified_donor_name_t = request.vars.get('verified_donor_name')
        binomial_name_t = read_only['name']
        common_name_t = read_only['common_name']
        ott_t = read_only['OTT_ID']
        url_t = "www.onezoom.org/life/@={}".format(ott_t) #build url
        email_t = read_only['e_mail'] or read_only['PP_e_mail'] #default to the email they gave us. If not, use the paypal one
        if request.vars.auto_email and read_only['emailed_re_sponsorship'] is None and email_t:
            mail, reason = ozmail.get_mailer()
            if mail is None:
                response.flash = reason
            else:
                gen_email = emails(
                    username_t,
                    ott_t,
                    binomial_name_t,
                    common_name_t,
                    verified_name_t,
                    email_t,
                    verified_donor_title_t,
                    verified_donor_name_t,
                    PP_first_name=read_only['PP_first_name'], 
                    PP_second_name=read_only['PP_second_name'], 
                    sponsor_for=(request.vars.verified_kind=='for'),
                )
                #for html, see http://web2py.com/books/default/chapter/29/08/emails-and-sms#Combining-text-and-HTML-emails
                if mail.send(**gen_email):
                    #update the emailed_re_sponsorship (time when contacted)
                    db.reservations[row_id]=dict(emailed_re_sponsorship=request.now)
                else:
                    response.flash = "Could not send auto-email to " + email_t

        if request.vars.auto_tweet and read_only['tweeted_re_sponsorship'] is None and twittername_t:          
            #set up verification tokens
            #do a tweet
            try:
                from twython import Twython
                twitter = Twython(myconf.take('twitter.consumer_key'), myconf.take('twitter.consumer_secret'), myconf.take('twitter.access_key'), myconf.take('twitter.access_secret'))
                tweet = 'Thank you @{} for sponsoring {} on OneZoom. See it at {}'.format(
                    twittername_t,
                    OZfunc.nice_name(binomial_name_t, common_name_t, the=True),
                    url_t,
                )
                if len(tweet) > 140:
                    tweet = 'Thank you @{} for sponsoring {} on OneZoom. See it at {}'.format(
                        twittername_t,
                        OZfunc.nice_name(binomial_name_t),
                        url_t,
                    )
                    if len(tweet) > 140:
                        tweet = 'Thank you @{} for sponsoring {} on OneZoom'.format(twittername_t, binomial_name_t)
                    
                try:
                    send_tweet = int(myconf.take('twitter.autosend_tweet'))
                except:
                    send_tweet = False
                if send_tweet:
                    twitter.update_status(status=tweet) #uncomment to make twitterbot live
                    #update the tweeted_re_sponsorship (time when tweeted)
                    db.reservations[row_id]=dict(tweeted_re_sponsorship=request.now)
                else:
                    response.flash = CAT((P(response.flash) if response.flash else ""), P('Twitterbot is in testing mode, but would otherwise have said"', EM(tweet), '". To turn twitterbot on, add "autosend_tweet = 1" to appconfig.ini'))
            except Exception as e:
                response.flash = CAT((P(response.flash) if response.flash else ""), P("Could not send auto-tweet to @{}: {}".format(twittername_t, e)))
        
        form.element(_type='submit').update(_style='background-color: #999999; background-image:none; font-size: 1.6em;')
        form.element(_type='submit').update(_value='↻')
        
        img_src_t = request.vars.get('verified_preferred_image_src')
        if img_src_t:
            img_src_t = int(img_src_t)
        if img_src_t in [src_flags['onezoom_via_eol'], src_flags['eol'], src_flags['eol_old']] or request.vars.admin_changed_image:
            # We have asked for an image from EoL- use EoLQueryPicsNames to download
            # it and simultanously add it to the database (perhaps as a bespoke image)
            try:                
                ret_text = ""
                ott = db.reservations[row_id].get('OTT_ID')
                # Since the EoLQueryPicsNames script runs as the web user, it should not have
                # direct access to the appconfig.ini file, with username and password,
                # so we pass it a password string
                db_conn_string = myconf.take('db.uri')
                m = re.match(r'([^:]*:[^:]+)(:?)([^@]*)(.*)', db_conn_string)
                #get the DB / pw string from appconfig.ini, and extract the password
                db_conn_string = (m.group(1) or '') + m.group(2) + m.group(4)
                password = m.group(3) or ''
                EoLQueryPicsNames = [os.path.join(request.folder,'OZprivate','ServerScripts','Utilities','EoLQueryPicsNames.py'),
                                     '--database', db_conn_string,
                                     '--add_percent', str(percent_crop_expansion),
                                     '-v', '--script', '--opentree_id', str(int(ott))]
                if img_src_t == src_flags['onezoom_via_eol'] or request.vars.admin_changed_image:
                    #this is a specific user-chosen image: we will save it as a "onezoom_via_eol" image
                    DOid = request.vars.get('verified_preferred_image_src_id')
                    if DOid:
                        #only save an explicit OneZoom image (by passing in the dataObject ID) if the user  
                        # (or admin, if overridden) has selected something different from the EoL default
                        image_getter = subprocess.run(
                            EoLQueryPicsNames + ['--eol_image_id', str(int(DOid))],
                            timeout=60, # seconds
                            input=f'{password}\n', #pass in pw via stdin, so it doesn't get shown in the processes
                            capture_output=True, 
                            env={"PATH": "/bin:/usr/bin:/usr/local/bin","PWD":os.getcwd()},
                            universal_newlines=True,
                        )
                        ret_text = image_getter.stderr + image_getter.stdout
                        if ret_text:
                            form.element(_type='submit').update(_title=ret_text)
                #Always update the default EoL image (and common name) using EoLQueryPicsNames.py,
                # unless (for the time being) this is an eol_old image, in which case leave it
                # (this is a hack until EoL V3 images are nicer than eolV2)
                # Don't pass in the DOid - the script should get that automagically
                if img_src_t != src_flags['eol_old']:
                    image_getter_connection = subprocess.run(
                        EoLQueryPicsNames, 
                        timeout=60, # seconds
                        input=f'{password}\n', #pass in pw via stdin, so it doesn't get shown in the processes
                        capture_output=True, 
                        env={"PATH": "/bin:/usr/bin:/usr/local/bin","PWD":os.getcwd()},
                        universal_newlines=True,
                    )
                    #pass in the password via stdin, so it doesn't get shown in the processes
                    ret_text = image_getter.stderr + image_getter.stdout
                    if ret_text:
                        form.element(_type='submit').update(_title=ret_text)
                # Get the newly changed row
                row = db(db.reservations.id==row_id).select(*[db.reservations[n] for n in read_only_cols+write_to_cols]).first()
            except:
                try:
                    response.flash = "could not download image ({}). Try running \n{}".format(ret_text, " ".join(EoLQueryPicsNames))
                except:
                    response.flash = "could not download image. Sorry."
    else:
        if form.errors:
            for elem in form.elements():
                elem.update(_style='background-color: #FFBBBB')
        else:
            #this is what happens when the form is loaded at the start (not processed)
            ## variables rendered in a 'textarea' tag (DB fieldtype = text)
            ## variables rendered in an 'input' tag (DB fieldtype = integer, etc)
            if not row['username']:
                # Check if we have sponsorships from someone of the same username or email already
                form.element(_name='username').update(_value=username)
                to_be_validated = True
            if row['verified_donor_title'] is None:
                form.element(_name='verified_donor_title').update(_value=(read_only['user_donor_title'] or "").strip())
                to_be_validated = True
            if row['verified_donor_name'] is None:
                form.element(_name='verified_donor_name').update(_value=(read_only['user_donor_name'] or "").strip())
                to_be_validated = True
            if row['verified_name'] is None:
                form.element(_name='verified_name').append((read_only['user_sponsor_name'] or "").strip())
                to_be_validated = True
            if row['verified_more_info'] is None:
                form.element(_name='verified_more_info').append((read_only['user_more_info'] or "").strip())
                to_be_validated = True
            
            if row['verified_kind'] is None:
                form.element(_name='verified_kind').element('option[value={}]'.format(read_only['user_sponsor_kind'] or 'by')).update(_selected='selected')    
                to_be_validated = True
    if to_be_validated:
        (img_src, img_src_id) = (
            row['user_preferred_image_src'], row['user_preferred_image_src_id'])
    else:
        #this is a simple update - show the already-validated image
        (img_src, img_src_id) = (
            row['verified_preferred_image_src'], row['verified_preferred_image_src_id'])
        form.element(_type='submit').update(_style='background-color: #999999; background-image:none; font-size: 1.6em;')
        form.element(_type='submit').update(_value='↻')

    return dict(
        form=form, 
        vars=read_only,
        username=username,
        other_sponsorship_otts=other_sponsorship_otts,
        img_src=img_src,
        img_src_id=img_src_id,
        to_be_validated=to_be_validated,
        EoL_API_key=EoL_API_key,
        # do we need to query the EoL API for the displayed image?
        img_already_on_oz=(
            (to_be_validated==False) or
            (read_only['user_nondefault_image']==None) or
            (inv_src_flags.get(img_src,None) not in eol_src_flag_names))
        )


@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def LIST_IMAGES():
    """this mines the database for all images and shows them ranked by popularity
    """
    from time import time #to apppend to href, so that caching does not happen
    from collections import OrderedDict
 
    try:
        page=int(request.args[0])
    except: 
        page=0
    items_per_page=500
   
    form=FORM(
        SELECT(
            OPTION('All images', _value='all'),
            OPTION('Best image per species', _value='best_any'),
            OPTION('Best verified image per species', _value='best_verified'),
            OPTION('Best PD image per species', _value='best_pd'),
            value=request.vars.get('select_image_type') or 'best_any', 
            _id="select_image_type", _name="select_image_type"),
        SELECT(
            OPTION('Sort by image quality', _value='qual'),
            OPTION('Sort by species popularity', _value='pop'),
            value=request.vars.get('sort') or 'qual',
            _id="sort", _name="sort"),
        _method = "GET"
    )
    form.element(_id='select_image_type')['_onchange']="this.form.submit()"
    form.element(_id='sort')['_onchange']="this.form.submit()"
    
    images = OrderedDict()
    for src_name in sorted(src_flags, key=src_flags.__getitem__):
        #show eol images separately from Arkive etc
        query = (db.images_by_ott.src == src_flags[src_name])
        if request.vars.get('select_image_type') == 'best_any':
            query = query & (db.images_by_ott.best_any)
        elif request.vars.get('select_image_type') == 'best_verified':
            query = query & (db.images_by_ott.best_verified)
        elif request.vars.get('select_image_type') == 'best_pd':
            query = query & (db.images_by_ott.best_pd)
        rows = db(query).select(
                           db.images_by_ott.src,
                           db.images_by_ott.src_id,
                           db.images_by_ott.ott,
                           db.images_by_ott.rating,
                           db.images_by_ott.rights,
                           db.images_by_ott.licence,
                           db.ordered_leaves.id,
                           db.ordered_leaves.popularity,
                           left=db.ordered_leaves.on(db.images_by_ott.ott == db.ordered_leaves.ott),
                           orderby="ordered_leaves.popularity DESC" if request.vars.get('sort')=="pop" else "images_by_ott.rating DESC")

        images[src_name] = rows[(page*items_per_page):(1+(page+1)*items_per_page)]
    return dict(pics=images, time=time(), form=form, page=page, items_per_page=items_per_page, vars=request.vars)


@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SHOW_RENEWAL_INFO():
    """
    Type in one or more usernames or emails and get back the renewal URL for visiting
    plus the email that would be sent
    """
    ids = []
    if request.vars.id:
        if isinstance(request.vars.id, str):
            ids = request.vars.id.split()
        else:
            ids = [id_ for id_item in request.vars.id for id_ in id_item.split()]

    id_map = {}
    info = []
    for id_string in ids:
        info.append(sponsorship.sponsor_renew_request_logic(id_string, reveal_private_data=True))
        if '@' in id_string:
            for uname in usernames.usernames_associated_to_email(id_string):
                if uname:
                    if id_string not in id_map:
                        id_map[id_string] = []
                    id_map[id_string].append(uname)
        else:
            if db(db.reservations.username == id_string).count():
                if id_string not in id_map:
                    id_map[id_string] = []
                id_map[id_string].append(id_string)

    try:
        uname_info = sponsorship.sponsorship_email_reminders(
            [uname for info_for_id in id_map.values() for uname in info_for_id])
    
        renew_urls = {
            k: {uname: uname_info[uname]["renew_url"] for uname in v}
            for k, v in id_map.items()
        }
        if info:
            response.flash = "Email information:\n" + "\n\n".join(info)

        return dict(urls = renew_urls)
    except ValueError as e:
        return dict(error = str(e))


@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SHOW_EMAILS():
    """
    Find each set of sponsorship batches, ordered by verification date (to the nearest day) 
    and list out the emails we can use, to paste into an email
    """
    from collections import OrderedDict
    import re
    import os.path
    email_list = OrderedDict()
    
    #first find the sponsors that haven't gone through for some reason.
    sponsors = db(
        ((db.reservations.e_mail != None) | 
         (db.reservations.twitter_name != None)   | 
         (db.reservations.allow_contact != None)   | 
         (db.reservations.user_sponsor_kind != None)   | 
         (db.reservations.user_sponsor_name != None)   | 
         (db.reservations.user_paid != None)   | 
         (db.reservations.user_more_info != None)) &
        ((db.reservations.PP_transaction_code == None) |
         (db.reservations.verified_paid == None))
        ).select(
            db.reservations.e_mail, 
            db.reservations.user_preferred_image_src,
            db.reservations.user_preferred_image_src_id,
            db.reservations.username,
            db.reservations.name,
            db.reservations.user_donor_title,
            db.reservations.user_donor_name,
            db.reservations.user_sponsor_kind,
            db.reservations.user_sponsor_name,
            db.reservations.OTT_ID,
            db.reservations.admin_comment,
            db.reservations.user_message_OZ,
            orderby=~db.reservations.reserve_time
        )

    otts = [s.OTT_ID for s in sponsors]                                                         
    cnames = OZfunc.get_common_names(otts)
    for s in sponsors:
        #we can't use the paypal emails etc because we haven't been paid!
        if s.e_mail:
            details = emails(
                s.username, # Probably None because this han't been verified
                s.OTT_ID,
                s.name,
                cnames.get(s.OTT_ID),
                s.user_sponsor_name,
                s.e_mail,
                s.user_donor_title,
                s.user_donor_name,
                sponsor_for=s.user_sponsor_kind=='for',
                email_type='no_payment')
            if s.user_preferred_image_src and s.user_preferred_image_src_id and local_pic_path is not None:
                details['local_pic'] = os.path.isfile(
                    os.path.join(
                        local_pic_path(s.user_preferred_image_src, s.user_preferred_image_src_id),
                        str(s.user_preferred_image_src_id)+'.jpg'))
            else:
                details['local_pic'] = None
            details.update({
               'type': 'no_payment',
               'email': details['to'],
               'ott' : str(s.OTT_ID),
               'name': s.name,
               'cname':cnames.get(s.OTT_ID),
               'img_src': str(s.user_preferred_image_src),
               'img_src_id': str(s.user_preferred_image_src_id),
               'rowflag':None if s.admin_comment else 'no_admin',
               'mesg': s.user_message_OZ})
            try:
                email_list[details['type']].append(details)
            except:
                email_list[details['type']]=[details]
            
    images = []
    #now look for sponsors that haven't been verified yet
    sponsors = db(
        (db.reservations.verified_paid != None) & #they have paid through paypal
        (db.reservations.verified_paid != '')   & 
        (db.reservations.verified_time == None)
    ).select(
        db.reservations.e_mail,
        db.reservations.PP_e_mail,
        db.reservations.user_preferred_image_src,
        db.reservations.user_preferred_image_src_id,
        db.reservations.user_sponsor_name,
        db.reservations.user_sponsor_kind,
        db.reservations.username,
        db.reservations.name,
        db.reservations.user_donor_title,
        db.reservations.user_donor_name,
        db.reservations.PP_first_name,
        db.reservations.PP_second_name,
        db.reservations.OTT_ID,
        db.reservations.user_message_OZ,
        orderby=~db.reservations.reserve_time,
    )
    otts = [s.OTT_ID for s in sponsors]                                                         
    cnames = OZfunc.get_common_names(otts)
    for s in sponsors:
        details = emails(
            s.username,
            s.OTT_ID,
            s.name,
            cnames.get(s.OTT_ID),
            s.user_sponsor_name,
            s.e_mail or s.PP_e_mail,
            s.user_donor_title,
            s.user_donor_name,
            s.PP_first_name,
            s.PP_second_name,
            sponsor_for=(s.user_sponsor_kind=='for'),
            email_type='to_verify',
        )
        if s.user_preferred_image_src and s.user_preferred_image_src_id and local_pic_path is not None:
            details['local_pic'] = os.path.isfile(
                os.path.join(
                    local_pic_path(s.user_preferred_image_src, s.user_preferred_image_src_id),
                    str(s.user_preferred_image_src_id)+'.jpg'))
        else:
            details['local_pic'] = None
        details.update({
            'type': 'to_verify',
            'email': details['to'],
            'ott' : str(s.OTT_ID),
            'name': s.name,
            'cname':cnames.get(s.OTT_ID),
            'img_src': str(s.user_preferred_image_src),
            'img_src_id': str(s.user_preferred_image_src_id),
            'mesg': s.user_message_OZ})
        try:
            email_list[details['type']].append(details)
        except:
            email_list[details['type']]=[details]
        images.append([s.user_preferred_image_src, s.user_preferred_image_src_id])

    #now go through each verified_time, by day
    sponsors = db(
        db.reservations.verified_time != None
    ).select(
        db.reservations.e_mail, 
        db.reservations.PP_e_mail,
        db.reservations.verified_time,
        db.reservations.verified_preferred_image_src,
        db.reservations.verified_preferred_image_src_id,
        db.reservations.verified_name,
        db.reservations.verified_kind,
        db.reservations.name,
        db.reservations.verified_donor_title,
        db.reservations.verified_donor_name,
        db.reservations.PP_first_name,
        db.reservations.PP_second_name,
        db.reservations.OTT_ID,
        db.reservations.user_message_OZ,
                                                                orderby=~db.reservations.reserve_time)
    otts = [s.OTT_ID for s in sponsors]                                                         
    cnames = OZfunc.get_common_names(otts)
    for s in sponsors:
        details = emails(
            s.OTT_ID,
            s.name,
            cnames.get(s.OTT_ID),
            s.verified_name,
            s.e_mail or s.PP_e_mail,
            s.verified_donor_title,
            s.verified_donor_name,
            s.PP_first_name,
            s.PP_second_name,
            sponsor_for=s.verified_kind=='for',
            email_type='live',
        )
        if s.verified_preferred_image_src and s.verified_preferred_image_src_id and local_pic_path is not None:
            # do we have a local picture, or is it missing?
            details['local_pic'] = os.path.isfile(img.thumb_url(
                img.local_path, s.verified_preferred_image_src, s.verified_preferred_image_src_id))
        else:
            details['local_pic'] = None
        details.update({
            'type': 'live',
            'email': details['to'],
            'ott' : str(s.OTT_ID),
            'name': s.name,
            'cname': cnames.get(s.OTT_ID),
            'img_src': str(s.verified_preferred_image_src),
            'img_src_id': str(s.verified_preferred_image_src_id),
            'mesg': s.user_message_OZ})
        try:
            email_list[details['type'] + " " + s.verified_time.strftime("%A %e %b, %Y")].append(details)
        except:
            email_list[details['type'] + " " + s.verified_time.strftime("%A %e %b, %Y")]=[details]

        images.append([s.verified_preferred_image_src, s.verified_preferred_image_src_id])
    
    onezoom_via_eol_images= [str(i[1]) for i in images if i[0]==src_flags['onezoom_via_eol']]
    eol_images = [str(i[1]) for i in images if i[0]==src_flags['eol']]
    contactable_emails = db((db.reservations.allow_contact == True)       &
                            (db.reservations.PP_transaction_code != None) & #requires transaction gone through
                            (db.reservations.verified_time != None)       & #requires verified
                            ((db.reservations.e_mail != None) | (db.reservations.PP_e_mail != None)) #need an email
                           ).select(db.reservations.e_mail, db.reservations.PP_e_mail)
    return(dict(
        email_list = email_list, 
        onezoom_via_eol_images=onezoom_via_eol_images,
        eol_images=eol_images,
        contactable_emails=contactable_emails))

""" these are admin tools for database import """

@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def SET_PRICES():
    import string
    """This sets cutoff prices in the sql database
    
    a) specific exclusions (£ contact us) (Humans, dog, etc.
    b) some specifically high-ranked taxa (I suggest all the icons on the home page should be boosted to e.g. 75 pounds)
    
    """
    # Take the initial prices from the previous prices in the DB
    bands = {string.ascii_uppercase[i]: row for i, row in enumerate(db().select(db.prices.ALL))}
    n_leaves = db(db.ordered_leaves).count()

    bespoke_spp = [ #these are in order highest to lowest
      [], # top band (e.g. £150)
      ['Quercus_robur'], # next most expensive band (e.g. £75)
      ['Latimeria_chalumnae','Dionaea_muscipula', 'Sequoiadendron_giganteum', 'Architeuthis_dux', 'Micromys_minutus'], # next most expensive (e.g. £40)
      ['Coccinella_septempunctata', 'Macrocystis_pyrifera', 'Amanita_muscaria', 'Anas_platyrhynchos', 'Brassica_oleracea', 'Giardia_intestinalis', 'Plasmodium_falciparum_Santa_Lucia']    # next most expensive - e.g. £20
    ]
    
    # Make a form with all the rows in it
    other_fields = [f for f in db.prices if f.name not in ('id', 'quantile', 'n_leaves')]
    fields = []
    for i, (band, row) in enumerate(sorted(bands.items(), reverse=True)):
        if i > 0:
            field = db.prices.quantile
            # Don't have a max popularity cutoff for the highest price
            fields.append(Field("_".join([field.name, band]), type = field.type, default=row[field.name], requires=IS_NOT_EMPTY()))
        for field in other_fields:
            fields.append(Field("_".join([field.name, band]), type = field.type, default=row[field.name]))
    form = SQLFORM.factory(*fields)
    
    if form.process().accepted:
        #set the 'normal' prices first
        queries = {}
        cutoffs = {}
        other_vars = {}
        prev = None
        for band in sorted(bands.keys()):
            if prev is None:
                # Cheapest category
                quantile = float(form.vars["_".join(["quantile", band])])
                cutoffs[band] = (quantile, int((1.0 - quantile / 100.0) * n_leaves))
                queries[band] = db(
                    (db.ordered_leaves.popularity_rank == None) | 
                    (db.ordered_leaves.popularity_rank >  cutoffs[band][1]))
            elif form.vars["_".join(["quantile", band])] is not None:
                quantile = float(form.vars["_".join(["quantile", band])])
                cutoffs[band] = (quantile, int((1.0 - quantile / 100.0) * n_leaves))
                queries[band] = db(
                    (db.ordered_leaves.popularity_rank <= cutoffs[prev][1]) & 
                    (db.ordered_leaves.popularity_rank >  cutoffs[band][1]))
            else:
                #this is the last one, which does not have a defined top price
                queries[band] = db(
                    (db.ordered_leaves.popularity_rank <= cutoffs[prev][1]))
            other_vars[band] = {
                f.name: form.vars["_".join([f.name, band])]
                for f in other_fields
            }
            prev = band
        
        #save the results
        db.prices.truncate()
        for band in sorted(bands.keys()):
            num=queries[band].count()
            db.prices.insert(
                quantile=(float(cutoffs[band][0]) if band in cutoffs else None),
                n_leaves=num,
                **other_vars[band],
            )

        output = []
        revenue = 0
        #also None means 'call us'
        for band in sorted(bands):
            price = other_vars[band]['price']
            cnt=queries[band].update(price=price)
            num=queries[band].count()
            revenue += num*price/100
            output.append(f"£{price/100}: {num:>8} species ({100*num/n_leaves:.2f}%) - {cnt} changed")
            output.append(BR())

            
        response.flash = DIV(
            f"SET THE FOLLOWING DEFAULT PRICE STRUCTURE for {n_leaves} species:", BR(),PRE(*output), 
            f". Total revenue: {revenue}!\nNow overriding the following special exclusions (and setting banned):", BR(),
            f"{bespoke_spp}"
        )

        #override with the bespoke ones
        target_band = 0
        for band in sorted(bands, reverse=True):
            db(db.ordered_leaves.name.belongs(bespoke_spp[target_band])).update(price=other_vars[band]['price'])
            target_band+=1
            if target_band>=len(bespoke_spp):
                break

        #make sure the banned ones are NULLified
        rows = db().select(db.banned.ott)
        for ban in rows:
            db(db.ordered_leaves.ott == ban.ott).update(price=None)

    elif form.errors:
        response.flash = 'form has errors'


    #a few examples to help decide bands

    examples = {
        'Canis lupus':'Dog',
        'Orcinus orca':'Killer Whale',
        'Dendrobates tinctorius':'Poison Arrow Frog',
        'Giraffa camelopardalis':'Giraffe',
        'Coccinella septempunctata':'Ladybird',
        'Architeuthis dux':'Giant Squid',
        'Crotalus horridus':'Timber Rattlesnake',
        'Sturnus vulgaris':'Starling',
        'Ginkgo biloba':'Ginkgo',
        'Sequoiadendron giganteum':'Giant Sequioa',
        'Dionaea muscipula':'Venus Fly Trap',
        'Camellia sinensis':'Tea',
        'Coffea arabica':'Coffee',
        'Cephalotus follicularis':'Australian Pitcher Plant',
        'Macrocystis pyrifera':'Giant Kelp'
    }
    rows = db(db.ordered_leaves.name.belongs(list(examples.keys()), all=False)).select(
        db.ordered_leaves.name, db.ordered_leaves.popularity, db.ordered_leaves.popularity_rank)
    example_spp = [
        (examples[r['name']], r['popularity'], (1 - r['popularity_rank']/n_leaves) * 100) for r in rows]

    mn = db.ordered_leaves.popularity.min()
    mx = db.ordered_leaves.popularity.max()
    pop_min=db(db.ordered_leaves).select(mn)
    pop_max=db(db.ordered_leaves).select(mx)
    return dict(
        form=form,
        bands={b: bands[b].price for b in sorted(bands.keys())},
        other_fields=other_fields,
        max_band=max(bands.keys()) if len(bands) else None,
        pop_min=pop_min[0][mn],
        pop_max=pop_max[0][mx],
        example_spp=sorted(example_spp, key=lambda tup: tup[1]),
        previous_prices = db().select(db.prices.ALL),
    )


@OZfunc.require_https_if_nonlocal()
@auth.requires_membership(role='manager')
def REIMPORT_TREE_TABLES():
    """
    !!!!currently this doesn't work
    """
    raise
    
    import os
    from shutil import copyfile
    # this function will read in the csv files to update the leaf and node tables in the database (large tables)
    response.flash = "Loading in huge datasets"
    status='OK'
    # drop existing database tables ready to read in new
    db.ordered_nodes.truncate()
    db.ordered_leaves.truncate()
    db.leaves_in_unsponsored_tree.truncate()
    
    # read in csv files
    nodefile = os.path.join(request.folder, 'OZprivate','data', 'output_files', 'ordered_nodes.csv')
    leaffile = os.path.join(request.folder, 'OZprivate','data', 'output_files', 'ordered_leaves.csv')
    unsponsoredleaffile = os.path.join(request.folder, 'OZprivate','data', 'output_files', 'leaves_in_unsponsored_tree.csv')
    sql_cmd1 = sql_cmd2 = sql_cmd3 = ''
    
    if db._uri.startswith("mysql://"):
        # For speed this uses "LOAD DATA LOCAL INFILE" (http://dev.mysql.com/doc/refman/5.7/en/load-data.html)
        # useless mySQL requires NULL values in files to be written as \N, so we do this with a quick perl hack first
        ret_text=[]
        with open(leaffile) as lf, open(nodefile) as nf:

            sql_cmd1 = "LOAD DATA LOCAL INFILE '{}' REPLACE INTO TABLE `leaves_in_unsponsored_tree` IGNORE 1 LINES (`ott`);".format(unsponsoredleaffile)
            
            
            sqlfile = nodefile+'.mySQL'
            copyfile(nodefile, sqlfile)
            ret_text.append(subprocess.check_output(
                ['perl', '-pi', '-e', r's/,(?=(,|\n))/,\\N/g', sqlfile], stderr=subprocess.STDOUT))
            sql_cmd2 = "LOAD DATA LOCAL INFILE '{}' REPLACE INTO TABLE `ordered_nodes` FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' IGNORE 1 LINES ({});".format(sqlfile, nf.readline.rstrip())
    
            sqlfile = leaffile+'.mySQL'
            copyfile(leaffile, sqlfile)
            ret_text.append(subprocess.check_output(
                ['perl', '-pi', '-e', r's/,(?=(,|\n))/,\\N/g', sqlfile], stderr=subprocess.STDOUT))
            sql_cmd3 = "LOAD DATA LOCAL INFILE '{}' REPLACE INTO TABLE `ordered_leaves` FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' IGNORE 1 LINES ({});".format(sqlfile, lf.readline.rstrip())


        try:
            db.executesql(sql_cmd1)
            db.executesql(sql_cmd2)
            db.executesql(sql_cmd3)
        except:
            status='Could not update database ... but tables have been wiped :('
            
    else:
        #use the (slow) built-in csv reader
        db.ordered_nodes.import_from_csv_file(open(nodefile,'r'))
        db.ordered_leaves.import_from_csv_file(open(leaffile,'r'))
        db.leaves_in_unsponsored_tree.import_from_csv_file(open(unsponsoredleaffile,'r'))
    
    return dict(leaffile = leaffile, nodefile = nodefile, unsponsoredleaffile=unsponsoredleaffile, status=status, sql_cmds=[sql_cmd1, sql_cmd2, sql_cmd3], ret_text=ret_text)

@OZfunc.require_https_if_nonlocal()
def emails(
    username,
    ott,
    species_name,
    common_name,
    sponsor_name,
    email,
    donor_title,
    donor_name,
    PP_first_name=None,
    PP_second_name=None,
    sponsor_for=False,
    email_type='live',
):
    """
    The email texts that we might want to send out
    email_type can be 'no_payment', 'to_verify', or e.g. 'live'
    """
    for_name = ""
    full_name = "sponsor"
    if donor_name:
        full_name = donor_name
        if donor_title:
            full_name = donor_title + ". " + full_name
    if sponsor_for:
        for_name = " for " + sponsor_name
        if full_name == "sponsor" and (PP_first_name or PP_second_name):
            full_name = " ".join([PP_first_name or "", PP_second_name or ""]).strip()
    else:
        if full_name == "sponsor":
            full_name = sponsor_name

    return ozmail.template_mail(email_type, dict(
        username=username,
        full_name=full_name,
        ott=ott,
        species_name=species_name,
        nice_name=OZfunc.nice_name(species_name, common_name),
        the_nice_name=OZfunc.nice_name(species_name, common_name, the=True),
        for_name=for_name,
    ), to=email)
