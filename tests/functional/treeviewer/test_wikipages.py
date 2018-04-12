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
            'treeviewer': lambda ott: linkouts_url(self.browser, js_get_life_link, ott, "ozspons"), #sponsorship links from js function in viewer
            'treeviewer_md': lambda ott: linkouts_url(self.browser, js_get_md_link, ott, "ozspons"), #sponsorship links from js function in MD viewer
        }
    
    

    def test_wikidata_has_wikipedia(self):
        """
        Test a page that *definitely* should have a wikipedia Qid, e.g. human, dog, cat
        """
        #self.browser.get(base_url + "life/@Homo_sapiens?pop=ol_{}".format(self.humanOTT))
        self.browser.get(self.urls['treeviewer'](self.humanOTT))

    def test_wikidata_no_wikipedia(self)
        """
        Test a page that has a Qid but no page in the requested language
        """

    def test_wikidata_no_wikipedia(self)
        """
        Test a page that has a Qid but no page in the requested language
        """
    