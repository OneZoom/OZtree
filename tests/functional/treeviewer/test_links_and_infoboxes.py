# -*- coding: utf-8 -*-
"""

"""
import sys
import os.path
from time import sleep

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_json


class TestLinksAndInfoboxes(FunctionalTest):
    """
    Test the popup boxes such as 'how to use', 'data sources', etc.
    Especially check that the links within them are valid, with no 404s
    (It is easy to get these wrong). Also test other links
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()

    def test_MD_nolinks(self):
        """
        There should be no links in the museum display, even once modals have been loaded in to the page
        """
        #need to load() all modals first - perhaps find all the ones with 
        pass

    def test_logo_link(self):
        """
        The OneZoom logo should always link to the homepage and not in a new tab
        """
        pass
        
    def test_partner_logo_link(self):
        """
        Other partner logos should open in a new tab
        """
        pass

    def test_about_box_has_text(self):
        """
        About box should not create errors
        """
        pass

    def test_about_box_has_tabbed_links(self):
        """
        Any links in about box should open in new tab
        """
        pass

    def test_MD_about_box_has_no_links(self):
        """
        Any links in the about box should have been culled
        """
        pass
