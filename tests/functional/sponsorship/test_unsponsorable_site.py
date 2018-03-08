# -*- coding: utf-8 -*-
from .sponsorship_tests import SponsorshipTest
from ..functional_tests import web2py_viewname_contains
from time import sleep

class TestUnsponsorableSite(SponsorshipTest):
    """
    Used to test e.g. a museum display site, where allow_sponsorship = 0
    """
    maintenance_mins = 0
    allow_sponsorship = 0
    
    def test_invalid(self):
        """
        In unsponsorable_site mode, invalid OTTs always ping up the invalid page
        """
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_invalid")
        SponsorshipTest.test_ott(self, assert_tests, self.invalid_ott())

    def test_banned(self):
        """
        In unsponsorable_site mode, banned OTTs always ping up the banned page
        """
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_banned")
        SponsorshipTest.test_ott(self, assert_tests, self.banned_unsponsored_ott())
        
    def test_already_sponsored(self):
        """
        In unsponsorable_site mode, already sponsored OTTs should always ping up the sponsored page
        """
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_sponsored")
        SponsorshipTest.test_ott(self, assert_tests, self.sponsored_ott())
        print("(banned but sponsored not implemented) ...", end="", flush=True)
        #SponsorshipTest.test_ott(self, assert_tests, self.banned_sponsored_ott())

    def test_sponsoring(self):
        """
        In unsponsorable_site mode, looking at an unsponsored (unvisted) OTTs should always ping up the sponsor-elsewhere page
        (also when revisiting from another browser, which would normally give a 'temporarily reserved' page)
        """
        def assert_tests(browser):
            assert web2py_viewname_contains(browser, "spl_elsewhere")
        def alt_browser_assert_tests(browser):
            assert_tests(browser)
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        SponsorshipTest.test_ott(self, assert_tests, ott, 
            extra_assert_tests_from_another_browser = alt_browser_assert_tests)
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"
