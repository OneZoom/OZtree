#!/usr/bin/env python3
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
test_email = 'test@onezoom.org' 

class FunctionalTest(unittest.TestCase):

    @classmethod
    def setUpClass(self):
        db_py_loc = os.path.realpath(os.path.join(web2py_app_dir, "models", "db.py"))
        with open(db_py_loc, 'r') as db_py:
            assert striptext_in_file("is_testing=True", db_py), "To do any testing you must set is_testing=True in " + db_py_loc
        self.db = get_db_connection()
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

    def get_never_looked_at_species(self):
        """
        Find an unpopular species that has never been looked at (i.e. does not have an entry in the reservations table
        Don't take the *most* unpopular, as this could be spacial. Take e.g. the 20th least popular
        """
        db_cursor = self.db['connection'].cursor()
        sql = "SELECT COUNT(1) FROM ordered_leaves WHERE price IS NOT NULL"
        db_cursor.execute(sql)
        if db_cursor.fetchone()[0]==0:
            self.fail("Cannot test sponsorship: you need to set prices for leaves (go to {}/manage/SET_PRICES/)".format(base_url))
        sql="SELECT ol.ott, ol.name FROM ordered_leaves ol LEFT JOIN reservations r ON ol.ott = r.OTT_ID WHERE r.OTT_ID IS NULL AND ol.ott IS NOT NULL and ol.price IS NOT NULL ORDER BY ol.popularity LIMIT 1 OFFSET 20"
        db_cursor.execute(sql)
        ott = sciname = None
        try:
            ott, sciname = db_cursor.fetchone()
        except TypeError:
            self.fail("could not find a species which has not been looked at before")
        db_cursor.close() 
        return ott, sciname
    
    def delete_reservation_entry(self, ott, name):
        """
        Warning: this will REMOVE data. Make sure that this is definitely one of the previously not looked at species
        Hence we pass *both* the ott and the name, and check that the reservation email matches test_email
        """
        db_cursor = self.db['connection'].cursor()
        sql="DELETE FROM `reservations` WHERE OTT_ID={0} AND name={0} AND e_mail={0} LIMIT 1".format(self.db['subs'])
        db_cursor.execute(sql, (ott, name, test_email))
        self.db['connection'].commit()
        #to do - verify that one was deleted
        db_cursor.close() 


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
    if appconfig_file is not None:
        cmd += ['--args', appconfig_file]
    return subprocess.Popen(cmd)

def get_db_connection():
    database_string = None
    with open(appconfig_loc, 'r') as conf:
        conf_type=None
        for line in conf:
        #look for [db] line, followed by uri
            m = re.match(r'\[([^]]+)\]', line)
            if m:
                conf_type = m.group(1)
            if conf_type == 'db':
                m = re.match('uri\s*=\s*(\S+)', line)
                if m:
                    database_string = m.group(1)
    assert database_string is not None, "Can't find a database string to connect to"
    db = {}
    if database_string.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db['connection'] = sqlite.connect(os.path.join(web2py_app_dir,'databases', database_string[len('sqlite://'):]))
        db['subs'] = "?"
        
    elif database_string.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', database_string.strip())
        if match.group(2) == '':
            #enter password on the command line, if not given (more secure)
            from getpass import getpass
            pw = getpass("Enter the sql database password: ")
        else:
            pw = match.group(2)
        db['connection'] = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
        db['subs'] = "%s"
    else:
        fail("No recognized database specified: {}".format(database_string))
    return(db)

    
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