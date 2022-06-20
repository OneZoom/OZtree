"""
Run with::

    grunt exec:test_server:test_controllers_api.py
"""
import unittest

import applications.OZtree.controllers.API as API
from applications.OZtree.tests.unit import util

from gluon.globals import Request, Session


def api_to_fn(endpoint):
    """Wrap endpoint to turn back into a python function"""
    def fn(**kwargs):
        current.request = Request(dict())
        for (k, v) in kwargs.items():
            current.request.vars[k] = v
        API.request = current.request
        return endpoint()
    return fn


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
        search_init = api_to_fn(API.search_init)

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

    def test_getOTT(self):
        """Can fetch OTT names in variety of forms"""
        getOTT = api_to_fn(API.getOTT)

        # Nothing in = nothing out
        self.assertEqual(getOTT(), {'errors': []})

        # String in = error out, if valid key
        self.assertEqual(getOTT(aardvark='camel'), {'errors': []})
        self.assertEqual(getOTT(eol='camel'), {'eol': {}, 'errors': ['eol could not be converted to int']})

        # Invalid number gets no hits
        self.assertEqual(getOTT(eol=-1), {'eol': {}, 'errors': []})

        # get leaf/node, can only search for leaves
        leaves = db((db.ordered_leaves.gbif != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,3))
        nodes = db((db.ordered_nodes.gbif != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,3))
        self.assertEqual(getOTT(gbif=[-1, leaves[1].gbif, leaves[2].gbif, nodes[0].gbif]), {'gbif': {
            # NB: invalid value ignored
            leaves[1].gbif : leaves[1].ott,
            leaves[2].gbif : leaves[2].ott,
            nodes[0].gbif : nodes[0].ott,
        }, 'errors': []})

        # Mixed query
        eol_leaves = db((db.ordered_leaves.eol != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,3))
        eol_nodes = db((db.ordered_nodes.eol != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,3))
        self.assertEqual(getOTT(gbif=[leaves[1].gbif, leaves[0].gbif], eol=[eol_leaves[0].eol, eol_nodes[0].eol]), {'gbif': {
            leaves[0].gbif : leaves[0].ott,
            leaves[1].gbif : leaves[1].ott,
        }, 'eol': {
            eol_leaves[0].eol : eol_leaves[0].ott,
            eol_nodes[0].eol : eol_nodes[0].ott,
        }, 'errors': []})

        # NCBI query
        ncbi_leaves = db((db.ordered_leaves.ncbi != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,3))
        ncbi_nodes = db((db.ordered_nodes.ncbi != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,3))
        self.assertEqual(getOTT(ncbi=[ncbi_leaves[0].ncbi, ncbi_nodes[0].ncbi]), { 'ncbi': {
            ncbi_leaves[0].ncbi : ncbi_leaves[0].ott,
            ncbi_nodes[0].ncbi : ncbi_nodes[0].ott,
        }, 'errors': []})

        # IUCN query
        iucn_leaves = db((db.ordered_leaves.iucn != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,3))
        # NB: No such thing as IUCN nodes
        self.assertEqual(getOTT(iucn=[iucn_leaves[0].iucn]), { 'iucn': {
            iucn_leaves[0].iucn : iucn_leaves[0].ott,
        }, 'errors': []})


if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersAPI))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
