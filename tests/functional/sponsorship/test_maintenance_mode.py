# -*- coding: utf-8 -*-
from .sponsorship_tests import SponsorshipTest
from ..functional_tests import web2py_viewname_contains
from time import sleep

class TestMaintenanceMode(SponsorshipTest):
    maintenance_mins = 99
    allow_sponsorship = 1
    
    def test_invalid(self):
        """
        In maintenance mode, invalid OTTs should always ping up the maintenance page
        """
        ott = self.invalid_ott()
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_maintenance")
            assert browser.find_element_by_id('time').text == '99'
        SponsorshipTest.test_ott(self, assert_tests, ott)

    def test_banned_unsponsored(self):
        """
        In maintenance mode, banned OTTs should always ping up the maintenance page
        """
        ott = self.banned_unsponsored_ott()
        vd = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_maintenance")
            assert browser.find_element_by_id('time').text == '99'
            assert self.visit_data(ott) == vd, "visit data should not be changed in maintenance mode"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        
    def test_already_sponsored(self):
        """
        In maintenance mode, already sponsored OTTs should always ping up the maintenance page
        """
        ott = self.sponsored_ott()
        vd = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_maintenance")
            assert browser.find_element_by_id('time').text == '99'
            assert self.visit_data(ott) == vd, "visit data should not be changed in maintenance mode"
        SponsorshipTest.test_ott(self, assert_tests, ott)
        print("(banned but sponsored not implemented) ...", end="", flush=True)
        #SponsorshipTest.test_ott(self, assert_tests, self.banned_sponsored_ott())

    def test_sponsoring(self):
        """
        In maintenance mode, looking at an unsponsored (unvisted) OTTs should always ping up the maintenance page
        (also when revisiting from another browser, which would normally give a 'temporarily reserved' page)
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        vd = self.visit_data(ott)
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_maintenance")
            assert browser.find_element_by_id('time').text == '99'
            assert self.visit_data(ott) == vd, "visit data should not be changed in maintenance mode"
        def alt_browser_assert_tests(browser):
            assert_tests(browser)
        SponsorshipTest.test_ott(self, assert_tests, ott, 
            extra_assert_tests_from_another_browser = alt_browser_assert_tests)
        n_deleted = self.delete_reservation_entry(ott, sciname, None) #delete the previously created entry
        assert n_deleted == 0, "visiting an unvisited ott in maintenance mode should not allocate a reservations row"
