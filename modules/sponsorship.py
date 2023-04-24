import datetime
import hashlib
import re
from gluon import current
from gluon.utils import web2py_uuid

import ozmail
import usernames
from OZfunc import (
    child_leaf_query, nice_name_from_otts
)

from .partners import partner_definitions, partner_identifiers_for_reservation_name

"""HMAC expiry in seconds, NB: This is when they're rotated, so an HMAC will be valid for 2xHMAC_EXPIRY"""
SPONSOR_RENEW_HMAC_EXPIRY = 60 * 60 * 24 * 7


def sponsorship_config():
    """
    Return dict of sponsorship config options, returning defaults if not available
    """
    myconf = current.globalenv['myconf']
    out = dict()
    try:
        out['duration_days'] = int(myconf.take('sponsorship.sponsorship_duration_days'))
    except:
        out['duration_days'] = 365*4+1  ## 4 years
    try:
        out['reservation_time_limit'] = float(myconf.take('sponsorship.reservation_time_limit_mins')) * 60.0
    except:
        out['reservation_time_limit'] = 360.0 #seconds
    try:
        out['unpaid_time_limit'] = float(myconf.take('sponsorship.unpaid_time_limit_mins')) * 60.0
    except:
        out['unpaid_time_limit'] = 2.0*24.0*60.0*60.0 #seconds
    try:
        out['slow_payment_time_limit'] = float(myconf.take('sponsorship.slow_payment_limit_mins')) * 60.0
    except:
        out['slow_payment_time_limit'] = 1 * 60.0 #seconds
    try:
        out['renew_discount'] = float(myconf.take('sponsorship.renew_discount'))
    except:
        out['renew_discount'] = 0.2
    try:
        out['maintenance_mins'] = myconf.take('sponsorship.maintenance_mins')
        out['maintenance_mins'] = int(out['maintenance_mins'])
    except:
        out['maintenance_mins'] = 0
    try:
        # Number of days left by which point we consider expiry to be soon
        out['expiry_soon_days'] = int(myconf.take('sponsorship.expiry_soon_days'))
    except:
        out['expiry_soon_days'] = 30
    try:
        # Number of days left by which point we consider expiry to be critical
        out['expiry_critical_days'] = int(myconf.take('sponsorship.expiry_critical_days'))
    except:
        out['expiry_critical_days'] = 15
    try:
        # Number of days after expiry_(x)_days after which we send e-mails
        out['expiry_hysteresis'] = int(myconf.take('sponsorship.expiry_hysteresis'))
    except:
        out['expiry_hysteresis'] = 5
    return out


def sponsorship_expiry_soon_date(exp_type = 'soon'):
    """Return datetime before which expiry is considered soon/critical"""
    request = current.request

    return request.now + datetime.timedelta(days=sponsorship_config()['expiry_%s_days' % exp_type])


def sponsorship_enabled():
    """
    Return whether sponsorship should be allowed on this instance, deriving from:

    * URL "no_sponsoring" parameter
    * sponsorship.allow_sponsorship config option
    * Role of current user (if config is not 1/0/all/none)

    Default to not allowing sponsorships, unless actively turned on
    """
    myconf = current.globalenv['myconf']
    request = current.request
    auth = current.globalenv['auth']

    if request.vars.no_sponsoring:
        # Shut off sponsoring via. URL param (e.g. museum display on main OZ site)
        return False

    # Read sponsorship setting from config
    try:
        spons = myconf.take('sponsorship.allow_sponsorship')
    except:
        spons = '0'
    if spons.lower() in ['1', 'all']:
        return True
    if spons.lower() in ['0', 'none']:
        return False

    # If anything other than '1' or 'all', treat this as a role, e.g. "manager"
    return auth.has_membership(role=spons)


def reservation_total_counts(count_type):
    """
    Total numbers of (count_type), including expired reservations

    count_type: One of 'donors', 'otts'
    """
    db = current.db

    if count_type == 'donors':
        return db.executesql('''
            SELECT COUNT(*) FROM (
                    SELECT DISTINCT username FROM reservations
                     WHERE verified_time IS NOT NULL
                       AND (deactivated IS NULL OR deactivated = '')
                UNION DISTINCT
                    SELECT DISTINCT username FROM expired_reservations
            ) x
        ''')[0][0]
    if count_type == 'otts':
        return db.executesql('''
            SELECT COUNT(*) FROM (
                    SELECT DISTINCT OTT_ID FROM reservations
                     WHERE verified_time IS NOT NULL
                       AND (deactivated IS NULL OR deactivated = '')
                UNION DISTINCT
                    SELECT DISTINCT OTT_ID FROM expired_reservations
            ) x
        ''')[0][0]
    raise ValueError("Unknown count_type: %s" % count_type)


def clear_reservation(reservations_table_id):
    db = current.db
    keep_fields = ('id', 'OTT_ID', 'num_views', 'last_view')
    del_fields = {f: None for f in db.reservations.fields if f not in keep_fields}
    assert len(keep_fields) + len(del_fields) == len(db.reservations.fields)
    assert reservations_table_id is not None
    db(db.reservations.OTT_ID == reservations_table_id).update(**del_fields)


def reservation_get_all_expired():
    """
    Get all reservation rows that should be expired
    """
    db = current.db
    request = current.request

    return db(
        (db.reservations.verified_time != None) &
        (db.reservations.sponsorship_ends < request.now)
    ).select(db.reservations.ALL)

def reservation_expire(r):
    """
    Move reservations row (r) into expired_reservations,
    return expired_reservations.id

    NB: Does not check if the row should be expired (i.e. sponsorship_ends > now)
    """
    db = current.db
    expired_r = r.as_dict()
    del expired_r['id']
    expired_r['was_renewed'] = True
    expired_id = db.expired_reservations.insert(**expired_r)
    r.delete_record()
    return expired_id


def reservation_validate_basket_fields(basket_fields):
    """
    Validate any user input in (basket_fields), return a dict of errors if any.

    The contents of basket_fields may be written to e.g. to validate postcodes.

    For mandatory fields, being None is an error, but outright missing means we
    expected this (e.g. it's a value we're not changing for a renewal)
    """
    T = current.globalenv['T']

    def normalise_postcode(input_s):
        s = input_s.strip().upper()
        # From https://stackoverflow.com/questions/164979/regex-for-matching-uk-postcodes/51885364#51885364
        if not re.match(r'^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})$', s):
            raise ValueError(input_s)
        return s

    errors = {}
    max_chars = 30

    if 'user_sponsor_name' in basket_fields:
        if not (basket_fields['user_sponsor_name'] or ''):
            errors['user_sponsor_name'] = T("You must enter some sponsor text")
        elif len(basket_fields['user_sponsor_name']) > max_chars:
            errors['user_sponsor_name'] = T("Text too long: max %s characters") % (max_chars, )

        if 'user_donor_name' in basket_fields and \
                basket_fields.get('user_sponsor_kind') == "by" and \
                not basket_fields.get('user_donor_name'):
            basket_fields['user_donor_name'] = basket_fields['user_sponsor_name']

    if 'user_more_info' in basket_fields and len(basket_fields['user_more_info'] or '') > max_chars:
        errors['user_more_info'] = T("Text too long: max %s characters") % (max_chars, )

    if 'user_sponsor_kind' in basket_fields and basket_fields['user_sponsor_kind'] not in ('by', 'for'):
        errors['user_sponsor_kind'] = T("Sponsorship can only be 'by' or 'for'")

    if basket_fields.get('user_giftaid'):
        missing_title = not (basket_fields.get('user_donor_title') or "").strip()
        if missing_title:
            errors['user_donor_title_name'] = T("We need your title to be able to claim gift aid")
        if not (basket_fields.get('user_donor_name') or "").strip():
            if missing_title:
                errors['user_donor_title_name'] = T("We need your name and title to be able to claim gift aid")
            else:
                errors['user_donor_title_name'] = T("We need your name to be able to claim gift aid")
        if basket_fields.get('user_addr_nonuk'):
            # International resident
            if not (basket_fields.get('user_addr_internationaladdr') or "").strip():
                errors['user_addr_internationaladdr'] = T("We need your address to be able to claim gift aid")
            # NB: We store the international addr in the house DB field
            basket_fields['user_addr_house'] = basket_fields.get('user_addr_internationaladdr')
            basket_fields['user_addr_postcode'] = None
        else:
            # UK resident
            if not (basket_fields.get('user_addr_house') or "").strip():
                errors['user_addr_house'] = T("We need your house number to be able to claim gift aid")
            if not (basket_fields.get('user_addr_postcode') or "").strip():
                errors['user_addr_postcode'] = T("We need your post code to be able to claim gift aid")
            else:
                try:
                    basket_fields['user_addr_postcode'] = normalise_postcode(basket_fields['user_addr_postcode'])
                except ValueError:
                    errors['user_addr_postcode'] = T("Your postcode is not in a recognised format")
    return errors


def reservation_add_to_basket(basket_code, reservation_row, basket_fields):
    """Add (reservation_row) to a basket identified with (basket_code), update (basket_fields) dict of fields"""
    db = current.db
    if not reservation_row.user_sponsor_name and 'user_sponsor_name' not in basket_fields:
        if basket_fields.get('prev_reservation_id', False):
            # Try digging it out of the previous entry
            prev_row = db(db.expired_reservations.id == basket_fields['prev_reservation_id']).select().first()
            if prev_row is None:
                raise ValueError("Cannot find prev_reservation_id %d" % basket_fields['prev_reservation_id'])
            basket_fields['user_sponsor_name'] = prev_row.user_sponsor_name
        else:
            # This is what defines this row as potentially-bought, so has to be defined.
            raise ValueError("Missing user_sponsor_name")
    reservation_row.update_record(
        basket_code=basket_code,
        **basket_fields)
    return reservation_row


def reservation_confirm_payment(basket_code, total_paid_pence, basket_fields):
    """
    Update all reservations with (basket_code) as paid, spreading (total_paid_pence)
    across all reservations. Fill in (basket_fields) (i.e. Paypal info) for all rows.
    """
    db = current.db
    request = current.request
    sponsorship_renew_discount = sponsorship_config()['renew_discount']

    if 'PP_transaction_code' not in basket_fields:
        raise ValueError("basket_fields should at least have PP_transaction_code")
    if 'sale_time' not in basket_fields:
        raise ValueError("basket_fields should at least have sale_time")

    basket_rows = db(db.reservations.basket_code == basket_code).select()
    if len(basket_rows) == 0:
        raise ValueError("Unknown basket_code %s" % basket_code)

    for r in basket_rows:
        if basket_fields['PP_transaction_code'] == r.PP_transaction_code:
            # PP_transaction_code matches, so is a replay of a previous transaction, exit.
            # NB: It's possible for some of the basket to not have PP_t_c set, if they run out of funds.
            return
    if db(db.uncategorised_donation.PP_transaction_code == basket_fields['PP_transaction_code']).count() > 0:
        # Already an uncategorized donation, so this is a replay of a previous transaction
        # NB: We need to check here too in case all of the OTTs in this basket were unpaid.
        return

    all_partners = None

    remaining_paid_pence = total_paid_pence
    for r in basket_rows:
        fields_to_update = basket_fields.copy()
        if not r.user_giftaid:
            # Without giftaid, we shouldn't store a users' location
            fields_to_update['PP_house_and_street'] = None
            fields_to_update['PP_postcode'] = None

        # Fetch latest asking price
        ott_price_pence = db(db.ordered_leaves.ott==r.OTT_ID).select(db.ordered_leaves.price).first().price
        if ott_price_pence is None:
            ott_price_pence = float('inf')

        # Fetch any previous row
        prev_row = db(db.expired_reservations.id == r.prev_reservation_id).select().first() if r.prev_reservation_id else None

        if r.verified_time is not None:  # i.e. is this an already paid for node?
            # Apply renewal discount for extension
            ott_price_pence = int(ott_price_pence * (1 - sponsorship_renew_discount))

            if remaining_paid_pence < ott_price_pence:
                # Not enough funds to extend sponsorship. Make a note and move on
                # NB: This isn't genuinely likely, but a potential attack if we don't preserve the old reservation
                #     (1) Get at their renewals page
                #     (2) Pay 0.01 for them, they all end up unpaid
                #     (3) Wait for them to timeout, claim for yourself
                r.update_record(admin_comment=("reservation_confirm_payment: Transaction %s insufficient for extension. Paid %d\n%s" % (
                    basket_fields['PP_transaction_code'],
                    total_paid_pence,
                    r.admin_comment or "",
                )).strip())
                continue

            # Renewal: Remove old reservation and make a new one.
            prev_row = db(db.expired_reservations.id == reservation_expire(r)).select().first()
            status, _, r, _ = get_reservation(prev_row.OTT_ID, basket_code)
            assert status == 'available'  # We just expired the old one, this should work
            reservation_add_to_basket(basket_code, r, dict(
                partner_name=prev_row.partner_name,
                prev_reservation_id=prev_row.id,
            ))

            # Bump time to include renewal
            fields_to_update['sponsorship_duration_days'] = sponsorship_config()['duration_days']
            fields_to_update['sponsorship_ends'] = prev_row.sponsorship_ends + datetime.timedelta(days=sponsorship_config()['duration_days'])

            # Text was verified previously, so we can automatically verify this entry
            fields_to_update['verified_time'] = request.now
            fields_to_update['reserve_time'] = prev_row.reserve_time  # Keep original reserve_time
            # Verification normally involves allocating a username, so we must set this too
            fields_to_update['username'] = prev_row.username
        else:
            # NB: This is different to existing paths, but feels a more correct place to set sponsorship_ends
            fields_to_update['sponsorship_duration_days'] = sponsorship_config()['duration_days']
            fields_to_update['sponsorship_ends'] = request.now + datetime.timedelta(days=sponsorship_config()['duration_days'])
            if prev_row and prev_row.verified_time:
                # Renewal of expired entry, bump verified_time, keep old reserve time
                fields_to_update['verified_time'] = request.now
                fields_to_update['reserve_time'] = prev_row.reserve_time
                if prev_row.partner_name:
                    fields_to_update['partner_name'] = prev_row.partner_name

        # If there's a previous row, fill in any missing values using the old entry.
        # Set either as part of an extension above, or as part of a renewal (on paypal-start)
        if prev_row:
            for k in db.expired_reservations.fields:
                if (db.expired_reservations[k].writable and
                        k in db.reservations.fields and
                        r[k] is None and
                        k not in fields_to_update):
                    fields_to_update[k] = prev_row[k]

        # Fetch percentages of any partners
        partner_identifiers = partner_identifiers_for_reservation_name(fields_to_update.get('partner_name', r.partner_name))
        if len(partner_identifiers) > 0:
            if all_partners is None:
                # We need the partner definitions, so fetch
                all_partners = partner_definitions()
            # NB: Will fall over if there's an undefined partner in the table
            partner_percentages = [all_partners[p].percentage for p in partner_identifiers]
        else:
            partner_percentages = []

        # If this sponsorship has partner(s), include the latest percentage
        if len(partner_percentages) == 0:
            # No partners to assign to
            fields_to_update['partner_percentage'] = None
        elif len(partner_percentages) == 1:
            fields_to_update['partner_percentage'] = partner_percentages[0]
        else:
            # Multiple partners, we can't represent that, so flag with NaN
            fields_to_update['partner_percentage'] = float('nan')

        price_float = None if ott_price_pence == float('inf') else (ott_price_pence / 100)
        # Update DB entry with recalculated asking price
        fields_to_update['asking_price'] = price_float

        if remaining_paid_pence >= ott_price_pence:
            # Can pay for this node, so do so.
            remaining_paid_pence -= ott_price_pence
            # NB: Strictly speaking user_paid is "What they promised to pay", and should
            # have been set before the paypal trip. But with a basket of items we don't divvy up
            # their donation until now.
            fields_to_update['user_paid'] = price_float
            fields_to_update['verified_paid'] = None if price_float is None else '{:.2f}'.format(price_float) 
        else:
            # Can't pay for this node, but make all other changes
            fields_to_update['user_paid'] = None
            fields_to_update['verified_paid'] = None
            fields_to_update['sale_time'] = None
            # NB: Both need to be NULL to be unpaid according to add_transaction()
            fields_to_update['verified_time'] = None
            fields_to_update['PP_transaction_code'] = None
            fields_to_update['admin_comment'] = ("reservation_confirm_payment: Transaction %s insufficient for purchase. Paid %d\n%s" % (
                basket_fields['PP_transaction_code'],
                total_paid_pence,
                r.admin_comment or "",
            )).strip()

        # Send all updates for this row
        r.update_record(**fields_to_update)
    if remaining_paid_pence > 0:
        # Money left over after this transaction, make an uncategorised donation as well
        fields_to_update = {
            k:basket_rows[0][k]  # NB: Pull from first row to fill in any details previously set
            for k in db.reservations.fields
            if k in db.uncategorised_donation.fields and k not in set(('id',))
        }
        # Make sure payment fields are set properly
        fields_to_update['user_paid'] = remaining_paid_pence / 100
        fields_to_update['verified_paid'] = '{:.2f}'.format(remaining_paid_pence / 100)
        fields_to_update['PP_transaction_code'] = basket_fields['PP_transaction_code']
        fields_to_update['sale_time'] = basket_fields['sale_time']
        db.uncategorised_donation.insert(**fields_to_update)


def sponsorship_get_leaf_status(OTT_ID_Varin):
    """
    Get sponsorship status of a leaf, without trying to reserve or checking that it's reserved
    Returns
    - status: String describing reservation status, One of
    -         maintenance / invalid / banned / "" (i.e. sponsorable)
    - status_param: A parameter associated with the status, e.g. number of mins of maintenance, time until allowed to sponsor
    - leaf_entry: row from ordered_leaves table
    """
    db = current.db
    request = current.request
    sp_conf = sponsorship_config()
    maintenance_mins = sp_conf['maintenance_mins']
    maintenance_mode = bool(maintenance_mins)

    status, status_param = "", None
    if maintenance_mode:
        status, status_param = "maintenance", maintenance_mins

    # initialise status flag (it will get updated if all is OK)
    # now search for OTTID in the leaf table
    try:
        leaf_entry = db(db.ordered_leaves.ott == OTT_ID_Varin).select().first()
    except:
        leaf_entry = None

    if ((not leaf_entry) or             # invalid if not in ordered_leaves
        (leaf_entry.ott is None) or     # invalid if no OTT ID
        (' ' not in leaf_entry.name)):  # invalid if not a sp. name (no space/underscore)
            status, status_param = "invalid", None # will override maintenance
    else:
        # find out if the leaf is banned
        if db(db.banned.ott == OTT_ID_Varin).count() >= 1:
            status, status_param = "banned", None  # will override maintenance

    return status, status_param, leaf_entry


def get_reservation(OTT_ID_Varin, form_reservation_code, update_view_count=False):
    """
    Try and add a reservation for OTT_ID_Varin
    - form_reservation_code: Temporary identifier for current user
    - update_view_count: Should the view count for the OTT be incremented?

    Returns
    - status: String describing reservation status, One of
              banned / available / available only to user / reserved / sponsored /
              unverified / unverified waiting for payment / unverified waiting for slow payment
    - status_param: A parameter associated with the status, e.g. number of mins of maintenance, time until allowed to sponsor
    - reservation_row: row from reservations table
    - leaf_entry: row from ordered_leaves table
    """
    db = current.db
    request = current.request
    sp_conf = sponsorship_config()
    reservation_time_limit = sp_conf['reservation_time_limit']
    unpaid_time_limit = sp_conf['unpaid_time_limit']
    maintenance_mins = sp_conf['maintenance_mins']
    maintenance_mode = bool(maintenance_mins)

    reservation_row = None
    allow_sponsorship = sponsorship_enabled()

    # Get overall leaf status
    status, status_param, leaf_entry = sponsorship_get_leaf_status(OTT_ID_Varin)

    if leaf_entry: # should be able to get data
        # we might come into this with a partner set in request.vars (e.g. LinnSoc)
        """
        TO DO & CHECK - Allows specific parts of the tree to be associated with a partner
        if partner is None:
            #check through partner_taxa for leaves that might match this one
            partner = db((~db.partner_taxa.deactived) & 
                         (db.partner_taxa.is_leaf == True) &
                         (db.partner_taxa.ott == OTT_ID_Varin)
                        ).select(db.partner_taxa.partner_identifier).first()
        if partner is None:
            #pull out potential partner *nodes* that we might need to check
            #also check if this leaf lies within any of the node ranges
            #this should include a join with ordered_nodes to get the ranges, & a select
            partner = db((~db.partner_taxa.deactived) & 
                         (db.partner_taxa.is_leaf == False) &
                         (OTT_ID_Varin >= db.ordered_nodes.leaf_lft) &
                         (OTT_ID_Varin <= db.ordered_nodes.leaf_rgt) &
                         (db.ordered_nodes.ott == db.partner.ott).first()
                        ).select(db.partner_taxa.partner_identifier) 
        """
        # we need to update the reservations table regardless of banned status)
        reservation_query = db(db.reservations.OTT_ID == OTT_ID_Varin)
        reservation_row = reservation_query.select().first()
        if reservation_row is None:
            if not maintenance_mode:
                # there is no row in the database for this case so add one
                if (status == ""):
                    status = "available"
                if status == "available" and allow_sponsorship:
                    db.reservations.insert(
                        OTT_ID = OTT_ID_Varin,
                        name=leaf_entry.name,
                        last_view=request.now,
                        num_views=1,
                        reserve_time=request.now,
                        user_registration_id=form_reservation_code)
                else:
                    # update with full viewing data but no reservation, even if e.g. banned
                    db.reservations.insert(
                        OTT_ID = OTT_ID_Varin,
                        name=leaf_entry.name,
                        last_view=request.now,
                        num_views=1)
        else:
            # there is already a row in the database so update if this is the main visit
            if update_view_count and not maintenance_mode:
                reservation_query.update(
                    last_view=request.now,
                    num_views=(reservation_row.num_views or 0)+1,
                    name=leaf_entry.name)

            # this may be available (because valid) but could be
            #  sponsored, unverified, reserved or still available  
            # easiest cases to rule out are relating sponsored and unverified cases.
            # In either case they would appear in the leger
            ledger_user_name = reservation_row.user_sponsor_name
            ledger_PP_transaction_code = reservation_row.PP_transaction_code
            ledger_verified_time = reservation_row.verified_time
            # We know something is fully sponsored if PP_transaction_code is filled out  
            # NB: this could be with us typing "yet to be paid" in which case
            #  verified_paid can be NULL, so "verified paid " should not be used as a
            #  test of whether something is available or not
            # For forked sites, we do not pass PP_transaction_code (confidential), so we
            #   have to check first if verified.
            # Need to have another option here if verified_time is too long ago - we
            #  should move this to the expired_reservations table and clear it.
            if (ledger_verified_time):
                status = "sponsored"  # will override maintenance
            elif status != "banned":
                if (ledger_user_name):
                # something has been filled in
                    if (ledger_PP_transaction_code):
                        #we have a code (or have reserved this taxon)
                        status = "unverified"
                    else:
                        # unverified and unpaid - test time
                        startTime = reservation_row.reserve_time
                        endTime = request.now
                        timesince = ((endTime-startTime).total_seconds())
                        # now we check if the time is too great
                        if (timesince < (sp_conf['slow_payment_time_limit'])):
                            status = "unverified waiting for payment"
                        elif (timesince < (unpaid_time_limit)):
                            status = "unverified waiting for slow payment"
                        elif not maintenance_mode:
                            # We've waited too long and can zap the personal data
                            # previously in the table then set available
                            clear_reservation(OTT_ID_Varin)
                            # Note that this e.g. clears deactivated taxa, etc etc. Even 
                            # if status == available, allow_sponsorship can be False
                            # status is then used to decide the text to show the user
                            status = "available"
                else:
                    # The page has no user name entered & is also valid (not banned etc)
                    # it could only be reserved or available
                    # First thing is to determine time difference since reserved
                    startTime = reservation_row.reserve_time   
                    endTime = request.now
                    if (startTime == None):
                        if not maintenance_mode:
                            status = "available"
                            # reserve the leaf because there is no reservetime on record
                            if allow_sponsorship:
                                reservation_query.update(
                                    name=leaf_entry.name,
                                    reserve_time=request.now,
                                    user_registration_id=form_reservation_code)
                    else:
                        # compare times to figure out if there is a time difference
                        timesince = ((endTime-startTime).total_seconds())
                        if (timesince < (reservation_time_limit)):
                            release_time = reservation_time_limit - timesince
                            # we may be reserved if it wasn't us
                            if(form_reservation_code == reservation_row.user_registration_id):
                                # it was the same user anyway so reset timer
                                if not maintenance_mode:
                                    status = "available only to user"
                                    if allow_sponsorship:
                                        reservation_query.update(
                                            name=leaf_entry.name,
                                            reserve_time=request.now)
                            else:
                                status, status_param = "reserved", release_time
                        elif not maintenance_mode:
                            # it's available still
                            status = "available"
                            # reserve the leaf because there is no reservetime on record
                            if allow_sponsorship:
                                reservation_query.update(
                                    name=leaf_entry.name,
                                    reserve_time = request.now,
                                    user_registration_id = form_reservation_code)
        #re-do the query since we might have added the row ID now
        reservation_row = reservation_query.select().first()
    return status, status_param, reservation_row, leaf_entry


def sponsorable_children_query(target_id, qtype="ott", check_reservations_table=True):
    """
    A function that returns a web2py query selecting the sponsorable children of a specific
    node (given by OTT if qtype="ott" or ID if qtype="id".
    
    Note a slight bug: this includes ones that have been reserved or sponsored but not paid for yet
    TO DO: change javascript so that nodes without an OTT use qtype='id'
    """
    db = current.db
    query = child_leaf_query(qtype, target_id)

    #nodes without an OTT are unsponsorable
    query = query & (db.ordered_leaves.ott != None) 

    #nodes without a space in the name are unsponsorable
    query = query & (db.ordered_leaves.name.contains(' ')) 

    if check_reservations_table:
        #check which have OTTs in the reservations table
        unavailable = db((db.reservations.verified_time != None))._select(db.reservations.OTT_ID)
        #the query above ony finds those with a name. We might prefer something like the below, but I can't get it to work
            #unavailable = db((db.reservations.user_sponsor_name != None) | ((db.reservations.reserve_time != None) & ((request.now - db.reservations.reserve_time).total_seconds() < reservation_time_limit)))._select(db.reservations.OTT_ID)
        query = query & (~db.ordered_leaves.ott.belongs(unavailable))

    return query

def sponsorable_children(target_id, qtype="ott", limit=None, in_reservations=None):
    """
    Return the result of a query to get the sponsorable children (otts) of an internal
    node.
    
    The in_reservations parameter specifies what to do with sponsorable OTTs that are in
    the reservations table (i.e. not actually sponsored, but with a row in reservations,
    which can occur if people lick to sponsor but don;t go through with it.
    If in_reservations is None, return OTTs including those in the reservations table 
    If in_reservations is True, return OTTs which must be in the reservations table 
    If in_reservations is False, return OTTs which are not in the reservations table 
    """
    db = current.db
    limitby = None if limit is None else (0, limit)
    
    if in_reservations is None:
        query = sponsorable_children_query(target_id, qtype)
        return db(query).select(db.ordered_leaves.ott, limitby=limitby)
    elif not in_reservations:
        # The reservations table could have a lot of OTT IDs, in which case the default
        # query, which uses .belongs() will be very slow, so we use a left join instead
        query = sponsorable_children_query(target_id, qtype, check_reservations_table=False)
        query = query & (db.reservations.OTT_ID == None)
        return db(query).select(
            db.ordered_leaves.ott,
            left=db.reservations.on(db.ordered_leaves.ott == db.reservations.OTT_ID),
            limitby=limitby,
            orderby="NULL",  # Suppress ordering, as otherwise we try to order on a joined index
        )
    else:
        # The reservations table could have a lot of OTT IDs, in which case the default
        # query, which uses .belongs() will be very slow, so we use a left join instead
        query = sponsorable_children_query(target_id, qtype, check_reservations_table=False)
        query = query & (db.reservations.OTT_ID != None)
        return db(query).select(
            db.ordered_leaves.ott,
            left=db.reservations.on(db.ordered_leaves.ott == db.reservations.OTT_ID),
            limitby=limitby,
            orderby="NULL",  # Suppress ordering, as otherwise we try to order on a joined index
        )
    

def sponsor_hmac_key():
    """Get hmac_key, or error informatively"""
    myconf = current.globalenv['myconf']

    try:
        out = myconf.take("sponsorship.hmac_key")
    except:
        raise ValueError("sponsorship.hmac_key not set in appconfig.ini, we need this to generate renewal URLs")
    if len(out) < 10:
        raise ValueError("sponsorship.hmac_key is too short, or still set to the example value")
    return out


def sponsor_signed_url(page, username, controller='default'):
    URL = current.globalenv['URL']

    return URL(
        controller,
        page,
        args=[username],
        scheme=True,
        host=True,
        hmac_key=sponsor_hmac_key()
        )


def sponsor_verify_url(request):
    """Verify current request has a valid signature"""
    URL = current.globalenv['URL']

    return URL.verify(request, hmac_key=sponsor_hmac_key())


def sponsorship_email_reminders(for_usernames=None):
    """
    Get all sponsorships that the donors should be alerted about

    - for_usernames: Get reminders for given usernames. Default all users that didn't say restrict_all_contact

    Yields (username, dict) for each username that needs reminding, with:
    - email_address: The e-mail address to contact them on
    - full_name: "{Donor title}. {Donor name}" or if not, look for a "sponsor by" name
    - pp_name: "{PP firstname} {PP lastname}"
    - inital_reminders: reservation OTT_IDs that need an initial reminder
    - final_reminders: reservation OTT_IDs that need an final reminder
    - not_yet_due: reservation OTT_IDs that are not due for renewal
    - unsponsorable: reservation OTT_IDs that need bespoke treatment for renewal
    - renew_url: Where to go to renew sponsorships
    - unsubscribe_url: Where to go to rid yourself of renewal messages
    """
    request = current.request
    db = current.db
    expiry_soon_date = sponsorship_expiry_soon_date()
    expiry_soon_trigger = expiry_soon_date - datetime.timedelta(days=sponsorship_config()['expiry_hysteresis'])
    expiry_critical_date = sponsorship_expiry_soon_date('critical')
    expiry_critical_trigger = expiry_critical_date - datetime.timedelta(days=sponsorship_config()['expiry_hysteresis'])

    def days_left(ends_dt, now_dt):
        out = (r.sponsorship_ends - request.now).days
        if out == 0 and ends_dt > now_dt:
            # "Not quite expired"
            out = 0.5
        return out

    query = (db.reservations.verified_time != None) & (db.reservations.PP_transaction_code != None)  # i.e. has been bought
    if for_usernames is not None:
        # Get sponsorships for given username
        if len(for_usernames) == 0:
            # Getting reminders for no usernames will return nothing
            return
        query &= (db.reservations.username.belongs(for_usernames))
    else:
        # Get sponsorships for all users we're allowed to contact
        query &= (db.reservations.restrict_all_contact == None)

    for_usernames = set(for_usernames or [])
    cur_username = None
    out = {}
    send_to = False
    for r in db(query).select(db.reservations.ALL, orderby=db.reservations.username|db.reservations.sponsorship_ends):
        if r.username != cur_username:
            if send_to:
                yield (cur_username, out)
            # Start new user entry
            cur_username = r.username
            out = dict(
                email_address = usernames.email_for_username(r.username),
                full_name=None,
                pp_name=None,
                username=r.username,
                user_sponsor_lang=r.user_sponsor_lang,
                initial_reminders=[],
                initial_triggers=[],
                final_reminders=[],
                final_triggers=[],
                days_left={},
                not_yet_due=[],
                unsponsorable=[],
                renew_url = sponsor_signed_url('sponsor_renew.html', r.username),
                unsubscribe_url = sponsor_signed_url('sponsor_unsubscribe.html', r.username),
            )
            send_to = r.username in for_usernames

        status, _, _ = sponsorship_get_leaf_status(r.OTT_ID)

        if (r.verified_donor_name):
            # replace with the most recent
            out["full_name"] = r.verified_donor_name.strip()
            if (r.verified_donor_title):
                out["full_name"] = r.verified_donor_title + ". " + out["full_name"]
        elif out["full_name"] is None and r.verified_kind == "by":
            # Only use sponsor by as a last resort
            out["full_name"] = r.verified_name

        if (r.PP_first_name or r.PP_second_name):
            # replace with the most recent
            out["pp_name"] = f"{r.PP_first_name} {r.PP_second_name}"

        if status != '':
            # This item now banned/invalid, shouldn't be sending reminders.
            out['unsponsorable'].append(r.OTT_ID)
        elif r.sponsorship_ends is None:
            # NULL sponsorship_ends ==> doesn't ever expire
            out['unsponsorable'].append(r.OTT_ID)
        elif r.sponsorship_ends <= expiry_critical_date:
            # Expiry critical
            out['final_reminders'].append(r.OTT_ID)
            out['days_left'][r.OTT_ID] = days_left(r.sponsorship_ends, request.now)
            if r.emailed_re_renewal_final is None and r.sponsorship_ends <= expiry_critical_trigger:
                # Below e-mail trigger date, send e-mail
                out['final_triggers'].append(r.OTT_ID)
                send_to = True
        elif r.sponsorship_ends <= expiry_soon_date:
            # Expiry soon
            out['initial_reminders'].append(r.OTT_ID)
            out['days_left'][r.OTT_ID] = days_left(r.sponsorship_ends, request.now)
            if r.emailed_re_renewal_initial is None and r.sponsorship_ends <= expiry_soon_trigger:
                # Below e-mail trigger date, send e-mail
                out['initial_triggers'].append(r.OTT_ID)
                send_to = True
        else:
            # sponsorship ends happens past the point we consider it soon
            out['not_yet_due'].append(r.OTT_ID)

    # Yield final entry
    if send_to:
        yield (cur_username, out)

def sponsor_renew_request_logic(user_identifier, mailer=None, reveal_private_data=False, automated=False):
    """
    Manage the logic of emailing a renewal request, returning a message to flash up. In some
    management pages, reveal_private_data can be set to True, in which case the info returned
    can contain private data such as email addresses from the DB or HMAC hashed keys.
    If mailer is not None then an email should be sent, if the email address is in the db,
    but should be sent to an admin address if the site is in testing mode.
    
    render_dict gives extra render variables to pass to the email template.
    """
    # Get all reminder blocks for usernames associated to this e-mail address
    unames = usernames.usernames_associated_to_email(user_identifier) if '@' in user_identifier else [user_identifier]
    try:
        user_reminders = {k:v for (k, v) in sponsorship_email_reminders(unames)}
    except ValueError:
        user_reminders = {}
    info = ''
    if not reveal_private_data:
        info = 'If the user %s exists in our database, we will send them an email' % user_identifier
    if len(user_reminders) == 0:
        if reveal_private_data:
            if not unames:
                info = 'Unknown email %s' % user_identifier
            else:
                info = 'Unknown user %s' % user_identifier
    elif len(user_reminders) > 1:
        if reveal_private_data:
            info = 'Many users associated with e-mail address %s' % user_identifier
    else:
        username, user_reminders = next(iter(user_reminders.items()))
        user_reminders['username'] = username
        user_reminders['nice_names'] = nice_name_from_otts(
            user_reminders['unsponsorable'] + user_reminders['not_yet_due'] +
            user_reminders['initial_reminders'] + user_reminders['final_reminders'],
            leaf_only=True, html=False, first_upper=True)
        user_reminders['automated'] = automated
        email = user_reminders['email_address']
        mailargs = ozmail.template_mail('sponsor_renew_reminder', user_reminders, to=email)
        if mailer is not None:
            mail, reason = mailer
            if mail is None:
                if info:
                    info += ' (NB: %s, so cannot send email)' % reason
                else:
                    info = '%s, so cannot send email' % reason
            else:
                # Should send to the admin address if is_testing == True
                mail.send(**mailargs)
        elif reveal_private_data:
            info = "The following mail should be sent to %s:\n%s" % (
                mailargs['to'] or "the email defined in appconfig.ini/smtp.sender",
                mailargs['message'],
            )
    return info

def sponsorship_email_reminders_post(reminder_row):
    """Log the fact that the e-mails sent so we don't do it again"""
    db = current.db
    request = current.request

    db(db.reservations.OTT_ID.belongs(reminder_row['initial_reminders'])).update(emailed_re_renewal_initial=request.now)
    db(db.reservations.OTT_ID.belongs(reminder_row['final_reminders'])).update(emailed_re_renewal_final=request.now)


def sponsorship_restrict_contact(user_name):
    """User doesn't want to be contacted any more"""
    db = current.db

    db(db.reservations.username==user_name).update(restrict_all_contact=True)
