#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Starting from the index page, follow all links in <a href='XXX'> form, and collect all form submission
actions. Using selenium allows us to check each page for JS errors too.
"""
import sys
import os.path
from nose import tools


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import web2py_server, web2py_app_dir
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities    

class TestWebpageSpidering(object):
    @classmethod
    def setUpClass(self):
        self.web2py = web2py_server()
        chrome_options = webdriver.ChromeOptions()
        # enable browser logging
        caps = chrome_options.to_capabilities()
        caps['loggingPrefs'] = { 'browser':'ALL' }
        self.browser = webdriver.Chrome(desired_capabilities = caps)
        self.browser.implicitly_wait(1)

    @classmethod    
    def tearDownClass(self):
        self.browser.quit()
        print("> stopping web2py")
        self.web2py.kill()
        
    
    external_links = set()
    internal_pages = set()
    internal_forms = set()
    
    def test_local_webpages(self):
        """
        """
        pass
    
    @tools.nottest
    def check_page(self, url):
        """
        recursively check pages. To avoid recursing through all species etc, chop off cgi params
        """