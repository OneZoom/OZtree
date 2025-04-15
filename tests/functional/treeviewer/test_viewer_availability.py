# -*- coding: utf-8 -*-
"""
Test the various tree views (linnean.html, AT.html, etc)
"""
import os.path
from time import sleep

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, make_temp_minlife_file, remove_temp_minlife_files


class TestViewerAvailability(FunctionalTest):
    """
    Test treeviewer loading
    """
    
    @classmethod
    def setup_class(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setup_class()
        self.tmp_minlife = make_temp_minlife_file(self)
        
    @classmethod
    def teardown_class(self):
        remove_temp_minlife_files(self)
        super().teardown_class()

    def check_available(self, controller, base=base_url):
        self.browser.get(base + controller)
        assert self.element_by_tag_name_exists('canvas'), "{} tree should always have a canvas element".format(controller)
        assert not self.element_by_class_exists('OneZoom_error'), "{} tree should not show the error text".format(controller)
    
    def test_life_available(self):
        """
        The default tree viewer should be available
        """
        self.check_available("life")
        assert self.element_by_class_exists('text_tree_root'), "Should have the text tree underlying the canvas"

    def test_life_MD_available(self):
        """
        The museum display viewer should be available, but not have any underlying text tree
        """
        self.check_available("life_MD")
        assert not self.element_by_class_exists('text_tree_root'), "Should not have the text tree underlying the canvas"

    def test_expert_mode_available(self):
        """
        The expert mode viewer (e.g. with screenshot functionality) should be available
        """
        self.check_available("life_expert")

    def test_AT_available(self):
        """
        The Ancestor's Tale tree (different colours) should be available
        """
        self.check_available("AT")

    def test_trail2016_available(self):
        """
        The Ancestor's Trail tree (different sponsorship details) should be available
        """
        self.check_available("trail2016")

    def test_partner_trees_available(self):
        """
        Partner trees (different sponsorship details) should be available under a few urls
        """
        #self.test_available("trail2016")
        self.check_available("linnean")
        assert self.browser.execute_script("return extra_title").endswith("LinnSoc"), "partner pages should have an extra element to the title"
        assert "LinnSoc" in self.browser.title, "partner pages should have an appropriate page title"
        self.check_available("life/LinnSoc")
        assert self.browser.execute_script("return extra_title").endswith("LinnSoc"), "partner pages should have an extra element to the title"
        assert "LinnSoc" in self.browser.title, "partner pages should have an appropriate page title"

    def test_text_tree_available(self):
        """
        The root of the text-only tree should be viewable
        """
        self.browser.get(base_url + "life_text")
        assert self.element_by_class_exists('text_tree'), "Should have the text tree in a labelled div"
        assert self.element_by_class_exists('text_tree_root'), "Should have the root of the text tree in a labelled ul"

    def test_text_tree_leaves_available(self):
        """
        Leaves of the text-only tree should be viewable
        """
        self.browser.get(base_url + "life_text/@={}".format(self.humanOTT))
        assert self.element_by_class_exists('text_tree'), "Should have the text tree in a labelled div"
        assert self.element_by_class_exists('species'), "Should have the species in a labelled div"


    def test_minlife_available(self):
        """
        The minlife view for restricted installation should be should be available on the site
        """
        self.check_available("treeviewer/minlife")

    def test_minlife_static(self):
        """
        The static version of the minlife file should work with no error
        """
        self.check_available(self.tmp_minlife, "file://")
