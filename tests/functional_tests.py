#!/usr/bin/env python2
import sys
import json
import unittest
import re
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities    

import subprocess
import os.path

ip = "127.0.0.1"
port = "8001"
base_url="http://"+ip+":"+port+"/"
web2py_app_dir = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))
appconfig_loc = os.path.join(web2py_app_dir, 'private', 'appconfig.ini')

class FunctionalTest(unittest.TestCase):

    @classmethod
    def setUpClass(self):
        chrome_options = webdriver.ChromeOptions()
        # enable browser logging
        #chrome_options.add_experimental_option("mobileEmulation", { "deviceName": "iPhone 7" })
        caps = chrome_options.to_capabilities()
        caps['loggingPrefs'] = { 'browser':'ALL' }
        db_py_loc = os.path.realpath(os.path.join(web2py_app_dir, "models", "db.py"))
        with open(db_py_loc, 'r') as db_py:
            assert striptext_in_file("is_testing=True", db_py), "To do any testing you must set is_testing=True in " + db_py_loc
        try:
            self.web2py = web2py_server(self.appconfig_loc)
        except AttributeError:
            self.web2py = web2py_server()
        self.browser = webdriver.Chrome(desired_capabilities = caps)
        self.browser.implicitly_wait(1)

    @classmethod    
    def tearDownClass(self):
        self.browser.close()
        self.web2py.kill()

    def element_by_tag_name_exists(self, tag_name):
            try: self.browser.find_element_by_tag_name(tag_name)
            except NoSuchElementException, e: return False
            return True
            
    def element_by_id_exists(self, id):
            try: self.browser.find_element_by_id(id)
            except NoSuchElementException, e: return False
            return True
    
    def web2py_viewname_contains(self, expected_view):
        #assumes that we have injected the view name into a meta element called 'viewfile'
        #using the web2py code {{response.meta.viewfile = response.view}}
        try:
            return expected_view in self.browser.find_element_by_xpath("//meta[@name='viewfile']").get_attribute("content")
        except NoSuchElementException:
            return False

    def has_external_linkouts(self):
        #find things with href attributes, e.g. <a>, <map>, etc.
        total_links = 0
        for tag in self.browser.find_elements_by_css_selector("[href^='http']"):
            total_links+=1
            if tag.tag_name != u'link': #should allow e.g. <link href="styles.css">
                 return True
        for tag in self.browser.find_elements_by_css_selector("[href^='//']"):
            total_links+=1
            if tag.tag_name != u'link': #should allow e.g. <link href="styles.css">
                 return True

        #all hrefs should now be http or https refs to local stuff. We should double check this
        #by looking at the tag.attribute which is fully expanded by selenium/chrome to include http
        for tag in self.browser.find_elements_by_css_selector('[href]'):
            if tag.tag_name != u'link' and not tag.get_attribute('href').startswith('http'):
                #this catches e.g. mailto:, ftp://, file:/// etc.
                return True

        #should be OK now - all elements are expanded to http but did not start with that originally
        return False    

def chrome_cmd(driver, cmd, params):
        resource = "/session/%s/chromium/send_command_and_get_result" % driver.session_id
        url = driver.command_executor._url + resource
        body = json.dumps({'cmd':cmd, 'params': params})
        response = driver.command_executor._request('POST', url, body)
        return response.get('value')
        
def striptext_in_file(line, file):
    """
    look for the line as a starting line in the file, stripping whitespace
    """
    line = line.strip().replace(" ","")
    for l in file:
        if l.strip().replace(" ","").startswith(line):
            return True
    return False

def web2py_server(appconfig_file=None):
    cmd = ['python2', os.path.join('..','..','web2py.py'), '-Q', '-i', ip, '-p', port, '-a pass']
    if appconfig_file is None:
        return subprocess.Popen(cmd)
    else:
        return subprocess.Popen(cmd + ['--args', appconfig_file])
    
def run_functional_tests(glob=None):
    suite = unittest.defaultTestLoader.discover('tests', pattern='test_*{}.py'.format(glob+'*' if glob else ""))
    runner = unittest.TextTestRunner(verbosity=2).run(suite)

if __name__ == '__main__':
    import argparse;
    parser = argparse.ArgumentParser(
        description="Carry out functional tests on OneZoom pages.")
    parser.add_argument(
        "--pattern", default=None, help="Only carry out tests whose file names match this pattern")
    args = parser.parse_args()
    run_functional_tests(args.pattern)