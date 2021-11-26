"""
OneZoom Sponsorship E-mailer
============================

(weekly) script to send all e-mail reminders about expiring sponsorships.

To trigger a dry-run without sending any e-mails::

    grunt exec:send_sponsorship_emails:(instance hostname):dry-run

To send the e-mails, do::

    grunt exec:send_sponsorship_emails:(instance hostname, e.g. onezoom.org)
"""
import time
import sys

from gluon.globals import Request

from sponsorship import (
    sponsorship_email_reminders,
    sponsorship_email_reminders_post,
)
from OZfunc import get_common_names, get_mailer

run_dryrun = 'dry-run' in sys.argv
run_verbose = run_dryrun or ('verbose' in sys.argv)
if len(sys.argv) < 2:
    print("Usage: grunt exec:send_sponsorship_emails:(instance hostname)", file=sys.stderr)
    exit(1)
run_http_host = sys.argv[1]

def verbose(s):
    if run_verbose:
        print(s)

# Bodge request to be able to generate valid URLs
current.request.env.http_host = run_http_host
current.request.env.http_port = '443'
current.request.env.wsgi_url_scheme = 'https'

for username, user_reminders in sponsorship_email_reminders().items():
    email = user_reminders['email_address']
    verbose("*****************************\n*** Sending e-mail to %s" % email)
    user_reminders['common_names'] = get_common_names(
        user_reminders['unsponsorable'] + user_reminders['not_yet_due'] +
        user_reminders['initial_reminders'] + user_reminders['final_reminders'],
        return_nulls=True,
        lang=user_reminders['user_sponsor_lang'],
    )
    email_body = re.sub(r'\n\n+', '\n\n', response.render('sponsor_renew_reminder.txt', user_reminders))
    verbose(email_body)

    # Actually try sending
    if run_dryrun:
        verbose("    ... (dry run)")
    else:
        mail, reason = get_mailer()
        if not mail:
            raise ValueError(reason)
        if not mail.send(to=email, subject=T("OneZoom sponsorship reminder"), message=email_body):
            raise ValueError("Failed to send e-mail")
        # Register as sent
        verbose("    ... Success")
        # Write back sent status and commit, so we don't do it again
        sponsorship_email_reminders_post(user_reminders)
        db.commit()
db.commit()
