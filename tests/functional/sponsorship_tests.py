#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import requests
from nose import tools
from time import sleep

from selenium import webdriver #to fire up a duplicate page

from .functional_tests import FunctionalTest, base_url, appconfig_loc, test_email, web2py_viewname_contains


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
        print("creating temporary appconfig")
        FunctionalTest.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(FunctionalTest.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins") or line.lstrip().startswith("allow_sponsorship"):
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[sponsorship]"):
                        test.write("maintenance_mins = {}\n".format(self.maintenance_mins))
                        test.write("allow_sponsorship = {}\n".format(self.allow_sponsorship))
        FunctionalTest.setUpClass()
        
        #Now get sponsorship links from the main web2py site, from the "normal" OZ viewer, from a museum display, 
        #from a partner view and also a test case where all links are banned
        def web2py_url(ott):
            return base_url + 'sponsor_leaf?ott={}'.format(ott)

        def web2py_nolinks_url(ott):
            return base_url + 'sponsor_leaf?ott={}&embed=4'.format(ott)

        #save the leaf_linkouts urls for a few different pages in some permanent variables
        self.browser.get(base_url + 'life')
        js_get_life_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        self.browser.get(base_url + 'life_MD')
        js_get_md_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")

        def leaf_link(ott, url):
            """Get the link from a leaf_linkouts url"""
            leaf_links = self.browser.execute_script("return (" + url + ")" + "({})".format(ott))
            json = requests.get(leaf_links).json()
            return json['data']['ozspons']

        #make some functions that can be called that refer to the saved leaf_linkouts urls
        def life_link(ott):
            return leaf_link(ott, js_get_life_link)
        def md_link(ott):
            return leaf_link(ott, js_get_md_link)

        self.urls={
            'web2py':web2py_url,
            'web2py_nolinks':web2py_nolinks_url,
            'treeviewer':life_link,
            'treeviewer_md':md_link,
            }

    @classmethod
    def tearDownClass(self):
        print("removing temporary appconfig")
        os.remove(FunctionalTest.appconfig_loc)
        FunctionalTest.tearDownClass()
        
    @tools.nottest
    def get_never_looked_at_species(self):
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
        db_cursor.close() 
        return ott, sciname
    
    @tools.nottest
    def delete_reservation_entry(self, ott, name, email=test_email):
        """
        Warning: this will REMOVE data. Make sure that this is definitely one of the previously not looked at species
        Hence we pass *both* the ott and the name, and check that the reservation email matches test_email
        """
        db_cursor = self.db['connection'].cursor()
        sql="DELETE FROM `reservations` WHERE OTT_ID={0} AND name={0} AND e_mail={0} LIMIT 1".format(self.db['subs'])
        db_cursor.execute(sql, (ott, name, email))
        self.db['connection'].commit()
        #to do - verify that one was deleted
        db_cursor.close() 
    
    
    @tools.nottest
    def test_invalid_OTT(self, extra_assert_tests):
        """
        Give an invalid OTT. We should also test for 'species' with no space in the name, but we can't be guaranteed
        that there will be any of these
        """
        invalid_ott = -1
        self.browser.get(self.urls['web2py'](invalid_ott))
        extra_assert_tests(self)
        self.browser.get(self.urls['treeviewer'](invalid_ott))
        extra_assert_tests(self)
        #assert self.zoom_disabled()
        #here we should check that (most?) links open a new tab
        self.browser.get(self.urls['treeviewer_md'](invalid_ott))
        extra_assert_tests(self)
        assert self.has_linkouts(include_internal=False) == False
        self.browser.get(self.urls['web2py_nolinks'](invalid_ott))
        extra_assert_tests(self)
        assert self.has_linkouts(include_internal=True) == False

    @tools.nottest
    def test_banned(self, extra_assert_tests):
        """
        Humans are always banned
        """
        human_ott = 770315
        self.browser.get(self.urls['web2py'](human_ott))
        extra_assert_tests(self)
        self.browser.get(self.urls['treeviewer'](human_ott))
        extra_assert_tests(self)
        #here we should check that (most?) links open a new tab
        self.browser.get(self.urls['treeviewer_md'](human_ott))
        extra_assert_tests(self)
        assert self.has_linkouts(include_internal=False) == False
        self.browser.get(self.urls['web2py_nolinks'](human_ott))
        extra_assert_tests(self)
        assert self.has_linkouts(include_internal=True)  == False
       
    @tools.nottest
    def test_already_sponsored(self, extra_assert_tests):
        """
        We might also want to test a sponsored banned species here, like the giant panda
        """
        #Find a sponsored species
        sponsored = requests.get(base_url + 'sponsored.json').json()['rows']
        if len(sponsored)==0:
            assert False, 'No sponsored species to test against'
        else:
            example_sponsored_ott = sponsored[0]['OTT_ID']
            self.browser.get(self.urls['web2py'](example_sponsored_ott))
            extra_assert_tests(self)
            self.browser.get(self.urls['treeviewer'](example_sponsored_ott))
            extra_assert_tests(self)
            #here we should check that (most?) links open a new tab
            self.browser.get(self.urls['treeviewer_md'](example_sponsored_ott))
            extra_assert_tests(self)
            assert self.has_linkouts(include_internal=False) == False
            self.browser.get(self.urls['web2py_nolinks'](example_sponsored_ott))
            extra_assert_tests(self)
            assert self.has_linkouts(include_internal=True)  == False

    @tools.nottest
    def test_can_be_sponsored(self, expected_name):
        """
        Look at an existing one
        """
        ott, sciname = self.get_never_looked_at_species()
        page = self.page + "?ott={}".format(ott)
        self.browser.get(page)
        assert self.web2py_viewname_contains("spl_maintenance")
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.browser.get(page + "&embed=3")
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertFalse(self.has_linkouts(include_internal=False))


        #look at the same page with another browser to check that session reservation
        #still forwards to the same page
        alt_browser = webdriver.Chrome()
        alt_browser.get(page + "&embed=3")
        self.assertTrue(web2py_viewname_contains(alt_browser, "spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        alt_browser.quit()

        self.browser.get(page + "&embed=4")
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertFalse(self.has_linkouts(include_internal=True))


        self.delete_reservation_entry(ott, sciname)

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
        #first clear console log
        self.browser.get_log('browser')
        #imitate a touch zoom event
        self.browser.execute_script("""
t1 = new Touch({identifier: 1,target: document.body, pageX: 0, pageY: 0});
t2 = new Touch({identifier: 2,target: document.body, pageX: 1, pageY: 1});
te = new TouchEvent('touchstart', {cancelable: true, bubbles: true, touches: [t1, t2]});
document.body.dispatchEvent(te);""")
        sleep(4) #wait for event to bubble and be written to log
        #get new logs
        console_log = self.browser.get_log('browser')
        assert console_log[0]['source']=='console-api'
        assert "Touch zoom event blocked" in console_log[0]['message'] #in is_testing mode, should have a log message that event is blocked
