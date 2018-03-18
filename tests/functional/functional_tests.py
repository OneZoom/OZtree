#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carry out functional tests on OneZoom pages using an automated browser via selenium

 Example: carry out all tests
    nosetests -w ./ tests/functional
 Example: carry out all tests for unsponsorable sites (museum displays)
    nosetests -vs functional/sponsorship/test_unsponsorable_site.py
 Example: carry out test that unsponsorable sites give the correct page for invalid otts 
    nosetests -vs functional/sponsorship/test_unsponsorable_site.py:TestUnsponsorableSite.test_invalid
    
 If you have installed the 'rednose' package (pip3 install rednose), you can get nicer output by e.g.
 
    nosetests -w ./ tests/functional --rednose
 
"""

import sys
import json
import os
import re
from datetime import datetime
from nose import tools
import requests
import subprocess

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities    

if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection, web2py_app_dir, web2py_server, base_url

date_format = "%Y-%m-%d %H:%M:%S.%f" #used when a web2py datetime on a webpage needs converting back to datetime format
test_email = 'test@onezoom.org'

class FunctionalTest(object):

    @classmethod
    def setUpClass(self):
        def striptext_in_file(line, file):
            """
            look for the line as a starting line in the file, stripping whitespace
            """
            line = line.strip().replace(" ","")
            for l in file:
                if l.strip().replace(" ","").startswith(line):
                    return True
            return False
        db_py_loc = os.path.realpath(os.path.join(web2py_app_dir, "models", "db.py"))
        with open(db_py_loc, 'r') as db_py:
            assert striptext_in_file("is_testing=True", db_py), "To do any functional testing you must set is_testing=True in " + db_py_loc
        self.db = get_db_connection()
        print("> starting web2py")
        try:
            self.web2py = web2py_server(self.appconfig_loc)
        except AttributeError:
            self.web2py = web2py_server()

        chrome_options = webdriver.ChromeOptions()
        # enable browser logging
        #chrome_options.add_experimental_option("mobileEmulation", { "deviceName": "iPhone 7" })
        caps = chrome_options.to_capabilities()
        caps['loggingPrefs'] = { 'browser':'ALL' }
        self.browser = webdriver.Chrome(desired_capabilities = caps)
        self.browser.implicitly_wait(1)

    @classmethod
    def tearDownClass(self):
        #should test here that we don't have any console.log errors (although we might have logs).
        self.browser.quit()
        print("> stopping web2py")
        self.web2py.kill()

    def setup(self):
        """
        By default, clear logs before each test
        """
        self.clear_log()

    def teardown(self):
        """
        By default, check javascript errors after each test. If you don't want to do this, e.g. for iframes, thic can be overridden
        """
        self.clear_log(check_errors=True)

    @tools.nottest
    def element_by_tag_name_exists(self, tag_name):
        try: self.browser.find_element_by_tag_name(tag_name)
        except NoSuchElementException: return False
        return True

    @tools.nottest
    def element_by_id_exists(self, id):
        try: self.browser.find_element_by_id(id)
        except NoSuchElementException: return False
        return True

    @tools.nottest
    def element_by_class_exists(self, cls):
        try: self.browser.find_element_by_class_name(cls)
        except NoSuchElementException: return False
        return True

    @tools.nottest
    def element_by_css_selector_exists(self, css):
        try: self.browser.find_element_by_css_selector(css)
        except NoSuchElementException: return False
        return True
    
    @tools.nottest
    def clear_log(self, check_errors=False):
        log = self.browser.get_log('browser')
        if check_errors:
            for message in log:
                if message['level'] not in ('INFO','WARNING','DEBUG'):
                    #we sometimes have media not found in EoL: hack round this
                    if not (message['message'].startswith("https://media.eol.org/content") and "404 (Not Found)" in message['message']):
                        assert False, "Javascript issue of level {}, : {}".format(message['level'], message['message'])
            
            
def has_linkouts(browser, include_site_internal):
    """
    Find tags with href attributes, e.g. <a>, <map>, etc. but allow some (e.g. link href=***)
    Depending on the param passed in, we may want to allow internal (relative) links such as 
    <a href='/sponsored'></a>
    """
    for tag in browser.find_elements_by_css_selector("[href^='http']"):
        if tag.tag_name != u'link': #should allow e.g. <link href="styles.css">
             return True
    for tag in browser.find_elements_by_css_selector("[href^='//']"):
        if tag.tag_name != u'link': #should allow e.g. <link href="styles.css">
             return True

    #all hrefs should now be http or https refs to local stuff. We should double check this
    #by looking at the tag.attribute which is fully expanded by selenium/chrome to include http
    #but we should exclude all page-local links (i.e. beginning with #)
    for tag in browser.find_elements_by_css_selector('[href]:not([href^="#"])'):
        if tag.tag_name != u'link':
            if include_site_internal:
                return True
            elif not tag.get_attribute('href').startswith('http'):
                #Allow http:// links which should all be internal / relative
                # but catch e.g. mailto:, ftp://, file:/// etc. and treat these all as linkouts
                return True

    #should be OK now - all elements are expanded to http but did not start with that originally
    return False    

def web2py_date_accessed(browser):
    #assumes that we have injected the access date into a meta element called 'date_accessed'
    #using the web2py code {{response.meta.date_accessed = request.now}}
    return datetime.strptime(browser.find_element_by_xpath("//meta[@name='date_accessed']").get_attribute("content"), date_format)
    
def web2py_viewname_contains(browser, expected_view):
    #Checks if we have injected the view name into a meta element called 'viewfile'
    #using the web2py code {{response.meta.viewfile = response.view}}
    try:
        return expected_view in browser.find_element_by_xpath("//meta[@name='viewfile']").get_attribute("content")
    except NoSuchElementException:
        return False

def linkouts_url(browser, url, ott_or_id, tab_name, lang=""):
    """
    This function can be used to convert a linkouts function in javascript
    to a URL to visit.
    Pass in a leaf_linkouts or node_linkouts function as a JS string 
    together with the ott (for leaves) or node id (for nodes) and a
    tab name such as 'wiki' or 'ozspons' (see linkouts() in controllers/tree.py).
    requires a browser to evaluate the JS
    """
    links = browser.execute_script("return (" + url + ")" + "({}, {})".format(ott_or_id, lang))
    json = requests.get(links).json()
    return json['data'][tab_name][0]


def make_temp_minlife_file(self):
    """Make a temporary minlife file in static, filename stored in self.minlife_file_location"""
    test_file = "minlife-test.html"
    self.created_temp_minlife = False
    self.minlife_file_location = os.path.join(web2py_app_dir, 'static', test_file)
    if os.path.isfile(self.minlife_file_location):
        raise Exception("There is already a test file in {}. Please remove it before continuing".format(self.minlife_file_location))
    else:
        print(">> making a temporary minlife file")
        response = requests.get(base_url+"treeviewer/minlife")
        with open(self.minlife_file_location, 'wb') as f:
            f.write(response.content)
        self.created_temp_minlife = True
        #process links (see the partial_install command in Gruntfile.js in the app dir)
        subprocess.call(['perl', '-i', os.path.join(web2py_app_dir, 'OZprivate','ServerScripts','Utilities','partial_install.pl'), self.minlife_file_location])

def remove_temp_minlife_file(self):
    if self.created_temp_minlife:
        os.remove(self.minlife_file_location) 

    
#def chrome_cmd(driver, cmd, params):
#        resource = "/session/%s/chromium/send_command_and_get_result" % driver.session_id
#        url = driver.command_executor._url + resource
#        body = json.dumps({'cmd':cmd, 'params': params})
#        response = driver.command_executor._request('POST', url, body)
#        return response.get('value')
