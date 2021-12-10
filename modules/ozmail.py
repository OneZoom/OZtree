from gluon import current

def get_mailer():
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
