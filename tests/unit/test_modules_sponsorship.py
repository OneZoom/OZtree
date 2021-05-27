"""
Run with
python3 /srv/devel/onezoom/web2py.py \
    -S OZtree -M -R applications/OZtree/tests/unit/test_modules_sponsorship.py
"""
import datetime
import unittest

from gluon.globals import Request

from sponsorship import (
    add_reservation,
    sponsorable_children_query,
    sponsorship_enabled,
)


class TestSponsorship(unittest.TestCase):
    def setUp(self):
        request = Request(dict())
        clear_unittest_sponsors()

    def tearDown(self):
        clear_unittest_sponsors()

    def test_add_reservation__invalid(self):
        """Invalid OTT is invalid"""
        status, reservation_row = add_reservation(-1000, form_reservation_code="UT::001")
        self.assertEqual(status, 'invalid')

    def test_add_reservation__reserve(self):
        """Can reserve items if sponsorship enabled"""
        # Sponsorship should be off
        set_allow_sponsorship(0)
        self.assertEqual(sponsorship_enabled(), False)

        # Anyone sees an empty item as available
        ott = find_unsponsored_ott()
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        self.assertEqual(reservation_row.OTT_ID, ott)
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'available')
        self.assertEqual(reservation_row.OTT_ID, ott)

        # Sponsorship activate
        set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)

        # Can reserve an OTT, and re-request it
        ott = find_unsponsored_ott()
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        self.assertEqual(reservation_row.OTT_ID, ott)
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available only to user')
        self.assertEqual(reservation_row.OTT_ID, ott)

        # Another user can't get it now, but can tomorrow
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'reserved')
        current.request.now = (current.request.now + datetime.timedelta(days=1))
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'available')


def clear_unittest_sponsors():
    """
    Anything with UT:: id or basket_code, or @unittest.example.com e-mail address
    is assumed to be from a test, remove it
    """
    db(
        db.reservations.user_registration_id.startswith('UT::') |
        db.reservations.basket_code.startswith('UT::') |
        db.reservations.e_mail.endswith('@unittest.example.com')).delete()
    db(
        db.expired_reservations.user_registration_id.startswith('UT::') |
        db.expired_reservations.basket_code.startswith('UT::') |
        db.expired_reservations.e_mail.endswith('@unittest.example.com')).delete()


def set_allow_sponsorship(val):
    """Update site config with new value for sponsorship.allow_sponsorship"""
    myconf = current.globalenv['myconf']
    myconf['sponsorship']['allow_sponsorship'] = str(val)
    if 'sponsorship.allow_sponsorship' in myconf.int_cache:
        del myconf.int_cache['sponsorship.allow_sponsorship']


def find_unsponsored_ott():
    query = sponsorable_children_query(147604, qtype="ott")
    r = db(query).select(limitby=(0, 1)).first()
    if r is None:
        raise ValueError("Can't find an available OTT")
    return r.ott


if __name__ == '__main__':
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestSponsorship))
    unittest.TextTestRunner(verbosity=2).run(suite)

