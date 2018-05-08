#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Get a list of all the public site webpages (functions in default.py) and check there are no 5XX server errors
If we get a 400 (client) error, then also test link provided in the link header
"""
import sys
import os.path
from time import sleep

import requests
from nose import tools


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import Web2py_server, base_url

class TestFunctionsInDefault(object):
    @classmethod
    def setUpClass(self):
        self.web2py = Web2py_server()
        public_page_list_url = base_url + "list_controllers.json"
        print(">> getting public webpages from " + public_page_list_url)
        json = requests.get(public_page_list_url, timeout=5).json()
        assert 'controllers' in json, "No web pages listed: " + ", ".join(json['errors'])
        self.webpages = json['controllers']
                
    @classmethod    
    def tearDownClass(self):
        self.web2py.stop_server()
    
    def test_default_webpages(self):
        """
        Check that all pages return a http 200 response, or if 400, have a header link to a correct version
        """
        for pagename in self.webpages:
            print(pagename)
            r = requests.get(base_url + pagename, timeout=5)
            if r.status_code != 200:
                if r.status_code == 400:
                    #this could be a page which requires args or vars setting
                    assert 'link' in r.headers and len(r.links) > 0, 'No link headers sent from {}'.format(base_url + pagename)
                    assert 'example' in r.links, 'No example link in link headers sent from {}'.format(base_url + pagename)
                    assert requests.get(r.links['example']['url'], timeout=5).status_code == 200, "Example link in '{}' invalid".format(base_url + pagename)
                else:
                    assert False, "Bad status code ({}) for default page {}".format(r.status_code, pagename)
    
