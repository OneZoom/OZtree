"""
Run with::

    grunt exec:test_server:test_controllers_api.py
"""
import unittest

import applications.OZtree.controllers.API as API
from applications.OZtree.tests.unit import util


class TestControllersAPI(unittest.TestCase):
    maxDiff = None

    def tearDown(self):
        db.rollback()

    def test_pinpoints(self):
        def pinpoints(pps, **kwargs):
            out = util.call_controller(API, 'pinpoints', vars=kwargs, args=pps)
            self.assertEqual(out['lang'], kwargs.get('lang', 'en'))
            return out['results']

        # Get arbitary content
        leaves = db((db.ordered_leaves.ott != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,4))
        nodes = db((db.ordered_nodes.ott != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,4))
        vns = db((db.vernacular_by_ott.lang_primary=='en') & (db.vernacular_by_ott.preferred==True)).select(
          join=db.ordered_leaves.on(db.ordered_leaves.ott == db.vernacular_by_ott.ott),
          limitby=(0,4))

        self.assertEqual(pinpoints([]), [])
        self.assertEqual(pinpoints(['@missingmissingmissing']), [dict(pinpoint='@missingmissingmissing')])

        self.assertEqual(
            pinpoints(['@=%d' % n.ott for n in leaves]),
            [dict(ott=n.ott, ozid=-n.id, pinpoint='@=%d' % n.ott) for n in leaves],
        )
        self.assertEqual(
            pinpoints(['@=%d' % n.ott for n in nodes]),
            [dict(ott=n.ott, ozid=n.id, pinpoint='@=%d' % n.ott) for n in nodes],
        )
        self.assertEqual(
            pinpoints(['@=%d' % v.ordered_leaves.ott for v in vns], vernacular='short', lang='en'),
            [dict(
                ott=v.vernacular_by_ott.ott,
                ozid=-v.ordered_leaves.id,
                pinpoint='@=%d' % v.vernacular_by_ott.ott,
                vn=v.vernacular_by_ott.vernacular,
            ) for v in vns],
        )

    def test_search_init(self):
        """Search for arbitary node/name combinations"""
        def search_init(**kwargs):
            return util.call_controller(API, 'search_init', vars=kwargs)

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
        def getOTT(**kwargs):
            return util.call_controller(API, 'getOTT', vars=kwargs)

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

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersAPI))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
