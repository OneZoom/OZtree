"""
Run from the OZtree directory as
python3 ../../web2py.py -S OZtree -M -R applications/OZtree/OZprivate/ServerScripts/Utilities/OneOff/make_usernames.py

After 2 passes, will allocate usernames of remaining unallocated reservations using a
species name plus year.
"""
import argparse

from usernames import (
    find_username,
)

# Do 2 loops, to catch cases where we allocate a username after the 1st pass
for allocate_species_name in [False, True]:
    # loop over all the entries with a verified_time
    rows = db(db.reservations.verified_time != None).select(
        db.reservations.ALL,
        orderby=db.reservations.verified_kind|db.reservations.verified_time  # put "by" first
    )
    usernames = {}
    for row in rows:
        data = (row.id, row.verified_kind, row.verified_name, row.e_mail, row.PP_e_mail, row.name)
        username = row.username
        if not username:
            username = find_username(row, allocate_species_name=allocate_species_name)[0]
            if username:
                db.reservations[row.id] = dict(username=username)
        if not username:
            assert allocate_species_name == False
            print(f"Could not construct a standard username for reservations row {data}")
        else:
            if username not in usernames:
                usernames[username] = [data]
            else:
                usernames[username].append(data)

print("Allocated usernames:")
for k, v in usernames.items():
    for row in v:
        print("User:", k, row)
    print()