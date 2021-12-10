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
    sponsorship_story="""
The horned screamer is a massive 84–95 cm (33–37.5 in) long, 3.5 kg (7.7 lb) bird, with a small chicken-like bill. The upperparts, head, and breast are black, with white speckles on the crown, throat and wing coverts. There is a long spiny structure projecting forward from the crown. This structure is unique among birds and is not derived from a feather but is a cornified structure that is loosely attached to the skull and grows continuously while often breaking at its tip. This gives this species its name. It has very long and lanky legs and three large toes in each. The belly and under wing coverts are white. It has two sharp spurs on its wings and feet which are only partially webbed.

The horned screamer is found in lowlands from Colombia, Venezuela, Brazil, Bolivia, Peru, Ecuador, French Guiana, Suriname, and Guyana. It has been possibly extirpated from Trinidad. Despite having declined locally, it remains widespread and is fairly common overall. Its range in Brazil appears to have expanded in recent years. Screamers, like most birds, tend to group together, but are for the most part semi-social. The existence of the screamer is rather sedentary. It lives in well-vegetated marshes and feeds on water plants.
    """.strip(),
))[0]

# History that should then expire at next step
util.time_travel(s_conf['duration_days'] * 2 + 1)
util.purchase_reservation([714464, 539138], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
))
util.purchase_reservation([767829], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
    # NB: We need to fish out the id to join these up. Ideally util.purchase_reservation would manage this for us.
    prev_reservation_id=db(
        (db.expired_reservations.OTT_ID == 767829) &
        (db.expired_reservations.e_mail == 'agemixture@fixture.example.com')
    ).select(db.expired_reservations.id, orderby=~db.expired_reservations.verified_time).first().id,
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
util.purchase_reservation([860132, 241848], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
))
util.purchase_reservation([767829], basket_details=dict(
    e_mail='agemixture@fixture.example.com',
    user_donor_name='F. Agemixture',
    user_sponsor_name='F. Agemixture',
    prev_reservation_id=db(
        (db.expired_reservations.OTT_ID == 767829) &
        (db.expired_reservations.e_mail == 'agemixture@fixture.example.com')
    ).select(db.expired_reservations.id, orderby=~db.expired_reservations.verified_time).first().id,
))

# Travel back to current time to make sure anything that should be expired is
util.time_travel()
db.commit()
