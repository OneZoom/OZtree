"""
From https://github.com/OneZoom/OZtree/issues/62

1) Test no js errors on main page (also that it zooms to the right place)
2) From #57 - test that we can get minlife from the main website, and that it loads as a local file without errors
3) Test the various tree views (linnean.html, AT.html, etc)
4) Test the sponsorship pathway pages
5) Test the iframe popups
"""

from functional_tests import FunctionalTest, base_url
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