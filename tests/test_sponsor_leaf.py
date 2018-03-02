from functional_tests import FunctionalTest, base_url
import os.path
import shutil
import requests

class TestSponsorLeaf(FunctionalTest):
    """
    Test the various pages fired when leaf sponsorship is done. We don't test maintenance mode here because
    it requires editing appconfig.ini, which shuts off all the other pages, so maintenance mode is
    tested in another file. Here we test
    
            [* error [spl_error.html] - something went very wrong]
            * invalid [spl_invalid.html] - not an actual sponsorable OTTid
            * banned [spl_banned.html] - cannot sponsor this
            * sponsored [spl_sponsored.html] - it's already been sponsored
            * unverified [spl_unverified.html] - it's already been sponsored but the details haven't been verified yet
            * unverified waiting for payment [spl_waitpay.html] - has been sponsored but paypal hasn't sent us confirmation (could be that they didn't actually pay, so may become free after a few days)
            * reserved [spl_reserved.html] - another user was active on this page recently and it's being reserved for them for a few minutes
            * available on main site [spl_elsewhere.html] - it may be available but this onezoom instance doesn't allow sponsorship (e.g. in a museum)
            * available [spl_leaf.html] - the leaf is fully available, so proceed
            * available only to session [sponsor_leaf.html] - it's available but for this user only

    """
    page = base_url + 'sponsor_leaf'
    
    def test_invalid_OTT(self):
        """
        Give an invalid OTT. We should also test for 'species' with no space in the name, but we can't be guaranteed
        that there will be any of these
        """
        self.browser.get(self.page + "?ott=0")
        self.assertTrue(self.web2py_viewname_contains("spl_invalid"))
        self.browser.get(self.page + "?ott=0&embed=3")
        self.assertTrue(self.web2py_viewname_contains("spl_invalid"))
        self.assertFalse(self.has_external_linkouts())

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
        

