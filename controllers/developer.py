import ozmail
from embed import embedize_url

from OZfunc import (
    __release_info,
)


def index():
    return dict(release_info=__release_info())


def changelog():
    return dict(release_info=__release_info())


def embedding():
    return dict()


def embed_edit():
    form = FORM(
        LABEL("E-mail address"),
        INPUT(_type='email', requires=[IS_NOT_EMPTY(), IS_EMAIL()], _name='email', _class="uk-input uk-margin-bottom"),
        INPUT(_type='hidden', _name='url', _value=URL('default', 'life', scheme=True, host=True)),
        INPUT(_type='submit', _value="Send e-mail", _class="oz-pill pill-leaf"),
        _id="form_embed_email",
    )

    if form.accepts(request.vars, session=None, keepvalues=True):
        mail, reason=ozmail.get_mailer()
        if mail is None:
            response.flash = '%s, so cannot send email' % reason
        else:
            mailargs = ozmail.template_mail('embed_code', dict(
                url=embedize_url(form.vars.url, form.vars.email),
            ), to=form.vars.email)
            mail.send(**mailargs)
            response.flash = "E-mail with embed code sent"
    return dict(
        form=form,
    )
