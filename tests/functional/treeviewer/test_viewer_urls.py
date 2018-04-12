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
        self.browser.get(base_url + "life/@={}".format(self.humanOTT))
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        self.browser.get(base_url + "life/@Homo_sapiens={}".format(self.humanOTT))
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        self.browser.get(base_url + "life/@Homo_sapiens={}#x968,y237,w1.0172".format(self.humanOTT))
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False
        
    def test_nozoom_leaf(self):
        """
        Test jumping straight to a leaf without a hash specification
        There was a problem with this that was fixed with 3a057db85f94a761d56acf1c8fdd14370527762e
        """
        self.browser.get(base_url + "life/@Homo_sapiens={}?init=jump".format(self.humanOTT))
        assert self.browser.find_element_by_id("error-modal").is_displayed() == False