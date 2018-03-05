from functional_tests import FunctionalTest, base_url, appconfig_loc, test_email
import os.path
import shutil
import requests

class TestUnsponsorableSite(FunctionalTest):
    """
    Test that if allow_sponsorship = 0 in appconfig, we can't go through with sponsorship but are directed to 
    the main OneZoom site
    """
    
    @classmethod
    def setUpClass(self):
        """
        We must set appconfig.ini so that maintenance mode is off but sponsorship is disallowed
        """
        self.appconfig_loc = appconfig_loc + '.test_orig.ini'
        with open(appconfig_loc, "r") as orig, open(self.appconfig_loc, "w") as test:
            for line in orig:
                if line.lstrip().startswith("maintenance_mins") or line.lstrip().startswith("allow_sponsorship"):
                    pass #do not write these out
                else:
                    test.write(line)
                    if line.lstrip().startswith("[general]"):
                        test.write("maintenance_mins = 0\n")
                        test.write("allow_sponsorship = 0\n")
        
        super(TestUnsponsorableSite, self).setUpClass()
    
    @classmethod    
    def tearDownClass(self):
        os.remove(self.appconfig_loc)
        super(TestUnsponsorableSite, self).tearDownClass()

    
    page = base_url + 'sponsor_leaf'
    
    def test_banned(self):
        """
        Humans are always banned
        """
        human_ott = 770315
        self.browser.get(self.page + "?ott={}".format(human_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_banned"))
        self.browser.get(self.page + "?ott={}&embed=3".format(human_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_banned"))
        self.assertFalse(self.has_external_linkouts())
        
    def test_already_sponsored(self):
        """
        We might also want to test a sponsored banned species here, like the giant panda
        """
        #Find a sponsored species
        sponsored = requests.get('http://127.0.0.1:8000/sponsored.json').json()['rows']
        assert len(sponsored), 'No sponsored species to test against'
        example_sponsored_ott = sponsored[0]['OTT_ID']
        self.browser.get(self.page + "?ott={}".format(example_sponsored_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_sponsored"))
        self.browser.get(self.page + "?ott={}&embed=3".format(example_sponsored_ott))
        self.assertTrue(self.web2py_viewname_contains("spl_sponsored"))
        self.assertFalse(self.has_external_linkouts())


    def test_sponsor_elsewhere(self):
        """
        we will get this on the museum display versions
        """
        ott, sciname = self.get_never_looked_at_species()
        page = self.page + "?ott={}".format(ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("spl_elsewhere"))
        page = self.page + "?ott={}&embed=3".format(ott)
        self.browser.get(page)
        self.assertTrue(self.web2py_viewname_contains("spl_elsewhere"))
        self.delete_reservation_entry(ott, sciname)

        
