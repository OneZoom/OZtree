#!/usr/bin/env python2
import sys
import json
import unittest
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
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
        #mobile_emulation = { "deviceName": "iPhone 7" }
        #chrome_options = webdriver.ChromeOptions()
        #chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)
        db_py_loc = os.path.realpath(os.path.join(web2py_app_dir, "models", "db.py"))
        with open(db_py_loc, 'r') as db_py:
            assert striptext_in_file("is_testing=True", db_py), "To do any testing you must set is_testing=True in " + db_py_loc
        try:
            self.web2py = web2py_server(self.appconfig_loc)
        except AttributeError:
            self.web2py = web2py_server()
        self.browser = webdriver.Chrome()#desired_capabilities = chrome_options.to_capabilities())
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