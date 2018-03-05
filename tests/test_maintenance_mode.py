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
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[general]"):
                        test.write("maintenance_mins = 99\n")
        
        super(TestMaintenanceMode, self).setUpClass()
    
    @classmethod    
    def tearDownClass(self):
        os.remove(self.appconfig_loc)
        super(TestMaintenanceMode, self).tearDownClass()

    
    def test_sponsor_maintenance(self):
        self.browser.get(base_url + 'sponsor_leaf')
        self.assertTrue(self.web2py_viewname_contains("spl_maintenance"))
        time = self.browser.find_element_by_id('time')
        self.assertEquals('99', time.text)

    def test_sponsor_maintenance_zoom_disabled(self):
        """
        Check that the touch zoom functionality is disabled.
        Note that this fakes a touch event and looks for a console log that it is diabled
        A proper functional test would actually automate a touch event and look to see if window.visualViewport.scale changes
        e.g.:
          zoom_level = self.browser.execute_script('return window.visualViewport.scale;') #works in chrome, not safari
          raise NotImplementedError, 'To DO: we need to figure out how to invoke a touch zoom event in Selenium'
          self.assertTrue(zoom_level == self.browser.execute_script('return window.visualViewport.scale;'))
        """
        self.browser.get(base_url + 'sponsor_leaf?embed=1')
        #first clear console log
        self.browser.get_log('browser')
        #imitate a touch zoom event
        self.browser.execute_script('''
t1 = new Touch({identifier: 1,target: document.body, pageX: 0, pageY: 0});
t2 = new Touch({identifier: 2,target: document.body, pageX: 1, pageY: 1});
te = new TouchEvent("touchstart", {cancelable: true, bubbles: true, touches: [t1, t2]});
document.body.dispatchEvent(te);
''')
        #get new logs
        console_log = self.browser.get_log('browser')
        self.assertTrue(console_log[0]['source']=='console-api')
        self.assertTrue("Touch zoom event blocked" in console_log[0]['message']) #in is_testing mode, should have a log message that event is blocked

        
    def test_sponsor_maintenance_sandbox(self):
        # check the embedded version for museum display
        self.browser.get(base_url + 'sponsor_leaf?embed=3')
        # check there are no links out of the sandbox
        self.assertFalse(self.element_by_tag_name_exists('a'), "There is a link in the sandboxed maintenance page")
        #check that context menu is disabled
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()"))
        ###check that touch events are trapped

        # check the embedded version with all links removed
        self.browser.get(base_url + 'sponsor_leaf?embed=4')
        # check there are no links out of the sandbox
        self.assertFalse(self.element_by_tag_name_exists('a'), "There is a link in the sandboxed maintenance page")
        #check that context menu is disabled
        self.assertFalse(self.browser.execute_script("document.oncontextmenu()"))
        
        
