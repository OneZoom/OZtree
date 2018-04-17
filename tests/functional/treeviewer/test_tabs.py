# -*- coding: utf-8 -*-
"""
Simple test of the popup tabs - wiki, eol, IUCN, etc.
"""
import sys
import os.path
from time import sleep

import requests

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_json


class TestTabs(FunctionalTest):
    """
    Tests all the tabs in a simplistic way, assuming we can find all ones for humans (leaf) and mammals (node)
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()
        #In the main OneZoom viewer, the sponsorship popup urls are returned by calling the
        # server_urls.OZ_leaf_json_url_func javascript function, providing it with an ott, e.g.
        # server_urls.OZ_leaf_json_url_func(1234). We need to coppture this function as javascript,
        # and create a python function that will evaluate the js and create the correct url
        #We save these functions for a the MD and the main life page in some permanent variables
    
        self.linkout_css_tests = {
            'opentree': 'a[href="/about/open-tree-of-life"]',
            'wiki': 'table.infobox.biota', #taxonomy pages on wikipedia usually have a taxobox in the style <table class="infobox biota"...
            'eol':'h1.scientific_name', #current eol page flags up the scientific name
            'ncbi':'a[href="mailto:info@ncbi.nlm.nih.gov"]',
            'iucn':'a[href="http://www.iucn.org"]',
            'powo':'a[href="http://www.kew.org/science-conservation"]'
        }
        
    def teardown(self):
        """
        By default, check javascript errors after each test. If you don't want to do this, e.g. for iframes, thic can be overridden
        """
        self.clear_log(check_errors=False) #errors accumulate in the iframes, so ignore them. Note that this means we can't check for JS errors in our own popup code

        
    def test_no_tabs(self):
        """Deliberately call the tab popup function with no tabs asked for"""
    
    def test_all_tabs(self):
        """
        Test tabs within the expert treeviewer
        For simplicity, most of the other tests in this file will work on the pages 
        outside of the viewer, but we should at least check one within the viewer
        
        We get the list of possible tabs from UI_layer.json
        """
        checked_tabs = {t['id']:False for t in requests.get(base_url + 'treeviewer/UI_layer.json').json()['tabs']}
        
        for identifier, tip_type in [('oak','leaf'), ('human','leaf'), ('mammal','node')]:
            print(identifier + ":", flush=True, end="")
            self.browser.get(base_url + 'life_expert.html/@={0}?pop={1}_{2}#x0,y0,w1'.format(
                getattr(self, identifier + 'OTT'),
                'ol' if tip_type=='leaf' else 'on',
                getattr(self, identifier + 'OTT') if tip_type=='leaf' else getattr(self, identifier + 'ID')))
            sleep(5) # 10 seconds should be enough to load and pop up a tab
            for tab in self.browser.find_elements_by_css_selector('.external-tabs li:not([style*="display: none"])'):
                tabname = tab.get_attribute("id")
                anchors = tab.find_elements_by_tag_name("a")
                print(" " + tabname, flush=True, end="")
                assert len(anchors)==1, "A single tabbed link should exist for `{}`".format(tabname)
                anchors[0].click()
                wait_time = 2
                sleep(wait_time)
                iframe_css = ".popup-container .{} iframe".format(tabname)
                iframes = self.browser.find_elements_by_css_selector(iframe_css)
                assert len(iframes)==1, "A single iframe should exist in `{}` for '{}'".format(iframe_css, tabname)
                form_css = ".popup-container .{} form".format(tabname)
                forms = self.browser.find_elements_by_css_selector(form_css)
                assert len(forms)==1, "A single linkout form should exist in `{}` for '{}'".format(form_css, tabname)
                form_links = forms[0].find_elements_by_tag_name("a")
                assert len(form_links)==1, "A single linkout button in the form should exist in `{}` for '{}'".format(form_css, tabname)
                href = forms[0].get_attribute('action') or form_links[0].get_attribute('href')
                assert href, "There should always be a link out from each iframe"
                self.browser.switch_to_frame(iframes[0])
                
                #for each tab, we need a different check
                if tabname in self.linkout_css_tests:
                    for sleeptime in (2,2,3,4):
                        if not self.element_by_css_selector_exists(self.linkout_css_tests[tabname]):
                            wait_time+=sleeptime
                            sleep(sleeptime) #wait a bit more to see if the frame loads
                    assert self.element_by_css_selector_exists(self.linkout_css_tests[tabname]), \
                        "{} should exist in {} iframe, but is not accessible after {} secs. Check if {} is accessible online".format(
                        self.linkout_css_tests[tabname], tabname, wait_time, href)
                
                checked_tabs[tabname] = True
                self.browser.switch_to.default_content()
            print(", ", flush=True, end="")
        assert all(checked_tabs.values()), "All tab types should have been checked"
