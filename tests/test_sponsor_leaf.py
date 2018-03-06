#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from functional_tests import FunctionalTest, base_url, appconfig_loc, test_email, web2py_viewname_contains
import unittest
from selenium import webdriver #to fire up a duplicate page
import os.path
import shutil
import requests


class TestSponsorLeaf(FunctionalTest):
    """
    Test the various pages fired when leaf sponsorship is done. We don't test maintenance mode and sponsor_elsewhere
    here because they both require editing appconfig.ini, which influences the other pages, so these are tested
    in another file. Here we test
    
            [* error [spl_error.html] - something went very wrong]
            * invalid [spl_invalid.html] - not an actual sponsorable OTTid
            * banned [spl_banned.html] - cannot sponsor this
            * sponsored [spl_sponsored.html] - it's already been sponsored
            * unverified [spl_unverified.html] - it's already been sponsored but the details haven't been verified yet
            * unverified waiting for payment [spl_waitpay.html] - has been sponsored but paypal hasn't sent us confirmation (could be that they didn't actually pay, so may become free after a few days)
            * reserved [spl_reserved.html] - another user was active on this page recently and it's being reserved for them for a few minutes
            * available [sponsor_leaf.html] - the leaf is fully available, so proceed
            * available only to session [sponsor_leaf.html] - it's available but for this user only (how does this differ from above?)

    We want to set off one set of tests if allow_sponsorship is set in appconfig

    """
    
    @classmethod
    def setUpClass(self):
        """
        We must set appconfig.ini so that maintenance mode is off and sponsorship is allowed
        """
        self.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(self.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins") or line.lstrip().startswith("allow_sponsorship"):
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[sponsorship]"):
                        test.write("maintenance_mins = 0\n")
                        test.write("allow_sponsorship = 1\n")
        
        super(TestSponsorLeaf, self).setUpClass()

    @classmethod    
    def tearDownClass(self):
        os.remove(self.appconfig_loc)
        super(TestSponsorLeaf, self).tearDownClass()
        
    page = base_url + 'sponsor_leaf'
    
    
    
    def test_invalid_OTT(self):
        """
        Give an invalid OTT. We should also test for 'species' with no space in the name, but we can't be guaranteed
        that there will be any of these
        """
        self.browser.get(self.page + "?ott=0")
        self.assertTrue(self.web2py_viewname_contains("spl_invalid"))
        self.browser.get(self.page + "?ott=0&embed=3")
        self.assertTrue(self.web2py_viewname_contains("spl_invalid"))
        self.assertFalse(self.has_external_linkouts())

    def test_banned(self):
        """
        Humans are always banned
        """
        human_ott = 770315
        self.browser.get(self.page + "?ott={}".format(human_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_banned"))
        self.browser.get(self.page + "?ott={}&embed=3".format(human_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_banned"))
        self.assertFalse(self.has_external_linkouts())
        
    def test_already_sponsored(self):
        """
        We might also want to test a sponsored banned species here, like the giant panda
        """
        #Find a sponsored species
        sponsored = requests.get('http://127.0.0.1:8000/sponsored.json').json()['rows']
        if len(sponsored)==0:
            fail('No sponsored species to test against')
        else:
            example_sponsored_ott = sponsored[0]['OTT_ID']
            self.browser.get(self.page + "?ott={}".format(example_sponsored_ott))
            self.assertTrue(self.web2py_viewname_contains("spl_sponsored"))
            self.browser.get(self.page + "?ott={}&embed=3".format(example_sponsored_ott))
            self.assertTrue(self.web2py_viewname_contains("spl_sponsored"))
            self.assertFalse(self.has_external_linkouts())
        
    def test_payment_pathway(self):
        """
        Go through the payment process, checking at each stage whether the correct page is given.
        We need to test 0) sponsor_leaf (the 'normal' page) 1) spl_reserved (reserved for someone else) 2) spl_waitpay 3) spl_unverified.html
        """
        test_name = "My tést <name> 漢字 + أبجدية عربية"
        test_4byte_unicode = " &amp; <script>"
        
        ott, sciname = self.get_never_looked_at_species()
        page = self.page + "?ott={}".format(ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("sponsor_leaf"))
        #here we could test functionality of the main sponsor_leaf page
        
        
        #look at the same page with another browser to check if session reservation works
        alt_browser = webdriver.Chrome()
        alt_browser.get(page)
        self.assertTrue(web2py_viewname_contains(alt_browser, "spl_reserved"))
        alt_browser.quit()
        
        #fill in the form elements
        email = self.browser.find_element_by_id("e-mail_input")
        sponsor_name = self.browser.find_element_by_id("user_sponsor_name_input")
        more_info = self.browser.find_element_by_id("user_more_info_input")
        
        email.send_keys(test_email) #should test too long a name
        sponsor_name.send_keys(test_name) #probably worth testing weird characters here
        more_info.send_keys(test_4byte_unicode) #probably worth testing weird characters here
        
        self.browser.find_element_by_id("submit_button").click()
        
        #try getting information from the API (should not return)
             
        self.delete_reservation_entry(ott, sciname, test_email)

    def test_unverified(self):
        """
        We need to fake an paid but unverified reservation for this. The simplest way is to ***
        """
        pass


    def test_reserved(self):
        """
        Here we simply need to visit the page first, then check if it sets to reserved.
        We might also want to check session reservations etc here.
        """
        pass

