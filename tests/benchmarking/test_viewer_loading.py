# -*- coding: utf-8 -*-
"""
"""

from ..util import base_url
from ..functional.functional_tests import FunctionalTest
import os.path

class TestViewerLoading(FunctionalTest):
    """
    Test whether the viewer loading functions work
    """
    @classmethod
    def setup_class(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setup_class()
        
    def test_viewer_loading_time(self):
        """
        Here we should check that in various browsers the loading time of a OneZoom page is acceptable
        """
        pass
        