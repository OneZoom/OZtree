"""
OneZoom Background task processor
=================================

Runs all background tasks for OneZoom in a single process:

* Expire any old sponsorships
* E-mail reminders, initial_reminders & final_reminders

Usage::

    grunt exec:background_tasks:(instance hostname, eg: 'onezoom.org')[:dry-run][:verbose]

* ``(instance hostname)`` provides the public hostname to use in links within e-mails
* ``dry-run`` will only report what will be done, no e-mails or database modifications will be made
* ``verbose`` will print out what is being done to stdout.

"""
import time
import sys

from gluon.globals import Request

import ozmail
from sponsorship import (
    reservation_expire,
    reservation_get_all_expired,
    sponsorship_email_reminders,
    sponsorship_email_reminders_post,
)
from OZfunc import nice_name_from_otts

run_dryrun = 'dry-run' in sys.argv
run_verbose = run_dryrun or ('verbose' in sys.argv)
if len(sys.argv) < 2:
    print("Usage: grunt exec:background_tasks:(instance hostname)[:dry-run][:verbose]", file=sys.stderr)
    exit(1)
run_http_host = sys.argv[1]

def verbose(s):
    if run_verbose:
        print(s)

# Regenerate request for current time
current.request = Request(dict())

# Application directory
current.request.folder = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))
current.request.application = os.path.basename(current.request.folder)

# Bodge request to be able to generate valid URLs
current.request.env.http_host = run_http_host
current.request.env.http_port = '443'
current.request.env.wsgi_url_scheme = 'https'

# Configure the mailer
mail, reason = ozmail.get_mailer()
if not mail:
    raise ValueError(reason)

for username, user_reminders in sponsorship_email_reminders().items():
    email = user_reminders['email_address']
    verbose("-" * 80)
    verbose("* Sending e-mail to %s" % email)
    user_reminders['nice_names'] = nice_name_from_otts(
        user_reminders['unsponsorable'] + user_reminders['not_yet_due'] +
        user_reminders['initial_reminders'] + user_reminders['final_reminders'],
        lang=user_reminders['user_sponsor_lang'], leaf_only=True,
        html=False, first_upper=True,
    )
    user_reminders['automated'] = True
    mailargs = ozmail.template_mail(
        'sponsor_renew_reminder',
        user_reminders,
        to=email,
    )
    verbose(mailargs['message'])

    # Actually try sending
    if run_dryrun:
        verbose("    ... (dry run)")
    else:
        if not mail.send(**mailargs):
            raise ValueError("Failed to send e-mail")
        # Register as sent
        verbose("    ... Success")
        # Write back sent status and commit, so we don't do it again
        sponsorship_email_reminders_post(user_reminders)
        db.commit()

verbose("-" * 80)
verbose("* Expire any old sponsorships")
for r in reservation_get_all_expired():
    print("Expiring sponsorship for OTT %d %s" % (
        r.OTT_ID,
        "(dry-run)" if run_dryrun else "",
    ))
    if not run_dryrun:
        reservation_expire(r)
db.commit()
