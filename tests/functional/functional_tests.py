#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carry out functional tests on OneZoom pages using an automated browser via selenium

 Example: carry out all tests
    nosetests -w ./ tests/functional
 Example: carry out all tests for unsponsorable sites (museum displays)
    nosetests -vs functional/sponsorship/test_unsponsorable_site.py
 Example: carry out test that unsponsorable sites give the correct page for invalid otts 
    nosetests -vs functional/sponsorship/test_unsponsorable_site.py:TestUnsponsorableSite.test_invalid
"""

import sys
import json
import subprocess
import os.path
import re
from datetime import datetime
from nose import tools

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities    

if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection, web2py_app_dir

ip = "127.0.0.1"
port = "8001"
base_url="http://"+ip+":"+port+"/"
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
            assert striptext_in_file("is_testing=True", db_py), "To do any testing you must set is_testing=True in " + db_py_loc
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
        print("> killing web2py")
        self.web2py.kill()

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
    

def has_linkouts(browser, include_internal):
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
    for tag in browser.find_elements_by_css_selector('[href]'):
        if tag.tag_name != u'link':
            if include_internal:
                return true
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

#def chrome_cmd(driver, cmd, params):
#        resource = "/session/%s/chromium/send_command_and_get_result" % driver.session_id
#        url = driver.command_executor._url + resource
#        body = json.dumps({'cmd':cmd, 'params': params})
#        response = driver.command_executor._request('POST', url, body)
#        return response.get('value')
        

def web2py_server(appconfig_file=None):
    cmd = ['python2', os.path.join(web2py_app_dir, '..','..','web2py.py'), '-Q', '-i', ip, '-p', port, '-a', 'pass']
    if appconfig_file is not None:
        cmd += ['--args', appconfig_file]
    return subprocess.Popen(cmd)
