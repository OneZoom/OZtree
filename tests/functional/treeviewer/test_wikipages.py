# -*- coding: utf-8 -*-
"""
Test the embedding of wikipedia or wikidata information
"""
import sys
import os.path
from time import sleep

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_url

web2py_dir = os.path.realpath(os.path.join(web2py_app_dir, '..','..'))
sys.path = [p for p in sys.path if p != web2py_dir] #remove the web2py_dir from the path, otherwise _OZ_globals thinks we are running within web2py
sys.path.insert(1,os.path.realpath(os.path.join(web2py_app_dir,'models'))) # to get _OZ_globals
from _OZglobals import wikiflags


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
        js_get_life_leaf_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        js_get_life_node_link = self.browser.execute_script("return server_urls.OZ_node_json_url_func.toString()")
        self.browser.get(base_url + 'life_MD')
        js_get_md_leaf_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        js_get_md_node_link = self.browser.execute_script("return server_urls.OZ_node_json_url_func.toString()")
        self.urls={
            'leaf': lambda ott: linkouts_url(self.browser, js_get_life_leaf_link, ott, "wiki"), #wiki leaf links from js function in viewer
            'node': lambda id: linkouts_url(self.browser, js_get_life_node_link, id, "wiki"), #wiki node links from js function in viewer
            'leaf_md': lambda ott: linkouts_url(self.browser, js_get_md_leaf_link, ott, "wiki"), #sponsorship links from js function in MD viewer
            'node_md': lambda id: linkouts_url(self.browser, js_get_md_node_link, id, "wiki"), #sponsorship links from js function in MD viewer
            #hack in no_wikisearch
            'leaf_nosearch': lambda ott: linkouts_url(self.browser, "&no_wikisearch=1&".join(js_get_life_leaf_link.rsplit('&',1)), ott, "wiki"),
            'node_nosearch': lambda id: linkouts_url(self.browser, "&no_wikisearch=1&".join(js_get_life_node_link.rsplit('&',1)), id, "wiki"),
        }
    
    def test_in_treeviewer(self):
        """
        Test a wiki popup within the treeviewer itself, rather than a standalone page.
        For simplicity, most of the other tests in this file will work on the pages 
        outside of the viewer, but we should at least check one within the viewer
        """
        self.browser.get(base_url + 'life.html/@={0}?pop=ol_{0}#x0,y0,w1'.format(self.humanOTT))
        wait = WebDriverWait(self.browser, 10) # 10 seconds should be enough to load and pop up a tab
        wait.until(EC.frame_to_be_available_and_switch_to_it((By.CSS_SELECTOR, ".popup-container .wiki iframe")))
        #this iframe should exist and contain a footer of class "wikipage-source"
        sleep(2) #not sure what we need this...
        wait = WebDriverWait(self.browser, 30)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
        self.browser.switch_to.default_content()

    def test_wikidata_has_wikipedia(self):
        """
        Test pages that *definitely* should have a wikipedia Qid:
        """
        #self.browser.get(base_url + "life/@Homo_sapiens?pop=ol_{}".format(self.humanOTT))
        print("human", flush=True, end="")
        self.browser.get(self.urls['leaf'](self.humanOTT))
        wait = WebDriverWait(self.browser, 30)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Human wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Human wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for human wikipedia page"

        self.browser.get(self.urls['leaf_md'](self.humanOTT))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Human wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Human wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for human wikipedia page"

        print(", dog", flush=True, end="")
        self.browser.get(self.urls['leaf'](self.dogOTT))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Dog wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Dog wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for dog wikipedia page"

        print(", cat", flush=True, end="")
        self.browser.get(self.urls['leaf'](self.catOTT))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Wildcat wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Wildcat wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for wildcat wikipedia page"

        print(", mammals", flush=True, end="")
        self.browser.get(self.urls['node'](self.mammalID))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Mammal wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Mammal wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for mammal wikipedia page"

        self.browser.get(self.urls['node_md'](self.mammalID))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert not self.element_by_class_exists("wikipedia-warning"), "Mammal wikipage should have no warnings"
            assert not self.element_by_class_exists("wikidata-warning"), "Mammal wikipage should have no warnings"
        except TimeoutException:
            assert False,  "Timeout waiting for mammal wikipedia page"
        print(" ...", flush=True, end="")

    def test_wikidata_no_linked_wikipedia(self):
        """
        Test pages with a wikidata Qid but no enwiki page 
        """
        nolang_leaf_OTT, nolang_node_ID = self.get_nolang_wiki_entries()
        self.browser.get(self.urls['leaf'](nolang_leaf_OTT))
        wait = WebDriverWait(self.browser, 30)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            assert self.element_by_class_exists("wikipedia-warning"), \
                "Searching by name for a popular species with no enwiki sitelink should probably give a enwiki page"
        except TimeoutException:
            assert False,  "Timeout waiting for species with a wikidata number (should have a wiki tab even if there is no enwiki sitelink)"

        self.browser.get(self.urls['node'](nolang_node_ID))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            self.element_by_class_exists("wikipedia-warning"), \
                "Searching by name for a popular taxon with no enwiki sitelink should probably give a enwiki page"
        except TimeoutException:
            assert False,  "Timeout waiting for taxon with a wikidata number (should have a wiki tab even if there is no enwiki sitelink)"
        
        
    def test_wikidata_only_page(self):
        """
        Test pages with a wikidata Qid but no enwiki page, and do not allow name matching
        """
        nolang_leaf_OTT, nolang_node_ID = self.get_nolang_wiki_entries()
        self.browser.get(self.urls['leaf_nosearch'](nolang_leaf_OTT))
        wait = WebDriverWait(self.browser, 30)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            self.element_by_class_exists("wikidata-warning"), \
                "Searching for an unnamed species with no enwiki sitelink should give the wikidata page"
        except TimeoutException:
            assert False,  "Timeout waiting for species with a wikidata number (should have a wiki tab even if there is no enwiki sitelink)"

        self.browser.get(self.urls['node_nosearch'](nolang_node_ID))
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "footer.wikipage-source")))
            self.element_by_class_exists("wikidata-warning"), \
                "Searching for an unnamed taxon with no enwiki sitelink should give the wikidata page"
        except TimeoutException:
            assert False,  "Timeout waiting for taxon with a wikidata number (should have a wiki tab even if there is no enwiki sitelink)"
        sleep(2) #wait for logs to be written
        self.clear_log() #otherwise we get a few errors about unloaded pngs, due to the hacky way we display wikidata pages (through cors-anywhere.herokuapp.com)
        
    def get_nolang_wiki_entries(self):
        """
        Here we get the most popular species and group that has a wikidata entry but no associated english language articles on wikipedia
        """
        db_cursor = self.db['connection'].cursor()
        sql = "SELECT ott, id, name from ordered_{} where wikidata is not NULL and (wikipedia_lang_flag & {}) = 0 ORDER BY popularity DESC LIMIT 1"
        db_cursor.execute(sql.format('leaves', 2**wikiflags['en']))
        row = db_cursor.fetchone()
        nolang_leaf_OTT = int(row[0])
        print("(using popular species: {})".format(row[2]), end=" ", flush=True)
        assert nolang_leaf_OTT, "To test we need at least one leaf with a wikidata entry but no site languages - this could fail depending on wikidata completeness"
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        db_cursor.execute(sql.format('nodes', 2**wikiflags['en']))
        row = db_cursor.fetchone()
        nolang_node_ID = int(row[1])
        print("(using popular taxon: {})".format(row[2]), end=" ...", flush=True)
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        assert nolang_node_ID, "To test we need at least one leaf with a wikidata entry but no site languages - this could fail depending on wikidata completeness"
        db_cursor.close()
        return nolang_leaf_OTT, nolang_node_ID

