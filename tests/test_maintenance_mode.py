# -*- coding: utf-8 -*-
from functional_tests import FunctionalTest, base_url, appconfig_loc, web2py_viewname_contains

import os
import time
import requests
from selenium import webdriver #to fire up a duplicate page


class TestMaintenanceMode(FunctionalTest):
    """
    Test maintenance mode
    """
    @classmethod
    def setUpClass(self):
        self.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(self.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins"):
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[sponsorship]"):
                        test.write("maintenance_mins = 99\n")
        
        super(TestMaintenanceMode, self).setUpClass()
    
    @classmethod    
    def tearDownClass(self):
        os.remove(self.appconfig_loc)
        super(TestMaintenanceMode, self).tearDownClass()

    page = base_url + 'sponsor_leaf'
    
    def test_plain(self):
        self.browser.get(self.page)
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)

    def test_invalid(self):
        """
        Should always ping up maintenance mode
        """
        invalid_ott = -1
        page = self.page + "?ott={}".format(invalid_ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.browser.get(page + "&embed=3")
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()")) #context menu disabled
        self.assertFalse(self.has_linkouts(include_internal=False))
        self.browser.get(page + "&embed=4")
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()")) #context menu disabled
        self.assertFalse(self.has_linkouts(include_internal=True))

    def test_banned(self):
        """
        Humans are always banned
        """
        human_ott = 770315
        page = self.page + "?ott={}".format(human_ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.browser.get(page + "&embed=3")
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertFalse(self.has_linkouts(include_internal=False))
        self.browser.get(page + "&embed=4")
        self.assertEquals('99', self.browser.find_element_by_id('time').text)
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        self.assertFalse(self.has_linkouts(include_internal=True))
        
    def test_already_sponsored(self):
        """
        We might also want to test a sponsored banned species here, like the giant panda
        """
        #Find a sponsored species
        sponsored = requests.get(base_url + 'sponsored.json').json()['rows']
        if len(sponsored)==0:
            self.fail('No sponsored species to test against')
        else:
            example_sponsored_ott = sponsored[0]['OTT_ID']
            page = self.page + "?ott={}".format(example_sponsored_ott)
            self.browser.get(page)
            self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
            self.assertEquals('99', self.browser.find_element_by_id('time').text)
            self.browser.get(page + "&embed=3")
            self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
            self.assertEquals('99', self.browser.find_element_by_id('time').text)
            self.assertFalse(self.has_linkouts(include_internal=False))
            self.browser.get(page + "&embed=4")
            self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
            self.assertEquals('99', self.browser.find_element_by_id('time').text)
            self.assertFalse(self.has_linkouts(include_internal=True))

    def test_sponsor_elsewhere(self):
        """
        we will get this on the museum display versions
        """
        ott, sciname = self.get_never_looked_at_species()
        page = self.page + "?ott={}".format(ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
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


    def test_zoom_disabled(self):
        """
        Check that the touch zoom functionality is disabled.
        Note that this fakes a touch event and looks for a console log that it is diabled
        A proper functional test would actually automate a touch event and look to see if window.visualViewport.scale changes
        e.g.:
          zoom_level = self.browser.execute_script('return window.visualViewport.scale;') #works in chrome, not safari
          raise NotImplementedError, '''To DO: we need to figure out how to invoke a touch zoom event in Selenium, probably using 
            from selenium.webdriver.common.touch_actions import TouchActions'''
          self.assertTrue(zoom_level == self.browser.execute_script('return window.visualViewport.scale;'))
        """
        self.browser.get(self.page + "&embed=1")
        #first clear console log
        self.browser.get_log('browser')
        #imitate a touch zoom event
        self.browser.execute_script('''
t1 = new Touch({identifier: 1,target: document.body, pageX: 0, pageY: 0});
t2 = new Touch({identifier: 2,target: document.body, pageX: 1, pageY: 1});
te = new TouchEvent("touchstart", {cancelable: true, bubbles: true, touches: [t1, t2]});
document.body.dispatchEvent(te);
''')
        time.sleep(4) #wait for event to bubble and be written to log
        #get new logs
        console_log = self.browser.get_log('browser')
        self.assertTrue(console_log[0]['source']=='console-api')
        self.assertTrue("Touch zoom event blocked" in console_log[0]['message']) #in is_testing mode, should have a log message that event is blocked
       
        
