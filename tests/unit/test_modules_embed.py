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

    def test_media_embed(self):
        def media_embed(url, **kwargs):
            out = embed.media_embed(url, **kwargs)
            return re.split('\s+', out, flags=re.MULTILINE)

        with self.assertRaisesRegex(HTTP, '400'):
            media_embed('https://www.wibble.com/some_image.jpg')

        self.assertEqual(media_embed('https://www.youtube.com/embed/12345'), [
            '<iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            '></iframe>',
        ])
        self.assertEqual(media_embed('https://www.youtube.com/embed/12345', ts_autoplay="tsstate-active_wait", camel='"yes"'), [
            '<iframe',
            'class="embed-youtube"',
            'type="text/html"',
            'src="https://www.youtube.com/embed/12345?enablejsapi=1&playsinline=1&origin=None://127.0.0.1:8000"',
            'frameborder="0"',
            'data-ts_autoplay="tsstate-active_wait"',
            'data-camel="&quot;yes&quot;"',
            '></iframe>',
        ])

        self.assertEqual(media_embed('https://player.vimeo.com/video/12345'), [
            '<iframe',
            'class="embed-vimeo"',
            'src="https://player.vimeo.com/video/12345"',
            'frameborder="0"',
            'allow="autoplay;',
            'fullscreen"',
            'allowfullscreen',
            '></iframe>',
        ])

        self.assertEqual(media_embed('https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif'), [
            '<a',
            'class="embed-wikimedia"',
            'title="Rose_of_Jericho.gif"',
            'href="https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif"',
            '><img',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Rose_of_Jericho.gif"',
            'alt="Rose_of_Jericho.gif"',
            '/></a>',
        ])

        self.assertEqual(media_embed('https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg'), [
            '<div',
            'class="embed-audio"><audio',
            'controls',
            'src="https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/Turdus_philomelos.ogg"',
            '></audio><a',
            'class="copyright"',
            'href="https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg"',
            'title="title">©</a></div>',
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
