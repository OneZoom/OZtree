"""
Run with
python3 web2py.py \
    -S OZtree -M -R applications/OZtree/tests/unit/test_modules_username.py
"""
import unittest

from gluon.globals import Request

from applications.OZtree.tests.unit import util

from sponsorship import (
    add_reservation,
    sponsorship_enabled,
    reservation_add_to_basket,
    reservation_confirm_payment,
)

from usernames import (
    find_username,
)


class TestUsername(unittest.TestCase):
    def setUp(self):
        request = Request(dict())
        clear_unittest_sponsors()

        # Allow sponsorship by default
        set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)
        
        # Set up some existing sponsorships
        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code="UT::001")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK001', reservation_row, dict(
            e_mail='no_username@unittest.example.com',
            user_sponsor_name="No_Usernäme!",  # NB: Have to at least set user_sponsor_name
            verified_name="No_Usernäme!",
            prev_reservation=None,
        ))
        reservation_confirm_payment('UT::BK001', 10000, dict(
            PP_transaction_code='UT::PP1',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        reservation_row.update_record(verified_time=current.request.now)

        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code="UT::002")
        self.assertEqual(status, 'available')
        reservation_add_to_basket('UT::BK002', reservation_row, dict(
            e_mail='has_username@unittest.example.com',
            username="Arnold",
            user_sponsor_name="Arnöld",  # NB: Have to at least set user_sponsor_name
            verified_name="Definitely Arnöld",
            prev_reservation=None,
        ))
        reservation_confirm_payment('UT::BK002', 10000, dict(
            PP_transaction_code='UT::PP2',
            PP_e_mail='paypal@unittest.example.com',
            sale_time='01:01:01 Jan 01, 2001 GMT',
        ))
        reservation_row.update_record(verified_time=current.request.now)

    def tearDown(self):
        clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_with_username(self):
        """Should return the existing username, even if the email matches another or this has not been verified"""
        # Buy ott, validate
        otts = util.find_unsponsored_otts(db, 2)
        added_rows = []
        for ott, e_mail in zip(
            otts,
            ['has_username@unittest.example.com', f'unused@unittest.example.com']
        ):
            status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
            self.assertEqual(status, 'available')
            added_rows += [reservation_add_to_basket(
                f'UT::BK{ott}',
                reservation_row,
                dict(
                    username='Becky',
                    e_mail=e_mail,
                    user_sponsor_name="Becky the chicken",  # NB: Must at least set user_sponsor_name
                    verified_name="Definitely Becky the chicken",
                    prev_reservation=None,
                )
            )]
            test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
            username, ids = find_username(test_row)
            self.assertEqual(username, 'Becky')
            self.assertEqual(len(ids), len(added_rows))
            self.assertEqual(set(r.id for r in added_rows), set(ids))
            username, otts = find_username(test_row, return_otts=True)
            self.assertEqual(username, 'Becky')
            self.assertEqual(len(otts), len(added_rows))
            self.assertEqual(set(r.OTT_ID for r in added_rows), set(otts))

    def test_no_guess(self):
        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail=f'email_{ott}@unittest.example.com',
            user_sponsor_name="Becky the chicken",  # NB: Have to at least set user_sponsor_name
            user_sponsor_kind="for",  # NB: Have to at least set user_sponsor_name
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(ids, None)  #Since this is a sponsor_for without a username
        self.assertEqual(username, None)
        
    def test_nonmatching_without_username(self):
        """Should return a guess for a username"""
        # Buy ott, validate
        fields = [
            ('user_sponsor_name', "Becky the chicken 1"),
            ('user_donor_name', "Becky the chicken 2"),
            ('verified_name', "Becky the chicken 3"),
            ('verified_donor_name', "Becky the chicken 4"),
        ]
        otts = util.find_unsponsored_otts(db, len(fields)*2)
        for max_field in range(len(fields)):
            params = dict(prev_reservation=None, user_sponsor_kind='by', verified_kind='by')
            for add_email in [False, True]:
                ott = otts.pop()
                if add_email:
                    params.update(dict(e_mail='new_name@unittest.example.com'))
                status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
                self.assertEqual(status, 'available')
                params.update(dict(fields[:max_field+1]))
                reservation_add_to_basket(f'UT::BK{ott}', reservation_row, params)
                # Not verified, so shouldn't match previously added rows
                test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
                username, ids = find_username(test_row)
                self.assertEqual(username, fields[max_field][1].replace(" ", ""))
                self.assertEqual(len(ids), 0)
 
    def test_matching_email_with_username(self):
        """Should return the username of the matching email"""
        # Buy ott, validate
        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail='has_username@unittest.example.com',
            user_sponsor_name="Becky the chicken",  # NB: Have to at least set user_sponsor_name
            user_donor_name="Definitely Becky the chicken",
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(username, 'Arnold')  # Defined in setUp()
        self.assertEqual(len(ids), 1)

    def test_matching_email_without_username(self):
        """Should return the constructed username, as the matching email has no username"""
        # Buy ott, validate
        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail='no_username@unittest.example.com',
            user_sponsor_name="Becky the chicken",  # NB: Have to at least set user_sponsor_name
            user_donor_name="Definitely Bécky the_chîcken😀",
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(username, 'DefinitelyBeckythechicken')
        self.assertEqual(len(ids), 0)

    def test_duplicate_username_construction(self):
        """Should return a unique username"""
        # Buy ott, validate
        ott = util.find_unsponsored_ott(db)
        status, reservation_row, _ = add_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail='no_username@unittest.example.com',
            user_sponsor_name="_Arnold ",  # NB: when NFKD'ed this matches an existing username
            user_sponsor_kind="by",
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(username, 'Arnold_2')
        self.assertEqual(len(ids), 0)


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


if __name__ == '__main__':
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestUsername))
    unittest.TextTestRunner(verbosity=2).run(suite)

