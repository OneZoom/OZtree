from functional_tests import FunctionalTest, base_url
import os.path
import shutil

class TestEmbeddedPages(FunctionalTest):
    """
    Test whether the embedding functions work
    """
    
    @classmethod
    def setUpClass(self):
        
        super(TestEmbeddedPages, self).setUpClass()
    
    def test_embedding_viewer(self):
        """
        Do we get the proper error page if we accidentally embed a viewer within another viewer
        """
        self.browser.get(base_url + 'life?embed=1')
        self.assertTrue(self.browser.find_element_by_id('stop_recursion'))

    def test_embedding_sponsor_leaf(self):
        """
        Find the next sponsorable species
        """
        pass