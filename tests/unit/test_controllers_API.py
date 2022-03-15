"""
Run with::

    grunt exec:test_server:test_controllers_api.py
"""
import unittest

import applications.OZtree.controllers.API as API
from applications.OZtree.tests.unit import util

from gluon.globals import Request, Session


class TestControllersAPI(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        # Poke session / DB / request into API's namespace
        API.session = current.session
        API.db = current.db
        API.request = current.request
        API.response = current.response

    def tearDown(self):
        db.rollback()

    def test_search_init(self):
        """Search for arbitary node/name combinations"""
        def search_init(ott=None, name=None):
            # Add arguments as vars
            current.request = Request(dict())
            current.request.vars.ott = ott
            if name:
                current.request.vars.name = name
            API.request = current.request
            return API.search_init()

        # Get an arbitary leaf & node
        leaf = db((db.ordered_leaves.ott != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,1))[0]
        node = db((db.ordered_nodes.ott != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,1))[0]

        # Search for nothing, get nothing
        self.assertEqual(search_init(), {'empty': None})

        # Can search by both OTT, name and both, leaf, so ID is negative
        self.assertEqual(search_init(ott=leaf.ott), {'ids': [-leaf.id]})
        self.assertEqual(search_init(name=leaf.name), {'ids': [-leaf.id]})
        self.assertEqual(search_init(ott=leaf.ott, name=leaf.name), {'ids': [-leaf.id]})

        # Can search by both OTT, name and both, node, so ID is positive
        self.assertEqual(search_init(ott=node.ott), {'ids': [node.id]})
        self.assertEqual(search_init(name=node.name), {'ids': [node.id]})
        self.assertEqual(search_init(ott=node.ott, name=node.name), {'ids': [node.id]})


if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersAPI))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
