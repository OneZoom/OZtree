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

from selenium import webdriver
from selenium.common.exceptions import TimeoutException

if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import Web2py_server, web2py_app_dir, ip, base_url
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
        self.user_agent = self.browser.execute_script("return navigator.userAgent")
        
    external_links = set()
    all_links = set()
    internal_pages = set()
    internal_forms = set()
    
    def test_local_webpages(self):
        """
        Recursively checking site links (* = full local url check, . = partial local url check, + = full remote url check)
        """
        self.browser.get(base_url)
        self.browser.set_page_load_timeout(20) #give this many seconds to load a page
        #use an additional window which we can then close to hack around a weird selenium bug where hanging pages stop further page loading
        #see https://stackoverflow.com/questions/50031290/how-to-get-a-new-page-after-selenium-times-out-on-indefinitely-loading-page
        self.browser.execute_script("window.open('{}')".format(base_url))
        self.browser.switch_to_window(self.browser.window_handles[-1])
        self.check_page(self.browser)
        print("Checked internal pages {}".format(self.internal_pages))
        print("Checked external links {}".format(self.external_links))
    
    @tools.nottest
    def check_page(self, browser_at_location):
        """
        Recursively check pages. To avoid recursing through all species etc, chop off cgi params
        Print a dot for each page checked
        """
        #get all links on page
        requests_params = dict(allow_redirects=True, headers={'User-Agent': self.user_agent}, timeout=10)
        try:
            curr_url = browser_at_location.current_url
        except:
            curr_url = "Unknown"
            
        links = [link.get_attribute("href") for link in browser_at_location.find_elements_by_tag_name("a")] 
        for link in sorted(set([l for l in links if l and not l.startswith('mailto:')])):
            if link:
                assert urlparse(link).hostname is not None, "Searching by css should have filled out the whole URL, but it is '{}'".format(link)
                full_link = link #this definitely contians the hostname
                #visit the link (so we also test first level of external links)
                if urldefrag(full_link)[0] not in self.all_links:
                    self.all_links.add(urldefrag(full_link)[0])
                    try:
                        #get the status & content type before visiting. Some sites require a User-Agent & session (for cookies)
                        try:
                            link_info = self.requests_session.head(full_link, **requests_params)
                            if link_info.status_code != 200:
                                raise ValueError("Return code from HEAD request to {} is not 200".format(full_link))
                        except:
                            try:
                                #try again as some websites only like .get responses
                                link_info = self.requests_session.get(full_link, **requests_params)
                                if link_info.status_code != 200:
                                    print("Return code from GET request to {} is not 200".format(full_link))
                                    continue
                            except requests.exceptions.Timeout:
                                print("Attempt to request {} from {} timed out".format(full_link, curr_url))
                                continue
                            except Exception as e:
                                print("Attempt to request {} from {} had problems: {}".format(full_link, curr_url, str(e)))
                                continue
                            
                        if not link_info.headers['Content-Type'].startswith('text/html'):
                            #don't get chrome to visit e.g. linked zip, pdf, jpg, or png files
                            #print("{} is not html, but {}".format(full_link, link_info.headers['Content-Type']))
                            pass
                        else:
                            try:
                                local_page_name = self.is_local_page_name(full_link)
                                if local_page_name:
                                    if local_page_name not in self.internal_pages:
                                        self.internal_pages.add(local_page_name)
                                        #recurse
                                        self.clear_log(check_errors=False)
                                        browser_at_location.get(full_link) #visit internal links if not visited before
                                        self.clear_log(check_errors=True)
                                        print("*", end="", flush=True)
                                        self.check_page(browser_at_location)
                                    else:
                                        print(".", end="", flush=True)
                                else:
                                    self.external_links.add(full_link)
                                    self.clear_log(check_errors=False)
                                    browser_at_location.get(full_link) #visited external sites before
                                    sleep(1) #wait for logs to catch up
                                    self.clear_log(check_errors=False)
                                    print("+", end="", flush=True)
                            except TimeoutException:
                                print("Attempt to send browser to {} from {} timed out".format(full_link, curr_url))
                                #after timeout we often need to close the window to regain control of the browser
                                # see https://stackoverflow.com/questions/50031290/how-to-get-a-new-page-after-selenium-times-out-on-indefinitely-loading-page
                                assert len(browser_at_location.window_handles) == 2
                                #close existing
                                old_window_handle = [h for h in browser_at_location.window_handles if h != browser_at_location.current_window_handle][0]
                                while len(browser_at_location.window_handles) == 2:
                                    try:
                                        browser_at_location.close()
                                        print("Closed stalled window", flush=True)
                                        browser_at_location.switch_to_window(old_window_handle)
                                    except WebDriverException as e: #sometimes get Message: unknown error: failed to close window in 20 seconds
                                        print("Retrying after error: " + str(e), flush=True)
                                        sleep(2)
                                        
                                #open new
                                while len(browser_at_location.window_handles) < 2:
                                    try:
                                        browser_at_location.execute_script("window.open('about:blank')")
                                        print("Opened new window", flush=True)
                                        browser_at_location.switch_to_window(browser_at_location.window_handles[-1])  
                                    except Exception as e: #sometimes get timout
                                        print("Retrying after error: " + str(e), flush=True)
                                        sleep(2)
                                continue
                    except Exception as e:
                        print("Error connecting to {} from {}: {}".format(full_link, curr_url, str(e)))
                        raise
        
    def is_local_page_name(self, full_link):
        """
        If a local page (to spider) return the raw page name (i.e. the function within a controller),
        otherwise return None (stop spidering)
        """
        url = urlparse(full_link)
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
