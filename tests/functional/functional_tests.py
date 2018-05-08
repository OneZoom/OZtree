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
 
    nosetests -vs ./ tests/functional --rednose
    
 To carry out tests on a remote machine, only some of the tests will work. You can do
 
    nosetests -vs ./ tests/functional --rednose -a remote=beta.onezoom.org
 
"""

import sys
import json
import os
import re
from datetime import datetime
from nose import tools
import requests
import subprocess
import logging

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities    
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.remote_connection import LOGGER as selenium_logger


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection, web2py_app_dir, Web2py_server, base_url

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
        db_cursor = self.db['connection'].cursor()
        sql = {k:"SELECT ott, id FROM ordered_{} WHERE name = {}".format(k, self.db['subs']) for k in ('leaves','nodes')}
        try:
            db_cursor.execute(sql['leaves'], ("Homo sapiens",))
            self.humanOTT = int(db_cursor.fetchone()[0])
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            db_cursor.execute(sql['leaves'], ("Canis lupus",))
            self.dogOTT = int(db_cursor.fetchone()[0])
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            db_cursor.execute(sql['leaves'], ("Felis silvestris",))
            self.catOTT = db_cursor.fetchone()[0]
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            db_cursor.execute(sql['leaves'], ("Quercus robur",)) #get a plant with lot of data
            self.oakOTT = db_cursor.fetchone()[0]
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            db_cursor.execute(sql['nodes'], ("Mammalia",))
            self.mammalOTT, self.mammalID = db_cursor.fetchone()
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        except (ValueError, TypeError):
            assert False, "Could not find human, dog, cat, oak, or mammal OTTs"
            
        db_cursor.close()
        
        try:
            self.web2py = Web2py_server(self.appconfig_loc)
        except AttributeError:
            self.web2py = Web2py_server()

        logging.getLogger("requests").setLevel(logging.WARNING)
        logging.getLogger("urllib3").setLevel(logging.WARNING)
        selenium_logger.setLevel(logging.WARNING)
        #chrome_options = webdriver.ChromeOptions()
        #chrome_options.add_experimental_option("mobileEmulation", { "deviceName": "iPhone 7" })
        self.caps = webdriver.ChromeOptions().to_capabilities()
        # enable browser logging
        self.caps['loggingPrefs'] = { 'browser':'ALL' }
        self.browser = webdriver.Chrome(desired_capabilities = self.caps)
        self.browser.implicitly_wait(1)

    @classmethod
    def tearDownClass(self):
        #should test here that we don't have any console.log errors (although we might have logs).
        self.web2py.stop_server()
        
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
            
    @tools.nottest
    def zoom_disabled(self):
        """
        Check that the touch zoom functionality is disabled.
        Note that this fakes a touch event and looks for the variable set when it is disabled
        A proper functional test would actually automate a touch event and look to see if window.visualViewport.scale changes
        e.g.:
          zoom_level = self.browser.execute_script('return window.visualViewport.scale;') #works in chrome, not safari
          raise NotImplementedError, '''To DO: we need to figure out how to invoke a touch zoom event in Selenium, probably using 
            from selenium.webdriver.common.touch_actions import TouchActions'''
          self.assertTrue(zoom_level == self.browser.execute_script('return window.visualViewport.scale;'))
        """
        #imitate a touch zoom event
        test_text = 'zoom_prevented'
        self.browser.execute_script("""
window.zoom_prevented_func = function() {{document.body.classList.add('{}');}};
t1 = new Touch({{identifier: 1,target: document.body, pageX: 0, pageY: 0}});
t2 = new Touch({{identifier: 2,target: document.body, pageX: 1, pageY: 1}});
te = new TouchEvent('touchstart', {{cancelable: true, bubbles: true, touches: [t1, t2]}});
document.body.dispatchEvent(te);""".format(test_text))
        # in is_testing mode, should have set the variable window.zoom_prevented set when zoom is detected
        # it may take a while for this event to percolate though, so we poll for 5 seconds
        try:
            #WebDriverWait(self.browser, 5).until(js_variable_set('zoom_prevented'))
            alert = WebDriverWait(self.browser, 5).until(element_has_css_class((By.TAG_NAME, 'body'), test_text))
            self.browser.execute_script("document.body.classList.remove('{}');".format(test_text))
            return True
        except TimeoutException:
            return False
            
class js_variable_set(object):
  """An expectation for checking that a global javascript variable (window.mayVar) is set to something other than undefined.

  locator - used to find the element
  returns the WebElement once it has the particular css class
  """
  def __init__(self, jsvar):
    self.jsvar = jsvar

  def __call__(self, driver):
    undef = driver.execute_script("return typeof {} === 'undefined'".format(self.jsvar))
    if undef:
        return False
    else:
        to_return = driver.execute_script("return {}".format(self.jsvar))
        driver.execute_script("{} = undefined".format(self.jsvar))
        return to_return
            
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

def linkouts_json(browser, url, ott_or_id, lang=""):
    """
    This function can be used to convert a linkouts function in javascript
    to a JSON return value.
    Pass in a leaf_linkouts or node_linkouts function as a JS string 
    together with the ott (for leaves) or node id (for nodes).
    Requires a browser to evaluate the JS
    """
    links = browser.execute_script("return (" + url + ")" + "({}, {})".format(ott_or_id, lang))
    return requests.get(links, timeout=5).json()['data']

def linkouts_url(browser, url, ott_or_id, tab_name, lang=""):
    """
    This function can be used to convert a linkouts function in javascript
    to a URL to visit (given by tab_name). See linkouts_json for details
    """
    return linkouts_json(browser, url, ott_or_id, lang)[tab_name][0]

#can't have these as we need to call them from a classmethod
def make_temp_minlife_file(self):
    """Make a temporary minlife file in static, filename stored in self.minlife_file_location"""
    test_file = "minlife-test{}.html"
    self.temp_minlife_created = []
    minlife_file_location = os.path.join(web2py_app_dir, 'static', test_file)
    for i in reversed(range(100)):
        if not os.path.isfile(minlife_file_location.format(i)):
            break
    if i:
        print(">> making a temporary minlife file")
        response = requests.get(base_url+"treeviewer/minlife", timeout=5)
        with open(minlife_file_location.format(i), 'wb') as f:
            f.write(response.content)
        self.temp_minlife_created += [minlife_file_location.format(i)]
        #process links (see the partial_install command in Gruntfile.js in the app dir)
        subprocess.call(['perl', '-i', os.path.join(web2py_app_dir, 'OZprivate','ServerScripts','Utilities','partial_install.pl'), minlife_file_location.format(i)])
        return minlife_file_location.format(i)
    else:
        raise Exception("There are already many test files in {}. Please remove some before continuing".format(minlife_file_location))

def remove_temp_minlife_files(self):
    for fn in self.temp_minlife_created:
        os.remove(fn) 

class element_has_css_class(object):
  """An expectation for checking that an element has a particular css class.

  locator - used to find the element
  returns the WebElement once it has the particular css class
  """
  def __init__(self, locator, css_class):
    self.locator = locator
    self.css_class = css_class

  def __call__(self, driver):
    element = driver.find_element(*self.locator)   # Finding the referenced element
    if self.css_class in element.get_attribute("class"):
        return element
    else:
        return False


#def chrome_cmd(driver, cmd, params):
#        resource = "/session/%s/chromium/send_command_and_get_result" % driver.session_id
#        url = driver.command_executor._url + resource
#        body = json.dumps({'cmd':cmd, 'params': params})
#        response = driver.command_executor._request('POST', url, body)
#        return response.get('value')
