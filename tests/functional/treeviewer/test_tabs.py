# -*- coding: utf-8 -*-
"""
Simple test of the popup tabs - wiki, eol, IUCN, etc.
"""
import sys
import os.path
from time import sleep

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
        self.browser.get(base_url + 'life')
        js_get_life_leaf_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        js_get_life_node_link = self.browser.execute_script("return server_urls.OZ_node_json_url_func.toString()")
        self.urls={
            'leaf': lambda ott: linkouts_json(self.browser, js_get_life_leaf_link, ott), 
            'node': lambda id: linkouts_json(self.browser, js_get_life_node_link, id),
        }
    
    def test_all_tabs(self):
        """
        Test tabs within the treeviewer.
        For simplicity, most of the other tests in this file will work on the pages 
        outside of the viewer, but we should at least check one within the viewer
        
        opentree only in expert mode
        powo never
        """
        leaf_tab_names = sorted(self.urls['leaf'](self.humanOTT).keys())
        node_tab_names = sorted(self.urls['leaf'](self.mammalOTT).keys())
        self.browser.get(base_url + 'life.html/@={0}?pop=ol_{0}#x0,y0,w1'.format(self.humanOTT))
        sleep(10) # 10 seconds should be enough to load and pop up a tab
        for tab in leaf_tab_names:
            css_sel = "li#{} a".format(tab)
            assert self.element_by_css_selector_exists(css_sel), "A tabbed link should exist at `{}`".format(css_sel)
            print(self.browser.find_elements_by_css_selector(css_sel))
            print(self.browser.find_element_by_css_selector(css_sel))
            self.browser.find_elements_by_css_selector(css_sel)[0].click()
            sleep(3)
            self.browser.switch_to_frame(self.browser.find_element_by_css_selector(".popup-container .{} iframe".format(tab)))
            #for each tab, we need a different check
            #assert self.element_by_css_selector_exists("footer.wikipage-source")
            self.browser.switch_to.default_content()

