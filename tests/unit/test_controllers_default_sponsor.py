import datetime

import unittest

from applications.OZtree.tests.unit import util

from gluon.globals import Request
from gluon.http import HTTP

import applications.OZtree.controllers.default as default

from sponsorship import sponsorship_config, sponsor_signed_url, reservation_expire


class ControllersDefaultSponsorInfo(unittest.TestCase):
    def setUp(self):
        util.clear_unittest_sponsors()
        util.set_allow_sponsorship(1)
        util.set_maintenance_mins(0)
        util.set_reservation_time_limit_mins(0)
        # Poke session / DB / request into API's namespace
        default.session = current.session
        default.db = current.db
        default.request = current.request
        default.response = current.response
        for n in current.globalenv.keys():
            setattr(default, n, current.globalenv[n])

    def tearDown(self):
        util.clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_sponsor_renew(self):
        expiry_time = current.request.now + datetime.timedelta(days=10*365)
        email_1, user_1 = '1_betty@unittest.example.com', '1_bettyunittestexamplecom'

        # Configure routing enough to get signatures right
        current.request.controller = 'default'
        current.request.function = 'sponsor_renew'
        current.request.args = [user_1]
        current.request.scheme = True
        current.request.extension = 'html'

        # Get signature wrong
        with self.assertRaises(HTTP):
            current.request.get_vars._signature = sponsor_signed_url('sponsor_renew.html', 'some other user').split('_signature=')[1]
            default.sponsor_renew()

        # Get signature right, no sponorships yet
        current.request.get_vars._signature = sponsor_signed_url('sponsor_renew.html', user_1).split('_signature=')[1]
        out = default.sponsor_renew()
        self.assertEqual(out['username'], user_1)
        self.assertEqual(out['show_donor_link'], False)  # Don't show donor link without sponsorships

        # Buy some OTTs
        current.request.now = expiry_time - datetime.timedelta(days=sponsorship_config()['duration_days'])
        rs = util.purchase_reservation(3, basket_details=dict(e_mail=email_1), verify=True)
        out = default.sponsor_renew()
        self.assertEqual(out['show_donor_link'], True)  # Do show donor link with sponsorships
        self.assertEqual(str(out['all_row_categories'][0]['title']), 'Active sponsorships')
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][0]['rows']], [r.OTT_ID for r in rs])
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][1]['rows']], [])
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][2]['rows']], [])

        # OTTs expiring soon
        current.request.now = expiry_time - datetime.timedelta(days=1)
        out = default.sponsor_renew()
        self.assertEqual(out['show_donor_link'], True)  # Do show donor link with sponsorships
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][0]['rows']], [])
        self.assertEqual(str(out['all_row_categories'][1]['title']), 'Sponsorships expiring soon')
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][1]['rows']], [r.OTT_ID for r in rs])
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][2]['rows']], [])

        # Fully expire OTTs
        current.request.now = expiry_time - datetime.timedelta(days=-1)
        for r in rs:
            reservation_expire(r)
        out = default.sponsor_renew()
        self.assertEqual(out['show_donor_link'], False)  # Don't show donor link without sponsorships
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][0]['rows']], [])
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][1]['rows']], [])
        self.assertEqual(str(out['all_row_categories'][2]['title']), 'Expired sponsorships')
        self.assertEqual([r.OTT_ID for r in out['all_row_categories'][2]['rows']], [r.OTT_ID for r in rs])

    def test_sponsor_renew_request(self):
        email_1, user_1 = '1_betty@unittest.example.com', '1_bettyunittestexamplecom'

        def srr(user_identifier):
            current.request.scheme = True
            current.request.extension = 'html'
            current.request.controller = 'default'
            current.request.function = 'sponsor_renew_request'
            current.request.vars.clear()
            current.session.flash = None
            current.globalenv['myconf']['smtp'] = dict(autosend_email=0)
            if user_identifier:
                current.request.vars['user_identifier'] = user_identifier
                current.request.vars['_formname'] = 'default'
            try:
                out = default.sponsor_renew_request()
            except HTTP as e:
                return dict(
                    status=e.status,
                    location=e.headers.get('Location'),
                    flash=current.session.flash,
                )
            return dict(
                status=current.response.status,
                flash=current.session.flash,
                form_errors=dict(out['form'].errors),
                form_latest=dict(out['form'].latest),
            )

        # Empty form, no message
        self.assertEqual(srr(None), dict(
            status=200,
            flash=None,
            form_errors={},
            form_latest={'user_identifier': None},
        ))
        # Sumbit something, get told we'll send an e-mail in a redirect (not a 200)
        self.assertEqual(srr(user_1), dict(
            status=303,
            location='/sponsor_renew_request',
            flash='If the user %s exists in our database, we will send them an email' % user_1,
        ))
        self.assertEqual(srr(email_1), dict(
            status=303,
            location='/sponsor_renew_request',
            flash='If the user %s exists in our database, we will send them an email' % email_1,
        ))


if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ControllersDefaultSponsorInfo))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
