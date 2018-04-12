# -*- coding: utf-8 -*-
import os.path
from time import sleep

from selenium import webdriver #to fire up a duplicate page

from .sponsorship_tests import SponsorshipTest
from ..functional_tests import web2py_viewname_contains, web2py_date_accessed, has_linkouts, linkouts_url, test_email
from ...util import base_url

class TestNormalSite(SponsorshipTest):
    """
    Used to test e.g. a museum display site, where allow_sponsorship = 0
    """
    maintenance_mins = 0
    allow_sponsorship = 1
    
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()

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

    def test_sponsoring_from_normal(self):
        """
        On the main OneZoom site, looking at an unsponsored (unvisted) OTTs should work as normal
        (when revisiting from another browser, we should get a 'temporarily reserved' page)
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        
        #here we open then reopen the same ott to check that opening from the same treeviewer is OK
        self.browser.get(self.urls['treeviewer'](ott)) #visit first
        self.browser.get(self.urls['treeviewer'](ott)) #visit second (should have same session)
        n_visits, last_visit, reserve_time = self.visit_data(ott)
        assert web2py_viewname_contains(self.browser, "sponsor_leaf")
        assert self.zoom_disabled()

        assert n_visits == 2, "should have recorded two visits"
        assert abs(web2py_date_accessed(self.browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
        assert abs(web2py_date_accessed(self.browser) - reserve_time).seconds == 0, "reserve time should be recorded as just now"
        self.browser.get(self.urls['web2py'](ott)) #visit from another page (not the same session)
        assert web2py_viewname_contains(self.browser, "spl_reserved")

        self.browser.get(self.urls['web2py_md_spons'](ott)) #visit from another page (not the same session)
        assert web2py_viewname_contains(self.browser, "spl_reserved")
        assert has_linkouts(self.browser, include_site_internal=False) == False
        assert self.zoom_disabled()
        
        self.browser.get(self.urls['treeviewer_md'](ott))
        assert web2py_viewname_contains(self.browser, "spl_elsewhere")
        assert has_linkouts(self.browser, include_site_internal=False) == False
        assert self.zoom_disabled()
        assert has_linkouts(self.browser, include_site_internal=False) == False

        self.browser.get(self.urls['web2py_nolinks'](ott)) #visit from another page (not the same session)
        assert web2py_viewname_contains(self.browser, "spl_reserved")
        assert has_linkouts(self.browser, include_site_internal=True) == False
        assert self.zoom_disabled()
        
        alt_browser = webdriver.Chrome()
        alt_browser.get(base_url + 'life')
        alt_url = linkouts_url(alt_browser, alt_browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()"), ott, "ozspons")
        alt_browser.get(alt_url)
        assert web2py_viewname_contains(alt_browser, "spl_reserved")
        alt_browser.quit()
        
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"


    def test_sponsoring_from_MD(self):
        """
        On the museum display OneZoom site, even if sponsorship is enabled we should get a sponsor_elsewhere page
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        
        #here we open then reopen the same ott to check that opening from the same treeviewer is OK
        self.browser.get(self.urls['treeviewer_md'](ott)) #only visit once, as this does not save session ids
        n_visits, last_visit, reserve_time = self.visit_data(ott)
        assert web2py_viewname_contains(self.browser, "spl_elsewhere")
        assert n_visits == 1, "should have recorded one visit"
        assert abs(web2py_date_accessed(self.browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
        assert reserve_time is None
        assert has_linkouts(self.browser, include_site_internal=False) == False
        assert self.zoom_disabled()
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott in the museum display should allocate a reservations row which has been deleted"
    
    
    def test_sponsoring_from_MD_with_spons(self):
        """
        Test non-treeview museum display embed mode allowing sponsorship (pointless while paypal cannot be iframed) 
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        self.browser.get(self.urls['web2py_md_spons'](ott)) 
        n_visits, last_visit, reserve_time = self.visit_data(ott)
        assert web2py_viewname_contains(self.browser, "sponsor_leaf")
        assert n_visits == 1, "should have recorded one visit"
        assert abs(web2py_date_accessed(self.browser) - last_visit).seconds == 0, "last visit time should be recorded as just now"
        assert abs(web2py_date_accessed(self.browser) - reserve_time).seconds == 0, "reserve time should be recorded as just now"
        assert has_linkouts(self.browser, include_site_internal=False) == False
        assert self.zoom_disabled()
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"


    def test_sponsor_reservation_expiry(self):
        """
        Test that after X minutes, a reserved entry becomes free again
        We need to do this by faking a reserve time into the database
        """
        ott, sciname = self.never_looked_at_ottname() #visiting this ott *may* make a new entry in the reservations table
        print(self.urls['web2py'](ott))
        self.browser.get(self.urls['web2py'](ott)) #visit from another page (not the same session)
        self.browser.get(self.urls['treeviewer'](ott))
        assert web2py_viewname_contains(self.browser, "spl_reserved")
        mins = self.browser.find_element_by_class_name("reserve_mins_left")
        mins = int(mins.get_attribute("innerHTML"))+1
        db_cursor = self.db['connection'].cursor()
        sql="UPDATE reservations SET reserve_time = DATE_ADD(reserve_time, INTERVAL {} MINUTE) where OTT_ID = {} LIMIT 1".format(self.db['subs'], self.db['subs'], self.db['subs'], self.db['subs'])
        db_cursor.execute(sql, (-mins, ott)) # versions are stored as negative numbers
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        self.browser.get(self.urls['treeviewer'](ott))
        assert web2py_viewname_contains(self.browser, "sponsor_leaf")

        
        n_deleted = self.delete_reservation_entry(ott, sciname, None)
        assert n_deleted == 1, "visiting an unvisited ott should allocate a reservations row which has been deleted"
        
    def test_payment_pathway(self):
        """
        Go through the payment process, checking at each stage whether the correct page is given.
        Do this from scratch, by getting the links from the life viewer in a different language
        We need to test 0) sponsor_leaf (the 'normal' page) 1) spl_reserved (reserved for someone else) 2) spl_waitpay 3) spl_unverified.html
        """
        
        test_name = "My tést <name> 漢字 + أبجدية عربية"
        test_4byte_unicode = " &amp; <script>" #annoyingly can't do this in selenium ChromeBrowser ()
        
        ott, sciname = self.never_looked_at_ottname()
        lang, expected_word ='fr', 'sponsorisé' #just to force errors, try sponsoring in a non-default browser language
        self.browser.get(base_url + 'life'+"/@={0}?init=jump&pop=osl_{0}&lang={1}".format(ott, lang))
        css_sel = ".ozspons iframe"
        for sleep_time in [0.1]*100: #try for 10 secs to get the iframe (takes some time to appear)
            if self.element_by_css_selector_exists(css_sel):
                break
            sleep(sleep_time)
        else:
            assert False, "timed out before the sponsorship iframe popped up (couldn't find selector '{}')".format(css_sel)
        iframe = self.browser.find_element_by_css_selector(css_sel)
        self.browser.switch_to.frame(iframe)
        sleep(1) #must wait for iframe to load properly
        assert web2py_viewname_contains(self.browser, "sponsor_leaf")
        assert expected_word in self.browser.page_source
                
        #fill in the form elements
        email = self.browser.find_element_by_id("e-mail_input")
        sponsor_name = self.browser.find_element_by_id("user_sponsor_name_input")
        more_info = self.browser.find_element_by_id("user_more_info_input")
        amount = self.browser.find_element_by_id("user_paid_input")
        
        email.send_keys(test_email) #should test too long a name
        sponsor_name.send_keys(test_name) #probably worth testing weird characters here
        more_info.send_keys(test_4byte_unicode) #probably worth testing weird characters here
        sponsorship_val = amount.get_attribute('value') #get what the value should be for later
        amount.clear() #deliberately fill in not enough money
        amount.send_keys("2")

        assert len(self.browser.window_handles) == 1, "Should start with only one window open"
        main_oz_tab = self.browser.window_handles[0]

        self.browser.find_element_by_id("submit_button").click()
        
        assert len(self.browser.window_handles) == 2, "Clicks on an iframed sponsor form always open in a new tab"
        new_tab = [x for x in self.browser.window_handles if x != main_oz_tab][0]
        self.browser.switch_to.window(new_tab)
        assert web2py_viewname_contains(self.browser, "sponsor_leaf"), "Too little money should be spotted and an error shown"

        amount = self.browser.find_element_by_id("user_paid_input")
        amount.clear()
        amount.send_keys(sponsorship_val) #fill in just enough money

        self.browser.find_element_by_id("submit_button").click()
        assert len(self.browser.window_handles) == 2, "Clicks on a non iframed sponsor form should not open in new tab"

        sleep(1)
        assert 'paypal.com' in self.browser.current_url, "Should redirect to paypal"
        
        self.browser.close()
        self.browser.switch_to.window(main_oz_tab)

        #has it filled out the DB
        #db_cursor = self.db['connection'].cursor()
        #sql="SELECT reserve_time, user_sponsor_lang FROM reservations where OTT_ID = {} LIMIT 1".format(self.db['subs'])
        #db_cursor.execute(sql, (-mins, ott)) # versions are stored as negative numbers
        #self.db['connection'].commit() #need to commit here otherwise next select returns stale data

             
        self.delete_reservation_entry(ott, sciname, test_email)
'''
    def test_partner_payment_pathway(self):
        """
        Go through the payment process for a partner site, checking at each stage whether the correct page is given.
        Do this from scratch, by getting the links from the life viewer in a different language
        We need to test 0) sponsor_leaf (the 'normal' page) 1) spl_reserved (reserved for someone else) 2) spl_waitpay 3) spl_unverified.html
        """
        
        test_name = "My tést <name> 漢字 + أبجدية عربية"
        test_4byte_unicode = " &amp; <script>" #annoyingly can't do this in selenium ChromeBrowser ()
        
        ott, sciname = self.never_looked_at_ottname()
        lang, expected_word ='fr', 'sponsorisé' #just to force errors, try sponsoring in a non-default browser language
        self.browser.get(base_url + 'life'+"/@={0}?init=jump&pop=osl_{0}&lang={1}".format(ott, lang))
        css_sel = ".ozspons iframe"
        for sleep_time in [0.1]*100: #try for 10 secs to get the iframe (takes some time to appear)
            if self.element_by_css_selector_exists(css_sel):
                break
            sleep(sleep_time)
        else:
            assert False, "timed out before the sponsorship iframe popped up (couldn't find selector '{}')".format(css_sel)
        iframe = self.browser.find_element_by_css_selector(css_sel)
        self.browser.switch_to.frame(iframe)
        sleep(1) #must wait for iframe to load properly
        assert web2py_viewname_contains(self.browser, "sponsor_leaf")
        assert expected_word in self.browser.page_source
                
        #fill in the form elements
        email = self.browser.find_element_by_id("e-mail_input")
        sponsor_name = self.browser.find_element_by_id("user_sponsor_name_input")
        more_info = self.browser.find_element_by_id("user_more_info_input")
        amount = self.browser.find_element_by_id("user_paid_input")
        
        email.send_keys(test_email) #should test too long a name
        sponsor_name.send_keys(test_name) #probably worth testing weird characters here
        more_info.send_keys(test_4byte_unicode) #probably worth testing weird characters here
        amount.send_keys("2") #deliberately fill in not enough money
'''