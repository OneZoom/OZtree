# -*- coding: utf-8 -*-
from .sponsorship_tests import SponsorshipTest
from ..functional_tests import web2py_viewname_contains, web2py_date_accessed
from time import sleep

class TestNormalSite(SponsorshipTest):
    """
    Used to test e.g. a museum display site, where allow_sponsorship = 0
    """
    maintenance_mins = 0
    allow_sponsorship = 1
    
    def test_invalid(self):
        """
        On the main OneZoom site, invalid OTTs always ping up the invalid page
        """
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_invalid")
        SponsorshipTest.test_ott(self, assert_tests, self.invalid_ott())

    def test_banned_unsponsored(self):
        """
        On the main OneZoom site, banned (and unsponsored) OTTs ping up the banned page
        """
        ott = self.banned_unsponsored_ott()
        prev_n_visits, prev_last_visit, prev_reserve_time = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_banned")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > prev_n_visits, "number of visits (was {}, now {}) should be augmented".format(prev_n_visits, n_visits)
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
            assert prev_reserve_time == reserve_time, "reserved time should not be recorded for banned species"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        
    def test_already_sponsored(self):
        """
        On the main OneZoom site, already sponsored OTTs should always ping up the sponsored page
        """
        ott = self.sponsored_ott()
        prev_n_visits, prev_last_visit, prev_reserve_time = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_sponsored")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > prev_n_visits, "number of visits (was {}, now {}) should be augmented".format(prev_n_visits, n_visits)
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
            assert prev_reserve_time == reserve_time, "reserved time should not be recorded for already sponsored species"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        print("(banned but sponsored not implemented) ...", end="", flush=True)
        #SponsorshipTest.test_ott(self, assert_tests, self.banned_sponsored_ott())

    def test_sponsoring(self):
        """
        On the main OneZoom site, looking at an unsponsored (unvisted) OTTs should work as normal
        (when revisiting from another browser, we should get a 'temporarily reserved' page)
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table

        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "sponsor_leaf")
            n_visits, last_visit, reserve_time = self.visit_data(ott)
            assert n_visits > 0, "number of visits should be recorded"
            assert abs(web2py_date_accessed(browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
            
        def alt_browser_assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_reserved")
            
        SponsorshipTest.test_ott(self, assert_tests, ott, 
            extra_assert_tests_from_another_browser = alt_browser_assert_tests)
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"
