"""
Run with::

    grunt exec:test_server:test_modules_ozmail.py
"""
import unittest


class TestOzMail(unittest.TestCase):
    maxDiff = None

    def test_normalize_whitespace(self):
        self.assertEqual(
            ozmail.normalize_whitespace("\n\nHello there!\n\n\n\n\nWhat a\nlovely day\nfor\nan email.\n\nBest regards,\n"),
            "Hello there!\n\nWhat a lovely day for an email.\n\nBest regards,",
        )


if __name__ == '__main__':
    suite = unittest.TestSuite()

    suite.addTest(unittest.makeSuite(TestOzMail))
    unittest.TextTestRunner(verbosity=2).run(suite)
