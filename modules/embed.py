import html
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


def media_embed(url, defaults=dict()):
    """
    Generate media embed code for given URL
    - url: Either a URI in recognised format or dict(url: "https://", **opts), where (opts) & (defaults) are merged
    - defaults: data-x options to set on the HTML, can be overriden by (opts)
    """
    request = current.request

    # If url is a dict, merge provided options with the defaults
    if isinstance(url, dict):
        opts = {**defaults, **url}
        url = opts['url']
    else:
        opts = defaults
        url = url

    # Join together extra element data
    element_data = ' '.join('data-%s="%s"' % (
        key,
        html.escape(value),
    ) for key, value in opts.items() if key != 'url' and value is not None)

    m = re.fullmatch(r'https://www.youtube.com/embed/(.+)', url)
    if m:
        return """<div class="embed-video"><iframe
            class="embed-youtube"
            type="text/html"
            src="{url}?enablejsapi=1&playsinline=1&origin={origin}"
            frameborder="0"
            {element_data}
        ></iframe></div>""".format(
            url=url,
            origin='%s://%s' % (request.env.wsgi_url_scheme, request.env.http_host),
            element_data=element_data,
        )

    m = re.fullmatch(r'https://player.vimeo.com/video/(.+)', url)
    if m:
        return """<div class="embed-video"><iframe
            class="embed-vimeo"
            src="{url}"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
            {element_data}
        ></iframe></div>""".format(
            url=url,
            element_data=element_data,
        )

    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+\.(gif|jpg|jpeg|png|svg))', url)
    if m:
        # TODO: Fetch & cache image metadata,
        return """<a class="embed-wikimedia" title="{title}" href="{url}" {element_data}><img
          src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/{name}"
          alt="{name}"
        /><span class="copyright">©</span></a>""".format(
            title=m.group(1),
            name=m.group(1),
            url=url,
            element_data=element_data,
        )

    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+\.(ogg|mp3))', url)
    if m:
        # TODO: There's a dedicated audio player embed we should probably use. The purpose here
        #       is more to demonstrate HTML audio than wikipedia commons in particular.
        return """<div class="embed-audio"><audio controls
          src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/{name}"
          {element_data}
          ></audio><a class="copyright" href="{url}" title="title">©</a></div>""".format(
            title=m.group(1),
            name=m.group(1),
            url=url,
            element_data=element_data,
        )

    # https://commons.wikimedia.org/wiki/Commons:File_types#Video
    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+\.(ogv|webm|mpg|mpeg))', url)
    if m:
        # NB: There's an embedded player we could use, but there's no way to control it over the iframe barrrier
        return """<div class="embed-video"><video controls
          src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/{name}"
          {element_data}
          ></video><a class="copyright" href="{url}">©</a></div>""".format(
            title=m.group(1),
            name=m.group(1),
            url=url,
            element_data=element_data,
        )

    # Fall back to linking
    return """<a href="{url}" style="font-weight:bold">{url}</a>""".format(
        url=url,
    )
