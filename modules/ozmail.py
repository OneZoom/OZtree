import re

from gluon import current

def get_mailer(**override_settings):
    """Return a tuple of a valid mail object or none, and if none a string reason"""
    auth = current.globalenv['auth']
    myconf = current.globalenv['myconf']

    # Generate mail object
    try:
        mail = auth.settings.mailer
        mail.settings.server = myconf.take('smtp.server')
        mail.settings.sender = myconf.take('smtp.sender')
        try:
            mail.settings.login = myconf.take('smtp.login')
        except:
            pass
        try:
            mail.settings.tls = (myconf.take('smtp.tls').lower() == 'true')
        except:
            pass
        for k, v in override_settings.items():
            setattr(mail.settings, k, v)
    except:
        mail = None

    try:
        autosend = int(myconf.take('smtp.autosend_email'))
    except BaseException:
        autosend = 0
    if mail is None:
        return None, 'No e-mail configuration in appconfig.ini'
    if autosend != 1:
        return None, '''"autosend_email" isn't set to 1 in appconfig.ini'''
    return mail, None


def normalize_whitespace(s):
    s = s.strip()
    # Only allow one blank line
    s = re.sub(r'\n{3,}', '\n\n', s)
    # Remove single newlines, let mail-clients do their own wrapping
    s = re.sub(r'(?<!\n)\n(?!\n)', ' ', s)
    return s


def template_mail(template_name, render_dict, to, **extra_args):
    """Template mail.send kwargs from a template file. If is_testing is true"""
    response = current.globalenv['response']
    is_testing = current.globalenv['is_testing']
    myconf = current.globalenv['myconf']
    
    email_body = response.render('email/%s.txt' % template_name, render_dict, escape=False).strip()
    email_subject, email_body = email_body.split('\n', 1)
    if is_testing:
        email_subject = "Test email intended for " + str(to) + " re: " + email_subject
        try:
            to = myconf.take('smtp.sender')
        except:
            to = None
    out = dict(
        subject=email_subject.strip(),
        message=normalize_whitespace(email_body),
        to=to,
    )
    out.update(extra_args)
    return out
