# -*- coding: utf-8 -*-
from .sponsorship_tests import SponsorshipTest

class TestMaintenanceMode(SponsorshipTest):
    maintenance_mins = 99
    allow_sponsorship = 1
    
    def test_invalid(self):
        """
        In maintenance mode, invalid OTTs should always ping up maintenance page
        """
        def assert_tests(self):
            assert self.web2py_viewname_contains("spl_maintenance")
            assert self.browser.find_element_by_id('time').text == '99'
        SponsorshipTest.test_invalid_OTT(self, assert_tests)
    def test_banned(self):
        """
        In maintenance mode, banned OTTs should always ping up maintenance page
        """
        def assert_tests(self):
            assert self.web2py_viewname_contains("spl_maintenance")
            assert self.browser.find_element_by_id('time').text == '99'
        SponsorshipTest.test_banned(self, assert_tests)
        
    def test_already_sponsored(self):
        """
        In maintenance mode, already sponsored OTTs should always ping up maintenance page
        """
        def assert_tests(self):
            assert self.web2py_viewname_contains("spl_maintenance")
            assert self.browser.find_element_by_id('time').text == '99'
        SponsorshipTest.test_already_sponsored(self, assert_tests)
        
