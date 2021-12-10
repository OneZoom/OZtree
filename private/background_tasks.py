"""
OneZoom Background task processor
=================================

Runs all background tasks for OneZoom in a single process.

You can trigger a single run for development with::

    grunt exec:background_tasks:--single:--verbose
"""
import time
import sys

from gluon.globals import Request

import ozmail
from sponsorship import (
    reservation_expire, reservation_get_all_expired,
    reservation_unthanked, reservation_unthanked_post,
)


run_verbose = '--verbose' in sys.argv
run_single = '--single' in sys.argv
def verbose(s):
    if run_verbose:
        print(s)
run_http_host = sys.argv[1]

# Bodge request to be able to generate valid URLs
current.request.env.http_host = run_http_host
current.request.env.http_port = '443'
current.request.env.wsgi_url_scheme = 'https'

# Fetch a mailer object
mail, reason = ozmail.get_mailer()

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
    db.commit()

    verbose("* Send any thankyou e-mails")
    for username, r in reservation_unthanked().items():
        if not mail:
            raise ValueError(reason)
        mailargs = ozmail.template_mail('live', r, to=r['email_address'])
        if not mail.send(**mailargs):
            raise ValueError("Failed to send e-mail")
        # Register as sent
        verbose("* Success (%s)" % r['email_address'])
        # Write back sent status and commit, so we don't do it again
        reservation_unthanked_post(r)
        db.commit()

    verbose("----------------------------------------------")
    db.commit()
    if run_single:
        break
    time.sleep(60 * 10)  # Wait 10mins before re-executing
