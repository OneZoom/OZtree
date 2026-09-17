"""
Run with::

    ./web2py-run tests/unit/test_modules_embed.py

"""
import re
import unittest

from gluon.globals import Request
from gluon.http import HTTP

from applications.OZtree.tests.unit import util

import embed
import img


class TestEmbed(unittest.TestCase):
    maxDiff = None

    def test_embedize_url(self):
        def extract_key(u):
            return re.search(r'embedkey=([a-z\-0-9]+)', u).group(1)

        # Append to URL correctly
        out = embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')
        self.assertEqual(out, 'http://moo.com?embedkey=' + extract_key(out))
        out = embed.embedize_url('http://moo.com?a=1', 'alfred@unittest.example.com')
        self.assertEqual(out, 'http://moo.com?a=1&embedkey=' + extract_key(out))

        # keys match when e-mail addresses match
        self.assertEqual(
            extract_key(embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')),
            extract_key(embed.embedize_url('http://parp.com', 'alfred@unittest.example.com')),
        )
        self.assertEqual(
            extract_key(embed.embedize_url('http://moo.com', 'betty@unittest.example.com')),
            extract_key(embed.embedize_url('http://parp.com', 'betty@unittest.example.com')),
        )
        self.assertNotEqual(
            extract_key(embed.embedize_url('http://moo.com', 'alfred@unittest.example.com')),
            extract_key(embed.embedize_url('http://moo.com', 'betty@unittest.example.com')),
        )

    def test_parse_media(self):
        m = embed.parse_media('imgsrc:99:27732437')
        self.assertEqual(m.kind, 'onezoom')
        self.assertEqual(m.media_type, 'image')
        self.assertEqual(m.src_url, img.url('imgsrc:99:27732437'))
        self.assertEqual(m.copyright_url, '/tree/pic_info/99/27732437')
        self.assertEqual(m.alt, '')
        self.assertEqual(m.title, '')
        # Base doesn't rewrite imgsrc: URLs
        self.assertEqual(
            embed.parse_media('imgsrc:99:27732437'),
            embed.parse_media('imgsrc:99:27732437', url_base='https://moo.com/base'),
        )

        m = embed.parse_media('https://www.wibble.com/some_image.jpg')
        self.assertEqual(m.kind, 'image')
        self.assertEqual(m.media_type, 'image')
        self.assertEqual(m.src_url, 'https://www.wibble.com/some_image.jpg')
        self.assertIsNone(m.copyright_url)
        self.assertEqual(m.alt, 'some image')

        m = embed.parse_media('https://www.wibble.com/some_file.bin')
        self.assertEqual(m.kind, 'link')
        self.assertEqual(m.media_type, 'link')
        self.assertEqual(m.src_url, 'https://www.wibble.com/some_file.bin')
        self.assertIsNone(m.copyright_url)

        m = embed.parse_media('https://www.youtube.com/embed/12345')
        self.assertEqual(m.kind, 'youtube')
        self.assertEqual(m.media_type, 'iframe')
        self.assertEqual(m.src_url, 'https://www.youtube.com/embed/12345')
        self.assertIsNone(m.copyright_url)

        m = embed.parse_media('https://player.vimeo.com/video/12345')
        self.assertEqual(m.kind, 'vimeo')
        self.assertEqual(m.media_type, 'iframe')
        self.assertIsNone(m.copyright_url)

        m = embed.parse_media('https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif')
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(m.media_type, 'image')
        self.assertEqual(
            m.src_url,
            'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Rose_of_Jericho.gif',
        )
        self.assertEqual(m.copyright_url, 'https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif')
        self.assertEqual(m.alt, 'Rose of Jericho')
        self.assertEqual(m.title, 'Rose_of_Jericho.gif')

        m = embed.parse_media('https://upload.wikimedia.org/wikipedia/commons/f/f8/Rooster04_adjusted.jpg')
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(m.media_type, 'image')
        self.assertEqual(
            m.src_url,
            'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Rooster04_adjusted.jpg',
        )
        self.assertEqual(m.copyright_url, 'https://commons.wikimedia.org/wiki/File:Rooster04_adjusted.jpg')

        m = embed.parse_media(
            'https://upload.wikimedia.org/wikipedia/commons/1/15/Psychrolutes_marcidus.jpg?utm_source=commons.wikimedia.org',
        )
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(m.copyright_url, 'https://commons.wikimedia.org/wiki/File:Psychrolutes_marcidus.jpg')

        m = embed.parse_media(
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Sommieria_leucophylla.jpg/1920px-Sommieria_leucophylla.jpg',
        )
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(
            m.src_url,
            'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Sommieria_leucophylla.jpg',
        )
        self.assertEqual(m.copyright_url, 'https://commons.wikimedia.org/wiki/File:Sommieria_leucophylla.jpg')

        m = embed.parse_media('https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg')
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(m.media_type, 'audio')
        self.assertEqual(m.copyright_url, 'https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg')

        m = embed.parse_media(
            'https://commons.wikimedia.org/wiki/File:Intense_bone_fluorescence_reveals_hidden_patterns_in_pumpkin_toadlets_-_video_1_-_41598_2019_41959_MOESM2_ESM.webm',
        )
        self.assertEqual(m.kind, 'wikimedia')
        self.assertEqual(m.media_type, 'video')

        m = embed.parse_media('https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg')
        self.assertEqual(m.kind, 'tours')
        self.assertEqual(m.media_type, 'image')
        self.assertEqual(m.src_url, 'https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg')
        self.assertEqual(m.copyright_url, 'https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.html')
        self.assertEqual(m.alt, 'Various frogs and toads')
        self.assertEqual(m.title, 'frogs/Various_frogs_and_toads.jpeg')
        self.assertEqual(
            m,
            embed.parse_media('frogs/Various_frogs_and_toads.jpeg', url_base=embed.TOURS_URL_BASE),
        )

        m = embed.parse_media(
            'frogs/Various_frogs_and_toads.jpeg',
            url_base='https://my-lovely-tour-tours.onezoom.workers.dev/',
        )
        self.assertEqual(m.kind, 'tours')
        self.assertEqual(
            m.copyright_url,
            'https://my-lovely-tour-tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.html',
        )

        m = embed.parse_media('https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.jpeg')
        self.assertEqual(m.kind, 'tours')
        self.assertEqual(m.copyright_url, 'https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.html')

        m = embed.parse_media('imgsrc:99:27732437', alt='Custom alt', title='Custom title')
        self.assertEqual(m.alt, 'Custom alt')
        self.assertEqual(m.title, 'Custom title')

        # Negative src_id is used for eol_old images
        m = embed.parse_media('imgsrc:3:-27123592')
        self.assertEqual(m.kind, 'onezoom')
        self.assertEqual(m.src_url, img.url('imgsrc:3:-27123592'))
        self.assertEqual(m.copyright_url, '/tree/pic_info/3/-27123592')

    def test_media_embed(self):
        def media_embed(url, **kwargs):
            out = embed.media_embed(url, **kwargs)
            return re.split('\s+', out, flags=re.MULTILINE)

        self.assertEqual(media_embed('https://www.wibble.com/some_image.jpg'), [
            '<a',
            'class="embed-image"',
            '><img',
            'src="https://www.wibble.com/some_image.jpg"',
            'alt="some',
            'image"',
            '/></a>',
        ])
        self.assertEqual(media_embed('https://www.wibble.com/some_file.bin'), [
            '<a',
            'href="https://www.wibble.com/some_file.bin"',
            'style="font-weight:bold">https://www.wibble.com/some_file.bin</a>',
        ])

        self.assertEqual(media_embed('imgsrc:99:27732437'), [
            '<a',
            'class="embed-image"',
            'title=""',
            'href="/tree/pic_info/99/27732437"',
            '><img',
            'src="http://127.0.0.1:8000/OZtree/static/FinalOutputs/img/99/437/27732437.jpg"',
            'alt=""',
            '/><span',
            'class="copyright">©</span></a>',
        ])
        # Base doesn't rewrite imgsrc: URLs
        self.assertEqual(
            media_embed('imgsrc:99:27732437'),
            media_embed('imgsrc:99:27732437', defaults=dict(url_base="https://moo.com/base")),
        )

        self.assertEqual(media_embed('https://www.youtube.com/embed/12345'), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            '></iframe></div>',
        ])
        self.assertEqual(media_embed('https://www.youtube.com/embed/12345?clip=sausage'), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?clip=sausage&enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            '></iframe></div>',
        ])
        self.assertEqual(media_embed('https://www.youtube.com/embed/12345', defaults=dict(ts_autoplay="tsstate-active_wait", camel='"yes"')), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            'data-ts_autoplay="tsstate-active_wait"',
            'data-camel="&quot;yes&quot;"',
            '></iframe></div>',
        ])
        # Can override defaults by providing a dict
        self.assertEqual(media_embed(dict(url='https://www.youtube.com/embed/12345', ts_autoplay="nothanks"), defaults=dict(ts_autoplay="tsstate-active_wait")), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            'data-ts_autoplay="nothanks"',
            '></iframe></div>',
        ])
        self.assertEqual(media_embed(dict(url='https://www.youtube.com/embed/12345', ts_autoplay=None), defaults=dict(ts_autoplay="tsstate-active_wait")), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            '></iframe></div>',
        ])
        # Can set classes using ": true"
        self.assertEqual(media_embed({"url": 'https://www.youtube.com/embed/12345', "peep": True, "poop": True}, defaults=dict(ts_autoplay="tsstate-active_wait")), [
            '<div',
            'class="embed-video',
            'peep',
            'poop"><iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            'data-ts_autoplay="tsstate-active_wait"',
            '></iframe></div>',
        ])

        self.assertEqual(media_embed('https://player.vimeo.com/video/12345'), [
            '<div',
            'class="embed-video"><iframe',
            'class="embed-vimeo"',
            'src="https://player.vimeo.com/video/12345"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            '></iframe></div>',
        ])

        self.assertEqual(media_embed('https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif'), [
            '<a',
            'class="embed-image"',
            'title="Rose_of_Jericho.gif"',
            'href="https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif"',
            '><img',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Rose_of_Jericho.gif"',
            'alt="Rose',
            'of',
            'Jericho"',
            '/><span',
            'class="copyright">©</span></a>',
        ])
        self.assertEqual(media_embed('https://upload.wikimedia.org/wikipedia/commons/f/f8/Rooster04_adjusted.jpg'), [
            '<a',
            'class="embed-image"',
            'title="Rooster04_adjusted.jpg"',
            'href="https://commons.wikimedia.org/wiki/File:Rooster04_adjusted.jpg"',
            '><img',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Rooster04_adjusted.jpg"',
            'alt="Rooster04',
            'adjusted"',
            '/><span',
            'class="copyright">©</span></a>',
        ])

        self.assertEqual(media_embed('https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg'), [
            '<div',
            'class="embed-audio"><audio',
            'controls',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Turdus_philomelos.ogg"',
            '></audio><a',
            'class="copyright"',
            'href="https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg">©</a></div>',
        ])

        self.assertEqual(media_embed('https://commons.wikimedia.org/wiki/File:Intense_bone_fluorescence_reveals_hidden_patterns_in_pumpkin_toadlets_-_video_1_-_41598_2019_41959_MOESM2_ESM.webm'), [
            '<div',
            'class="embed-video"><video',
            'controls',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Intense_bone_fluorescence_reveals_hidden_patterns_in_pumpkin_toadlets_-_video_1_-_41598_2019_41959_MOESM2_ESM.webm"',
            '></video><a',
            'class="copyright"',
            'href="https://commons.wikimedia.org/wiki/File:Intense_bone_fluorescence_reveals_hidden_patterns_in_pumpkin_toadlets_-_video_1_-_41598_2019_41959_MOESM2_ESM.webm">©</a></div>',
        ])

        self.assertEqual(media_embed('https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg'), [
            '<a',
            'class="embed-image"',
            'title="frogs/Various_frogs_and_toads.jpeg"',
            'href="https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.html"',
            '><img',
            'src="https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg"',
            'alt="Various',
            'frogs',
            'and',
            'toads"',
            '/><span',
            'class="copyright">©</span></a>',
        ])
        # Can use a URL base
        self.assertEqual(
            media_embed('https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg'),
            media_embed('frogs/Various_frogs_and_toads.jpeg', defaults=dict(url_base=embed.TOURS_URL_BASE)),
        )
        # Per-tour worker hosts get a copyright page on the same host
        self.assertEqual(media_embed('https://my-lovely-tour-tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg'), [
            '<a',
            'class="embed-image"',
            'title="frogs/Various_frogs_and_toads.jpeg"',
            'href="https://my-lovely-tour-tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.html"',
            '><img',
            'src="https://my-lovely-tour-tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg"',
            'alt="Various',
            'frogs',
            'and',
            'toads"',
            '/><span',
            'class="copyright">©</span></a>',
        ])
        self.assertEqual(
            media_embed('https://my-lovely-tour-tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg'),
            media_embed('frogs/Various_frogs_and_toads.jpeg', defaults=dict(
                url_base='https://my-lovely-tour-tours.onezoom.workers.dev/')),
        )
        # Former GitHub Pages host still embeds with a copyright page on that host
        self.assertEqual(media_embed('https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.jpeg'), [
            '<a',
            'class="embed-image"',
            'title="frogs/Various_frogs_and_toads.jpeg"',
            'href="https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.html"',
            '><img',
            'src="https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.jpeg"',
            'alt="Various',
            'frogs',
            'and',
            'toads"',
            '/><span',
            'class="copyright">©</span></a>',
        ])


if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestEmbed))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
