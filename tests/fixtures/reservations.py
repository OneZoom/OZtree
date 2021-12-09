"""
(re) populate the test fixture reservations. Run with::

    grunt exec:db_fixtures
"""
import datetime
import sys

from gluon.globals import Request

from applications.OZtree.tests.unit import util
import sponsorship
import OZfunc

db = current.db
s_conf = sponsorship.sponsorship_config()

# Delete previous fixture entries, start from scratch
db.executesql("""DELETE FROM reservations WHERE e_mail LIKE '%@fixture.example.com'""")
db.executesql("""DELETE FROM expired_reservations WHERE e_mail LIKE '%@fixture.example.com'""")
db.executesql("""DELETE FROM wiped_reservations WHERE e_mail LIKE '%@fixture.example.com'""")

# Ancient history that should expire at next step
util.time_travel(s_conf['duration_days'] * 3 + 2)
util.purchase_reservation([767829], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
))

# History that should then expire at next step
util.time_travel(s_conf['duration_days'] * 2 + 1)
util.purchase_reservation([714464, 539138, 767829], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
))

# Rewind time, make some reservations that should be coming up for renewal soon
util.time_travel(s_conf['duration_days'] - s_conf['expiry_soon_days'] + 5)
util.purchase_reservation([714464], basket_details=dict(
    e_mail='single@fixture.example.com',
    user_donor_name='F. Single',
    user_sponsor_name='F. Single',
))
# Give pandas a price temporarily
old_price = db(db.ordered_leaves.ott==872573).select(db.ordered_leaves.price).first().price
db(db.ordered_leaves.ott==872573).update(price=100)
util.purchase_reservation([872573, 872577], basket_details=dict(
    e_mail='bannedott@fixture.example.com',
    user_donor_name='F. Banned',
    user_sponsor_name='F. Banned',
), allowed_status=set(('available', 'banned')))
db(db.ordered_leaves.ott==872573).update(price=old_price)
util.purchase_reservation([767829, 860132, 241848], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
))

# Travel back to current time to make sure anything that should be expired is
util.time_travel()
db.commit()
