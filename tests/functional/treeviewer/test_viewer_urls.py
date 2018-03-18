# -*- coding: utf-8 -*-
"""
Test the various forms of URL that the viewer can accept
"""
import sys
import os.path
from time import sleep


from ...util import base_url
from ..functional_tests import FunctionalTest, linkouts_url, has_linkouts

class TestViewerUrls(FunctionalTest):
    """
    TO DO
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()
    
    

    def test_plain_leaf(self):
        """
        Test normal methods of going to a leaf
        """
        #these should all be equivalent
        self.browser.get(base_url + "life/@Homo_sapiens")
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False        
        self.browser.get(base_url + "life/@=770315")
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        self.browser.get(base_url + "life/@Homo_sapiens=770315")
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        self.browser.get(base_url + "life/@Homo_sapiens=770315#x968,y237,w1.0172")
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        
    def test_nozoom_leaf(self):
        """
        Test jumping straight to a leaf without a hash specification
        """
        self.browser.get(base_url + "life/@Homo_sapiens=770315?init=jump")
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False