# -*- coding: utf-8 -*-
import os.path
from datetime import datetime

from .sponsorship_tests import SponsorshipTest
from ..functional_tests import web2py_viewname_contains, web2py_date_accessed

class TestUnsponsorableSite(SponsorshipTest):
    """
    Used to test e.g. a museum display site, where allow_sponsorship = 0
    """
    maintenance_mins = 0
    allow_sponsorship = 0
    
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()

    def test_invalid(self):
        """
        In unsponsorable_site mode, invalid OTTs always ping up the invalid page
        """
        ott = self.invalid_ott()
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_invalid")
        SponsorshipTest.test_ott(self, assert_tests, ott)

    def test_banned_unsponsored(self):
        """
        In unsponsorable_site mode, banned OTTs always ping up the banned page
        """
        ott = self.banned_unsponsored_ott()
        prev_n_visits, prev_last_visit, prev_reserve_time = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_banned")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > prev_n_visits, "number of visits (was {}, now {}) should be augmented in unsponsorable_site mode".format(prev_n_visits, n_visits)
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded just now, even in unsponsorable_site mode"
            assert prev_reserve_time == reserve_time, "reserved time should not be recorded for banned species"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        
    def test_already_sponsored(self):
        """
        In unsponsorable_site mode, already sponsored OTTs should always ping up the sponsored page
        """
        ott = self.sponsored_ott()
        prev_n_visits, prev_last_visit, prev_reserve_time = self.visit_data(ott)
        time_diff_v = datetime.now() - prev_last_visit
        time_diff_r = datetime.now() - prev_reserve_time
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_sponsored")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > prev_n_visits, "number of visits should be recorded in unsponsorable_site mode"
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded just now, even in unsponsorable_site mode"
            assert prev_reserve_time == reserve_time, "reserved time should not be recorded for already sponsored species"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        print("(banned but sponsored not implemented) ...", end="", flush=True)
        #SponsorshipTest.test_ott(self, assert_tests, self.banned_sponsored_ott())

    def test_sponsoring(self):
        """
        In unsponsorable_site mode, looking at an unsponsored (unvisted) OTT should always ping up the sponsor-elsewhere page
        (also when revisiting from another browser, which would normally give a 'temporarily reserved' page)
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_elsewhere")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > 0, "number of visits should be recorded in unsponsorable_site mode"
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded just now, even in unsponsorable_site mode"
            assert reserve_time is None, "reserved time ({}) should not be recorded if sponsorship is banned".format(reserve_time)            
        def alt_browser_assert_tests(browser):
            assert_tests(browser)
        SponsorshipTest.test_ott(self, assert_tests, ott, 
            extra_assert_tests_from_another_browser = alt_browser_assert_tests)
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"

    def test_sponsorship_sandbox(self):
        """
        """