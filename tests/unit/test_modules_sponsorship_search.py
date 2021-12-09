"""
Run with::

    grunt exec:test_server:test_modules_sponsorship_search.py
"""
import unittest

from gluon.globals import Request

from applications.OZtree.tests.unit import util

import sponsorship
import sponsorship_search

class TestSponsorshipSearch(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        request = Request(dict())
        util.clear_unittest_sponsors()

        # Allow sponsorship by default
        util.set_allow_sponsorship(1)
        util.set_maintenance_mins(0)
        util.set_reservation_time_limit_mins(6)
        self.assertEqual(sponsorship.sponsorship_enabled(), True)

    def tearDown(self):
        util.clear_unittest_sponsors()
        # Remove anything created as part of tests
        db.rollback()

    def test_search_sponsor_noterm(self):
        """No search term returns {}"""
        out = sponsorship_search.search_sponsor("")
        self.assertEqual(out, {})


if __name__ == '__main__':
    suite = unittest.TestSuite()

    suite.addTest(unittest.makeSuite(TestSponsorshipSearch))
    unittest.TextTestRunner(verbosity=2).run(suite)
