"""
Run with

python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_modules_sponsorship.py
    
Note you should make sure prices are set before running tests (manage/SET_PRICES.html)
"""
import datetime
import unittest
import urllib.parse
import uuid

from applications.OZtree.tests.unit import util

from gluon.globals import Request

from sponsorship import (
    get_reservation,
    sponsorship_config,
    sponsorship_enabled,
    reservation_total_counts,
    reservation_add_to_basket,
    reservation_confirm_payment,
    reservation_get_all_expired,
    reservation_expire,
    sponsor_hmac_key,
    sponsor_verify_url,
    sponsorship_email_reminders,
    sponsorship_email_reminders_post,
    sponsorship_restrict_contact,
    sponsor_renew_request_logic,
)


class TestMaintenance(unittest.TestCase):
    mins = 10

    def setUp(self):
        request = Request(dict())
        util.clear_unittest_sponsors()

        # Allow sponsorship by default
        util.set_allow_sponsorship(1)
        util.set_maintenance_mins(0)
        util.set_reservation_time_limit_mins(0)
        self.otts = util.find_unsponsored_otts(3, in_reservations=False)
        # make sure there's at least one unsponsored ott, one sponsored but unverified,
        # one fully sponsored OTT in the reservations table
        for i, ott in enumerate(self.otts):
            _, _, reservation_row, _ = get_reservation(
                ott, form_reservation_code="UT::001"
            )
            if i > 0:
                reservation_add_to_basket(
                    "UT::BK001",
                    reservation_row,
                    dict(
                        e_mail="001@unittest.example.com",
                        user_sponsor_name="Arnold",
                    ),
                )
                reservation_confirm_payment(
                    "UT::BK001",
                    10000,
                    dict(
                        PP_transaction_code="UT::PP1",
                        PP_e_mail="paypal@unittest.example.com",
                        sale_time="01:01:01 Jan 01, 2001 GMT",
                    ),
                )
            if i > 1:
                reservation_row.update_record(verified_time=current.request.now)
        util.set_maintenance_mins(self.mins)
        self.assertEqual(sponsorship_enabled(), True)
        self.total = db(db.reservations).count()

    def tearDown(self):
        util.clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_maintenance_unsponsored(self):
        status = "sponsored"
        status, param, reservation_row, _ = get_reservation(
            self.otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "maintenance")
        self.assertEqual(param, self.mins)
        self.assertNotEqual(reservation_row, None)

        unreserved_ott = util.find_unsponsored_ott(in_reservations=False)
        status, param, reservation_row, _ = get_reservation(
            unreserved_ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "maintenance")
        self.assertEqual(param, self.mins)
        self.assertEqual(reservation_row, None)
        self.assertEqual(self.total, db(db.reservations).count())

    def test_maintenance_banned(self):
        "Invalid leaves return invalid even if in maintenance mode"
        self.assertNotEqual(db(db.banned.ott != None).count(), 0)
        ott = (
            db(db.banned.ott != None).select(db.banned.ott, limitby=(0, 1)).first().ott
        )
        status, param, *_ = get_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, "banned")
        self.assertEqual(param, None)
        self.assertEqual(self.total, db(db.reservations).count())

    def test_maintenance_invalid(self):
        "Invalid leaves return invalid even if in maintenance mode"
        status, param, _, _ = get_reservation(-1000, form_reservation_code="UT::001")
        self.assertEqual(status, "invalid")
        self.assertEqual(param, None)
        self.assertEqual(self.total, db(db.reservations).count())

    def test_maintenance_reserved(self):
        "Reserved leaves return reserved even if in maintenance mode"
        util.set_reservation_time_limit_mins(10)
        status, param, reservation_row, _ = get_reservation(
            self.otts[0], form_reservation_code="UT::002"
        )
        self.assertEqual(status, "reserved")
        self.assertGreater(param, 0)
        util.set_reservation_time_limit_mins(0)
        status, param, _, _ = get_reservation(
            self.otts[0], form_reservation_code="UT::002"
        )
        self.assertEqual(status, "maintenance")
        self.assertNotEqual(reservation_row, None)
        self.assertEqual(self.total, db(db.reservations).count())

    def test_maintenance_sponsored(self):
        "Unverified leaves return unverified even if in maintenance mode"
        status, param, _, _ = get_reservation(
            self.otts[1], form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        self.assertEqual(self.total, db(db.reservations).count())

    def test_maintenance_sponsored(self):
        "Sponsored leaves return sponsored even if in maintenance mode"
        status, param, _, _ = get_reservation(
            self.otts[2], form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(self.total, db(db.reservations).count())


class TestSponsorship(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        request = Request(dict())
        util.clear_unittest_sponsors()

        # Allow sponsorship by default
        util.set_allow_sponsorship(1)
        util.set_maintenance_mins(0)
        util.set_reservation_time_limit_mins(6)
        self.assertEqual(sponsorship_enabled(), True)

    def tearDown(self):
        util.clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_sponsorship_enabled__role(self):
        """allow_sponsorship can be set to a role"""
        auth = current.globalenv["auth"]

        role_id = auth.add_group("ut::candlestickmaker")
        util.set_allow_sponsorship("ut::candlestickmaker")
        # Not logged in, doesn't work
        self.assertEqual(sponsorship_enabled(), False)

        # Create emily, login, still not allowed
        user = auth.get_or_create_user(
            dict(
                username="ut::emily",
                email="emily@unittest.example.com",
                password="emilypw",
            )
        )
        auth.login_user(user)
        self.assertNotEqual(auth.user, None)
        self.assertEqual(sponsorship_enabled(), False)

        # Make emily a candlestickmaker, now fine
        auth.add_membership(role="ut::candlestickmaker", user_id=user.id)
        self.assertEqual(sponsorship_enabled(), True)

    def test_reservation_total_counts(self):
        """Can count for the home page"""
        # Purchase an OTT ages ago, which will expire, then 2 new ones
        util.time_travel(sponsorship_config()["duration_days"] * 3)
        # Get unsponsored OTTs in one go, to ensure they don't overlap
        otts = util.find_unsponsored_otts(3)
        reservations_old = util.purchase_reservation(
            otts[0:2], basket_details=dict(e_mail="betty@unittest.example.com")
        )
        util.time_travel(0)
        reservations_newer = util.purchase_reservation(
            otts[2:], basket_details=dict(e_mail="betty@unittest.example.com")
        )

        # Re-purchase the now expired OTT
        reservations_renewed = util.purchase_reservation(
            [reservations_old[0].OTT_ID],
            basket_details=dict(e_mail="betty@unittest.example.com"),
        )

        # Reserve an OTT
        reserved_ott = util.find_unsponsored_ott(in_reservations=False)
        status, param, reservation_row, _ = get_reservation(
            reserved_ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
                username=uuid.uuid4(),
            ),
        )

        donors = db.executesql(
            "SELECT username, MAX(verified_time) FROM reservations GROUP BY 1;"
        )
        expired_donors = set(
            x[0] for x in db.executesql("SELECT username FROM expired_reservations;")
        )
        # At least one non-verified entry to not count
        self.assertTrue(sum(1 for u, vt in donors if vt is None) > 0)
        # Ignore it for our count
        donors = set(u for u, vt in donors if vt is not None)
        # There's *something* in the intersection to make sure we don't count double
        self.assertTrue(len(donors & expired_donors) > 0)
        # Check return value against our union
        self.assertEqual(
            reservation_total_counts("donors"), len(donors | expired_donors)
        )

        otts = db.executesql(
            "SELECT OTT_ID, MAX(verified_time) FROM reservations GROUP BY 1;"
        )
        expired_otts = set(
            x[0] for x in db.executesql("SELECT OTT_ID FROM expired_reservations;")
        )
        # Our reserved, non-verified entry is in OTTs
        self.assertIn((reserved_ott, None), otts)
        # Ignore it for our count
        otts = set(ott for ott, vt in otts if vt is not None)
        # The newer purchases are also in OTTs
        for r in reservations_newer:
            self.assertIn(r.OTT_ID, otts)
        # The re-purchased OTT appears in both lists
        self.assertIn(reservations_renewed[0].OTT_ID, otts & expired_otts)
        # Check return value against our union
        self.assertEqual(reservation_total_counts("otts"), len(otts | expired_otts))

    def test_get_reservation__invalid(self):
        """Invalid OTT is invalid"""
        status, param, _, _ = get_reservation(-1000, form_reservation_code="UT::001")
        self.assertEqual(status, "invalid")
        self.assertEqual(param, None)

    def test_get_reservation__reserve(self):
        """Can reserve items if sponsorship enabled"""
        # Sponsorship should be off
        util.set_allow_sponsorship(0)
        self.assertEqual(sponsorship_enabled(), False)

        # Anyone sees an empty item as available
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        self.assertEqual(reservation_row.OTT_ID, ott)
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "available")
        self.assertEqual(reservation_row.OTT_ID, ott)

        # Sponsorship activate
        util.set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)

        # Can reserve an OTT, and re-request it
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        self.assertEqual(reservation_row.OTT_ID, ott)
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available only to user")
        self.assertEqual(reservation_row.OTT_ID, ott)

        # Another user can't get it now, but can tomorrow
        status, param, _, _ = get_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, "reserved")
        self.assertNotEqual(param, None)
        current.request.now = current.request.now + datetime.timedelta(days=1)
        status, param, _, _ = get_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, "available")
        self.assertEqual(param, None)

    def test_get_reservation__slow(self):
        """Slow payments have their own status"""
        util.set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)
        ott = util.find_unsponsored_ott()

        # Start to buy OTT
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
                verified_name="Definitely Arnold",
                prev_reservation=None,
            ),
        )

        # We get told that we're waiting for funds, with any reservation code
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified waiting for payment")

        # Wait 12 mins, we get told we're slow
        current.request.now = current.request.now + datetime.timedelta(minutes=12)
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for slow payment")

        # Wait 2 days, expired
        current.request.now = current.request.now + datetime.timedelta(days=2)
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")

    def test_get_reservation__renew_expired(self):
        """Can renew an expired row"""

        # Buy ott, validate
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
                user_donor_name="Emily",
                user_sponsor_kind="for",
                prev_reservation=None,
            ),
        )
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        username = util.verify_reservation(
            reservation_row, verified_name="Definitely Arnold"
        )
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(reservation_row.verified_kind, "for")
        self.assertEqual(reservation_row.verified_donor_name, "Emily")
        self.assertEqual(reservation_row.verified_name, "Definitely Arnold")
        self.assertEqual(reservation_row.username, username)

        # Expire the reservation
        expired_r_id = reservation_expire(reservation_row)

        # Is available to anyone
        util.set_allow_sponsorship(0)
        status, *_ = get_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, "available")
        status, *_ = get_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, "available")

        # Can reserve it referencing old node
        util.set_allow_sponsorship(1)
        status, *_ = get_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, "available")
        status, *_ = get_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, "available only to user")
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "reserved")

        # Move ahead in time, to prove which times are different
        current.request.now = current.request.now + datetime.timedelta(seconds=5)

        # Can buy it again, referencing old reservation
        reservation_add_to_basket(
            "UT::BK002",
            reservation_row,
            dict(
                # NB: We don't set user_sponsor_name, add_to_basket will work it out.
                e_mail="002@unittest.example.com",  # NB: Overriding original e_mail
                prev_reservation_id=expired_r_id,
            ),
        )

        # Has all the details from expired_r, but not transaction details
        status, _, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified waiting for payment")
        self.assertEqual(reservation_row.user_sponsor_name, "Arnold")
        self.assertEqual(reservation_row.e_mail, "002@unittest.example.com")
        self.assertEqual(reservation_row.PP_e_mail, None)
        self.assertEqual(reservation_row.PP_transaction_code, None)
        # self.assertEqual(reservation_row.username, username)

        # Buy it, compare details with expired row
        reservation_confirm_payment(
            "UT::BK002",
            10000,
            dict(
                PP_transaction_code="UT::PP2",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2002 GMT",
            ),
        )
        expired_r = db(db.expired_reservations.id == expired_r_id).select().first()
        status, param, reservation_row, _ = get_reservation(
            ott, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(param, None)
        # New row got an updated verified_timeif r.prev_reservation_id:
        self.assertEqual(
            reservation_row.verified_time,
            expired_r.verified_time + datetime.timedelta(seconds=5),
        )
        # Reserve time from previous entry kept
        self.assertEqual(reservation_row.reserve_time, expired_r.reserve_time)
        self.assertEqual(expired_r.sale_time, "01:01:01 Jan 01, 2001 GMT")
        self.assertEqual(reservation_row.sale_time, "01:01:01 Jan 01, 2002 GMT")
        self.assertEqual(reservation_row.username, username)
        self.assertEqual(reservation_row.user_sponsor_name, "Arnold")
        self.assertEqual(reservation_row.verified_name, "Definitely Arnold")
        self.assertEqual(reservation_row.PP_e_mail, "paypal@unittest.example.com")
        self.assertEqual(reservation_row.PP_transaction_code, "UT::PP2")
        self.assertEqual(reservation_row.verified_donor_name, "Emily")
        self.assertEqual(reservation_row.user_sponsor_kind, "for")
        self.assertEqual(reservation_row.verified_kind, "for")

    def test_reservation_confirm_payment__invalid(self):
        """Unknown baskets are an error"""
        with self.assertRaisesRegex(ValueError, r"PP_transaction_code"):
            reservation_confirm_payment("UT::invalid", 1000, dict())

        with self.assertRaisesRegex(ValueError, r"sale_time"):
            reservation_confirm_payment(
                "UT::invalid",
                1000,
                dict(PP_transaction_code="UT::001"),
            )

        with self.assertRaisesRegex(ValueError, r"basket_code UT::invalid"):
            reservation_confirm_payment(
                "UT::invalid",
                1000,
                dict(
                    PP_transaction_code="UT::001", sale_time="01:01:01 Jan 01, 2001 GMT"
                ),
            )

    def test_reservation_confirm_payment__giftaid(self):
        """Buy a single item with giftaid on/off"""

        # Buy ott1 with giftaid off
        ott1 = util.find_unsponsored_ott()
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row1,
            dict(
                e_mail="001@unittest.example.com",
                user_giftaid=False,
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_house_and_street="PP House",
                PP_postcode="PO12 3DE",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # Can't reserve it since it's unverified (not "sponsored" since we haven't set verified)
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        # E-mail got set, house/postcode didn't
        self.assertEqual(reservation_row1.PP_e_mail, "paypal@unittest.example.com")
        self.assertEqual(reservation_row1.PP_house_and_street, None)
        self.assertEqual(reservation_row1.PP_postcode, None)

        # Validate row, is fully sponsored
        reservation_row1.update_record(verified_time=current.request.now)
        status, *_ = get_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, "sponsored")

        # Buy ott2 with giftaid on
        ott2 = util.find_unsponsored_ott()
        status, _, reservation_row2, _ = get_reservation(
            ott2, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK002",
            reservation_row2,
            dict(
                e_mail="001@unittest.example.com",
                user_giftaid=True,
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK002",
            10000,
            dict(
                PP_transaction_code="UT::PP2",
                PP_house_and_street="PP House",
                PP_postcode="PO12 3DE",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # Address gets set, old row left alone
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(reservation_row1.PP_e_mail, "paypal@unittest.example.com")
        self.assertEqual(reservation_row1.PP_house_and_street, None)
        self.assertEqual(reservation_row1.PP_postcode, None)
        status, _, reservation_row2, _ = get_reservation(
            ott2, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        self.assertEqual(reservation_row2.PP_e_mail, "paypal@unittest.example.com")
        self.assertEqual(reservation_row2.PP_house_and_street, "PP House")
        self.assertEqual(reservation_row2.PP_postcode, "PO12 3DE")

        # Giftaid claimed
        reservation_row1.update_record(giftaid_claimed_on=current.request.now)
        # NB: DB round trip to round down to MySQL precision
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        old_claimed_time = reservation_row1.giftaid_claimed_on

        # Renew ott1, gift-aid no longer claimed
        reservation_add_to_basket("UT::BK003", reservation_row1, dict())
        reservation_confirm_payment(
            "UT::BK003",
            1000000,
            dict(
                PP_transaction_code="UT::PP3",
                PP_e_mail="paypal-new-addr@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(reservation_row1.giftaid_claimed_on, None)

        # ...but is on expired entry
        expired_row = (
            db(db.expired_reservations.id == reservation_row1.prev_reservation_id)
            .select()
            .first()
        )
        self.assertEqual(expired_row.giftaid_claimed_on, old_claimed_time)

    def test_reservation_confirm_payment__partner(self):
        """Buy/renew items with partner percentages"""
        from partners import (
            partner_definitions,
            partner_identifiers_to_reservation_name,
            partner_identifiers_for_reservation_name,
        )

        db.partners.update_or_insert(
            db.partners.partner_identifier == "ut:a",
            partner_identifier="ut:a",
            name="Unittest partner A",
            percentage=20,
        )
        db.partners.update_or_insert(
            db.partners.partner_identifier == "ut:b",
            partner_identifier="ut:b",
            name="Unittest partner B",
            percentage=40,
        )
        all_partners = partner_definitions()
        self.assertTrue(
            len(all_partners) > 0
        )  # NB: Need at least one partner for this to work
        partner_a = all_partners["ut:a"]
        partner_b = all_partners["ut:b"]

        # Buy ott1 with partner payment
        ott1 = util.find_unsponsored_ott()
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row1,
            dict(
                e_mail="001@unittest.example.com",
                partner_name=partner_identifiers_to_reservation_name(
                    [partner_a.partner_identifier]
                ),
                user_giftaid=False,
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_house_and_street="PP House",
                PP_postcode="PO12 3DE",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # Can't reserve it since it's unverified (not "sponsored" since we haven't set verified)
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        # Partner was set, with percentage
        self.assertEqual(
            partner_identifiers_for_reservation_name(reservation_row1.partner_name),
            [partner_a.partner_identifier],
        )
        self.assertEqual(reservation_row1.partner_percentage, partner_a.percentage)

        # Validate row, is fully sponsored
        reservation_row1.update_record(verified_time=current.request.now)
        status, *_ = get_reservation(ott1, form_reservation_code="UT::002")
        self.assertEqual(status, "sponsored")

        # Update the partner A percentage
        db.partners.update_or_insert(
            db.partners.partner_identifier == "ut:a",
            partner_identifier="ut:a",
            name="Unittest partner A",
            percentage=50,
        )

        # Buy ott1 again, after the partner percentage changed
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        reservation_add_to_basket(
            "UT::BK002",
            reservation_row1,
            dict(
                e_mail="001@unittest.example.com",
                user_giftaid=True,
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK002",
            10000,
            dict(
                sale_time="01:01:01 Jan 01, 2001 GMT",
                PP_transaction_code="UT::PP2",
            ),
        )

        # Percentage for partner updated
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::003"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(
            partner_identifiers_for_reservation_name(reservation_row1.partner_name),
            [partner_a.partner_identifier],
        )
        self.assertEqual(reservation_row1.partner_percentage, 50.0)

        # update percentage again, expire-and-repurchase
        db.partners.update_or_insert(
            db.partners.partner_identifier == "ut:a",
            partner_identifier="ut:a",
            name="Unittest partner A",
            percentage=70,
        )
        expired_r_id = reservation_expire(reservation_row1)
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::004"
        )
        reservation_add_to_basket(
            "UT::BK003",
            reservation_row1,
            dict(
                e_mail="001@unittest.example.com",
                prev_reservation_id=expired_r_id,
            ),
        )
        reservation_confirm_payment(
            "UT::BK003",
            10000,
            dict(
                sale_time="01:01:01 Jan 01, 2001 GMT",
                PP_transaction_code="UT::PP3",
            ),
        )
        status, _, reservation_row1, _ = get_reservation(
            ott1, form_reservation_code="UT::005"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(
            partner_identifiers_for_reservation_name(reservation_row1.partner_name),
            [partner_a.partner_identifier],
        )
        self.assertEqual(reservation_row1.partner_percentage, 70.0)

        # Buy ott2 with no partner
        ott2 = util.find_unsponsored_ott()
        status, _, reservation_row2, _ = get_reservation(
            ott2, form_reservation_code="UT::006"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK004",
            reservation_row2,
            dict(
                e_mail="001@unittest.example.com",
                user_giftaid=True,
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK004",
            10000,
            dict(
                PP_transaction_code="UT::PP2",
                PP_house_and_street="PP House",
                PP_postcode="PO12 3DE",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # partner details unset
        status, _, reservation_row2, _ = get_reservation(
            ott2, form_reservation_code="UT::007"
        )
        self.assertEqual(
            partner_identifiers_for_reservation_name(reservation_row2.partner_name), []
        )
        self.assertEqual(reservation_row2.partner_percentage, None)

    def test_reservation_confirm_payment__extension(self):
        """Buy an item twice to extend it"""

        # Buy ott1
        ott1 = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
                user_sponsor_kind="For",
                user_donor_name="Gertrude",
                verified_sponsor_name="Arnold",
                verified_kind="For",
                verified_donor_name="Gertrude",
            ),
        )
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # Can't reserve it since it's unverified (not "sponsored" since we haven't set verified)
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        # E-mail, asking price got set
        self.assertEqual(reservation_row.PP_e_mail, "paypal@unittest.example.com")
        self.assertGreater(reservation_row.asking_price, 4)
        orig_asking_price = reservation_row.asking_price

        # We paid well over the asking price, so there's a row with additional donation
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row.basket_code
        ).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(
            donations[0].user_paid, (10000 - orig_asking_price * 100) / 100
        )

        # Replaying a transaction gets ignored
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal-replay-attack@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "unverified")
        self.assertEqual(reservation_row.PP_e_mail, "paypal@unittest.example.com")

        # Validate row, is fully sponsored for 4 years
        util.verify_reservation(reservation_row)
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(reservation_row.user_sponsor_name, "Arnold")
        self.assertEqual(reservation_row.verified_name, "Arnold")
        self.assertEqual(reservation_row.user_donor_name, "Gertrude")
        self.assertEqual(reservation_row.verified_donor_name, "Gertrude")
        self.assertEqual(reservation_row.user_sponsor_kind, "For")
        self.assertEqual(reservation_row.verified_kind, "For")
        self.assertEqual(
            reservation_row.verified_time, current.request.now.replace(microsecond=0)
        )
        self.assertEqual(
            reservation_row.reserve_time, current.request.now.replace(microsecond=0)
        )
        self.assertEqual(reservation_row.sponsorship_duration_days, 365 * 4 + 1)
        self.assertLess(
            reservation_row.sponsorship_ends
            - current.request.now
            - datetime.timedelta(days=365 * 4 + 1),
            datetime.timedelta(minutes=1),
        )

        # Go forward 5 days
        current.request.now = current.request.now + datetime.timedelta(days=5)

        # ...but can add it to a new basket and renew it.
        reservation_add_to_basket(
            "UT::BK002",
            reservation_row,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK002",
            int(orig_asking_price * 100 * (1 - 0.2)),
            dict(
                PP_transaction_code="UT::PP2",
                PP_e_mail="paypal-new-addr@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )

        # Go forward 5 days again
        current.request.now = current.request.now + datetime.timedelta(days=5)

        # Now reserved for 8 years (NB: *not* 8 years, 10 days), with updated details
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "sponsored")  # NB: Verification status preserved
        # Verified as soon as we got dosh, *not* the verified time of the previous entry, or now.
        self.assertEqual(
            reservation_row.verified_time,
            current.request.now.replace(microsecond=0) - datetime.timedelta(days=5),
        )
        # Reserve time still the previous time
        self.assertEqual(
            reservation_row.reserve_time,
            current.request.now.replace(microsecond=0) - datetime.timedelta(days=10),
        )
        self.assertEqual(
            reservation_row.PP_e_mail, "paypal-new-addr@unittest.example.com"
        )
        self.assertEqual(
            reservation_row.sponsorship_duration_days, 365 * 4 + 1
        )  # NB: Duration still 4 years.
        self.assertLess(
            reservation_row.sponsorship_ends
            - current.request.now
            - datetime.timedelta(days=365 * 8 + 1),
            datetime.timedelta(minutes=1),
        )
        # Other writable details copied over
        self.assertEqual(reservation_row.user_donor_name, "Gertrude")
        self.assertEqual(reservation_row.verified_donor_name, "Gertrude")

        # The asking price dropped, as it's a renewal
        self.assertEqual(reservation_row.asking_price, orig_asking_price * (1 - 0.2))

        # We paid the correct figure, so no extra donation
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row.basket_code
        ).select()
        self.assertEqual(len(donations), 0)

        # Can find the old row as an expired reservation
        expired_row = (
            db(
                (db.expired_reservations.OTT_ID == ott1)
                & (db.expired_reservations.PP_transaction_code == "UT::PP1")
            )
            .select()
            .first()
        )
        self.assertEqual(expired_row.e_mail, "001@unittest.example.com")
        self.assertEqual(expired_row.PP_e_mail, "paypal@unittest.example.com")
        self.assertEqual(expired_row.asking_price, orig_asking_price)
        self.assertEqual(reservation_row.prev_reservation_id, expired_row.id)

    def test_reservation_confirm_payment__insufficientfunds(self):
        """Buying items with insufficient funds fails"""

        # Reserve 3 OTTs
        otts = util.find_unsponsored_otts(3)
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        status, _, reservation_row1, _ = get_reservation(
            otts[1], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        status, _, reservation_row2, _ = get_reservation(
            otts[2], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row0,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row1,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row2,
            dict(
                e_mail="001@unittest.example.com",
                user_sponsor_name="Arnold",  # NB: Have to at least set user_sponsor_name
            ),
        )

        # Pay ~nothing, none get bought, instead make a tiny donaton
        reservation_confirm_payment(
            "UT::BK001",
            1,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        self.assertEqual(
            reservation_row0.admin_comment,
            "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
        )
        status, _, reservation_row1, _ = get_reservation(
            otts[1], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        self.assertEqual(
            reservation_row1.admin_comment,
            "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
        )
        status, _, reservation_row2, _ = get_reservation(
            otts[2], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        self.assertEqual(
            reservation_row2.admin_comment,
            "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
        )
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row0.basket_code
        ).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, "0.01")
        self.assertEqual(donations[0].PP_transaction_code, "UT::PP1")

        # Try replaying the transaction, situation doesn't change
        reservation_confirm_payment(
            "UT::BK001",
            1,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        status, _, reservation_row1, _ = get_reservation(
            otts[1], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        status, _, reservation_row2, _ = get_reservation(
            otts[2], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row0.basket_code
        ).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, "0.01")

        # Pay again, enough for 2/3 items
        # NB: This is tricky, but not impossible, to do through the interface. Pay, press back, pay again.
        reservation_confirm_payment(
            "UT::BK001",
            reservation_row0.asking_price * 100
            + reservation_row1.asking_price * 100
            + 3,
            dict(
                PP_transaction_code="UT::PP2",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified")
        status, _, reservation_row1, _ = get_reservation(
            otts[1], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified")
        status, _, reservation_row2, _ = get_reservation(
            otts[2], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "unverified waiting for payment")
        self.assertEqual(
            reservation_row2.admin_comment,
            "\n".join(
                (
                    "reservation_confirm_payment: Transaction UT::PP2 insufficient for purchase. Paid %d"
                    % (
                        reservation_row0.asking_price * 100
                        + reservation_row1.asking_price * 100
                        + 3
                    ),
                    "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
                )
            ),
        )
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row0.basket_code
        ).select()
        self.assertEqual(len(donations), 2)
        self.assertEqual(donations[0].verified_paid, "0.01")
        self.assertEqual(donations[1].verified_paid, "0.03")

        # Verify otts[0]
        reservation_row0.update_record(verified_time=current.request.now)
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "sponsored")
        old_sponsorship_ends = reservation_row0.sponsorship_ends

        # Try to extend otts[0] without paying enough, should still be sponsored but sponsorship_ends same
        reservation_add_to_basket("UT::BK002", reservation_row0, dict())
        reservation_confirm_payment(
            "UT::BK002",
            2,
            dict(
                PP_transaction_code="UT::PP3",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2002 GMT",
            ),
        )
        status, _, reservation_row0, _ = get_reservation(
            otts[0], form_reservation_code="UT::001"
        )
        self.assertEqual(status, "sponsored")
        self.assertEqual(reservation_row0.sponsorship_ends, old_sponsorship_ends)
        self.assertEqual(
            reservation_row0.admin_comment,
            "\n".join(
                (
                    "reservation_confirm_payment: Transaction UT::PP3 insufficient for extension. Paid 2",
                    "reservation_confirm_payment: Transaction UT::PP1 insufficient for purchase. Paid 1",
                )
            ),
        )

        # Made a tiny donation
        donations = db(
            db.uncategorised_donation.basket_code == reservation_row0.basket_code
        ).select()
        self.assertEqual(len(donations), 1)
        self.assertEqual(donations[0].verified_paid, "0.02")

    def test_sponsorship_email_reminders(self):
        db = current.db

        def all_reminders(user_details=False):
            """Filter out non-unittest e-mail addresses"""
            out = {}
            for (k, r) in sponsorship_email_reminders():
                # Check URLs then hide them
                if k is None:
                    # Nonsense data in the DB
                    continue
                self.assertTrue(urllib.parse.quote(k) in r["renew_url"])
                del r["renew_url"]
                self.assertTrue(urllib.parse.quote(k) in r["unsubscribe_url"])
                del r["unsubscribe_url"]

                # Hide one or other, depending on what we're checking
                if user_details:
                    del r["final_reminders"]
                    del r["initial_reminders"]
                    del r["not_yet_due"]
                    del r["unsponsorable"]
                else:
                    del r["full_name"]
                    del r["pp_name"]
                    del r["user_sponsor_lang"]
                if k.endswith("unittestexamplecom"):
                    out[k] = r
            return out

        expiry_time = current.request.now + datetime.timedelta(days=4 * 365)
        # User 1 & 2 buy some OTTs
        email_1, user_1 = "1_betty@unittest.example.com", "1_bettyunittestexamplecom"
        email_2, user_2 = "2_gelda@unittest.example.com", "2_geldaunittestexamplecom"
        current.request.now = expiry_time - datetime.timedelta(days=4 * 365 + 40)
        r1_1 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        r2_1 = util.purchase_reservation(basket_details=dict(e_mail=email_2))[0]
        current.request.now = expiry_time - datetime.timedelta(days=4 * 365 + 20)
        r1_2 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        r2_2 = util.purchase_reservation(basket_details=dict(e_mail=email_2))[0]
        current.request.now = expiry_time - datetime.timedelta(days=4 * 365 + 0)
        r1_3 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        # All new, nothing to remind about
        self.assertEqual(all_reminders(), {})

        # Move forward in time, reservations about to expire
        current.request.now = expiry_time - datetime.timedelta(days=80)
        all_r = all_reminders()
        self.assertEqual(
            all_r,
            {
                user_1: dict(
                    username=user_1,
                    email_address=email_1,
                    initial_reminders=[r1_1.OTT_ID, r1_2.OTT_ID, r1_3.OTT_ID],
                    initial_triggers=[r1_1.OTT_ID, r1_2.OTT_ID],
                    final_reminders=[],
                    final_triggers=[],
                    days_left={
                        r1_1.OTT_ID: 40,
                        r1_2.OTT_ID: 60,
                        r1_3.OTT_ID: 80,
                    },
                    not_yet_due=[],
                    unsponsorable=[],
                ),
                user_2: dict(
                    username=user_2,
                    email_address=email_2,
                    initial_reminders=[r2_1.OTT_ID, r2_2.OTT_ID],
                    initial_triggers=[r2_1.OTT_ID, r2_2.OTT_ID],
                    final_reminders=[],
                    final_triggers=[],
                    days_left={
                        r2_1.OTT_ID: 40,
                        r2_2.OTT_ID: 60,
                    },
                    not_yet_due=[],
                    unsponsorable=[],
                ),
            },
        )

        # Ban one of user_1's OTTs
        db.banned.insert(ott=r1_1.OTT_ID)
        all_r = all_reminders()
        self.assertEqual(
            all_r,
            {
                user_1: dict(
                    username=user_1,
                    email_address=email_1,
                    initial_reminders=[r1_2.OTT_ID, r1_3.OTT_ID],
                    initial_triggers=[r1_2.OTT_ID],
                    final_reminders=[],
                    final_triggers=[],
                    days_left={
                        r1_2.OTT_ID: 60,
                        r1_3.OTT_ID: 80,
                    },
                    not_yet_due=[],
                    unsponsorable=[r1_1.OTT_ID],
                ),
                user_2: dict(
                    username=user_2,
                    email_address=email_2,
                    initial_reminders=[r2_1.OTT_ID, r2_2.OTT_ID],
                    initial_triggers=[r2_1.OTT_ID, r2_2.OTT_ID],
                    final_reminders=[],
                    final_triggers=[],
                    days_left={
                        r2_1.OTT_ID: 40,
                        r2_2.OTT_ID: 60,
                    },
                    not_yet_due=[],
                    unsponsorable=[],
                ),
            },
        )

        # Send e-mails for user_2, nothing more to tell them, but still told about user_1
        sponsorship_email_reminders_post(all_r[user_2])
        all_r = all_reminders()
        self.assertEqual(
            all_r,
            {
                user_1: dict(
                    username=user_1,
                    email_address=email_1,
                    initial_reminders=[r1_2.OTT_ID, r1_3.OTT_ID],
                    initial_triggers=[r1_2.OTT_ID],
                    final_reminders=[],
                    final_triggers=[],
                    days_left={
                        r1_2.OTT_ID: 60,
                        r1_3.OTT_ID: 80,
                    },
                    not_yet_due=[],
                    unsponsorable=[r1_1.OTT_ID],
                ),
            },
        )

        # Send e-mails for user_1, nothing more to tell them
        sponsorship_email_reminders_post(all_r[user_1])
        all_r = all_reminders()
        self.assertEqual(all_r, {})

        # Now r2_1 is due a final reminder, and told about their new purchase
        current.request.now = expiry_time - datetime.timedelta(days=51)
        r2_3 = util.purchase_reservation(basket_details=dict(e_mail=email_2))[0]
        all_r = all_reminders()
        self.assertEqual(
            all_r,
            {
                user_2: dict(
                    username=user_2,
                    email_address=email_2,
                    initial_reminders=[r2_2.OTT_ID],
                    initial_triggers=[],
                    final_reminders=[r2_1.OTT_ID],
                    final_triggers=[r2_1.OTT_ID],
                    days_left={
                        r2_1.OTT_ID: 11,
                        r2_2.OTT_ID: 31,
                    },
                    not_yet_due=[r2_3.OTT_ID],
                    unsponsorable=[],
                ),
            },
        )

        # Send that, nothing more to tell them
        sponsorship_email_reminders_post(all_r[user_2])
        all_r = all_reminders()
        self.assertEqual(all_r, {})

        # Hit critical for r1_2/r2_2, final reminders due, but r1_1 stays unsponsorable
        current.request.now = expiry_time - datetime.timedelta(days=20 + 15 - 1)
        all_r = all_reminders()
        self.assertEqual(
            all_r,
            {
                user_1: dict(
                    username=user_1,
                    email_address=email_1,
                    initial_reminders=[r1_3.OTT_ID],
                    initial_triggers=[],
                    final_reminders=[r1_2.OTT_ID],
                    final_triggers=[r1_2.OTT_ID],
                    days_left={
                        r1_3.OTT_ID: 34,
                        r1_2.OTT_ID: 14,
                    },
                    not_yet_due=[],
                    unsponsorable=[r1_1.OTT_ID],
                ),
                user_2: dict(
                    username=user_2,
                    email_address=email_2,
                    initial_reminders=[],
                    initial_triggers=[],
                    # NB: r2_1.OTT_ID hasn't expired, so still "final"
                    final_reminders=[r2_1.OTT_ID, r2_2.OTT_ID],
                    final_triggers=[r2_2.OTT_ID],
                    days_left={
                        r2_1.OTT_ID: -6,
                        r2_2.OTT_ID: 14,
                    },
                    not_yet_due=[r2_3.OTT_ID],
                    unsponsorable=[],
                ),
            },
        )

        # Send that, nothing more to tell them
        sponsorship_email_reminders_post(all_r[user_1])
        sponsorship_email_reminders_post(all_r[user_2])
        all_r = all_reminders()
        self.assertEqual(all_r, {})

    def test_sponsorship_restrict_contact(self):
        # Buy 2 otts
        user1, email1 = "bettyunittestexamplecom", "betty@unittest.example.com"
        r1 = util.purchase_reservation(basket_details=dict(e_mail=email1))[0]
        current.request.now = current.request.now + datetime.timedelta(days=10)
        r2 = util.purchase_reservation(basket_details=dict(e_mail=email1))[0]

        # Requesting reminders for no usernames returns nothing
        self.assertEqual(list(sponsorship_email_reminders([])), [])

        # Can explicitly request to see that nothing's due
        reminders = {k: r for (k, r) in sponsorship_email_reminders([user1])}[user1]
        self.assertEqual(reminders["initial_reminders"], [])
        self.assertEqual(reminders["final_reminders"], [])
        self.assertEqual(reminders["not_yet_due"], [r1.OTT_ID, r2.OTT_ID])
        self.assertEqual(reminders["unsponsorable"], [])

        # Move forward in time, reservations about to expire
        current.request.now = current.request.now + datetime.timedelta(
            days=(4 * 365) - 30
        )

        # Allowed to contact about the expiry
        reminders = {k: r for (k, r) in sponsorship_email_reminders()}[user1]
        self.assertEqual(reminders["initial_reminders"], [r2.OTT_ID])
        self.assertEqual(reminders["final_reminders"], [r1.OTT_ID])
        self.assertEqual(reminders["not_yet_due"], [])
        self.assertEqual(reminders["unsponsorable"], [])

        # After restricting contact, we're not
        sponsorship_restrict_contact(user1)
        self.assertNotIn(user1, set(k for (k, v) in sponsorship_email_reminders()))

        # But can explictly request the e-mail contents
        reminders = {k: r for (k, r) in sponsorship_email_reminders([user1])}[user1]
        self.assertEqual(reminders["initial_reminders"], [r2.OTT_ID])
        self.assertEqual(reminders["final_reminders"], [r1.OTT_ID])
        self.assertEqual(reminders["not_yet_due"], [])
        self.assertEqual(reminders["unsponsorable"], [])

    def test_reservation_get_all_expired(self):
        def gae():
            # We only care about our unittest entries, there may be other things lurking in the DB
            rows = [
                r
                for r in reservation_get_all_expired()
                if (r.e_mail or "").endswith("@unittest.example.com")
            ]
            return rows

        # Nothing has expired yet
        self.assertEqual([r.OTT_ID for r in gae()], [])

        # Buy ott1
        ott1 = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott1, form_reservation_code="UT::001"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK001",
            reservation_row,
            dict(
                e_mail="betty@unittest.example.com",
                user_sponsor_name="Betty",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK001",
            10000,
            dict(
                PP_transaction_code="UT::PP1",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 01, 2001 GMT",
            ),
        )
        reservation_row.update_record(verified_time=current.request.now)

        # Buy ott2 10 days later
        current.request.now = current.request.now + datetime.timedelta(days=10)
        ott2 = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(
            ott2, form_reservation_code="UT::002"
        )
        self.assertEqual(status, "available")
        reservation_add_to_basket(
            "UT::BK002",
            reservation_row,
            dict(
                e_mail="betty@unittest.example.com",
                user_sponsor_name="Betty",  # NB: Have to at least set user_sponsor_name
            ),
        )
        reservation_confirm_payment(
            "UT::BK002",
            10000,
            dict(
                PP_transaction_code="UT::PP2",
                PP_e_mail="paypal@unittest.example.com",
                sale_time="01:01:01 Jan 11, 2001 GMT",
            ),
        )
        reservation_row.update_record(verified_time=current.request.now)

        # Neither have expired yet
        self.assertEqual([r.OTT_ID for r in gae()], [])

        # 4 years later, the first has
        current.request.now = (
            current.request.now
            - datetime.timedelta(days=0)
            + datetime.timedelta(days=365 * 4 + 1)
        )
        self.assertEqual([r.OTT_ID for r in gae()], [ott1])

        # 10 days later, the second has too
        current.request.now = current.request.now + datetime.timedelta(days=10)
        self.assertEqual([r.OTT_ID for r in gae()], [ott1, ott2])

        # Expire the entries and they stop turning up
        rows = gae()
        reservation_expire(rows[0])
        self.assertEqual([r.OTT_ID for r in gae()], [ott2])
        reservation_expire(rows[1])
        self.assertEqual([r.OTT_ID for r in gae()], [])

    def test_reservation_time_limit(self):
        ott = util.find_unsponsored_ott()
        status, *_ = get_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, "available")
        status, *_ = get_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, "reserved")
        util.set_reservation_time_limit_mins(0)
        status, *_ = get_reservation(ott, form_reservation_code="UT::003")
        self.assertEqual(status, "available")


class SimpleMailMock:
    """A simple class to replace the ozmail.mailer instance for testing"""

    def __init__(
        self, validate_to, validate_subject_contains, validate_message_contains
    ):
        self.to = validate_to
        self.subject_contains = validate_subject_contains
        self.message_contains = validate_message_contains

    def send(self, **kwargs):
        if self.to and self.to != kwargs["to"]:
            raise ValueError(f'{kwargs["to"]} does not match {self.to} in `to:` field')
        if self.subject_contains and self.subject_contains not in kwargs["subject"]:
            raise ValueError(
                f'{kwargs["subject"]} does not contain {self.subject_contains} in `subject:` field'
            )
        if self.message_contains and self.message_contains not in kwargs["message"]:
            raise ValueError("message: field does not contain " + self.message_contains)


class TestSponsorRenewRequestLogic(TestSponsorship):
    good_email = "good_email@unittest.example.com"
    admin_email = "admin@unittest.example.com"
    flash_text = "If the user %s exists in our database"

    dummy_mail = SimpleMailMock(None, None, None)  # this always validates on `send`

    validate_user_mail = SimpleMailMock(
        good_email,
        "Renew your OneZoom sponsorships",  # used when user has requested a renewal link
        "To renew your sponsored species",
    )

    validate_auto_mail = SimpleMailMock(
        good_email,
        "OneZoom sponsorship reminder",  # text when "automated" set (cron job)
        "To renew your sponsored species",
    )

    validate_admin_mail = SimpleMailMock(
        admin_email,
        "Renew your OneZoom sponsorships",  # used when user has requested a renewal link
        "To renew your sponsored species",
    )

    def test_production_user_logic(self):
        # Will only attempt to send emails in the normal way if is_tasting==False and smtp set up
        util.set_is_testing(False)
        util.set_smtp(sender=self.admin_email)
        mailer = (
            self.validate_user_mail,
            "Mock mailer for a user-requested renewal req",
        )
        # Add emails to DB
        good_r = util.purchase_reservation(basket_details=dict(e_mail=self.good_email))[
            0
        ]
        bad_r = util.purchase_reservation(
            basket_details=dict(e_mail="bad@unittest.example.com")
        )[0]

        # Logic will work, but mock mailer won't match, so should raise an error
        self.assertRaisesRegex(
            ValueError, "to:", sponsor_renew_request_logic, bad_r.username, mailer
        )
        # Logic will work, and mock mailer matches
        info = sponsor_renew_request_logic(self.good_email, mailer)
        self.assertTrue(self.flash_text % self.good_email in info)
        info = sponsor_renew_request_logic(good_r.username, mailer)
        self.assertTrue(self.flash_text % good_r.username in info)
        self.assertFalse(
            self.good_email in info
        )  # Should not reveal the private email if username passed
        data = {
            k: r
            for (k, r) in sponsorship_email_reminders(for_usernames=[good_r.username])
        }
        self.assertTrue(good_r.username in data)
        self.assertTrue("renew_url" in data[good_r.username])
        self.assertFalse(data[good_r.username]["renew_url"] in info)

        # Same flash test even if user does not exist in DB
        for non_existing in ("ut::non_existing_user", "no_user@unittest.example.com"):
            mailer = (self.dummy_mail, "Mailer that always passes validation")
            info = sponsor_renew_request_logic(non_existing, mailer)
            self.assertTrue(self.flash_text % non_existing in info)

    def test_production_auto_logic(self):
        util.set_is_testing(False)
        util.set_smtp(sender=self.admin_email)
        auto_mailer = (
            self.validate_auto_mail,
            "Mock mailer for an auto renewal req, e.g. from cron",
        )
        good_r = util.purchase_reservation(basket_details=dict(e_mail=self.good_email))[
            0
        ]
        info = sponsor_renew_request_logic(good_r.username, auto_mailer, automated=True)
        self.assertTrue(self.flash_text % good_r.username in info)

    def test_management_reveal_private(self):
        # The management pages show what would have been sent (revealing private data),
        # but shouldn't actually send the email, as they do not pass a mailer
        util.set_is_testing(False)
        util.set_smtp(sender=self.admin_email)
        good_r = util.purchase_reservation(basket_details=dict(e_mail=self.good_email))[
            0
        ]
        mailer = (None, "No mailer provided")
        info = sponsor_renew_request_logic(
            good_r.username, None, reveal_private_data=True
        )
        data = {
            k: r
            for (k, r) in sponsorship_email_reminders(for_usernames=[good_r.username])
        }
        self.assertTrue(good_r.username in data)
        self.assertTrue("renew_url" in data[good_r.username])
        renew_url = data[good_r.username]["renew_url"]
        self.assertTrue("email_address" in data[good_r.username])
        email_address = data[good_r.username]["email_address"]

        self.assertTrue(info.startswith("The following mail should be sent to"))
        self.assertTrue(email_address in info)
        self.assertTrue(renew_url in info)  # This is private data

    def test_sponsor_renew_request_logic_testing(self):
        """
        In testing mode, send to admin
        """
        util.set_is_testing(True)
        util.set_smtp(sender=self.admin_email)
        good_r = util.purchase_reservation(basket_details=dict(e_mail=self.good_email))[
            0
        ]
        user_mailer = (self.validate_user_mail, "Validate admin email")
        admin_mailer = (self.validate_admin_mail, "Validate admin email")
        self.assertRaisesRegex(
            ValueError, "to:", sponsor_renew_request_logic, good_r.username, user_mailer
        )
        info = sponsor_renew_request_logic(good_r.username, mailer=admin_mailer)
        self.assertTrue(self.flash_text % good_r.username in info)
        self.assertFalse(
            self.flash_text % self.good_email in info
        )  # Still don't flash up email
        data = {
            k: r
            for (k, r) in sponsorship_email_reminders(for_usernames=[good_r.username])
        }
        self.assertTrue(good_r.username in data)
        self.assertTrue("renew_url" in data[good_r.username])
        self.assertFalse(data[good_r.username]["renew_url"] in info)


if __name__ == "__main__":
    import sys

    if current.globalenv["is_testing"] != True:
        raise RuntimeError(
            "Do not run tests in production environments, ensure is_testing = True"
        )
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestSponsorship))
    suite.addTest(unittest.makeSuite(TestMaintenance))
    suite.addTest(unittest.makeSuite(TestSponsorRenewRequestLogic))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
