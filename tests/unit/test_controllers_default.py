"""
Run with::

    grunt exec:test_server:test_controllers_default.py
"""
import unittest
from inspect import getmembers, isfunction, getfullargspec

from gluon.globals import Request, Session
from gluon.http import HTTP  # This is the error code

import applications.OZtree.controllers.default as default
from applications.OZtree.tests.unit import util
import img

def dummy(*args, **kwargs):
    "Pass-through function used e.g. to replace built-in 'redirect'"
    pass

class TestControllersDefault(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        # Poke session / DB / request into API's namespace
        default.session = current.session
        default.db = current.db
        default.request = current.request
        default.response = current.response
        default.auth = current.globalenv['auth']
        default.PY2 = current.globalenv['PY2']
        default.SPAN = current.globalenv['SPAN']
        default.FORM = current.globalenv['FORM']
        default.LABEL = current.globalenv['LABEL']
        default.INPUT = current.globalenv['INPUT']
        default.URL = current.globalenv['URL']
        default.T = current.globalenv['T']
        default.HTTP = current.globalenv['HTTP']
        default.sponsor_suggestion_flags = current.globalenv['sponsor_suggestion_flags']
        try:
            default.thumb_base_url = current.globalenv['myconf'].take('images.url_base')
        except:
            default.thumb_base_url = "//" + img.local_path
        default.redirect = dummy
        # Define all the globals in _OZglobals
        

    def tearDown(self):
        db.rollback()


    def test_functions(self):
        """
        Just test that all the default controller functions can be run with no error. 
        """
        for name, f in getmembers(default, isfunction):
            a = getfullargspec(f)
            if a.args or a.varargs or a.varkw or a.defaults or a.kwonlyargs:
                # These are not standard controller functions
                continue
            if name.startswith("_"):
                # Private function
                continue
            for is_testing in (True, False):
                default.is_testing = is_testing
                if name in {
                    "sponsor_leaf",
                    "sponsor_node",
                    "sponsor_node_price",
                    "sponsor_pay",
                    "sponsor_replace_page",
                }:
                    # The controllers that raises an error if no ott/id given
                    self.assertRaises(HTTP, f)
                    # TODO - check that they work if an OTT or ID given
                elif name in {
                    "user",
                }:
                    self.assertRaises(HTTP, f)
                else:
                    f()

if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersDefault))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
