# -*- coding: utf-8 -*-
"""

"""
import sys
import os.path
from time import sleep

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_json


class TestInfoboxes(FunctionalTest):
    """
    Test the popup boxes such as 'how to use', 'data sources', etc.
    Especially check that the links within them are valid, with no 404s
    (It is easy to get these wrong)
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()

