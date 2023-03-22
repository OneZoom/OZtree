"""
Run with
python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_modules_embed.py
"""
import re
import unittest

from gluon.globals import Request

from applications.OZtree.tests.unit import util

import embed


class TestEmbed(unittest.TestCase):
    def test_embedize_url(self):
        def extract_key(u):
            return re.search(r'embedkey=([a-z\-0-9]+)', u).group(1)

        # Append to URL correctly
        out = embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')
        self.assertEqual(out, 'http://moo.com?embedkey=' + extract_key(out))
        out = embed.embedize_url('http://moo.com?a=1', 'alfred@unittest.example.com')
        self.assertEqual(out, 'http://moo.com?a=1&embedkey=' + extract_key(out))

        # keys match when e-mail addresses match
        self.assertEqual(
            extract_key(embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')),
            extract_key(embed.embedize_url('http://parp.com', 'alfred@unittest.example.com')),
        )
        self.assertEqual(
            extract_key(embed.embedize_url('http://moo.com', 'betty@unittest.example.com')),
            extract_key(embed.embedize_url('http://parp.com', 'betty@unittest.example.com')),
        )
        self.assertNotEqual(
            extract_key(embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')),
            extract_key(embed.embedize_url('http://moo.com', 'betty@unittest.example.com')),
        )


if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestEmbed))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
