import re
import urllib.request

from gluon import current
from gluon.http import HTTP
from gluon.utils import web2py_uuid

def embedize_url(url, email):
    request = current.request
    db = current.db

    # Normalise e-mail address
    email = email.strip().lower()

    # Get / generate a corresponding embed_key
    embed_key = db(db.embed_key.e_mail == email).select().first()
    if embed_key is None:
        db.embed_key.insert(e_mail=email, code=web2py_uuid())
        embed_key = db(db.embed_key.e_mail == email).select().first()

    # Return URL with embed key added on
    return "".join((
        url,
        '&' if '?' in url else '?',
        'embedkey=%s' % embed_key.code,
    ))


def media_embed(url):
    """Generate media embed code for given URL"""
    request = current.request

    m = re.fullmatch(r'https://www.youtube.com/embed/(.+)', url)
    if m:
        return """<iframe
            class="embed-youtube"
            type="text/html"
            src="{url}?enablejsapi=1&playsinline=1&origin={origin}"
            frameborder="0"
        ></iframe>""".format(
            url=url,
            origin='%s://%s' % (request.env.wsgi_url_scheme, request.env.http_host),
        )

    m = re.fullmatch(r'https://player.vimeo.com/video/(.+)', url)
    if m:
        return """<iframe
            class="embed-vimeo"
            src="{url}"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
        ></iframe>""".format(
            url=url,
        )

    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+\.(gif|jpg|jpeg|png|svg))', url)
    if m:
        # TODO: Fetch & cache image metadata,
        return """<a class="embed-wikimedia" title="{title}" href="{url}"><img
          src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/{name}"
          alt="{name}"
        /></a>""".format(
            title=m.group(1),
            name=m.group(1),
            url=url,
        )

    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+\.(ogg|mp3))', url)
    if m:
        # TODO: There's a dedicated audio player embed we should probably use. The purpose here
        #       is more to demonstrate HTML audio than wikipedia commons in particular.
        return """<audio class="embed-audio" controls
          src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/{name}"
          ></audio><a href="{url}" title="title">(c)</a>""".format(
            title=m.group(1),
            name=m.group(1),
            url=url,
        )

    raise HTTP(400, "Unknown embed URL %s" % url)
