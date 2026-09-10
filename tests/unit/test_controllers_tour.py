"""
Run with::

    grunt exec:test_server:test_controllers_tour.py
"""
import unittest

import applications.OZtree.controllers.tour as tour
from applications.OZtree.tests.unit import util

from gluon import current
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
            tour_body['tourstops'] = [{
                'ott': ott,
                'identifier': "ott%d" % ott,
                'template_data': {'title': "Tour %s OTT %d" % (
                    tour_identifier,
                    ott
                )},
            } for ott in util.find_unsponsored_otts(tour_body['tourstops'])]

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

    def tour_preview(self, tour_body):
        return util.call_controller(
            tour,
            'preview',
            method='POST',
            content_type='application/json',
            vars=tour_body,
        )

    def test_preview_errors(self):
        """Error conditions handled appropriately?"""
        one_stop = {'tourstops': [{'identifier': "ott0", 'ott': 67819}]}

        # Only POST renders a preview
        with self.assertRaisesRegex(HTTP, r'405'):
            util.call_controller(
                tour, 'preview', content_type='application/json', vars=one_stop)

        # A form-encoded body is refused, so a cross-origin form can't reach us
        with self.assertRaisesRegex(HTTP, r'415') as cm:
            util.call_controller(
                tour,
                'preview',
                method='POST',
                content_type='application/x-www-form-urlencoded',
                vars=one_stop,
            )
        self.assertRegex(str(cm.exception.body), r'application/json')

        # Can't preview a tour with no tourstops
        with self.assertRaisesRegex(HTTP, r'422'):
            self.tour_preview({'title': "A unit test tour"})

        # Symlinks need a saved tour to point at
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_preview({'tourstops': [{
                'identifier': "sym",
                'symlink_tourstop': "ott0",
            }]})
        self.assertRegex(str(cm.exception.body), r'sym.*symlink')

        # Anything that isn't a tourstop object is reported by position
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_preview({'tourstops': ["ott0"]})
        self.assertRegex(str(cm.exception.body), r'Tourstop 1')

        # Latin-only pinpoints are refused, matching data()
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_preview({'tourstops': [{
                'identifier': "felids",
                'ott': "@Felidae",
            }]})
        self.assertRegex(str(cm.exception.body), r'felids.*integer OTT')

    def test_preview_matchesdata(self):
        """A previewed document renders from the same values as a saved one"""
        otts = util.find_unsponsored_otts(2)
        tour_body = {
            'identifier': "ut_tour",
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'keywords': ["education"],
            'tourstop_shared': {
                'stop_wait': 1234,
                'template_data': {'visible-transition_in': True},
            },
            'tourstops': [
                {
                    'ott': otts[0],
                    'identifier': "ott0",
                    'stop_wait': 3,
                    'template_data': {'title': "The first tourstop"},
                },
                {
                    'ott': otts[1],
                    'identifier': "ott1",
                },
            ],
        }
        saved = self.tour_put('UT::TOUR', dict(tour_body))
        previewed = self.tour_preview(dict(tour_body))['tour']

        # Everything views/tour/data.html reads out of the tour renders the same
        for prop in ('lang', 'author', 'title', 'description', 'image_url', 'keywords'):
            self.assertEqual(previewed[prop], saved[prop], prop)
        self.assertEqual(len(previewed['tourstops']), len(saved['tourstops']))
        for prev_ts, saved_ts in zip(previewed['tourstops'], saved['tourstops']):
            for prop in (
                    'lang', 'ott', 'qs_opts', 'transition_in', 'fly_in_speed',
                    'transition_in_wait', 'stop_wait', 'stop_wait_after_backward',
                    'template_data'):
                self.assertEqual(prev_ts[prop], saved_ts[prop], prop)

    def test_preview_nodatabase(self):
        """Preview stores nothing, and fills defaults as if the tour had been saved"""
        tour_count = db(db.tour.identifier).count()
        out = self.tour_preview({
            'title': "A unit test tour",
            'tourstops': [{
                'identifier': "felids",
                'ott': 67819,
                'template_data': {'title': "Cats"},
            }],
        })

        self.assertEqual(out['tour_identifier'], 'preview')
        self.assertEqual(out['tour']['tourstops'][0]['ott'], 67819)
        # Defaults are filled in as if the tour had been saved and read back
        self.assertEqual(out['tour']['lang'], 'en')
        self.assertEqual(out['tour']['tourstops'][0]['transition_in'], 'fly')
        self.assertEqual(out['tour']['tourstops'][0]['fly_in_speed'], 1)
        # Rendered by the same view as a saved tour, and nothing was written
        self.assertEqual(current.response.view, 'tour/data.html')
        self.assertEqual(db(db.tour.identifier).count(), tour_count)

    def test_preview_identifier(self):
        """The document's identifier ends up on the rendered tour"""
        out = self.tour_preview({
            'identifier': "ut_cats",
            'tourstops': [{'identifier': "felids", 'ott': 67819}],
        })
        self.assertEqual(out['tour_identifier'], 'ut_cats')

    def test_data_errors(self):
        """Error conditions handled appropriately?"""
        # Have to include a tour identifier
        with self.assertRaisesRegex(HTTP, r'422'):
            util.call_controller(tour, 'data')

        # Can't PUT without being logged in
        with self.assertRaisesRegex(HTTP, r'403'):
            util.call_controller(tour, 'data', method='PUT', args=['UT::TOUR'], vars={})

        # Can't PUT a tour with no tourstops
        with self.assertRaisesRegex(HTTP, r'422'):
            out = self.tour_put('UT::TOUR', {
                'title': "A Unit test tour",
            })

        # Missing tour
        with self.assertRaisesRegex(HTTP, r'404') as cm:
            util.call_controller(tour, 'data', args=['UT::MISSING'])
        self.assertRegex(str(cm.exception.body), r"Tour 'UT::MISSING' not found")

        # Missing tourstop identifier
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_put('UT::TOUR', {
                'tourstops': [{'ott': 67819}],
            })
        self.assertRegex(str(cm.exception.body), r'missing identifier')

        # Non-integer ott is rejected
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_put('UT::TOUR', {
                'tourstops': [{
                    'ott': "highlight=fan:rgb(130,130,247)@=67819",
                    'identifier': "badstop",
                }],
            })
        self.assertRegex(str(cm.exception.body), r'badstop.*integer OTT')

        # Latin-only and ozid pinpoints are rejected
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_put('UT::TOUR', {
                'tourstops': [{
                    'ott': "@Felidae",
                    'identifier': "latinonly",
                }],
            })
        self.assertRegex(str(cm.exception.body), r'latinonly.*integer OTT')

        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_put('UT::TOUR', {
                'tourstops': [{
                    'ott': "@_ozid=123456",
                    'identifier': "badozid",
                }],
            })
        self.assertRegex(str(cm.exception.body), r'badozid.*integer OTT')

        # Malformed ancestor pinpoint
        with self.assertRaisesRegex(HTTP, r'422') as cm:
            self.tour_put('UT::TOUR', {
                'tourstops': [{
                    'ott': "@_ancestor=123",
                    'identifier': "badanc",
                }],
            })
        self.assertRegex(str(cm.exception.body), r'badanc.*integer OTT')

    def test_data_storerestore(self):
        """Can we store/restore tours in the database?"""
        otts = util.find_unsponsored_otts(10)

        # Can insert new tours
        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstops': [
                {
                    'ott': otts[0],
                    'identifier': "ott0",
                },
                {
                    'ott': otts[5],
                    'identifier': "ott5",
                },
            ],
        })
        self.assertEqual(t['title'], "A unit test tour")
        self.assertEqual(t['description'], "It's a nice tour")
        self.assertEqual(t['author'], "UT::Author")
        self.assertEqual(
            [ts['ott'] for ts in t['tourstops']],
            [otts[0], otts[5]],
        )
        t_alt = self.tour_put('UT::TOUR-ALT', {
            'title': "An alternative unit test tour",
            'description': "An alternative tour that won't be fetched at the same time",
            'author': "UT::Author",
            'tourstops': [
                {
                    # NB: Share an identifier, which is fine
                    'ott': otts[0],
                    'identifier': "ott0",
                    'template_data': {'title': "We still start in the same place"},
                },
                {
                    'ott': otts[9],
                    'identifier': "ott9",
                },
            ],
        })
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
        t2 = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstops': [
                {
                    # Change metadata, keep existing entry
                    'ott': otts[0],
                    'identifier': "ott0",
                    'template_data': {'title': "The first tourstop"},
                },
                {
                    # The OTT matches, but is a different identifier, so gets a new entry
                    'ott': otts[5],
                    'identifier': "ott5first",
                },
                {
                    # Recycling identifier in a new location, keeps existing entry
                    'ott': otts[5],
                    'identifier': "ott5",
                },
            ],
        })
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
        t2 = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstops': [
                {
                    'ott': otts[5],
                    'identifier': "ott5first",
                },
                {
                    'ott': otts[5],
                    'identifier': "ott5",
                },
            ],
        })
        self.assertEqual(
            [ts['ott'] for ts in t2['tourstops']],
            [otts[5], otts[5]],
        )

    def test_data_symlinks(self):
        """Can we symlink tours from one to another?"""
        # Insert 2 tours
        t = self.tour_put('UT::TOUR', {'tourstops': 3})
        orig_ts = t['tourstops']
        t2 = self.tour_put('UT::TOUR2', {'tourstops': 3})
        orig_ts2 = t2['tourstops']

        # Symlinks point at own tour by default
        t2 = self.tour_put('UT::TOUR2', {'tourstops': [
            t2['tourstops'][0],
            t2['tourstops'][1],
            {
                'symlink_tourstop': t2['tourstops'][2]['identifier'],
            },
            t2['tourstops'][2],
        ]})
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts2[2]['ott'],
            orig_ts2[2]['ott'],
        ])

        # Dangling symlinks are noticed
        with self.assertRaisesRegex(HTTP, r'422'):
            t2 = self.tour_put('UT::TOUR2', {'tourstops': [
                t2['tourstops'][0],
                t2['tourstops'][1],
                {
                    'symlink_tourstop': 'parrotparrot',
                },
                t2['tourstops'][2],
            ]})

        # Add symlink to first tour
        t2 = self.tour_put('UT::TOUR2', {'tourstops': [
            orig_ts2[0],
            orig_ts2[1],
            {
                'symlink_tour': "UT::TOUR",
                'symlink_tourstop': t['tourstops'][0]['identifier'],
            },
            orig_ts2[2],
        ]})
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
        t2 = self.tour_put('UT::TOUR2', {'tourstops': [
            orig_ts2[0],
            orig_ts2[1],
            orig_ts2[2],
            {
                'symlink_tour': "UT::TOUR",
                'symlink_tourstop': t['tourstops'][0]['identifier'],
            },
        ]})
        self.assertEqual([ts['ott'] for ts in t2['tourstops']], [
            orig_ts2[0]['ott'],
            orig_ts2[1]['ott'],
            orig_ts2[2]['ott'],
            orig_ts[0]['ott'],
        ])

        # Removing from t cascades & removes from t2
        t = self.tour_put('UT::TOUR', {'tourstops': [
            orig_ts[1],
        ]})
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
        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstops': [
                {
                    'ott': '@_ancestor=%d=%d' % (otts[0], otts[1]),
                    'identifier': "ott0",
                },
            ],
        })

        # Get back the same pinpoint
        self.assertEqual(
            t['tourstops'][0]['ott'],
            '@_ancestor=%d=%d' % (otts[0], otts[1]),
        )

        # Broken down in DB
        ts = db(db.tour.id == t['id']).select(db.tour.ALL)[0].tourstop.select()[0]
        self.assertEqual(ts.ott, otts[0])
        self.assertEqual(ts.secondary_ott, otts[1])

    def test_data_ott_pinpoints(self):
        """@=OTT and @name=OTT are stored as the integer OTT"""
        otts = util.find_unsponsored_otts(2)

        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstops': [
                {
                    'ott': '@=%d' % otts[0],
                    'identifier': "bare",
                },
                {
                    'ott': '@Mammalia=%d' % otts[1],
                    'identifier': "named",
                },
            ],
        })
        self.assertEqual(
            [ts['ott'] for ts in t['tourstops']],
            [otts[0], otts[1]],
        )

    def test_data_shareddata(self):
        """Can use tourstop_shared to fill in common tourstop values"""
        otts = util.find_unsponsored_otts(10)

        # Can insert a tour with a common ancestor pinpoint
        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstop_shared': {
                'stop_wait': 1234,
                'template_data': {
                    "title": "Some tourstop",
                    "visible-transition_in": True,
                },
            },
            'tourstops': [
                {
                    'ott': '@_ancestor=%d=%d' % (otts[0], otts[1]),
                    'identifier': "ott0",
                    'stop_wait': 3,
                    'template_data': {'title': "The first tourstop"},
                },
                {
                    'ott': '@_ancestor=%d=%d' % (otts[0], otts[1]),
                    'identifier': "ott1",
                    'template_data': {
                        "visible-transition_in": False,
                    },
                },
            ],
        })
        # Tourstop wins for top-level items
        self.assertEqual(
            [ts['stop_wait'] for ts in t['tourstops']],
            [3, 1234],
        )
        # Items within template_data are also overridable, even if their override value is falsy
        self.assertEqual(
            [ts['template_data'] for ts in t['tourstops']],
            [
                {'title': 'The first tourstop', 'visible-transition_in': True},
                {'title': 'Some tourstop', 'visible-transition_in': False},
            ]
        )

    def test_data_resettodefault(self):
        """Removing values will reset them to their default"""
        otts = util.find_unsponsored_otts(10)

        # Can insert a tour with a common ancestor pinpoint
        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstop_shared': {
                'stop_wait': 1234,
            },
            'tourstops': [
                {
                    'ott': otts[0],
                    'identifier': "ott0",
                    'stop_wait': 3,
                    'author': "Frank",
                },
                {
                    'ott': otts[1],
                    'identifier': "ott1",
                    'author': "Gelda",
                },
            ],
        })
        # One entry uses default
        self.assertEqual(
            [ts['stop_wait'] for ts in self.tour_get('UT::TOUR')['tourstops']],
            [3, 1234],
        )
        # Both have an Author
        self.assertEqual(
            [ts['author'] for ts in self.tour_get('UT::TOUR')['tourstops']],
            ['Frank', 'Gelda'],
        )

        # Clear author, stop_wait. Get set back to their DB defaults
        t = self.tour_put('UT::TOUR', {
            'title': "A unit test tour",
            'description': "It's a nice tour",
            'author': "UT::Author",
            'tourstop_shared': {
            },
            'tourstops': [
                {
                    'ott': otts[0],
                    'identifier': "ott0",
                    'stop_wait': 3,
                },
                {
                    'ott': otts[1],
                    'identifier': "ott1",
                },
            ],
        })
        self.assertEqual(
            [ts['stop_wait'] for ts in self.tour_get('UT::TOUR')['tourstops']],
            [3, None],
        )
        self.assertEqual(
            [ts['author'] for ts in self.tour_get('UT::TOUR')['tourstops']],
            ['', ''],
        )

    def test_list(self):
        def t_list(tours, include_rest=""):
            return util.call_controller(
                tour,
                'list',
                method='GET',
                args=[],
                vars={'tours': ",".join(tours), 'include_rest': str(include_rest)},
            )

        def t_filter(out, list_name):
            return [
                t.identifier
                for t in out[list_name]
                if t.identifier.startswith('UT::')
            ]

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

        # Can ask for the remainder
        out = t_list([tour1['identifier']], include_rest=True)
        self.assertEqual(t_filter(out, 'tours'), [tour1['identifier']])
        self.assertEqual(t_filter(out, 'rest'), [tour2['identifier']])


if __name__ == '__main__':
    import sys

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestControllersTour))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
