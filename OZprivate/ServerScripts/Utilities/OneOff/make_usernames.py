"""
Run from the OZtree directory as
python3 ../../web2py.py -S OZtree -M -R applications/OZtree/OZprivate/ServerScripts/Utilities/OneOff/make_usernames.py

Find any remaining rows that have been sponsored but for which we can't find a username
using select * from reservations where username is NULL and verified_time is not NULL;
"""

from usernames import (
    find_username,
)

# loop over all the entries with a verified_time

rows = db(db.reservations.verified_time != None).select(
    db.reservations.ALL,
    orderby=db.reservations.verified_kind|db.reservations.verified_time  # put "by" first
)
usernames = {}
for row in rows:
    data = (row.id, row.verified_kind, row.verified_name, row.e_mail, row.PP_e_mail)
    username = row.username
    if not username:
        username = find_username(row)[0]
        if username:
            db.reservations[row.id] = dict(username=username)
    if not username:
        print(f"Could not construct a username for reservations row {data}")
    else:
        if username not in usernames:
            usernames[username] = [data]
        else:
            usernames[username].append(data)

for k, v in usernames.items():
    for row in v:
        print("User:", k, row)
    print()