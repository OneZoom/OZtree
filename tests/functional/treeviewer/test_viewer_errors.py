# -*- coding: utf-8 -*-
"""
From https://github.com/OneZoom/OZtree/issues/62

1) Test no js errors on main page (also that it zooms to the right place) - see http://blog.amolchavan.space/capture-javascript-console-error-using-selenium-webdriver/
2) Test the iframe popups
"""

from ..functional_tests import FunctionalTest, base_url
import os.path
import shutil

class TestViewerErrors(FunctionalTest):
    """
    Test whether the embedding functions work
    """
    
    def test_viewer_embedded(self):
        """
        Do we get the proper error page if we accidentally embed a viewer within another viewer
        """
        self.browser.get(base_url + 'life?embed=3')
        self.assertTrue(self.browser.find_element_by_id('stop_recursion'))

    def test_viewer_bad_tree(self):
        """
        Do we get an error page if there is a version mismatch 
        """
        #self.browser.get(base_url + 'life?embed=1')
        pass
    
    
    def test_viewer_loading_time(self):
        """
        Here we should check that in various browsers the loading time of a OneZoom page is acceptable
        """
        pass
        
    def test_viewer_normal(self):
        """
        Check there are no javascript errors on normal loading of the tree
        """
        for page in ['life','life.html','life/@Mammalia', 'life/@=315707', ]:
            self.browser.get(base_url + page)
        
    def test_image_popup():
        """
        Here we should test that we can pop up local (OZ) information about an image (esp. in museum display mode)
        """
        pass