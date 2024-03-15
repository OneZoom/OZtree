"""
Run with

python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_modules_tour.py
"""
import datetime
import unittest
import urllib.parse
import uuid

from applications.OZtree.tests.unit import util

from gluon.globals import Request

import tour


class TestModuleTour(unittest.TestCase):
    def setUp(self):
        util.clear_unittest_sponsors()
        util.set_allow_sponsorship(1)
        util.set_maintenance_mins(0)
        util.set_reservation_time_limit_mins(0)

    def tearDown(self):
        util.clear_unittest_sponsors()
        util.clear_unittest_tours()
        # Remove anything created as part of tests
        db.rollback()

    def test_tours_related_to_ott(self):
        def dictify(x):
            out = {}
            for ott, rows in x.items():
                out[ott] = [r.as_dict() for r in rows]
            return out

        db = current.db
        leaves = [db(db.ordered_leaves.ott == ott).select(db.ordered_leaves.ALL)[0] for ott in util.find_unsponsored_otts(10)]
        tour1 = util.create_tour([l.ott for l in leaves[0:5]])
        tour2 = util.create_tour([l.ott for l in leaves[3:7]])

        # Single leaf, no tours
        self.assertEqual(dictify(tour.tours_related_to_ott([leaves[9].ott])), {
            # NB: leaves[9] has no tour, so not present
        })

        # Single leaf, single tour
        self.assertEqual(dictify(tour.tours_related_to_ott([leaves[0].ott])), {
            leaves[0].ott: [dict(identifier=tour1['identifier'])],
        })

        # Multiple leaf, double tour
        self.assertEqual(dictify(tour.tours_related_to_ott([leaves[0].ott, leaves[3].ott, leaves[9].ott])), {
            leaves[0].ott: [dict(identifier=tour1['identifier'])],
            leaves[3].ott: [dict(identifier=tour1['identifier']), dict(identifier=tour2['identifier'])],
            # NB: leaves[9] has no tour, so not present
        })

        # Full metadata
        out = dictify(tour.tours_related_to_ott([leaves[0].ott], full_meta=True))
        self.assertEqual(out, {leaves[0].ott: [dict(
            author=tour1['author'],
            created=tour1['created'],
            description=tour1['description'],
            id=tour1['id'],
            identifier=tour1['identifier'],
            image_url=tour1['image_url'],
            keywords=tour1['keywords'],
            lang=tour1['lang'],
            title=tour1['title'],
            updated=tour1['updated'],
            views=tour1['views'],
            visible_in_search=tour1['visible_in_search'],
        )]})

    def test_tour_search(self):
        db = current.db
        leaves = [db(db.ordered_leaves.ott == ott).select(db.ordered_leaves.ALL)[0] for ott in util.find_unsponsored_otts(10)]
        tour1 = util.create_tour([l.ott for l in leaves[0:1]], title="Test tour first", description="A tour with things")
        tour2 = util.create_tour([l.ott for l in leaves[1:2]], title="Test tour things", description="A tour with stuff")

        # Search in both title and description
        out = tour.tour_search("things")
        self.assertEqual(
            [o.identifier for o in out if o.identifier.startswith('UT::')],
            [tour1['identifier'], tour2['identifier']],
        )

        # String only in description
        out = tour.tour_search("stuff")
        self.assertEqual(
            [o.identifier for o in out if o.identifier.startswith('UT::')],
            [tour2['identifier']],
        )

        # String only in title
        out = tour.tour_search("first")
        self.assertEqual(
            [o.identifier for o in out if o.identifier.startswith('UT::')],
            [tour1['identifier']],
        )

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestModuleTour))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
