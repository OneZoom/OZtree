from sponsorship import (
    sponsorable_children,
)

from gluon import current

def find_unsponsored_otts(count, in_reservations=None):
    db = current.db
    rows = sponsorable_children(
        1,    # 1st node should have all leaves as descendants
        qtype="id",
        limit=count,
        in_reservations=in_reservations)
    prices = {}
    for r in db(db.ordered_leaves.ott.belongs([r.ott for r in rows])).select(
        db.ordered_leaves.ott,
        db.ordered_leaves.price,
        db.banned.ott,
    ):
        prices[r.ordered_leaves.ott] = r

    if len(rows) < count:
        raise ValueError("Can't find available OTTs")
    rows = [r for r in rows if r.ott in prices and prices[r.ott].ordered_leaves.price > 0]
    if len(rows) < count:
        raise ValueError("Rows don't have associated prices set, visit /manage/SET_PRICES/")
    return [r.ott for r in rows]


def find_unsponsored_ott(in_reservations=None):
    return find_unsponsored_otts(1, in_reservations=in_reservations)[0]

def clear_unittest_sponsors():
    """
    Anything with UT:: id or basket_code, or @unittest.example.com e-mail address
    is assumed to be from a test, remove it
    """
    db = current.db
    db(
        db.reservations.user_registration_id.startswith('UT::') |
        db.reservations.basket_code.startswith('UT::') |
        db.reservations.e_mail.endswith('@unittest.example.com')).delete()
    db(
        db.expired_reservations.user_registration_id.startswith('UT::') |
        db.expired_reservations.basket_code.startswith('UT::') |
        db.expired_reservations.e_mail.endswith('@unittest.example.com')).delete()
    db(
        db.uncategorised_donation.basket_code.startswith('UT::') |
        db.uncategorised_donation.e_mail.endswith('@unittest.example.com')).delete()


def set_appconfig(section, key, val):
    """Update site config (section).(key) = (val)"""
    myconf = current.globalenv['myconf']
    myconf[section][key] = str(val)
    full_key = ".".join((section, key))
    if full_key in myconf.int_cache:
        del myconf.int_cache[full_key]


def set_allow_sponsorship(val):
    """Update site config with new value for sponsorship.allow_sponsorship"""
    set_appconfig('sponsorship', 'allow_sponsorship', val)

def set_maintenance_mins(val):
    """Update site config with new value for sponsorship.maintenance_mins"""
    set_appconfig('sponsorship', 'maintenance_mins', val)

def set_reservation_time_limit_mins(val):
    """Update site config with new value for sponsorship.reservation_time_limit_mins"""
    set_appconfig('sponsorship', 'reservation_time_limit_mins', val)

