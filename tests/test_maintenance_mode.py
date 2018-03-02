from functional_tests import FunctionalTest, base_url, appconfig_loc, chrome_cmd
import os
import shutil
from selenium.webdriver.common.touch_actions import TouchActions

class TestMaintenanceMode(FunctionalTest):
    """
    Test maintenance mode
    """
    @classmethod
    def setUpClass(self):
        self.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(self.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins"):
                    test.write("maintenance_mins = 99\n")
                else:
                    test.write(line)
        
        super(TestMaintenanceMode, self).setUpClass()
    
    @classmethod    
    def tearDownClass(self):
        os.remove(self.appconfig_loc)
        super(TestMaintenanceMode, self).tearDownClass()

    
    def test_sponsor_maintenance(self):
        self.browser.get(base_url + 'sponsor_leaf')
        self.assertIn('Maintenance',self.browser.title)
        time = self.browser.find_element_by_id('time')
        self.assertEquals('99', time.text)
        
    def test_sponsor_maintenance_sandbox(self):
        # check the embedded version for museum display
        self.browser.get(base_url + 'sponsor_leaf?embed=3')
        # check there are no links out of the sandbox
        self.assertFalse(self.element_by_tag_name_exists('a'), "There is a link in the sandboxed maintenance page")
        #check that context menu is disabled
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()"))
        touch = TouchActions(self.browser)
        

        # check the embedded version with all links removed
        self.browser.get(base_url + 'sponsor_leaf?embed=4')
        # check there are no links out of the sandbox
        self.assertFalse(self.element_by_tag_name_exists('a'), "There is a link in the sandboxed maintenance page")
        #check that context menu is disabled
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()"))
        
        
        zoom_level = self.browser.execute_script("return window.visualViewport.scale;") #works in chrome, not safari
        raise NotImplementedError, "To DO: we need to figure out how to invoke a touch zoom event in Selenium"
        self.assertTrue(zoom_level == self.browser.execute_script("return window.visualViewport.scale;"))
