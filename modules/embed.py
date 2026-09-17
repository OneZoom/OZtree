import html
import os.path
import re
import urllib.parse
import urllib.request
from collections import namedtuple

from gluon import current
from gluon.http import HTTP
from gluon.utils import web2py_uuid

import img

# Canonical host for tour-bundled images/audio. Relative media paths are resolved against this.
TOURS_URL_BASE = 'https://tours.onezoom.workers.dev/'

IMAGE_EXTS = ('gif', 'jpg', 'jpeg', 'png', 'svg')
AUDIO_EXTS = ('ogg', 'mp3')
VIDEO_EXTS = ('ogv', 'webm', 'mpg', 'mpeg')
MEDIA_EXTS = '|'.join(IMAGE_EXTS + AUDIO_EXTS + VIDEO_EXTS)

ParsedMedia = namedtuple('ParsedMedia', (
    'kind',           # onezoom | youtube | vimeo | wikimedia | tours | image | audio | link
    'media_type',     # image | audio | video | iframe | link
    'src_url',        # URL to display the media
    'copyright_url',  # attribution page, or None
    'alt',
    'title',
))


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


def _humanise_url(url):
    """Turn a url into something more human-readable"""
    return os.path.splitext(os.path.basename(url))[0].replace('_', ' ')


def _media_type_for_ext(ext):
    ext = ext.lower()
    if ext in IMAGE_EXTS:
        return 'image'
    if ext in AUDIO_EXTS:
        return 'audio'
    if ext in VIDEO_EXTS:
        return 'video'
    return None


def _parse_onezoom(url, alt, title):
    m = re.fullmatch(r'imgsrc:(-?\d+):(-?\d+)', url)
    if not m:
        return None
    return ParsedMedia(
        kind='onezoom',
        media_type='image',
        src_url=img.url(url),
        copyright_url='/tree/pic_info/%s/%s' % (m.group(1), m.group(2)),
        alt=alt or '',
        title=title or '',
    )


def _parse_youtube(url, alt, title):
    m = re.fullmatch(r'https://www.youtube.com/embed/(.+)', url)
    if not m:
        return None
    return ParsedMedia(
        kind='youtube',
        media_type='iframe',
        src_url=url,
        copyright_url=None,
        alt=alt or '',
        title=title or '',
    )


def _parse_vimeo(url, alt, title):
    m = re.fullmatch(r'https://player.vimeo.com/video/(.+)', url)
    if not m:
        return None
    return ParsedMedia(
        kind='vimeo',
        media_type='iframe',
        src_url=url,
        copyright_url=None,
        alt=alt or '',
        title=title or '',
    )


def _upload_commons_filename(url):
    """Filename from a Commons original or thumb on upload.wikimedia.org."""
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or '').lower()
    if host.startswith('www.'):
        host = host[4:]
    if host != 'upload.wikimedia.org':
        return None
    pathname = urllib.parse.unquote(parsed.path)
    m = re.match(
        r'^/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+\.(%s))(?:/.*)?$' % MEDIA_EXTS,
        pathname,
        re.IGNORECASE,
    )
    return m.group(1) if m else None


def _parse_wikimedia(url, alt, title):
    m = re.fullmatch(
        r'https://commons.wikimedia.org/wiki/File:(.+)\.(%s)' % MEDIA_EXTS,
        url,
    )
    if m:
        filename = '%s.%s' % (m.group(1), m.group(2))
        copyright_url = url
    else:
        filename = _upload_commons_filename(url)
        if not filename:
            return None
        copyright_url = 'https://commons.wikimedia.org/wiki/File:%s' % filename
    return ParsedMedia(
        kind='wikimedia',
        media_type=_media_type_for_ext(filename.rsplit('.', 1)[-1]),
        src_url='https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/%s' % filename,
        copyright_url=copyright_url,
        alt=alt or _humanise_url(filename),
        title=title or filename,
    )


def _parse_tours(url, alt, title):
    # Custom tours assets at https://*.onezoom.workers.dev/
    # Also recognise the former GitHub Pages host. Replace the media extension with
    # .html to get a link to the copyright page on the same host.
    m = re.fullmatch(
        r'(https://(?:(?:[a-z0-9-]+\.)*onezoom\.workers\.dev|onezoom\.github\.io/tours))/(.+)\.(%s)' % MEDIA_EXTS,
        url,
    )
    if not m:
        return None
    return ParsedMedia(
        kind='tours',
        media_type=_media_type_for_ext(m.group(3)),
        src_url=url,
        copyright_url='%s/%s.html' % (m.group(1), m.group(2)),
        alt=alt or _humanise_url(m.group(2)),
        title=title or '%s.%s' % (m.group(2), m.group(3)),
    )


def _parse_image(url, alt, title):
    m = re.fullmatch(r'(.+\.(?:%s))' % '|'.join(IMAGE_EXTS), url)
    if not m:
        return None
    return ParsedMedia(
        kind='image',
        media_type='image',
        src_url=url,
        copyright_url=None,
        alt=alt or _humanise_url(url),
        title=title or '',
    )


def _parse_audio(url, alt, title):
    m = re.fullmatch(r'(.+\.(?:%s))' % '|'.join(AUDIO_EXTS), url)
    if not m:
        return None
    return ParsedMedia(
        kind='audio',
        media_type='audio',
        src_url=url,
        copyright_url=None,
        alt=alt or '',
        title=title or '',
    )


def _parse_link(url, alt, title):
    return ParsedMedia(
        kind='link',
        media_type='link',
        src_url=url,
        copyright_url=None,
        alt=alt or '',
        title=title or '',
    )


_MEDIA_PARSERS = (
    _parse_onezoom,
    _parse_youtube,
    _parse_vimeo,
    _parse_wikimedia,
    _parse_tours,
    _parse_image,
    _parse_audio,
)


def parse_media(url, url_base=None, alt=None, title=None):
    """
    Classify a media URL and resolve display / copyright URLs.

    Returns a ParsedMedia. ``url_base`` is joined onto relative URLs (tour assets).
    ``alt`` / ``title`` override the defaults derived from the URL.
    """
    if url_base:
        url = urllib.parse.urljoin(url_base, url)
    for parse in _MEDIA_PARSERS:
        media = parse(url, alt=alt, title=title)
        if media is not None:
            return media
    return _parse_link(url, alt=alt, title=title)


def render_media_html(media, opts=None):
    """Render ParsedMedia to tour-stop embed HTML. ``opts`` become data-* / classes."""
    request = current.request
    opts = dict(opts or ())

    element_data = ' '.join('data-%s="%s"' % (
        key,
        html.escape(value),
    ) for key, value in opts.items() if value is not None and value is not True)

    klass = ''.join(' %s' % (
        html.escape(key),
    ) for key, value in opts.items() if value is True)

    if media.media_type == 'image':
        if media.copyright_url:
            return """<a class="embed-image{klass}" title="{title}" href="{href}" {element_data}><img
          src="{src_url}"
          alt="{alt}"
        /><span class="copyright">©</span></a>""".format(
                klass=klass,
                title=media.title,
                href=media.copyright_url,
                element_data=element_data,
                src_url=media.src_url,
                alt=media.alt,
            )
        return """<a class="embed-image{klass}" {element_data}><img
          src="{src_url}"
          alt="{alt}"
        /></a>""".format(
            klass=klass,
            element_data=element_data,
            src_url=media.src_url,
            alt=media.alt,
        )

    if media.media_type == 'iframe':
        src_url = media.src_url
        iframe_class = 'embed-youtube' if media.kind == 'youtube' else 'embed-vimeo'
        extra_attrs = ''
        if media.kind == 'youtube':
            qs_continuation = '&' if '?' in src_url else '?'
            origin = '%s://%s' % (request.env.wsgi_url_scheme, request.env.http_host)
            src_url = '%s%senablejsapi=1&playsinline=1&origin=%s' % (
                src_url, qs_continuation, origin,
            )
            extra_attrs = '\n            type="text/html"'
        return """<div class="embed-video{klass}"><iframe
            class="{iframe_class}"{extra_attrs}
            src="{src_url}"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
            {element_data}
        ></iframe></div>""".format(
            klass=klass,
            iframe_class=iframe_class,
            extra_attrs=extra_attrs,
            src_url=src_url,
            element_data=element_data,
        )

    if media.media_type == 'audio':
        copyright = ''
        if media.copyright_url:
            copyright = '<a class="copyright" href="%s">©</a>' % media.copyright_url
        return """<div class="embed-audio{klass}"><audio controls
              src="{src_url}"
              {element_data}
              ></audio>{copyright}</div>""".format(
            klass=klass,
            src_url=media.src_url,
            element_data=element_data,
            copyright=copyright,
        )

    if media.media_type == 'video':
        copyright = ''
        if media.copyright_url:
            copyright = '<a class="copyright" href="%s">©</a>' % media.copyright_url
        return """<div class="embed-video{klass}"><video controls
              src="{src_url}"
              {element_data}
              ></video>{copyright}</div>""".format(
            klass=klass,
            src_url=media.src_url,
            element_data=element_data,
            copyright=copyright,
        )

    return """<a href="{url}" style="font-weight:bold">{url}</a>""".format(url=media.src_url)


def media_embed(url, defaults=dict()):
    """
    Generate media embed code for given URL
    - url: Either a URI in recognised format or dict(url: "https://", **opts), where (opts) & (defaults) are merged
    - defaults: data-x options to set on the HTML, can be overriden by (opts)
    """
    if isinstance(url, dict):
        opts = {**defaults, **url}
    else:
        opts = defaults.copy()
        opts['url'] = url

    media = parse_media(
        opts.pop('url'),
        url_base=opts.pop('url_base', None),
        alt=opts.pop('alt', None),
        title=opts.pop('title', None),
    )
    return render_media_html(media, opts)
