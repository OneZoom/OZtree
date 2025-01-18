# -*- coding: utf-8 -*-
"""
Test that loading or switching between languages works
"""
import sys
import os.path
from time import sleep


from ...util import base_url
from ..functional_tests import FunctionalTest, linkouts_url, has_linkouts

class TestLanguageLocalisation(FunctionalTest):
    """
    TO DO
    """
    @classmethod
    def setup_class(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setup_class()
    
    
