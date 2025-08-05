"""
Run with::

    grunt exec:test_server:test_controllers_developer.py
"""
import unittest

import applications.OZtree.controllers.developer as Developer
from applications.OZtree.tests.unit import util


class TestControllersDeveloper(unittest.TestCase):
    maxDiff = None

    def tearDown(self):
        db.rollback()

    def test_embed_edit(self):
        def embed_edit(**kwargs):
            form = util.call_controller(Developer, 'embed_edit', vars=kwargs, method='POST' if len(kwargs) > 0 else 'GET')['form']
            return dict(
                flash=Developer.response.flash,
            )

        # Nothing happens with an empty form
        self.assertEqual(embed_edit(), dict(flash=""))

        # Can't send without configuration
        util.set_smtp(sender=None)
        self.assertEqual(embed_edit(email="ut1@example.com", url="http://ut/life/", _formname="default"), dict(
            flash="No e-mail configuration in appconfig.ini, so cannot send email",
        ))

        # Try sending for real
        util.set_smtp(sender="admin@example.com")
        # NB: Not actually testing the e-mail contents, util.set_smtp should be setting up a fake mailer to do that
        self.assertEqual(embed_edit(email="ut1@example.com", url="http://ut/life/", _formname="default"), dict(
            flash="E-mail with embed code sent",
        ))


if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersDeveloper))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
