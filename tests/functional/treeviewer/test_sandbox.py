# -*- coding: utf-8 -*-
"""
Test that following links within the museum display never finds external links (e.g. to wikipedia)
We carry out recursive link following using selenium rather than e.g. requests+BeautifulSoup
so that 1) we can see where we are going 2) we use the same libraries as the rest of the test suite
"""
import sys
import os.path
from time import sleep


from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_url, has_linkouts

web2py_dir = os.path.realpath(os.path.join(web2py_app_dir, '..','..'))
sys.path = [p for p in sys.path if p != web2py_dir] #remove the web2py_dir from the path, otherwise _OZ_globals thinks we are running within web2py
sys.path.insert(1,os.path.realpath(os.path.join(web2py_app_dir,'models'))) # to get _OZ_globals
from _OZglobals import wikiflags

class TestSandbox(FunctionalTest):
    """
    Test whether the embedding functions work
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()
        self.browser.get(base_url + 'life_MD')
        js_get_md_link = self.browser.execute_script("return server_urls.OZ_leaf_json_url_func.toString()")
        self.wikilink = lambda slf, ott: linkouts_url(slf.browser, js_get_md_link, ott, "wiki")
    
    
    def test_sponsorship_sandbox(self):
        """
        pick an ott and follow some links
        """
        pass

            
    def test_wiki_sandbox(self):
        """
        Test that a handful of the wikipedia pages are properly sandboxed
        """
        #locate a few popular wikipedia pages and test sandboxing in different languages
        langs = ['zh','fr','en','en']
        lang_flags = {lang:2**bit for lang, bit in wikiflags.items()}
        db_cursor = self.db['connection'].cursor()
        db_cursor.execute("SELECT ott, wikipedia_lang_flag FROM ordered_leaves WHERE wikidata IS NOT NULL=1 AND wikipedia_lang_flag IS NOT NULL and wikipedia_lang_flag > 0 ORDER BY popularity DESC LIMIT 4")
        
        for lang, row in zip(langs, db_cursor.fetchall()):
            oz_wd_url = self.wikilink(row[0])
            if row[1] & lang_flags[lang]:
                oz_wd_url = oz_wd_url.replace("en/", lang)
            self.browser.get(oz_wd_url)
            sleep(2) #wait for ajax processing
            #check for no links in the page, even ones within the OZ website (although this does allow page-local links)
            assert has_linkouts(self.browser, include_site_internal=True) == False
        self.db['connection'].commit()
        db_cursor.close()