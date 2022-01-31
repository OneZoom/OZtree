"""
Run with
python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_modules_username.py
"""
import unittest

from gluon.globals import Request

from applications.OZtree.tests.unit import util

from sponsorship import (
    get_reservation,
    sponsorship_enabled,
    reservation_add_to_basket,
    reservation_confirm_payment,
)

from usernames import (
    find_username,
    email_for_username,
    usernames_associated_to_email,
)

class TestUsername(unittest.TestCase):
    def setUp(self):
        request = Request(dict())
        util.clear_unittest_sponsors()

        # Allow sponsorship by default
        util.set_allow_sponsorship(1)
        self.assertEqual(sponsorship_enabled(), True)
        
        # Set up some existing sponsorships
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code="UT::001")
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

        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code="UT::002")
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
        util.clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_with_username(self):
        """Should return the existing username, even if the email matches another or this has not been verified"""
        # Buy ott, validate
        otts = util.find_unsponsored_otts(2)
        added_rows = []
        for ott, e_mail in zip(
            otts,
            ['has_username@unittest.example.com', f'unused@unittest.example.com']
        ):
            status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
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
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
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
        otts = util.find_unsponsored_otts(len(fields)*2)
        for max_field in range(len(fields)):
            params = dict(prev_reservation=None, user_sponsor_kind='by')
            if fields[max_field][0].startswith("verified"):
                params.update(verified_kind='by')
            for add_email in [False, True]:
                ott = otts.pop()
                if add_email:
                    params.update(dict(e_mail='new_name@unittest.example.com'))
                status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
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
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
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
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail='no_username@unittest.example.com',
            user_sponsor_name="Becky the chicken",  # NB: Have to at least set user_sponsor_name
            user_donor_name="Definitely Bécky the_chîcken😀",
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(username, 'DefinitelyBeckythe_chicken')
        self.assertEqual(len(ids), 0)

    def test_duplicate_username_construction(self):
        """Should return a unique username"""
        # Buy ott, validate
        ott = util.find_unsponsored_ott()
        status, _, reservation_row, _ = get_reservation(ott, form_reservation_code=f"UT::{ott}")
        self.assertEqual(status, 'available')
        reservation_add_to_basket(f'UT::BK{ott}', reservation_row, dict(
            e_mail='no_username@unittest.example.com',
            user_sponsor_name="😀Arnold ",  # NB: when NFKD'ed this matches an existing username
            user_sponsor_kind="by",
            prev_reservation=None,
        ))
        test_row = db(db.reservations.OTT_ID == ott).select(db.reservations.ALL).first()
        username, ids = find_username(test_row)
        self.assertEqual(username, 'Arnold-2')
        self.assertEqual(len(ids), 0)

    def test_email_for_username(self):
        """Make sure we can always fish out a username"""
        # User with no e-mail addresses at all, get ValueError
        util.time_travel(3)
        r = util.purchase_reservation(basket_details=dict(
            user_donor_name='Billy-no-email',
            user_sponsor_name='Billy-no-email',
        ), paypal_details=dict(PP_e_mail=None))[0]
        with self.assertRaisesRegex(ValueError, r.username):
            email_for_username(r.username)

        # Buy one with only a paypal e-mail address, we get that back
        util.time_travel(2)
        r_alfred_1 = util.purchase_reservation(basket_details=dict(
            user_donor_name='Alfred',
            user_sponsor_name='Alfred',
        ), paypal_details=dict(PP_e_mail='alfred-pp@unittest.example.com'))[0]
        self.assertEqual(email_for_username(r_alfred_1.username), 'alfred-pp@unittest.example.com')

        # Same user, provide e-mail address, we get their proper e-mail address
        util.time_travel(1)
        r_alfred_2 = util.purchase_reservation(basket_details=dict(
            e_mail='alfred@unittest.example.com',
            user_donor_name='Alfred',
            user_sponsor_name='Alfred',
        ), paypal_details=dict(PP_e_mail='alfred-pp@unittest.example.com'))[0]
        self.assertEqual(r_alfred_2.username, r_alfred_1.username)
        self.assertEqual(email_for_username(r_alfred_1.username), 'alfred@unittest.example.com')

        # Buy another without an e-mail address, we fish out the previous entry rather than getting the PP address
        util.time_travel(0)
        r_alfred_3 = util.purchase_reservation(basket_details=dict(
            user_donor_name='Alfred',
            user_sponsor_name='Alfred',
        ), paypal_details=dict(PP_e_mail='alfred-pp@unittest.example.com'))[0]
        self.assertEqual(r_alfred_3.username, r_alfred_1.username)
        self.assertEqual(email_for_username(r_alfred_1.username), 'alfred@unittest.example.com')

    def test_usernames_associated_to_email(self):
        # Alfred changed their e-mail address to something more formal
        r = util.purchase_reservation(basket_details=dict(
            e_mail='alfredo-the-great@unittest.example.com',
            user_donor_name='Alfred',
            user_sponsor_name='Alfred',
        ), paypal_details=dict(PP_e_mail='alfred-pp@unittest.example.com'))[0]
        u_alfred = r.username
        r = util.purchase_reservation(basket_details=dict(
            e_mail='alfred@unittest.example.com',
            user_donor_name='Alfred',
            user_sponsor_name='Alfred',
        ), paypal_details=dict(PP_e_mail='alfred-pp@unittest.example.com'))[0]
        self.assertEqual(r.username, u_alfred)

        # Betty and Belinda share paypal e-mail addresses for some reason
        r = util.purchase_reservation(basket_details=dict(
            e_mail='betty@unittest.example.com',
            user_donor_name='Betty',
            user_sponsor_name='Betty',
        ), paypal_details=dict(PP_e_mail='bb@unittest.example.com'))[0]
        u_betty = r.username
        r = util.purchase_reservation(basket_details=dict(
            e_mail='belinda@unittest.example.com',
            user_donor_name='Belinda',
            user_sponsor_name='Belinda',
        ), paypal_details=dict(PP_e_mail='bb-x@unittest.example.com'))[0]
        u_belinda = r.username
        self.assertNotEqual(u_betty, u_belinda)

        # Now we have 2 records with non-matching usernames, an admin changes the PP_e_mail.
        r.update_record(PP_e_mail='bb@unittest.example.com')

        # All e-mail addresses should return something we expect
        self.assertEqual(usernames_associated_to_email('nonexistant@unittest.example.com'), ())
        self.assertEqual(usernames_associated_to_email('alfredo-the-great@unittest.example.com'), (u_alfred,))
        self.assertEqual(usernames_associated_to_email('alfred@unittest.example.com'), (u_alfred,))
        self.assertEqual(usernames_associated_to_email('alfred-pp@unittest.example.com'), (u_alfred,))
        self.assertEqual(usernames_associated_to_email('betty@unittest.example.com'), (u_betty,))
        self.assertEqual(usernames_associated_to_email('belinda@unittest.example.com'), (u_belinda,))
        self.assertEqual(set(usernames_associated_to_email('bb@unittest.example.com')), {u_betty, u_belinda,})


if __name__ == '__main__':
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestUsername))
    unittest.TextTestRunner(verbosity=2).run(suite)

