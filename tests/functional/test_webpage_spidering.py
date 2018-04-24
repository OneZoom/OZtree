#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Starting from the index page, follow all links in <a href='XXX'> form, and collect all form submission
actions. To avoid looking at vast numbers of pages, and infinite recursion, we keep a list of the 
links we have followed, and don't follow to the same base page again.

It is slightly tricky to work out whether a page like /sponsor/argval is a page called argval within the 
sponsor controller, or a page called sponsor in the default controller with an argval argument. 
To detect these, we need to look at all the possible functions that can be called from the default
controller (and hence do not need a controller part of the URL). We can get these using list_controllers.json

Using selenium for each page allows us to check each page for JS errors too.
"""
import sys
import os.path
from nose import tools
from time import sleep
from urllib.parse import urlparse, urldefrag
import requests


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import web2py_server, web2py_app_dir, ip, base_url
from .functional_tests import FunctionalTest


class TestWebpageSpidering(FunctionalTest):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        sleep(1)
        public_page_list_url = base_url + "list_controllers.json"
        print(">> getting public webpages from " + public_page_list_url)
        self.requests_session = requests.Session()
        json = self.requests_session.get(public_page_list_url).json()
        assert 'controllers' in json, "No web pages listed: " + ", ".join(json['errors'])
        self.default_controller_funcs = json['controllers']

        
    external_links = set()
    all_links = set()
    internal_pages = set()
    internal_forms = set()
    
    def test_local_webpages(self):
        """
        Recursively checking all local pages and first level links
        """
        self.browser.get(base_url)
        self.check_page(self.browser)
        print("Checked internal pages {}".format(self.internal_pages))
        print("Checked external links {}".format(self.external_links))
    
    @tools.nottest
    def check_page(self, browser_at_location):
        """
        recursively check pages. To avoid recursing through all species etc, chop off cgi params
        """
        #get all links on page
        links = [link.get_attribute("href") for link in browser_at_location.find_elements_by_tag_name("a")] 
        for link in sorted(set([l for l in links if l and not l.startswith('mailto:')])):
            if link:
                assert urlparse(link).hostname is not None, "Searching by css should have filled out the whole URL, but it is '{}'".format(link)
                #visit the link (so we also test first level of external links)
                if urldefrag(link)[0] not in self.all_links:
                    self.all_links.add(urldefrag(link)[0])
                    try:
                        #get the status & content type before visiting. Some sites require a User-Agent & session (for cookies)
                        link_info = self.requests_session.head(link, allow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'})
                        if link_info.status_code != 200:
                            assert False, "Return code from {} is not 200".format(link)
                        else:
                            if not link_info.headers['Content-Type'].startswith('text/html'):
                                #don't get chrome to visit e.g. linked zip, pdf, jpg, or png files
                                #print("{} is not html, but {}".format(link, link_info.headers['Content-Type']))
                                pass
                            else:
                                browser_at_location.get(link) #change location if we have not visited this before
                                sleep(1) #wait until new page loaded
                                local_page_name = self.is_local_page_name(browser_at_location)
                                if local_page_name:
                                    self.clear_log(check_errors=True)
                                    if local_page_name not in self.internal_pages:
                                        self.internal_pages.add(local_page_name)
                                        #recurse
                                        self.check_page(browser_at_location)
                                else:
                                    self.external_links.add(link)
                                    self.clear_log(check_errors=False)
                    except requests.ConnectionError:
                        print("Error connecting to {}".format(link))
                        raise 
        
    def is_local_page_name(self, browser):
        """
        If a local page (to spider) return the raw page name (i.e. the function within a controller),
        otherwise return None (stop spidering)
        """
        url = urlparse(browser.current_url)
        assert url.hostname is not None
        if not url.hostname.endswith(ip):
            #not the local server
            return None

        pagename = "index.html" #default
        path_parts = url.path.split("/")
        assert path_parts[0] == ""
        if len(path_parts) > 1 and path_parts[1] != '':
            if path_parts[1].rsplit('.',1)[0] in self.default_controller_funcs:
                #this is in the 'default' controller, so the part after the first "/" is the page name
                pagename = path_parts[1]
            elif len(path_parts) > 2 and path_parts[2] != '':
                #this is in another controller, so so the part after the second "/" is the page name
                pagename = path_parts[2]
                
        return pagename.rsplit('.',1)[0] #chop off any extension