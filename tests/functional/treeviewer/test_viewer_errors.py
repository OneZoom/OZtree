# -*- coding: utf-8 -*-
"""
From https://github.com/OneZoom/OZtree/issues/62

1) Test no js errors on main page (also that it zooms to the right place) - see http://blog.amolchavan.space/capture-javascript-console-error-using-selenium-webdriver/
2) Test the iframe popups
"""
import os.path

from ...util import base_url
from ..functional_tests import FunctionalTest

class TestViewerErrors(FunctionalTest):
    """
    Can't nest viewer in viewer
    """
    @classmethod
    def setup_class(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setup_class()

    def test_viewer_popuped(self):
        """
        Do we get the proper error page if we accidentally popup a viewer within another viewer
        """
        self.browser.get(base_url + 'life?popup=3')
        assert self.element_by_id_exists('stop_recursion')
