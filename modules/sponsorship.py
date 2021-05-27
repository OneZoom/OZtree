import datetime
from gluon import current

from OZfunc import (
    child_leaf_query, get_common_name
)

def sponsorship_config():
    """
    Return dict of sponsorship config options, returning defaults if not available
    """
    myconf = current.globalenv['myconf']
    out = dict()
    try:
        out['reservation_time_limit'] = float(myconf.take('sponsorship.reservation_time_limit_mins')) * 60.0
    except:
        out['reservation_time_limit'] = 360.0 #seconds
    try:
        out['unpaid_time_limit'] = float(myconf.take('sponsorship.unpaid_time_limit_mins')) * 60.0
    except:
        out['unpaid_time_limit'] = 2.0*24.0*60.0*60.0 #seconds
    try:
        out['sponsorship_renew_discount'] = float(myconf.take('sponsorship.renew_discount'))
    except:
        out['sponsorship_renew_discount'] = 0.2
    return out


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
    auth = current.globalenv['Auth']

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


def clear_reservation(reservations_table_id):
    db = current.db
    keep_fields = ('id', 'OTT_ID', 'num_views', 'last_view')
    del_fields = {f: None for f in db.reservations.fields if f not in keep_fields}
    assert len(keep_fields) + len(del_fields) == len(db.reservations.fields)
    assert reservations_table_id is not None
    db(db.reservations.OTT_ID == reservations_table_id).update(**del_fields)


def reservation_add_to_basket(basket_code, reservation_row, basket_fields):
    """Add (reservation_row) to a basket identified with (basket_code), update (basket_fields) dict of fields"""
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
    sponsorship_renew_discount = sponsorship_config()['sponsorship_renew_discount']

    if 'PP_transaction_code' not in basket_fields:
        raise ValueError("basket_fields should at least have PP_transaction_code")

    basket_rows = db(db.reservations.basket_code == basket_code).select()
    if len(basket_rows) == 0:
        raise ValueError("Unknown basket_code %s" % basket_code)

    remaining_paid_pence = total_paid_pence
    for r in basket_rows:
        fields_to_update = basket_fields.copy()
        if not r.user_giftaid:
            # Without giftaid, we shouldn't store a users' location
            fields_to_update['PP_house_and_street'] = None
            fields_to_update['PP_postcode'] = None

        # Fetch latest asking price
        ott_price_pence = db(db.ordered_leaves.ott==r.OTT_ID).select(db.ordered_leaves.price).first().price

        if r.PP_transaction_code is not None:
            if r.PP_transaction_code == basket_fields['PP_transaction_code']:
                # PP_transaction_code matches, so is a replay of the same transaction, ignore.
                continue
            # Renewal of existing sponsorship. Backup old reservation
            expired_r = r.as_dict()
            del expired_r['id']
            expired_r['was_renewed'] = True
            db.expired_reservations.insert(**expired_r)

            # Bump time to include renewal
            fields_to_update['sponsorship_duration_days'] = 365*4+1
            fields_to_update['sponsorship_ends'] = r.sponsorship_ends + datetime.timedelta(days=365*4+1)  ## 4 Years

            # Apply renewal discount
            ott_price_pence = int(ott_price_pence * (1 - sponsorship_renew_discount))
        else:
            # NB: This is different to existing paths, but feels a more correct place to set sponsorship_ends
            fields_to_update['sponsorship_duration_days'] = 365*4+1
            fields_to_update['sponsorship_ends'] = datetime.datetime.now() + datetime.timedelta(days=365*4+1)  ## 4 Years

        # Update DB entry with recalculated asking price
        fields_to_update['asking_price'] = ott_price_pence / 100

        if r.OTT_ID == basket_rows[-1].OTT_ID:
            # Last item, throw all remaining funds onto it
            ott_price_pence = max(ott_price_pence, remaining_paid_pence)
        remaining_paid_pence -= ott_price_pence
        if remaining_paid_pence < 0:
            raise ValueError("Out of funds for basket %s: %d" % (
                basket_code,
                total_paid_pence,
            ))
        # NB: Strictly speaking user_paid is "What they promised to pay", and should
        # have been set before the paypal trip. But with a basket of items we don't divvy up
        # their donation until now.
        fields_to_update['user_paid'] = ott_price_pence / 100
        fields_to_update['verified_paid'] = '{:.2f}'.format(ott_price_pence / 100)

        # Send all updates for this row
        r.update_record(**fields_to_update)


def add_reservation(OTT_ID_Varin, form_reservation_code, prev_sponsorship=None, update_view_count=False):
    """
    Try and add a reservation for OTT_ID_Varin
    - form_reservation_code: Temporary identifier for current user
    - prev_sponsorship: A previous db.expired_reservations row, if supplied and able to sponsor again, details will be copied over.
    - update_view_count: Should the view count for the OTT be incremented?

    Returns
    - status: String describing reservation status.
    - reservation_row: row from reservations table
    """
    db = current.db
    request = current.request
    sp_conf = sponsorship_config()
    reservation_time_limit = sp_conf['reservation_time_limit']
    unpaid_time_limit = sp_conf['unpaid_time_limit']
    allow_sponsorship = sponsorship_enabled()
    # initialise status flag (it will get updated if all is OK)
    status = ""
    reservation_row = None
    # now search for OTTID in the leaf table
    try:
        leaf_entry = db(db.ordered_leaves.ott == OTT_ID_Varin).select().first()
        common_name = get_common_name(OTT_ID_Varin)
        sp_name = leaf_entry.name
    except:
        OTT_ID_Varin = None
        leaf_entry = {}
    if ((not leaf_entry) or             # invalid if not in ordered_leaves
        (leaf_entry.ott is None) or     # invalid if no OTT ID
        (' ' not in leaf_entry.name)):  # invalid if not a sp. name (no space/underscore)
            status = "invalid" # will override maintenance

    if status == "":  # still need to figure out status, but should be able to get data
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
        # find out if the leaf is banned
        if db(db.banned.ott == OTT_ID_Varin).count() >= 1:
            status = "banned"
        # we need to update the reservations table regardless of banned status)
        reservation_query = db(db.reservations.OTT_ID == OTT_ID_Varin)
        reservation_row = reservation_query.select().first()
        if reservation_row is None:
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
            if update_view_count:
                reservation_query.update(
                    last_view=request.now,
                    num_views=(reservation_row.num_views or 0)+1,
                    name=sp_name)

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
                status = "sponsored"
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
                        if (timesince < (unpaid_time_limit)):
                            status = "unverified waiting for payment"
                        else:
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
                        status = "available"
                        # reserve the leaf because there is no reservetime on record
                        if allow_sponsorship:
                            reservation_query.update(
                                name=sp_name,
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
                                status = "available only to user"
                                if allow_sponsorship:
                                    reservation_query.update(
                                        name=sp_name,
                                        reserve_time=request.now)
                            else:
                                status = "reserved"
                        else:
                            # it's available still
                            status = "available"
                            # reserve the leaf because there is no reservetime on record
                            if allow_sponsorship:
                                reservation_query.update(
                                    name=sp_name,
                                    reserve_time = request.now,
                                    user_registration_id = form_reservation_code)

        #re-do the query since we might have added the row ID now
        reservation_row = reservation_query.select().first()

        if status == 'available' and prev_sponsorship:
            # Copy over details from any fields that are marked as writable
            # NB: This includes the verified_* fields
            reservation_row.update_record(**{
                k:prev_sponsorship[k]
                for k
                in db.expired_reservations.fields
                if db.expired_reservations[k].writable
            })
    return status, reservation_row

def sponsorable_children_query(target_id, qtype="ott"):
    """
    A function that returns a web2py query selecting the sponsorable children of this node.
    TO DO: change javascript so that nodes without an OTT use qtype='id'
    """
    db = current.db
    query = child_leaf_query(qtype, target_id)

    #nodes without an OTT are unsponsorable
    query = query & (db.ordered_leaves.ott != None) 

    #nodes without a space in the name are unsponsorable
    query = query & (db.ordered_leaves.name.contains(' ')) 

    #check which have OTTs in the reservations table
    unavailable = db((db.reservations.verified_time != None))._select(db.reservations.OTT_ID)
    #the query above ony finds those with a name. We might prefer something like the below, but I can't get it to work
    #unavailable = db((db.reservations.user_sponsor_name != None) | ((db.reservations.reserve_time != None) & ((request.now - db.reservations.reserve_time).total_seconds() < reservation_time_limit)))._select(db.reservations.OTT_ID)
    
    query = query & (~db.ordered_leaves.ott.belongs(unavailable))
    return(query)
