"""
Run with::

    grunt exec:test_server:test_modules_ozmail.py
"""
import unittest

import ozmail
from applications.OZtree.tests.unit import util


class TestOzMail(unittest.TestCase):
    maxDiff = None

    def test_get_mailer(self):
        util.set_smtp(None)
        mail, reason = ozmail.get_mailer()
        self.assertEqual(mail, None)
        self.assertEqual(reason, "No e-mail configuration in appconfig.ini")

        util.set_smtp(sender="admin@example.com", autosend_email=0)
        mail, reason = ozmail.get_mailer()
        self.assertEqual(mail, None)
        self.assertTrue("autosend_email" in reason)
        
        util.set_smtp(sender="admin@example.com")
        mail, reason = ozmail.get_mailer()
        self.assertNotEqual(mail, None)
        self.assertEqual(reason, None)

        # autosend_email=0, server='logging' is fine
        util.set_smtp(sender="admin@example.com", autosend_email=0)
        util.set_appconfig('smtp', 'server', 'logging')
        mail, reason = ozmail.get_mailer()
        self.assertNotEqual(mail, None)

    def test_normalize_whitespace(self):
        self.assertEqual(
            ozmail.normalize_whitespace("\n\nHello there!\n\n\n\n\nWhat a\nlovely day\nfor\nan email.\n\nBest regards,\n"),
            "Hello there!\n\nWhat a lovely day for an email.\n\nBest regards,",
        )

    def test_template_mail(self):
        email = "fake@example.com"
        util.set_smtp(None)  # disable the smtp settings, so to=None when testing
        for testing, email in zip((True, False), (None, email)):
            util.set_is_testing(testing)
            mailargs = ozmail.template_mail("test_template", {"test_value": "abcde"}, to=email)
            self.assertEqual(mailargs["to"], email)
            self.assertTrue("Test" in mailargs["subject"])
            self.assertTrue("abcde" in mailargs["message"])

        util.set_smtp(sender="admin@example.com")
        util.set_is_testing(True)  # When testing, replace to: with the appconfig sender
        mailargs = ozmail.template_mail("test_template", {}, to=email)
        self.assertTrue("Test email" in mailargs["subject"])
        self.assertEqual(mailargs["to"], "admin@example.com")

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestOzMail))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
