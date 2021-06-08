"""
OneZoom Background task processor
=================================

Runs all background tasks for OneZoom in a single process.

You can trigger a single run for development with::

    python3 $(dirname $(dirname $(readlink -f .)))/web2py.py -S OZtree -M -e \
        -R applications/OZtree/private/background_tasks.py --args --single
"""
import time
import sys

from gluon.globals import Request

from sponsorship import (
    reservation_expire, reservation_get_all_expired
)


run_verbose = '--verbose' in sys.argv
run_single = '--single' in sys.argv
def verbose(s):
    if run_verbose:
        print(s)

# NB: We don't catch errors in our loop, so any errors will cause the worker to
#     fall over completely. However, supervisord will restart for us
while True:
    # Regenerate request for current time
    current.request = Request(dict())
    verbose(current.request.now)

    verbose("* Expire any old sponsorships")
    for r in reservation_get_all_expired():
        print("Expiring sponsorship for OTT %d" % r.OTT_ID)
        reservation_expire(r)

    verbose("----------------------------------------------")
    db.commit()
    if run_single:
        break
    time.sleep(60 * 10)  # Wait 10mins before re-executing
