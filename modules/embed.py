import html
import os.path
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

    def humanise_url(url):
        """Turn a url into something more human-readable"""
        return os.path.splitext(os.path.basename(url))[0].replace('_', ' ')

    # If url is a dict, merge provided options with the defaults
    if isinstance(url, dict):
        opts = {**defaults, **url}
    else:
        opts = defaults.copy()
        opts['url'] = url

    # Join together extra element data
    opts['element_data'] = ' '.join('data-%s="%s"' % (
        key,
        html.escape(value),
    ) for key, value in opts.items() if key not in ('url', 'alt', 'title') and value is not None and value is not True)

    # List of classes from all true options
    opts['klass'] = ''.join(' %s' % (
        html.escape(key),
    ) for key, value in opts.items() if key != 'url' and value is True)

    m = re.fullmatch(r'https://www.youtube.com/embed/(.+)', opts['url'])
    if m:
        opts['qs_continuation'] = '&' if "?" in url else "?"
        opts['origin'] = '%s://%s' % (request.env.wsgi_url_scheme, request.env.http_host)
        return """<div class="embed-video{klass}"><iframe
            class="embed-youtube"
            type="text/html"
            src="{url}{qs_continuation}enablejsapi=1&playsinline=1&origin={origin}"
            frameborder="0"
            {element_data}
        ></iframe></div>""".format(**opts)

    m = re.fullmatch(r'https://player.vimeo.com/video/(.+)', opts['url'])
    if m:
        return """<div class="embed-video{klass}"><iframe
            class="embed-vimeo"
            src="{url}"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
            {element_data}
        ></iframe></div>""".format(**opts)

    m = re.fullmatch(r'https://commons.wikimedia.org/wiki/File:(.+)\.(gif|jpg|jpeg|png|svg|ogg|mp3|ogv|webm|mpg|mpeg)', opts['url'])
    if m:
        if not opts.get('alt'):
            opts['alt'] = humanise_url("%s.%s" % (m.group(1), m.group(2)))
        if not opts.get('title'):
            opts['title'] = "%s.%s" % (m.group(1), m.group(2))
        opts['src_url'] = "https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/%s.%s" % (m.group(1), m.group(2))

        if m.group(2) in ('gif', 'jpg', 'jpeg', 'png', 'svg'):
            return """<a class="embed-image{klass}" title="{title}" href="{url}" {element_data}><img
              src="{src_url}"
              alt="{alt}"
            /><span class="copyright">©</span></a>""".format(**opts)
        if m.group(2) in ('ogg', 'mp3'):
            return """<div class="embed-audio{klass}"><audio controls
              src="{src_url}"
              {element_data}
              ></audio><a class="copyright" href="{url}" title="title">©</a></div>""".format(**opts)
        if m.group(2) in ('ogv', 'webm', 'mpg', 'mpeg'):
            return """<div class="embed-video{klass}"><video controls
              src="{src_url}"
              {element_data}
              ></video><a class="copyright" href="{url}">©</a></div>""".format(**opts)

    # Fallback without copyright link
    m = re.fullmatch(r'(.+\.(gif|jpg|jpeg|png|svg))', opts['url'])
    if m:
        if not opts.get('alt'):
            opts['alt'] = humanise_url(url)
        return """<a class="embed-image{klass}" {element_data}><img
          src="{url}"
          alt="{alt}"
        /></a>""".format(**opts)
    m = re.fullmatch(r'(.+\.(ogg|mp3))', opts['url'])
    if m:
        return """<div class="embed-audio{klass}"><audio controls
          src="{url}"
          {element_data}
          ></audio></div>""".format(**opts)

    # Fall back to linking
    return """<a href="{url}" style="font-weight:bold">{url}</a>""".format(**opts)
