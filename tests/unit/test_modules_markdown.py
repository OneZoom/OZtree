"""
Run with::

    ./web2py-run tests/unit/test_modules_markdown.py

"""
import re
import unittest

from gluon.globals import Request
from gluon.http import HTTP

from applications.OZtree.tests.unit import util

import markdown


class TestMarkdown(unittest.TestCase):
    maxDiff = None

    def test_markdown_safemode(self):
        """Raw HTML isn't allowed"""
        self.assertEqual(markdown.markdown("""
*Hello there*

<b>I am in your HTML</b>
""").strip(), """
<p><em>Hello there</em></p>

<p>&lt;b&gt;I am in your HTML&lt;/b&gt;</p>
""".strip())

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestMarkdown))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
