"""
Run with::

    grunt exec:test_server:test_controllers_api.py
"""
import unittest

from applications.OZtree.modules.pinpoint import (
    resolve_pinpoint_to_row,
    tidy_latin,
)
from applications.OZtree.tests.unit import util


class TestModulesPinpoint(unittest.TestCase):
    maxDiff = None

    def tearDown(self):
        db.rollback()

    def test_resolve_pinpoint_to_row(self):
        def rpr(pp):
            """Check is_leaf based on row returned"""
            r, is_leaf = resolve_pinpoint_to_row(pp)
            if r:
                self.assertTrue(hasattr(r, 'extinction_date' if is_leaf else 'vern_synth'))
            else:
                self.assertEqual(is_leaf, False)
            return r
        def ancestor(*pps):
            """Find common ancestor of pinpoints"""
            return rpr("@_ancestor=" + "=".join(str(rpr(p).ott) for p in pps))

        # Get arbitary content
        leaves = db((db.ordered_leaves.ott != None) & (db.ordered_leaves.name != None)).select(orderby='ott', limitby=(0,4))
        nodes = db((db.ordered_nodes.ott != None) & (db.ordered_nodes.name != None)).select(orderby='ott', limitby=(0,4))

        # No pinpoint -> root node
        self.assertEqual(rpr("").name, "biota")

        # Invalid pinpoint -> None
        self.assertEqual(rpr("@missingmissingmissing"), None)

        # Bare OTT
        for n in leaves:
            self.assertEqual(rpr(str(n.ott)).id, n.id)
        for n in nodes:
            self.assertEqual(rpr(str(n.ott)).id, n.id)

        # @=OTT
        for n in leaves:
            self.assertEqual(rpr("@=%d" % n.ott).id, n.id)
        for n in nodes:
            self.assertEqual(rpr("@=%d" % n.ott).id, n.id)

        # @_ozid=OZID
        for n in leaves:
            self.assertEqual(rpr("@_ozid=%d" % -n.id).id, n.id)
        for n in nodes:
            self.assertEqual(rpr("@_ozid=%d" % n.id).id, n.id)

        # Latin name
        for n in leaves:
            self.assertEqual(rpr("@%s" % tidy_latin(n.name)).id, n.id)

        # Both
        for n in leaves:
            self.assertEqual(rpr("@%s=%d" % (tidy_latin(n.name), n.ott)).id, n.id)

        # Common ancestor
        self.assertEqual(
            ancestor("@Crypturellus", "@Crypturellus").name.lower(),
            "crypturellus",
        )
        self.assertEqual(
            ancestor("@Xenicus_gilviventris", "@Crypturellus").name.lower(),
            "aves",
        )
        self.assertEqual(
            ancestor("@Xenicus_gilviventris", "@Alectoris").name.lower(),
            "neognathae",
        )
        self.assertEqual(
            ancestor("@Xenicus_gilviventris", "@Crypturellus", "@Alectoris").name.lower(),
            "aves",
        )

    def test_tidy_latin(self):
        self.assertEqual(tidy_latin("Bacillus cereus F837/76"), "Bacillus_cereus_F837")
        self.assertEqual(tidy_latin("Bacillus coagulans DSM 1 = ATCC 7050"), "Bacillus_coagulans_DSM_1_")

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestModulesPinpoint))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
