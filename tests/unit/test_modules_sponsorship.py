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
    reservation_add_to_basket,
    reservation_confirm_payment,
    reservation_expire,
)


class TestSponsorship(unittest.TestCase):
    def setUp(self):
        request = Request(dict())
        clear_unittest_sponsors()

        # Allow sponsorship by default
        set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)

    def tearDown(self):
        clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_sponsorship_enabled__role(self):
        """allow_sponsorship can be set to a role"""
        auth = current.globalenv['auth']

        role_id = auth.add_group("ut::candlestickmaker")
        set_allow_sponsorship("ut::candlestickmaker")
        # Not logged in, doesn't work
        self.assertEqual(sponsorship_enabled(), False)

        # Create emily, login, still not allowed
        user = auth.get_or_create_user(dict(
            username='ut::emily',
            email='emily@unittest.example.com',
            password='emilypw'
        ))
        auth.login_user(user)
        self.assertNotEqual(auth.user, None)
        self.assertEqual(sponsorship_enabled(), False)

        # Make emily a candlestickmaker, now fine
        auth.add_membership(role="ut::candlestickmaker", user_id=user.id)
        self.assertEqual(sponsorship_enabled(), True)

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

    def test_add_reservation__renew_expired(self):
        """Can renew an expired row"""

        # Buy ott, validate
        ott = find_unsponsored_ott()
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK001', reservation_row, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            verified_name="Definitely Arnold",
            prev_reservation=None,
        ))
        reservation_confirm_payment('UT::BK001', 10000, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        reservation_row.update_record(verified_time=current.request.now)
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')

        # Expire the reservation
        expired_r_id = reservation_expire(reservation_row)

        # Is available to anyone
        set_allow_sponsorship(0)
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'available')

        # Can reserve it referencing old node
        set_allow_sponsorship(1)
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available only to user')
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'reserved')

        # Move ahead in time, to prove which times are different
        current.request.now = (current.request.now + datetime.timedelta(days=1))

        # Can buy it again, referencing old reservation
        reservation_add_to_basket('UT::BK002', reservation_row, dict(
            # NB: We don't set user_sponsor_name, add_to_basket will work it out.
            e_mail='002@unittest.example.com',  # NB: Overriding original e_mail
            prev_reservation_id=expired_r_id,
        ))

        # Has all the details from expired_r, but not transaction details
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'unverified waiting for payment')
        self.assertEqual(reservation_row.user_sponsor_name, 'Arnold')
        self.assertEqual(reservation_row.e_mail, '002@unittest.example.com')
        self.assertEqual(reservation_row.PP_e_mail, None)
        self.assertEqual(reservation_row.PP_transaction_code, None)

        # Buy it, compare details with expired row
        reservation_confirm_payment('UT::BK002', 10000, dict(
            PP_transaction_code='UT::PP2',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2002 GMT',
        ))
        expired_r = db(db.expired_reservations.id==expired_r_id).select().first()
        status, reservation_row = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')
        self.assertEqual(reservation_row.verified_time, expired_r.verified_time)
        self.assertEqual(expired_r.sale_time, '01:01:01 Jan 01, 2001 GMT')
        self.assertEqual(reservation_row.sale_time, '01:01:01 Jan 01, 2002 GMT')
        self.assertEqual(reservation_row.user_sponsor_name, 'Arnold')
        self.assertEqual(reservation_row.verified_name, 'Definitely Arnold')
        self.assertEqual(reservation_row.PP_e_mail, 'paypal@unittest.example.com')
        self.assertEqual(reservation_row.PP_transaction_code, 'UT::PP2')

    def test_reservation_confirm_payment__invalid(self):
        """Unknown baskets are an error"""
        with self.assertRaisesRegex(ValueError, r'PP_transaction_code'):
            reservation_confirm_payment("UT::invalid", 1000, dict())

        with self.assertRaisesRegex(ValueError, r'sale_time'):
            reservation_confirm_payment("UT::invalid", 1000, dict(PP_transaction_code='UT::001'))

        with self.assertRaisesRegex(ValueError, r'basket_code UT::invalid'):
            reservation_confirm_payment("UT::invalid", 1000, dict(PP_transaction_code='UT::001', sale_time='01:01:01 Jan 01, 2001 GMT'))

    def test_reservation_confirm_payment__giftaid(self):
        """Buy a single item with giftaid on/off"""

        # Buy ott1 with giftaid off
        ott1 = find_unsponsored_ott()
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK001', reservation_row1, dict(
            e_mail='001@unittest.example.com',
            user_giftaid=False,
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_confirm_payment('UT::BK001', 10000, dict(
            PP_transaction_code='UT::PP1',
            PP_house_and_street='PP House',
            PP_postcode='PO12 3DE',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))

        # Can't reserve it since it's unverified (not "sponsored" since we haven't set verified)
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'unverified')
        # E-mail got set, house/postcode didn't
        self.assertEqual(reservation_row1.PP_e_mail, 'paypal@unittest.example.com')
        self.assertEqual(reservation_row1.PP_house_and_street, None)
        self.assertEqual(reservation_row1.PP_postcode, None)

        # Validate row, is fully sponsored
        reservation_row1.update_record(verified_time=current.request.now)
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')

        # Buy ott2 with giftaid on
        ott2 = find_unsponsored_ott()
        status, reservation_row2 = add_reservation(ott2, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK002', reservation_row2, dict(
            e_mail='001@unittest.example.com',
            user_giftaid=True,
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_confirm_payment('UT::BK002', 10000, dict(
            PP_transaction_code='UT::PP2',
            PP_house_and_street='PP House',
            PP_postcode='PO12 3DE',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))

        # Address gets set, old row left alone
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')
        self.assertEqual(reservation_row1.PP_e_mail, 'paypal@unittest.example.com')
        self.assertEqual(reservation_row1.PP_house_and_street, None)
        self.assertEqual(reservation_row1.PP_postcode, None)
        status, reservation_row2 = add_reservation(ott2, form_reservation_code="UT::002")
        self.assertEqual(status, 'unverified')
        self.assertEqual(reservation_row2.PP_e_mail, 'paypal@unittest.example.com')
        self.assertEqual(reservation_row2.PP_house_and_street, "PP House")
        self.assertEqual(reservation_row2.PP_postcode, "PO12 3DE")

        # Giftaid claimed
        reservation_row1.update_record(giftaid_claimed_on=current.request.now)
        # NB: DB round trip to round down to MySQL precision
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::002")
        old_claimed_time = reservation_row1.giftaid_claimed_on

        # Renew ott1, gift-aid no longer claimed
        reservation_add_to_basket('UT::BK003', reservation_row1, dict())
        reservation_confirm_payment('UT::BK003', 1000000, dict(
            PP_transaction_code='UT::PP3',
            PP_e_mail='paypal-new-addr@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        status, reservation_row1 = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')
        self.assertEqual(reservation_row1.giftaid_claimed_on, None)

        # ...but is on expired entry
        expired_row = db(db.expired_reservations.id == reservation_row1.prev_reservation_id).select().first()
        self.assertEqual(expired_row.giftaid_claimed_on, old_claimed_time)

    def test_reservation_confirm_payment__extension(self):
        """Buy an item twice to extend it"""

        # Buy ott1
        ott1 = find_unsponsored_ott()
        status, reservation_row = add_reservation(ott1, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK001', reservation_row, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_confirm_payment('UT::BK001', 10000, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))

        # Can't reserve it since it's unverified (not "sponsored" since we haven't set verified)
        status, reservation_row = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'unverified')
        # E-mail, asking price got set
        self.assertEqual(reservation_row.PP_e_mail, 'paypal@unittest.example.com')
        self.assertGreater(reservation_row.asking_price, 4)
        orig_asking_price = reservation_row.asking_price

        # We paid well over the asking price, so there's a row with additional donation
        donations = db(db.uncategorised_donation.basket_code==reservation_row.basket_code).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].user_paid, (10000 - orig_asking_price * 100) / 100)

        # Replaying a transaction gets ignored
        reservation_confirm_payment('UT::BK001', 10000, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal-replay-attack@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        status, reservation_row = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'unverified')
        self.assertEqual(reservation_row.PP_e_mail, 'paypal@unittest.example.com')

        # Validate row, is fully sponsored for 4 years
        reservation_row.update_record(verified_time=current.request.now)
        status, reservation_row = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')
        self.assertEqual(reservation_row.sponsorship_duration_days, 365 * 4 + 1)
        self.assertLess(
            reservation_row.sponsorship_ends - request.now - datetime.timedelta(days = 365 * 4 + 1),
            datetime.timedelta(minutes=1))

        # ...but can add it to a new basket and renew it.
        reservation_add_to_basket('UT::BK002', reservation_row, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_confirm_payment('UT::BK002', int(orig_asking_price * 100 * (1 - 0.2)), dict(
            PP_transaction_code='UT::PP2',
            PP_e_mail='paypal-new-addr@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))

        # Now reserved for 8 years, with updated details
        status, reservation_row = add_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, 'sponsored')  # NB: Verification status preserved
        self.assertEqual(reservation_row.PP_e_mail, 'paypal-new-addr@unittest.example.com')
        self.assertEqual(reservation_row.sponsorship_duration_days, 365 * 4 + 1)  # NB: Duration still 4 years.
        self.assertLess(
            reservation_row.sponsorship_ends - request.now - datetime.timedelta(days = 365 * 8 + 1),
            datetime.timedelta(minutes=1))

        # The asking price dropped, as it's a renewal
        self.assertEqual(reservation_row.asking_price, orig_asking_price * (1 - 0.2))

        # We paid the correct figure, so no extra donation
        donations = db(db.uncategorised_donation.basket_code==reservation_row.basket_code).select()
        self.assertEqual(len(donations), 0)

        # Can find the old row as an expired reservation
        expired_row = db(
            (db.expired_reservations.OTT_ID == ott1) &
            (db.expired_reservations.PP_transaction_code == 'UT::PP1')).select().first()
        self.assertEqual(expired_row.e_mail, '001@unittest.example.com')
        self.assertEqual(expired_row.PP_e_mail, 'paypal@unittest.example.com')
        self.assertEqual(expired_row.asking_price, orig_asking_price)
        self.assertEqual(reservation_row.prev_reservation_id, expired_row.id)

    def test_reservation_confirm_payment__insufficientfunds(self):
        """Buying items with insufficient funds fails"""

        # Reserve 3 OTTs
        otts = find_unsponsored_otts(3)
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        status, reservation_row1 = add_reservation(otts[1], form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        status, reservation_row2 = add_reservation(otts[2], form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK001', reservation_row0, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_add_to_basket('UT::BK001', reservation_row1, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))
        reservation_add_to_basket('UT::BK001', reservation_row2, dict(
            e_mail='001@unittest.example.com',
            user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
        ))

        # Pay ~nothing, none get bought, instead make a tiny donaton
        reservation_confirm_payment('UT::BK001', 1, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        self.assertEqual(reservation_row0.admin_comment, "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1")
        status, reservation_row1 = add_reservation(otts[1], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        self.assertEqual(reservation_row1.admin_comment, "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1")
        status, reservation_row2 = add_reservation(otts[2], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        self.assertEqual(reservation_row2.admin_comment, "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1")
        donations = db(db.uncategorised_donation.basket_code==reservation_row0.basket_code).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, '0.01')
        self.assertEqual(donations[0].PP_transaction_code, 'UT::PP1')

        # Try replaying the transaction, situation doesn't change
        reservation_confirm_payment('UT::BK001', 1, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        status, reservation_row1 = add_reservation(otts[1], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        status, reservation_row2 = add_reservation(otts[2], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        donations = db(db.uncategorised_donation.basket_code==reservation_row0.basket_code).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, '0.01')

        # Pay again, enough for 2/3 items
        # NB: This is tricky, but not impossible, to do through the interface. Pay, press back, pay again.
        reservation_confirm_payment('UT::BK001', reservation_row0.asking_price * 100 + reservation_row1.asking_price * 100 + 3, dict(
            PP_transaction_code='UT::PP2',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified')
        status, reservation_row1 = add_reservation(otts[1], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified')
        status, reservation_row2 = add_reservation(otts[2], form_reservation_code="UT::001")
        self.assertEqual(status, 'unverified waiting for payment')
        self.assertEqual(reservation_row2.admin_comment, "\n".join((
            "reservation_confirm_payment: Transaction UT::PP2 insufficient for purchase. Paid 2003",
            "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
        )))
        donations = db(db.uncategorised_donation.basket_code==reservation_row0.basket_code).select()
        self.assertEqual(len(donations), 2)
        self.assertEqual(donations[0].verified_paid, '0.01')
        self.assertEqual(donations[1].verified_paid, '0.03')

        # Verify otts[0]
        reservation_row0.update_record(verified_time=current.request.now)
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'sponsored')
        old_sponsorship_ends = reservation_row0.sponsorship_ends

        # Try to extend otts[0] without paying enough, should still be sponsored but sponsorship_ends same
        reservation_add_to_basket('UT::BK002', reservation_row0, dict())
        reservation_confirm_payment('UT::BK002', 2, dict(
            PP_transaction_code='UT::PP3',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2002 GMT',
        ))
        status, reservation_row0 = add_reservation(otts[0], form_reservation_code="UT::001")
        self.assertEqual(status, 'sponsored')
        self.assertEqual(reservation_row0.sponsorship_ends, old_sponsorship_ends)
        self.assertEqual(reservation_row0.admin_comment, "\n".join((
            "reservation_confirm_payment: Transaction UT::PP3 insufficient for extension. Paid 2",
            "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
        )))

        # Made a tiny donation
        donations = db(db.uncategorised_donation.basket_code==reservation_row0.basket_code).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, '0.02')


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
    db(
        db.uncategorised_donation.basket_code.startswith('UT::') |
        db.uncategorised_donation.e_mail.endswith('@unittest.example.com')).delete()


def set_allow_sponsorship(val):
    """Update site config with new value for sponsorship.allow_sponsorship"""
    myconf = current.globalenv['myconf']
    myconf['sponsorship']['allow_sponsorship'] = str(val)
    if 'sponsorship.allow_sponsorship' in myconf.int_cache:
        del myconf.int_cache['sponsorship.allow_sponsorship']


def find_unsponsored_otts(count):
    query = sponsorable_children_query(147604, qtype="ott")
    rows = db(query).select(limitby=(0, count))
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


def find_unsponsored_ott():
    return find_unsponsored_otts(1)[0]


if __name__ == '__main__':
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestSponsorship))
    unittest.TextTestRunner(verbosity=2).run(suite)

