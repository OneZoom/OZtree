"""
Run with::

    grunt exec:test_server:test_controllers_tour.py
"""
import unittest

import applications.OZtree.controllers.tour as tour
from applications.OZtree.tests.unit import util

from gluon.globals import Request, Session
from gluon.http import HTTP


class TestControllersTour(unittest.TestCase):
    maxDiff = None

    def tearDown(self):
        util.clear_unittest_tours()
        db.rollback()

    def tour_get(self, tour_identifier):
        out = util.call_controller(tour, 'data', args=[tour_identifier])
        # Turn response rows into dicts
        out['tour'] = out['tour'].as_dict()
        out['tour']['tourstops'] = [ts.as_dict() for ts in out['tour']['tourstops']]
        # Tour identifier should always match what is put in
        self.assertEqual(out['tour_identifier'], tour_identifier)
        return out['tour']

    def tour_put(self, tour_identifier, tour_body):
        out = util.call_controller(
            tour,
            'data',
            method='PUT',
            args=[tour_identifier],
            vars=tour_body,
            username='admin'
        )
        # Turn response rows into dicts
        out['tour'] = out['tour'].as_dict()
        out['tour']['tourstops'] = [ts.as_dict() for ts in out['tour']['tourstops']]
        # Tour identifier should always match what is put in
        self.assertEqual(out['tour_identifier'], tour_identifier)
        return out['tour']

    def test_data_errors(self):
        """Error conditions handled appropriately?"""
        # Have to include a tour identifier
        with self.assertRaisesRegex(HTTP, r'400'):
            util.call_controller(tour, 'data')

        # Can't PUT without being logged in
        with self.assertRaisesRegex(HTTP, r'403'):
            util.call_controller(tour, 'data', method='PUT', args=['UT::TOUR'], vars={})

        # Can't PUT a tour with no tourstops
        with self.assertRaisesRegex(HTTP, r'400'):
            out = self.tour_put('UT::TOUR', dict(
                title="A Unit test tour",
            ))

    def test_data_storerestore(self):
        """Can we store/restore tours in the database?"""
        otts = util.find_unsponsored_otts(10)

        # Can insert new tours
        t = self.tour_put('UT::TOUR', dict(
            title="A unit test tour",
            description="It's a nice tour",
            author="UT::Author",
            tourstops=[
                dict(
                    ott=otts[0],
                    identifier="ott0",
                ),
                dict(
                    ott=otts[5],
                    identifier="ott5",
                ),
            ],
        ))
        self.assertEqual(t['title'], "A unit test tour")
        self.assertEqual(t['description'], "It's a nice tour")
        self.assertEqual(t['author'], "UT::Author")
        self.assertEqual(
            [ts['ott'] for ts in t['tourstops']],
            [otts[0], otts[5]],
        )
        t_alt = self.tour_put('UT::TOUR-ALT', dict(
            title="An alternative unit test tour",
            description="An alternative tour that won't be fetched at the same time",
            author="UT::Author",
            tourstops=[
                dict(
                    # NB: Share an identifier, which is fine
                    ott=otts[0],
                    identifier="ott0",
                    template_data=dict(title="We still start in the same place"),
                ),
                dict(
                    ott=otts[9],
                    identifier="ott9",
                ),
            ],
        ))
        self.assertEqual(t_alt['title'], "An alternative unit test tour")
        self.assertEqual(t_alt['description'], "An alternative tour that won't be fetched at the same time")
        self.assertEqual(t_alt['author'], "UT::Author")
        self.assertEqual(
            [ts['ott'] for ts in t_alt['tourstops']],
            [otts[0], otts[9]],
        )
        # Tourstops aren't shared between tours, even though the identifier matches
        self.assertNotEqual(t_alt['tourstops'][0]['id'], t['tourstops'][0]['id'])

        # Can fetch back tours by name
        self.assertEqual(t, self.tour_get('UT::TOUR'))
        self.assertEqual(t_alt, self.tour_get('UT::TOUR-ALT'))

        # Updating tour will re-use existing tourstops where possible
        t2 = self.tour_put('UT::TOUR', dict(
            title="A unit test tour",
            description="It's a nice tour",
            author="UT::Author",
            tourstops=[
                dict(
                    # Change metadata, keep existing entry
                    ott=otts[0],
                    identifier="ott0",
                    template_data=dict(title="The first tourstop"),
                ),
                dict(
                    # The OTT matches, but is a different identifier, so gets a new entry
                    ott=otts[5],
                    identifier="ott5first",
                ),
                dict(
                    # Recycling identifier in a new location, keeps existing entry
                    ott=otts[5],
                    identifier="ott5",
                ),
            ],
        ))
        self.assertEqual(
            [ts['ott'] for ts in t2['tourstops']],
            [otts[0], otts[5], otts[5]],
        )
        self.assertEqual([ts['id'] for ts in t2['tourstops']], [
            t['tourstops'][0]['id'],  # Same ID as before
            t2['tourstops'][1]['id'],  # New tourstop
            t['tourstops'][1]['id'],  # Same ID as before, in a different location
        ])

        # Can remove tourstops by getting rid of reference to them
        t2 = self.tour_put('UT::TOUR', dict(
            title="A unit test tour",
            description="It's a nice tour",
            author="UT::Author",
            tourstops=[
                dict(
                    ott=otts[5],
                    identifier="ott5first",
                ),
                dict(
                    ott=otts[5],
                    identifier="ott5",
                ),
            ],
        ))
        self.assertEqual(
            [ts['ott'] for ts in t2['tourstops']],
            [otts[5], otts[5]],
        )

if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersTour))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
