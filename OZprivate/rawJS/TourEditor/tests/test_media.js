/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_media.js
 */
import test from 'tape';
import {
    defaultMediaKind,
    mediaBlockToUrl,
    mediaBlockWithKind,
    mediaBlockWithYoutubeTimes,
    mediaKindOptions,
    mediaPreview,
    optionalYoutubeSeconds,
    parseMediaUrl,
    parseMediaUrlAsKind,
    THUMBNAIL_MEDIA_KINDS,
} from '../src/media';

test('parseMediaUrl: OneZoom imgsrc', (t) => {
    t.deepEqual(parseMediaUrl('imgsrc:99:27732437'), { kind: 'onezoom', src: 99, srcId: 27732437 });
    t.deepEqual(parseMediaUrl('99:192836'), { kind: 'onezoom', src: 99, srcId: 192836 });
    t.end();
});

test('parseMediaUrl: YouTube embed, watch, and youtu.be', (t) => {
    t.deepEqual(parseMediaUrl('https://www.youtube.com/embed/W86cTIoMv2U'), {
        kind: 'youtube',
        videoId: 'W86cTIoMv2U',
    });
    t.deepEqual(parseMediaUrl('https://www.youtube.com/watch?v=pTZ211cIjX8'), {
        kind: 'youtube',
        videoId: 'pTZ211cIjX8',
    });
    t.deepEqual(parseMediaUrl('https://youtu.be/pTZ211cIjX8?t=30'), {
        kind: 'youtube',
        videoId: 'pTZ211cIjX8',
        start: 30,
    });
    t.deepEqual(parseMediaUrl('https://www.youtube.com/embed/ORV3qV8GFF4?start=30'), {
        kind: 'youtube',
        videoId: 'ORV3qV8GFF4',
        start: 30,
    });
    t.deepEqual(
        parseMediaUrl('https://www.youtube.com/embed/AzLMbnWwOoc?si=8bLT-YgLxKekLvUY&amp;start=408'),
        { kind: 'youtube', videoId: 'AzLMbnWwOoc', start: 408 },
    );
    t.deepEqual(
        parseMediaUrl('https://www.youtube.com/embed/AzLMbnWwOoc?start=408&amp;end=450'),
        { kind: 'youtube', videoId: 'AzLMbnWwOoc', start: 408, end: 450 },
    );
    t.end();
});

test('parseMediaUrl: Vimeo', (t) => {
    t.deepEqual(parseMediaUrl('https://player.vimeo.com/video/12345'), { kind: 'vimeo', videoId: '12345' });
    t.deepEqual(parseMediaUrl('https://vimeo.com/12345'), { kind: 'vimeo', videoId: '12345' });
    t.end();
});

test('parseMediaUrl: Wikimedia, tours, image, audio', (t) => {
    t.deepEqual(
        parseMediaUrl('https://commons.wikimedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg'),
        { kind: 'wikimedia', filename: 'Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg' },
    );
    t.deepEqual(
        parseMediaUrl('https://upload.wikimedia.org/wikipedia/commons/1/15/Psychrolutes_marcidus.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original'),
        { kind: 'wikimedia', filename: 'Psychrolutes_marcidus.jpg' },
    );
    t.deepEqual(
        parseMediaUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Sommieria_leucophylla.jpg/1920px-Sommieria_leucophylla.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20141030103649'),
        { kind: 'wikimedia', filename: 'Sommieria_leucophylla.jpg' },
    );
    t.deepEqual(
        parseMediaUrl('https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.jpeg'),
        { kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' },
    );
    t.deepEqual(
        parseMediaUrl('frogs/Various_frogs_and_toads.jpeg'),
        { kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' },
    );
    t.deepEqual(
        parseMediaUrl('https://example.com/cat.jpg'),
        { kind: 'image', url: 'https://example.com/cat.jpg' },
    );
    t.deepEqual(
        parseMediaUrl('https://example.com/call.ogg'),
        { kind: 'audio', url: 'https://example.com/call.ogg' },
    );
    t.deepEqual(
        parseMediaUrl('https://example.com/file.bin'),
        { kind: 'link', url: 'https://example.com/file.bin' },
    );
    t.deepEqual(
        parseMediaUrl('https://en.wikipedia.org/wiki/Sponge'),
        { kind: 'link', url: 'https://en.wikipedia.org/wiki/Sponge' },
    );
    t.deepEqual(
        parseMediaUrl('https://en.wikipedia.org/wiki/Sponge#/media/File:Aplysina_archeri_(Stove-pipe_Sponge-pink_variation).jpg'),
        { kind: 'link', url: 'https://en.wikipedia.org/wiki/Sponge#/media/File:Aplysina_archeri_(Stove-pipe_Sponge-pink_variation).jpg' },
    );
    t.deepEqual(
        parseMediaUrl('https://de.wikipedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg'),
        { kind: 'link', url: 'https://de.wikipedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg' },
    );
    t.equal(parseMediaUrl('not a url'), null);
    t.end();
});

test('parseMediaUrl: kinds limits which parsers run', (t) => {
    t.deepEqual(
        parseMediaUrl('https://www.youtube.com/embed/W86cTIoMv2U', ['image', 'link']),
        { kind: 'link', url: 'https://www.youtube.com/embed/W86cTIoMv2U' },
    );
    t.equal(parseMediaUrl('https://www.youtube.com/embed/W86cTIoMv2U', ['image']), null);
    t.deepEqual(
        parseMediaUrl('https://example.com/cat.jpg', ['image']),
        { kind: 'image', url: 'https://example.com/cat.jpg' },
    );
    t.deepEqual(
        parseMediaUrl('frogs/Various_frogs_and_toads.jpeg', ['image']),
        { kind: 'image', url: 'frogs/Various_frogs_and_toads.jpeg' },
    );
    t.equal(parseMediaUrl('frogs/Various_frogs_and_toads.jpeg', ['youtube']), null);
    t.deepEqual(mediaKindOptions(['youtube', 'image']).map((option) => option.value), ['youtube', 'image']);
    t.deepEqual(THUMBNAIL_MEDIA_KINDS, ['onezoom', 'image']);
    t.deepEqual(
        parseMediaUrl('imgsrc:99:27732437', THUMBNAIL_MEDIA_KINDS),
        { kind: 'onezoom', src: 99, srcId: 27732437 },
    );
    t.deepEqual(
        parseMediaUrl('https://example.com/cat.jpg', THUMBNAIL_MEDIA_KINDS),
        { kind: 'image', url: 'https://example.com/cat.jpg' },
    );
    t.equal(parseMediaUrl('https://www.youtube.com/embed/W86cTIoMv2U', THUMBNAIL_MEDIA_KINDS), null);
    t.end();
});

test('mediaBlockToUrl: round-trips recognised kinds', (t) => {
    const cases = [
        { kind: 'onezoom', src: 99, srcId: 27732437 },
        { kind: 'youtube', videoId: 'ORV3qV8GFF4', start: 30 },
        { kind: 'vimeo', videoId: '12345' },
        { kind: 'wikimedia', filename: 'Rose_of_Jericho.gif' },
        { kind: 'wikimedia', filename: 'Aplysina_archeri_(Stove-pipe_Sponge-pink_variation).jpg' },
        { kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' },
        { kind: 'image', url: 'https://example.com/cat.jpg' },
        { kind: 'audio', url: 'https://example.com/call.ogg' },
        { kind: 'link', url: 'https://example.com/file.bin' },
    ];
    for (const block of cases) {
        t.deepEqual(parseMediaUrl(mediaBlockToUrl(block)), block);
    }
    t.equal(
        mediaBlockToUrl({ kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' }),
        'frogs/Various_frogs_and_toads.jpeg',
    );
    t.end();
});

test('mediaBlockWithKind converts via the canonical URL', (t) => {
    const wikimedia = {
        id: 'm1',
        kind: 'wikimedia',
        filename: 'Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg',
    };
    t.equal(
        mediaBlockToUrl(wikimedia),
        'https://commons.wikimedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg',
    );
    t.deepEqual(
        mediaBlockWithKind(wikimedia, 'image'),
        {
            id: 'm1',
            kind: 'image',
            url: 'https://commons.wikimedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg',
        },
    );
    t.deepEqual(mediaBlockWithKind(wikimedia, 'youtube'), { id: 'm1', kind: 'youtube', videoId: '' });
    t.deepEqual(
        mediaBlockWithKind(wikimedia, 'link'),
        {
            id: 'm1',
            kind: 'link',
            url: 'https://commons.wikimedia.org/wiki/File:Sponges_in_Caribbean_Sea,_Cayman_Islands.jpg',
        },
    );
    t.deepEqual(parseMediaUrlAsKind('imgsrc:99:1', 'onezoom'), { kind: 'onezoom', src: 99, srcId: 1 });
    t.deepEqual(parseMediaUrlAsKind('https://example.com/cat.jpg', 'youtube'), { kind: 'youtube', videoId: '' });
    t.end();
});

test('YouTube start/end update the embed URL', (t) => {
    const block = { id: 'm1', kind: 'youtube', videoId: 'b-gEx-yFz1c' };
    t.deepEqual(
        mediaBlockWithYoutubeTimes(block, 96, 129),
        { id: 'm1', kind: 'youtube', videoId: 'b-gEx-yFz1c', start: 96, end: 129 },
    );
    t.equal(
        mediaBlockToUrl(mediaBlockWithYoutubeTimes(block, 96, 129)),
        'https://www.youtube.com/embed/b-gEx-yFz1c?start=96&end=129',
    );
    t.equal(
        mediaBlockToUrl(mediaBlockWithYoutubeTimes({ ...block, start: 96, end: 129 }, undefined, 129)),
        'https://www.youtube.com/embed/b-gEx-yFz1c?end=129',
    );
    t.equal(optionalYoutubeSeconds(''), undefined);
    t.equal(optionalYoutubeSeconds('96'), 96);
    t.equal(optionalYoutubeSeconds('-1'), undefined);
    t.end();
});

test('mediaPreview: empty until the block has a source', (t) => {
    t.deepEqual(mediaPreview({ id: 'm1', kind: 'youtube', videoId: '' }), { type: 'empty' });
    t.deepEqual(mediaPreview({ id: 'm1', kind: 'youtube', videoId: 'W86cTIoMv2U' }), {
        type: 'iframe',
        src: 'https://www.youtube.com/embed/W86cTIoMv2U',
    });
    t.deepEqual(mediaPreview({
        id: 'm1',
        kind: 'youtube',
        videoId: 'b-gEx-yFz1c',
        start: 96,
        end: 129,
    }), {
        type: 'iframe',
        src: 'https://www.youtube.com/embed/b-gEx-yFz1c?start=96&end=129',
    });
    t.deepEqual(mediaPreview({ id: 'm1', kind: 'link', url: 'https://example.com/about' }), {
        type: 'link',
        href: 'https://example.com/about',
    });
    t.end();
});
