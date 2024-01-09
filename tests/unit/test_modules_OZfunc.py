"""
Run with

python3 web2py.py -S OZtree -M -R applications/OZtree/tests/unit/test_modules_OZfunc.py

Note you should make sure prices are set before running tests (manage/SET_PRICES.html)
"""
import datetime
import unittest
import urllib.parse
import uuid

from applications.OZtree.tests.unit import util

from gluon.globals import Request

from OZfunc import (
    nodes_info_from_array,
)

from sponsorship import sponsorship_config


class TestNodeInfo(unittest.TestCase):
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

    def ni(self, *args, **kwargs):
        """Call nodes_info_from_array(), resolve array column outputs"""
        meta = nodes_info_from_array([], [])

        def id_col(x):
            if x == 'reservations':
                return meta['colnames_' + x]['OTT_ID']
            return meta['colnames_' + x]['id']

        out = nodes_info_from_array(*args, **kwargs)
        for tblname in meta.keys():
            if not tblname.startswith('colnames_'):
                continue
            tblname = tblname.replace('colnames_', '')
            if tblname not in out:
                continue
            out[tblname + '_dict'] = {row[id_col(tblname)]:{k:row[idx] for (k, idx) in meta['colnames_' + tblname].items()} for row in out[tblname]}
        return out

    def test_nodes_info_from_string_sponsorship(self):
        db = current.db

        def reservation_leaf(r):
            return db(db.ordered_leaves.ott == r.OTT_ID).select()[0]

        expiry_time = current.request.now + datetime.timedelta(days=10*365)
        # Buy some OTTs
        email_1, user_1 = '1_betty@unittest.example.com', '1_bettyunittestexamplecom'
        current.request.now = expiry_time - datetime.timedelta(days=sponsorship_config()['duration_days'])
        rs = util.purchase_reservation(3, basket_details=dict(e_mail=email_1), verify=False)
        leaves = [reservation_leaf(r) for r in rs]
        util.verify_reservation(rs[0], verified_name="Definitely Betty", verified_url="https://betty.org")
        util.verify_reservation(rs[1], verified_name="It's Betty again", verified_kind="for", verified_url="https://betty.com", verified_more_info="More info about Betty")
        # NB: rs[2] isn't verified

        out = self.ni([l.id for l in leaves], [], include_sponsorship=True)
        self.assertEqual(out['leaves_dict'], {
            leaves[0].id: {k: getattr(leaves[0], k) for k in ('id', 'ott', 'name', 'popularity', 'price', 'extinction_date')},
            leaves[1].id: {k: getattr(leaves[1], k) for k in ('id', 'ott', 'name', 'popularity', 'price', 'extinction_date')},
            leaves[2].id: {k: getattr(leaves[2], k) for k in ('id', 'ott', 'name', 'popularity', 'price', 'extinction_date')},
        })

        self.assertEqual(out['reservations_dict'], {
            rs[0].OTT_ID: dict(
                OTT_ID=rs[0].OTT_ID,
                verified_name="Definitely Betty",
                verified_kind="by",
                verified_url="https://betty.org",
                verified_more_info=None,
            ), rs[1].OTT_ID: dict(
                OTT_ID=rs[1].OTT_ID,
                verified_name="It's Betty again",
                verified_kind="for",
                verified_url="https://betty.com",
                verified_more_info="More info about Betty",
            ),
            # NB: rs[2] doesn't appear in reservations output
        })

    def test_nodes_info_from_string_tours(self):
        def tour_url(*args):
            return ['/tour/data.html/ %s' % t['identifier'] for t in args]

        db = current.db
        leaves = [db(db.ordered_leaves.ott == ott).select(db.ordered_leaves.ALL)[0] for ott in util.find_unsponsored_otts(10)]
        tour1 = util.create_tour([l.ott for l in leaves[0:5]])
        tour2 = util.create_tour([l.ott for l in leaves[3:7]])
        expected_tours_by_ott = [
          [leaves[0].ott, tour_url(tour1)],
          [leaves[1].ott, tour_url(tour1)],
          [leaves[2].ott, tour_url(tour1)],
          [leaves[3].ott, tour_url(tour1, tour2)],
          [leaves[4].ott, tour_url(tour1, tour2)],
          [leaves[5].ott, tour_url(tour2)],
          [leaves[6].ott, tour_url(tour2)],
        ]

        out = self.ni([l.id for l in leaves], [])
        # Reponse has all leaves
        self.assertEqual(
            sorted([l.ott for l in leaves]),
            sorted([x[1] for x in out['leaves']]),
        )
        self.assertEqual(
            sorted(out['tours_by_ott'], key=lambda x: x[0]),
            sorted(expected_tours_by_ott, key=lambda x: x[0]),
        )

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestNodeInfo))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
