#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import requests
from nose import tools
from time import sleep

from selenium import webdriver #to fire up a duplicate page

from ...util import appconfig_loc, base_url, humanOTT
from ..functional_tests import FunctionalTest, test_email, web2py_viewname_contains, has_linkouts, linkouts_url


class SponsorshipTest(FunctionalTest):
    """
    Base class for testng the sponsorship pathway under different conditions
    """
    
    @classmethod
    def setUpClass(self):
        """
        When setting up the sponsorship pages testing suite we have to create a new appconfig.ini file
        and point out web2py instance at it so that we can adjust maintenance_mins and allow_sponsorship
        """
        print(">> creating temporary appconfig")
        self.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(self.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins") or line.lstrip().startswith("allow_sponsorship"):
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[sponsorship]"):
                        test.write("maintenance_mins = {}\n".format(self.maintenance_mins))
                        test.write("allow_sponsorship = {}\n".format(self.allow_sponsorship))
        super().setUpClass()
        
        #Now get s, from the "normal" OZ viewer, from a museum display, 
        #from a partner view and also a test case where all links are banned
        
        #In the main OneZoom viewer, the sponsorship popup urls are returned by calling the
        # server_urls.OZ_leaf_json_url_func javascript function, providing it with an ott, e.g.
        # server_urls.OZ_leaf_json_url_func(1234). We need to coppture this function as javascript,
        # and create a python function that will evaluate the js and create the correct url
        #We save these functions for a the MD and the main life page in some permanent variables
        self.browser.get(base_url + 'life')
        js_get_life_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        self.browser.get(base_url + 'life_MD')
        js_get_md_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")

        self.urls={
            'web2py': lambda ott: base_url + 'sponsor_leaf?ott={}'.format(ott), #sponsorship link from web2py directly
            'web2py_nolinks': lambda ott: base_url + 'sponsor_leaf?ott={}&embed=4'.format(ott), #sponsorship links from web2py no links directly
            # the next two use the linkouts_url function to convert the stringified js function to a python output
            'treeviewer': lambda ott: linkouts_url(self.browser, js_get_life_link, ott, "ozspons"), #sponsorship links from js function in viewer
            'treeviewer_md': lambda ott: linkouts_url(self.browser, js_get_md_link, ott, "ozspons"), #sponsorship links from js function in MD viewer
            }

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()
        print(">> removing temporary appconfig")
        os.remove(self.appconfig_loc)
        
    @tools.nottest
    def test_ott(self, extra_assert_tests, ott, extra_assert_tests_from_another_browser=None, browser=None):
        """
        Test the 4 separate urls, each viewing the same page linked from a different place
        (e.g. from the OZ tree viewer versus the min website, vs a museum display)
        
        If browser is None, use self.browser
        
        If extra_assert_tests_from_another_browser is set, then fire up another 
        browser midway through, and test those on that browser (allows us to test whether
        session id reservations work)
        """
        browser = self.browser if browser is None else browser
        print("|tree", end="", flush=True)
        browser.get(self.urls['treeviewer'](ott))
        extra_assert_tests(browser)
        assert self.zoom_disabled()
        if extra_assert_tests_from_another_browser is not None:
            #look at the same page with another browser to check that session reservation
            #still forwards to the same page
            print(" ... also testing same pages from an alternative browser ...", end="", flush=True)
            alt_browser = webdriver.Chrome()
            self.test_ott(extra_assert_tests_from_another_browser, ott, None, alt_browser)
            alt_browser.quit()
        #check all the alternative representations too
        print("|plain", end="", flush=True)
        browser.get(self.urls['web2py'](ott))
        extra_assert_tests(browser)
        print("|MD", end="", flush=True)
        browser.get(self.urls['treeviewer_md'](ott))
        extra_assert_tests(browser)
        assert has_linkouts(browser, include_site_internal=False) == False
        assert self.zoom_disabled()
        print("|nolink ", end="", flush=True)
        browser.get(self.urls['web2py_nolinks'](ott))
        extra_assert_tests(browser)
        assert has_linkouts(browser, include_site_internal=True) == False

    @tools.nottest
    def test_md_sandbox(self, ott):
        """
        Follow any links from the museum display page and collect a list. If any are external, return False
        """
        self.browser.get(self.urls['treeviewer_md'](ott))
        #Although any element can potentially link out to another page using javascript, 
        # the most likely elements that will cause a sandbox escape on our own page
        # are <a href=...> <form action=...> <area href=...>, or <button onclick=...>
        # For external pages (e.g. wikipages) we shoud ensure that JS is stripped.
        def first_external_link(self, already_followed):
            """
            Recurse through possible links from this page until we find an external one
            in which case we can return False, or 
            """
            return 
            
        for elem in self.browser.find_elements_by_tag_name('a'):
            href = elem.get_attribute('href')
        
        
    @tools.nottest
    def never_looked_at_ottname(self):
        """
        Find an unpopular species that has never been looked at (i.e. does not have an entry in the reservations table
        Don't take the *most* unpopular, as this could be spacial. Take e.g. the 20th least popular
        """
        db_cursor = self.db['connection'].cursor()
        sql = "SELECT COUNT(1) FROM ordered_leaves WHERE price IS NOT NULL"
        db_cursor.execute(sql)
        if db_cursor.fetchone()[0]==0:
            self.fail("Cannot test sponsorship: you need to set prices for leaves (go to {}/manage/SET_PRICES/)".format(base_url))
        sql="SELECT ol.ott, ol.name FROM ordered_leaves ol LEFT JOIN reservations r ON ol.ott = r.OTT_ID WHERE r.OTT_ID IS NULL AND ol.ott IS NOT NULL and ol.price IS NOT NULL ORDER BY ol.popularity LIMIT 1 OFFSET 20"
        db_cursor.execute(sql)
        ott = sciname = None
        try:
            ott, sciname = db_cursor.fetchone()
        except TypeError:
            self.fail("could not find a species which has not been looked at before")
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        db_cursor.close() 
        return ott, sciname
    
    @tools.nottest
    def delete_reservation_entry(self, ott, name, email=test_email):
        """
        Warning: this will REMOVE data. Make sure that this is definitely one of the previously not looked at species
        Hence we pass *both* the ott and the name, and (normally) check that the reservation email matches test_email
        """
        db_cursor = self.db['connection'].cursor()
        if email is None:
            #don't also check for email - be more wary of this, but needed e.g. when we can't add info via a sponsorship page
            sql="DELETE FROM `reservations` WHERE OTT_ID={0} AND name={0} LIMIT 1".format(self.db['subs'])
            n_rows = db_cursor.execute(sql, (ott, name))
        else:
            sql="DELETE FROM `reservations` WHERE OTT_ID={0} AND name={0} AND e_mail={0} LIMIT 1".format(self.db['subs'])        
            n_rows = db_cursor.execute(sql, (ott, name, email))
        self.db['connection'].commit()
        #to do - return the number of rows deleted (should be 0 or 1)
        db_cursor.close() 
        return n_rows

    @tools.nottest
    def invalid_ott(self):
        """
        Give an invalid OTT. We should also test for 'species' with no space in the name, but we can't be guaranteed
        that there will be any of these
        """
        return -1

    @tools.nottest
    def banned_unsponsored_ott(self):
        """
        Human ott is always banned, never sponsored
        """
        return humanOTT

    @tools.nottest
    def banned_sponsored_ott(self):
        """
        We could possibly pick pandas here, but we are not assured that they will be sponsored on all sites
        """
        raise NotImplementedError

       
    @tools.nottest
    def sponsored_ott(self):
        """
        We might also want to test a sponsored banned species here, like the giant panda
        """
        #Find a sponsored species
        sponsored = requests.get(base_url + 'sponsored.json').json()['rows']
        if len(sponsored)==0:
            assert False, 'No sponsored species to test against'
            return None
        else:
            return sponsored[0]['OTT_ID']
            
    @tools.nottest
    def visit_data(self, ott):
        """
        Return the num_views, last_view and the reserve_time for this ott
        """
        db_cursor = self.db['connection'].cursor()
        sql="SELECT num_views, last_view, reserve_time FROM `reservations` WHERE OTT_ID={0} LIMIT 1".format(self.db['subs'])        
        db_cursor.execute(sql, (ott,))
        row = db_cursor.fetchone()
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        db_cursor.close() 
        return row or (None, None, None)

    @tools.nottest
    def zoom_disabled(self):
        """
        Check that the touch zoom functionality is disabled.
        Note that this fakes a touch event and looks for a console log that it is disabled
        A proper functional test would actually automate a touch event and look to see if window.visualViewport.scale changes
        e.g.:
          zoom_level = self.browser.execute_script('return window.visualViewport.scale;') #works in chrome, not safari
          raise NotImplementedError, '''To DO: we need to figure out how to invoke a touch zoom event in Selenium, probably using 
            from selenium.webdriver.common.touch_actions import TouchActions'''
          self.assertTrue(zoom_level == self.browser.execute_script('return window.visualViewport.scale;'))
        """
        #first clear console log and check nothing untoward
        self.clear_log(check_errors=True)
        #imitate a touch zoom event
        self.browser.execute_script("""
t1 = new Touch({identifier: 1,target: document.body, pageX: 0, pageY: 0});
t2 = new Touch({identifier: 2,target: document.body, pageX: 1, pageY: 1});
te = new TouchEvent('touchstart', {cancelable: true, bubbles: true, touches: [t1, t2]});
document.body.dispatchEvent(te);""")
        sleep(3) #wait for event to bubble and be written to log
        #get new logs
        console_log = self.browser.get_log('browser')
        # in is_testing mode, should have a log message that event is blocked
        return console_log[0]['source']=='console-api' and console_log[0]['level']=='INFO' and "Touch zoom event blocked" in console_log[0]['message'] 