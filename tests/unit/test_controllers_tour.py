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
        # Fill in tour defaults
        if 'title' not in tour_body:
            tour_body['title'] = 'A unit test tour %s' % tour_identifier,
        if 'description' not in tour_body:
            tour_body['description'] = 'A default description'
        if 'author' not in tour_body:
            tour_body['author'] = 'UT::Author'
        if isinstance(tour_body.get('tourstops', None), int):
            tour_body['tourstops'] = [dict(
                ott=ott,
                identifier="ott%d" % ott,
                template_data=dict(title="Tour %s OTT %d" % (
                    tour_identifier,
                    ott
                )),
            ) for ott in util.find_unsponsored_otts(tour_body['tourstops'])]

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

        # Missing author also alerted
        with self.assertRaisesRegex(HTTP, r'400'):
            out = self.tour_put('UT::TOUR', dict(
                title="A Unit test tour",
                author=None,
                tourstops=1,
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

    def test_data_symlinks(self):
        """Can we symlink tours from one to another?"""
        # Insert 2 tours
        t = self.tour_put('UT::TOUR', dict(tourstops=3))
        orig_ts = t['tourstops']
        t2 = self.tour_put('UT::TOUR2', dict(tourstops=3))
        orig_ts2 = t2['tourstops']

        # Symlinks point at own tour by default
        t2 = self.tour_put('UT::TOUR2', dict(tourstops=[
            t2['tourstops'][0],
            t2['tourstops'][1],
            dict(
                symlink_tourstop=t2['tourstops'][2]['identifier'],
            ),
            t2['tourstops'][2],
        ]))
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts2[2]['ott'],
            orig_ts2[2]['ott'],
        ])

        # Dangling symlinks are noticed
        with self.assertRaisesRegex(HTTP, r'400'):
            t2 = self.tour_put('UT::TOUR2', dict(tourstops=[
                t2['tourstops'][0],
                t2['tourstops'][1],
                dict(
                    symlink_tourstop='parrotparrot',
                ),
                t2['tourstops'][2],
            ]))

        # Add symlink to first tour
        t2 = self.tour_put('UT::TOUR2', dict(tourstops=[
            orig_ts2[0],
            orig_ts2[1],
            dict(
                symlink_tour="UT::TOUR",
                symlink_tourstop=t['tourstops'][0]['identifier'],
            ),
            orig_ts2[2],
        ]))
        # t2 has OTTs in the order we expect
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts[0]['ott'],
            orig_ts2[2]['ott'],
        ])
        # Title inherited from symlink target
        self.assertEqual(
            t2['tourstops'][2]['template_data']['title'],
            orig_ts[0]['template_data']['title'],
        )

        # Can move symlink
        t2 = self.tour_put('UT::TOUR2', dict(tourstops=[
            orig_ts2[0],
            orig_ts2[1],
            orig_ts2[2],
            dict(
                symlink_tour="UT::TOUR",
                symlink_tourstop=t['tourstops'][0]['identifier'],
            ),
        ]))
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts2[2]['ott'],
            orig_ts[0]['ott'],
        ])

        # Removing from t cascades & removes from t2
        t = self.tour_put('UT::TOUR', dict(tourstops=[
            orig_ts[1],
        ]))
        self.assertEqual([ts['ott'] for ts in t['tourstops']], [
            orig_ts[1]['ott'],
        ])
        t2 = self.tour_get('UT::TOUR2')
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts2[2]['ott'],
        ])

    def test_data_commonancestor(self):
        """Can refer to common ancestors in tourstops"""
        otts = util.find_unsponsored_otts(10)

        # Can insert a tour with a common ancestor pinpoint
        t = self.tour_put('UT::TOUR', dict(
            title="A unit test tour",
            description="It's a nice tour",
            author="UT::Author",
            tourstops=[
                dict(
                    ott='@_ancestor=%d=%d' % (otts[0], otts[1]),
                    identifier="ott0",
                ),
            ],
        ))

        # Get back the same pinpoint
        self.assertEqual(
            t['tourstops'][0]['ott'],
            '@_ancestor=%d=%d' % (otts[0], otts[1]),
        )

        # Broken down in DB
        ts = db(db.tour.id == t['id']).select(db.tour.ALL)[0].tourstop.select()[0]
        self.assertEqual(ts.ott, otts[0])
        self.assertEqual(ts.secondary_ott, otts[1])


    def test_list(self):
        def t_list(tours):
            return util.call_controller(
                tour,
                'list',
                method='GET',
                args=[],
                vars=dict(tours=",".join(tours)),
            )

        # DB setup
        db = current.db
        leaves = [db(db.ordered_leaves.ott == ott).select(db.ordered_leaves.ALL)[0] for ott in util.find_unsponsored_otts(10)]
        tour1 = util.create_tour([l.ott for l in leaves[0:5]])
        tour2 = util.create_tour([l.ott for l in leaves[3:7]])

        # Empty tours list
        out = t_list([])
        self.assertEqual(list(out['tours']), [])

        # Ask for 2 tours, get them back in order
        self.assertEqual(
            [t.identifier for t in t_list([tour1['identifier'], tour2['identifier']])['tours']],
            [tour1['identifier'], tour2['identifier']],
        )
        self.assertEqual(
            [t.identifier for t in t_list([tour2['identifier'], tour1['identifier']])['tours']],
            [tour2['identifier'], tour1['identifier']],
        )

        # Duplicates filtered
        self.assertEqual(
            [t.identifier for t in t_list([tour2['identifier'], tour1['identifier'], tour2['identifier']])['tours']],
            [tour2['identifier'], tour1['identifier']],
        )


if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersTour))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
