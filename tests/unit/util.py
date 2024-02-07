import datetime
import os.path
import uuid
import random
import shutil

import sponsorship
import usernames

from gluon import current
from gluon.globals import Request


def grunt_path():
    """Find grunt executable, return full path"""
    for x in (
            './node_modules/.bin/grunt',
            './applications/OZtree/node_modules/.bin/grunt',
            'grunt',
            ):
        if shutil.which(x):
            return os.path.abspath(shutil.which(x))
    raise RuntimeError("Cannot find grunt executable")


def call_controller(module, endpoint, vars={}, args=[], method=None, username=None):
    """Set up a semi-sane request environment, call a controller endpoint"""
    # Create request for given params
    current.request = Request(dict())
    for (k, v) in vars.items():
        current.request.vars[k] = v
    current.request.args = args
    if method:
        current.request.env.request_method = method

    class FakeAuth():
        """Fake enough of of the auth API"""
        def basic(self):
            # NB: Do this in the basic call to ensure it happens
            self.user = username
    current.globalenv['auth'] = FakeAuth()

    # Poke session / DB / request into module's namespace
    module.session = current.session
    module.db = current.db
    module.request = current.request
    module.response = current.response
    module.auth = current.globalenv['auth']
    module.HTTP = current.globalenv['HTTP']

    return getattr(module, endpoint)()


def time_travel(days=0, expire=True):
    """Go back in time (days) days from start of test"""
    if not current.request.time_travel_now:
        current.request.time_travel_now = current.request.now
    current.request.now = current.request.time_travel_now - datetime.timedelta(days=days)
    if expire:
        for r in sponsorship.reservation_get_all_expired():
            sponsorship.reservation_expire(r)


def find_unsponsored_otts(count, in_reservations=None, allow_banned=False):
    """
    If allow_banned==True
    """
    db = current.db

    rows = sponsorship.sponsorable_children(
        1,    # 1st node should have all leaves as descendants
        qtype="id",
        limit=count * 2, # get twice as many as required, in case some are banned
        in_reservations=in_reservations)
    banned = {r.ott for r in db().iterselect(db.banned.ott)} if allow_banned else set()
    otts = [
        r.ott
        for r in db(db.ordered_leaves.ott.belongs([r.ott for r in rows])).select(
            db.ordered_leaves.ott,
            db.ordered_leaves.price,
        )
        if allow_banned or (r.ott not in banned and r.price)
    ]
    if len(rows) < count:
        raise ValueError("Can't find available OTTs")
    if len(otts) < count:
        raise ValueError("Rows may not have associated prices set, visit /manage/SET_PRICES/")
    return random.sample(otts, count)


def find_unsponsored_ott(in_reservations=None, allow_banned=False):
    return find_unsponsored_otts(
        1, in_reservations=in_reservations, allow_banned=allow_banned)[0]

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


def create_tour(otts, tour_identifier=None, title=None, description=None, author=None):
    db = current.db

    if not tour_identifier:
        tour_identifier = 'UT::TOUR%d' % (db(db.tour.identifier).count(),)

    tour_body = dict(
        title=title or 'A unit test tour %s' % tour_identifier,
        description=description or 'A default description',
        author=author or 'UT::Author',
    )

    if isinstance(otts, int):
        otts = util.find_unsponsored_otts(tour_body['tourstops'])
    tour_body['tourstops'] = [dict(
        ott=ott,
        identifier="ott%d" % ott,
        template_data=dict(title="Tour %s OTT %d" % (
            tour_identifier,
            ott
        )),
    ) for ott in otts]

    import applications.OZtree.controllers.tour as tour_controller
    out = call_controller(
        tour_controller,
        'data',
        method='PUT',
        args=[tour_identifier],
        vars=tour_body,
        username='admin'
    )
    # Turn response rows into dicts
    out['tour'] = out['tour'].as_dict()
    out['tour']['tourstops'] = [ts.as_dict() for ts in out['tour']['tourstops']]
    return out['tour']

def clear_unittest_tours():
    """
    Tours with identifiers starting with UT:: are assumed to be unit test tours
    and should be deleted
    """
    db = current.db
    db(db.tour.identifier.startswith('UT::')).delete()


def set_appconfig(section, key, val):
    """Update site config (section).(key) = (val). If val is None, delete"""
    myconf = current.globalenv['myconf']
    if val is None:
        if key in myconf[section]:
            del myconf[section][key]
    else:
        myconf[section][key] = str(val)
    full_key = ".".join((section, key))
    if full_key in myconf.int_cache:
        del myconf.int_cache[full_key]


def set_is_testing(val):
    """Update the global var is_testing"""
    current.globalenv['is_testing'] = val

def set_allow_sponsorship(val):
    """Update site config with new value for sponsorship.allow_sponsorship"""
    set_appconfig('sponsorship', 'allow_sponsorship', val)

def set_maintenance_mins(val):
    """Update site config with new value for sponsorship.maintenance_mins"""
    set_appconfig('sponsorship', 'maintenance_mins', val)

def set_reservation_time_limit_mins(val):
    """Update site config with new value for sponsorship.reservation_time_limit_mins"""
    set_appconfig('sponsorship', 'reservation_time_limit_mins', val)

def set_smtp(sender='me@example.com', autosend_email=1):
    """
    Update site config with new value for smtp server, sender, and autosend_email.
    If sender is None, delete the server
    If autosend_email=0, then the normal ozmail.get_mailer() function will return None
    """
    if sender is None:
        set_appconfig('smtp', 'server', None)
        set_appconfig('smtp', 'sender', None)
        set_appconfig('smtp', 'autosend_email', autosend_email)
    else:
        if not 'server' in current.globalenv['myconf']['smtp'] or current.globalenv['myconf']['smtp']['server'] is None:
            set_appconfig('smtp', 'server', 'localhost:2500')
        set_appconfig('smtp', 'sender', sender)
        set_appconfig('smtp', 'autosend_email', autosend_email)

def purchase_reservation(otts = 1, basket_details = None, paypal_details = None, payment_amount=None, allowed_status=set(('available',)), verify=True):
    """
    Go through all the motions required to purchase a reservation.
    otts can be an integer, in which case some sponsorable otts are chosen at random,
    or a list of ott ids.
    """
    db = current.db

    purchase_uuid = uuid.uuid4()
    basket_code = 'UT::BK%s' % purchase_uuid

    if isinstance(otts, int):
        otts = find_unsponsored_otts(otts)

    if not basket_details:
        basket_details = {}
    if not paypal_details:
        paypal_details = {}
    if 'user_sponsor_name' not in basket_details:
        # Have to at least set user_sponsor_name
        basket_details['user_sponsor_name'] = basket_details.get("e_mail", "User %s" % purchase_uuid)
        basket_details['user_sponsor_kind'] = "by"
    if 'PP_transaction_code' not in paypal_details:
        paypal_details['PP_transaction_code'] = 'UT::PP%s' % purchase_uuid
    if 'PP_e_mail' not in paypal_details:
        paypal_details['PP_e_mail'] = "%s@paypal.unittest.example.com" % purchase_uuid
    if 'sale_time' not in paypal_details:
        paypal_details['sale_time'] = '01:01:01 Jan 01, 2001 GMT'

    if payment_amount is None:
        # Work out payment amount from OTTs
        sum = db.ordered_leaves.price.sum()
        payment_amount = db(db.ordered_leaves.ott.belongs(otts)).select(sum).first()[sum]
        if payment_amount is None:
            # This must have included banned or unpriced species
            payment_amount = float('inf')  # still allow it to be bought

    for ott in otts:
        status, _, reservation_row, _ = sponsorship.get_reservation(ott, form_reservation_code="UT::%s" % purchase_uuid)
        if status not in allowed_status:
            raise ValueError("OTT %d wasn't available: %s" % (ott, status))
        sponsorship.reservation_add_to_basket(basket_code, reservation_row, basket_details)
    sponsorship.reservation_confirm_payment(basket_code, payment_amount, paypal_details)

    reservation_rows = db(db.reservations.basket_code == basket_code).select()
    if verify:
        for reservation_row in reservation_rows:
            verify_reservation(reservation_row)
    return reservation_rows


def verify_reservation(reservation_row, **kwargs):
    """Emulate verification logic in controllers/manage.py:SPONSOR_UPDATE"""
    # Add verified options
    reservation_row.update_record(
        verified_time=current.request.now,
        verified_kind=reservation_row.user_sponsor_kind,
        verified_name=reservation_row.user_sponsor_name,
        verified_donor_name=reservation_row.user_donor_name,
    )
    # Now verified details are set, map username
    username, _ = usernames.find_username(reservation_row)
    assert username
    reservation_row.update_record(
        username=username,
        **kwargs,
    )
