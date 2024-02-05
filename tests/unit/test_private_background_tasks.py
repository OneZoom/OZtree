"""
Run with

python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_private_background_tasks.py
    
Note you should make sure prices are set before running tests (manage/SET_PRICES.html)
"""
import datetime
import subprocess
import unittest
import urllib.parse
import uuid

from applications.OZtree.tests.unit import util
from applications.OZtree.tests.util import web2py_app_dir
from OZfunc import nice_name_from_otts

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


def nice_name_from_ott(ott):
    return nice_name_from_otts([ott])[ott]


class TestBackgroundTasks(unittest.TestCase):
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

    def run_background_tasks(self, *args):
        out = subprocess.check_output(('grunt', ':'.join((
            'exec',
            'background_tasks',
            'ut-onezoom-host',
        ) + args)), cwd=web2py_app_dir, encoding='utf8')
        return out

    def test_background_reminder_emails(self):
        db = current.db

        # User 1 & 2 buy some OTTs in the past (NB: We can't influence the now of background_tasks.py)
        current.request.now = (current.request.now - datetime.timedelta(days=4*365 + 1))
        email_1, user_1 = '1_betty@unittest.example.com', '1_bettyunittestexamplecom'
        email_2, user_2 = '2_gelda@unittest.example.com', '2_geldaunittestexamplecom'
        r1_1 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        r2_1 = util.purchase_reservation(basket_details=dict(e_mail=email_2))[0]

        current.request.now = (current.request.now + datetime.timedelta(days=2))
        r1_2 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        r2_2 = util.purchase_reservation(basket_details=dict(e_mail=email_2))[0]

        current.request.now = (current.request.now + datetime.timedelta(days=10))
        r1_3 = util.purchase_reservation(basket_details=dict(e_mail=email_1))[0]
        db.commit()  # NB: We have to commit so the sub-process finds the entries

        # In dry-run mode we don't do anything, so can re-run
        out = self.run_background_tasks('dry-run')
        self.assertIn('Dear 1_betty@unittest.example.com', out)
        # NB: Check the days_left matches what we expect
        self.assertIn('* %s - now expired' % nice_name_from_ott(r1_1.OTT_ID), out)
        self.assertIn('* %s - final' % nice_name_from_ott(r1_2.OTT_ID), out)
        self.assertIn('* %s - 11 days' % nice_name_from_ott(r1_3.OTT_ID), out)
        self.assertIn('Dear 2_gelda@unittest.example.com', out)
        self.assertIn('* %s' % nice_name_from_ott(r2_1.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r2_2.OTT_ID), out)
        self.assertIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)

        out = self.run_background_tasks('dry-run')
        self.assertIn('Dear 1_betty@unittest.example.com', out)
        self.assertIn('* %s' % nice_name_from_ott(r1_1.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r1_2.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r1_3.OTT_ID), out)
        self.assertIn('Dear 2_gelda@unittest.example.com', out)
        self.assertIn('* %s' % nice_name_from_ott(r2_1.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r2_2.OTT_ID), out)
        self.assertIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)

        # Run once, do the same work
        out = self.run_background_tasks('log-email', 'verbose')
        self.assertIn('Dear 1_betty@unittest.example.com', out)
        self.assertIn('* %s' % nice_name_from_ott(r1_1.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r1_2.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r1_3.OTT_ID), out)
        self.assertIn('Dear 2_gelda@unittest.example.com', out)
        self.assertIn('* %s' % nice_name_from_ott(r2_1.OTT_ID), out)
        self.assertIn('* %s' % nice_name_from_ott(r2_2.OTT_ID), out)
        self.assertIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)
        self.assertIn('Dear 1_betty@unittest.example.com', out)
        self.assertIn('Dear 2_gelda@unittest.example.com', out)
        self.assertIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)

        # Now nothing to do
        out = self.run_background_tasks('log-email', 'verbose')
        self.assertNotIn('Dear 1_betty@unittest.example.com', out)
        self.assertNotIn('* %s' % nice_name_from_ott(r1_1.OTT_ID), out)
        self.assertNotIn('* %s' % nice_name_from_ott(r1_2.OTT_ID), out)
        self.assertNotIn('* %s' % nice_name_from_ott(r1_3.OTT_ID), out)
        self.assertNotIn('Dear 2_gelda@unittest.example.com', out)
        self.assertNotIn('* %s' % nice_name_from_ott(r2_1.OTT_ID), out)
        self.assertNotIn('* %s' % nice_name_from_ott(r2_2.OTT_ID), out)
        self.assertNotIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertNotIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)
        self.assertNotIn('Dear 1_betty@unittest.example.com', out)
        self.assertNotIn('Dear 2_gelda@unittest.example.com', out)
        self.assertNotIn('Expiring sponsorship for OTT %d' % r1_1.OTT_ID, out)
        self.assertNotIn('Expiring sponsorship for OTT %d' % r2_1.OTT_ID, out)


if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestBackgroundTasks))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
