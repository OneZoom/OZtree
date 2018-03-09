# -*- coding: utf-8 -*-
"""
Test the various tree views (linnean.html, AT.html, etc)
"""
import os.path
import shutil
from nose import tools

from ...util import base_url
from ..functional_tests import FunctionalTest

class TestViewerAvailability(FunctionalTest):
    """
    Test whether the embedding functions work
    """
    
    @tools.nottest
    def test_available(self, controller):
        self.browser.get(base_url + controller)
        assert self.element_by_tag_name_exists('canvas'), "Should always have a canvas element"
        assert not self.element_by_id_exists('OneZoom_error'), "Should not show the error text"
    
    def test_life_available(self):
        """
        The default tree viewer should be available
        """
        self.test_available("life")
        assert self.element_by_class_exists('text_tree_root'), "Should have the text tree underlying the canvas"

    def test_life_MD_available(self):
        """
        The museum display viewer should be available
        """
        self.test_available("life_MD")

    def test_expert_mode_available(self):
        """
        The expert mode viewer (e.g. with screenshot functionality) should be available
        """
        self.test_available("life_expert")

    def test_AT_available(self):
        """
        The Ancestor's Tale tree (different colours) should be available
        """
        self.test_available("AT")

    def test_trail2016_available(self):
        """
        The Ancestor's Trail tree (different sponsorship details) should be available
        """
        self.test_available("trail2016")

    def test_linnean_available(self):
        """
        The Linnean Soc tree (different sponsorship details) should be available
        """
        self.test_available("linnean")

    def test_text_tree_available(self):
        """
        The Linnean Soc tree (different sponsorship details) should be available
        """
        self.browser.get(base_url + "life_text")
        assert self.element_by_class_exists('text_tree'), "Should have the text tree in a labelled div"
        assert self.element_by_class_exists('text_tree_root'), "Should have the root of the text tree in a labelled ul"
