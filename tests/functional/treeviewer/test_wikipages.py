# -*- coding: utf-8 -*-
"""
Test the embedding of wikipedia or wikidata information
"""
import sys
import os.path
from time import sleep


from ...util import base_url
from ..functional_tests import FunctionalTest, linkouts_url, has_linkouts

class TestWikipages(FunctionalTest):
    """
    Tests the embedded wikipedia / wikidata pages, which are the most commonly viewed
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
        js_get_life_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        self.browser.get(base_url + 'life_MD')
        js_get_md_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        self.urls={
            'treeviewer': lambda ott: linkouts_url(self.browser, js_get_life_link, ott, "wiki"), #sponsorship links from js function in viewer
            'treeviewer_md': lambda ott: linkouts_url(self.browser, js_get_md_link, ott, "wiki"), #sponsorship links from js function in MD viewer
        }
    
    def test_in_treeviewer(self):
        """
        Test a wiki popup within the treeviewer itself, rather than a standalone page.
        For simplicity, most of the other tests in this file will work on the pages 
        outside of the viewer, but we should at least check one within the viewer
        """
        self.browser.get(base_url + 'life.html/@={0}?pop=ol_{0}#x0,y0,w1'.format(self.humanOTT))
        sleep(10) # 10 seconds should be enough to load and pop up a tab
        self.browser.switch_to_frame(self.browser.find_element_by_css_selector(".popup-container .wiki iframe"))
        #this iframe should exist and contain a footer of class "wikipage-source"
        assert self.element_by_css_selector_exists("footer.wikipage-source")
        self.browser.switch_to.default_content()

    def test_wikidata_has_wikipedia(self):
        """
        Test a page that *definitely* should have a wikipedia Qid, e.g. human, dog, cat
        """
        #self.browser.get(base_url + "life/@Homo_sapiens?pop=ol_{}".format(self.humanOTT))
        self.browser.get(self.urls['treeviewer'](self.humanOTT))
        sleep(5)
        assert self.element_by_css_selector_exists("footer.wikipage-source"), "Human should have wikipedia page"
        assert not self.element_by_class_exists("wiki-warning"), "Human wikipage should have no warnings"
        self.browser.get(self.urls['treeviewer'](self.dogOTT))
        sleep(5)
        assert self.element_by_css_selector_exists("footer.wikipage-source"), "Dog should have wikipedia page"
        assert not self.element_by_class_exists("wiki-warning"), "Dog wikipage should have no warnings"
        self.browser.get(self.urls['treeviewer'](self.catOTT))
        sleep(5)
        assert self.element_by_css_selector_exists("footer.wikipage-source"), "Wildcat should have wikipedia page"
        assert not self.element_by_class_exists("wiki-warning"), "Wildcat wikipage should have no warnings"

    def test_wikidata_no_wikipedia(self):
        """
        Test a page that has a Qid but no page in the requested language
        """
        pass
        
    def test_wikidata_no_wikipedia(self):
        """
        Test a page that has a Qid but no page in the requested language
        """
        pass