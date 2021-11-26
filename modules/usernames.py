"""
Module to create usernames (consist of alphabetic chars + digits + underscore + hyphen)
"""

import string
import unicodedata
import datetime
from gluon import current

def make_username(name):
    """
    Create a new username by removing suspect characters and uniquifying
    """
    db = current.db
    if name is None:
        return None
    allowed = string.ascii_lowercase + string.ascii_uppercase + string.digits + "_"
    nm = "".join(
        c for c in unicodedata.normalize('NFKD', name).encode("ascii", "ignore").decode()
        if c in allowed)
    if len(nm) == 0:
        # Could happen if e.g. donor name is entirely chinese characters
        return None
    username = nm
    # uniquify
    i = 1
    while db(db.reservations.username == username).count() > 0:
        i += 1
        username = nm + f"-{i}"
    return username

def find_username(target_row, return_otts=False, allocate_species_name=False):
    """
    Check if a (possibly unverified) row of the reservations table matches other rows
    with the same username, or if no username, the same email. Return the best matching
    username and the matching row IDs (or OTTs if return_otts is True).
    If no match is found, return a reasonable new username and an empty list.
    """
    db = current.db
    return_ids = db.reservations.OTT_ID if return_otts else db.reservations.id
    if target_row.username:
        other_rows = db(db.reservations.username == target_row.username).select(return_ids)
        return target_row.username, [r.OTT_ID if return_otts else r.id for r in other_rows]

    # No existing username - check for other rows with matching emails
    e_mail = target_row.e_mail
    PP_e_mail = target_row.PP_e_mail
    # an email has been provided: try and match
    q = []
    if e_mail:
        q += [(db.reservations.e_mail == e_mail) & (db.reservations.verified_time != None)]
    if PP_e_mail:
        q += [(db.reservations.PP_e_mail == PP_e_mail) & (db.reservations.verified_time != None)]
    if e_mail:
        q += [(db.reservations.PP_e_mail == e_mail) & (db.reservations.verified_time != None)]
    if PP_e_mail:
        q += [(db.reservations.e_mail == PP_e_mail) & (db.reservations.verified_time != None)]

    usernames = {}
    for query in q:
        for r in db(query).select(db.reservations.username, return_ids):
            if r.username:
                if r.username in usernames:
                    usernames[r.username].append(r.OTT_ID if return_otts else r.id)
                else:
                    usernames[r.username] = [r.OTT_ID if return_otts else r.id]
    if usernames:
        best_match = min(usernames.keys())  # Get the first, alphabetically
        return best_match, usernames[best_match]

    # No other matching usernames - make one from this
    if target_row.verified_donor_name:
        username = make_username(target_row.verified_donor_name)
        if username:
            return username, []
    if target_row.verified_name and target_row.verified_kind and target_row.verified_kind.lower() == "by":
        username = make_username(target_row.verified_name)
        if username:
            return username, []
    if target_row.verified_donor_name is None and target_row.user_donor_name:
        username = make_username(target_row.user_donor_name)
        if username:
            return username, []
    if (
        (target_row.verified_name is None and target_row.verified_kind is None)
        and (target_row.user_sponsor_name and target_row.user_sponsor_kind and target_row.user_sponsor_kind.lower() == "by")
    ):
        username = make_username(target_row.user_sponsor_name)
        if username:
            return username, []

    if allocate_species_name:
        # As a last resort, use the species name plus sponsorship year as the username
        leaf = db(db.ordered_leaves.ott == target_row.OTT_ID).select(db.ordered_leaves.name)
        sp_name = ""
        if leaf:
            sp_name = leaf.first().name
        if not sp_name:
            sp_name = target_row.name
        date = target_row.reserve_time
        year = date.year if date else datetime.datetime.now().year
        sp_name = sp_name.replace(" ", "_") + "_" + str(year)
        username = make_username(sp_name)
        if username:
            return username, []
        
    return None, None


def email_for_username(username):
    """Return the most up to date e-mail address for a given username"""
    db = current.db

    for r in db(db.reservations.username == username).iterselect(orderby=~db.reservations.verified_time):
        if r.e_mail:
            return r.e_mail
        if r.PP_e_mail:
            return r.PP_e_mail
    raise ValueError("No e-mail address found for username %s" % username)


def usernames_associated_to_email(email):
    """Given an e-mail address, return a list of usernames that have used it"""
    db = current.db

    return [
        x['username']
        for x in db(
            (db.reservations.e_mail == email) | (db.reservations.PP_e_mail == email)
        ).select(db.reservations.username)
        if x['username']
    ]
