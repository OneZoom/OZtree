/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_compile.js
 */
import test from 'tape';
import { editorTourToJson, tourJsonToHtml } from '../src/compile';
import { createEmptyStop, createEmptyTour } from '../src/tour';

function stop(partial) {
    return {
        ...createEmptyStop(),
        ...partial,
    };
}

function tour(partial) {
    return {
        ...createEmptyTour(),
        ...partial,
    };
}

test('editorTourToJson: empty tour', (t) => {
    t.deepEqual(editorTourToJson(createEmptyTour()), {
        title: '',
        description: '',
        author: '',
        license: 'all-rights-reserved',
        tourstops: [],
    });
    t.end();
});

test('editorTourToJson: maps stop fields to production JSON', (t) => {
    const json = editorTourToJson(tour({
        title: 'Mammals',
        description: 'A walk',
        author: 'OZ',
        license: 'cc-by-4.0',
        thumbnail: { id: 'th1', kind: 'onezoom', src: 99, srcId: 27732437 },
        stops: [
            stop({
                identifier: 'cats',
                title: 'Cats',
                location: '@Felidae',
                fillScreen: true,
                highlights: [{
                    id: 'h1',
                    type: 'fan',
                    color: '#ff6b6b',
                    pinpoints: ['@Felidae'],
                }],
                textBlocks: [
                    { id: 't1', text: 'Look at cats' },
                    { id: 't2', text: '' },
                    { id: 't3', text: 'And more cats' },
                ],
                mediaBlocks: [
                    { id: 'm1', kind: 'youtube', videoId: 'W86cTIoMv2U' },
                    { id: 'm2', kind: 'wikimedia', filename: 'Rose_of_Jericho.gif' },
                    { id: 'm3', kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' },
                    { id: 'm4', kind: 'image', url: '' },
                    { id: 'm5', kind: 'link', url: 'https://example.com/about' },
                ],
                transitionIn: 'leap',
                flyInSpeed: 2,
                autoAdvance: true,
                stopWaitSeconds: 5,
            }),
            stop({
                identifier: 'dogs',
                location: '@Canidae',
            }),
        ],
    }));

    t.deepEqual(json.tourstops[0], {
        identifier: 'cats',
        ott: '@Felidae',
        qs_opts: '?into_node=max&highlight=fan:#ff6b6b@Felidae',
        transition_in: 'leap',
        fly_in_speed: 2,
        stop_wait: 5000,
        template_data: {
            title: 'Cats',
            window_text: ['Look at cats', 'And more cats'],
            media: [
                'https://www.youtube.com/embed/W86cTIoMv2U',
                'https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif',
                'frogs/Various_frogs_and_toads.jpeg',
                'https://example.com/about',
            ],
        },
    });
    t.deepEqual(json.tourstops[1], {
        identifier: 'dogs',
        ott: '@Canidae',
        template_data: {},
    });
    t.equal(json.license, 'cc-by-4.0');
    t.equal(json.image_url, 'imgsrc:99:27732437');
    t.end();
});

test('editorTourToJson: omits empty thumbnail', (t) => {
    const json = editorTourToJson(createEmptyTour());
    t.equal('image_url' in json, false);
    t.end();
});

test('editorTourToJson: writes a direct image thumbnail', (t) => {
    const json = editorTourToJson(tour({
        thumbnail: { id: 'th1', kind: 'image', url: 'https://example.com/cat.jpg' },
    }));
    t.equal(json.image_url, 'https://example.com/cat.jpg');
    t.end();
});

test('editorTourToJson: omits defaults and empty location', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({ identifier: 'empty' })],
    }));
    t.deepEqual(json.tourstops[0], {
        identifier: 'empty',
        template_data: {},
    });
    t.end();
});

test('tourJsonToHtml: production-like markup', (t) => {
    const html = tourJsonToHtml({
        identifier: 'demo',
        title: 'Demo',
        description: 'Desc',
        author: 'OZ',
        image_url: 'imgsrc:99:27732437',
        tourstops: [
            {
                identifier: 'cats',
                ott: '@Felidae',
                qs_opts: '?highlight=fan:#ff6b6b@Felidae',
                transition_in: 'leap',
                stop_wait: 5000,
                template_data: {
                    title: 'Cats',
                    window_text: ['Look at <cats>', 'Line 2'],
                    media: [
                        'https://www.youtube.com/embed/W86cTIoMv2U',
                        'https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif',
                        'frogs/Various_frogs_and_toads.jpeg',
                        'imgsrc:99:27732437',
                    ],
                },
            },
            {
                identifier: 'dogs',
                ott: '@Canidae',
                template_data: { title: 'Dogs' },
            },
        ],
    });

    t.match(html, /class="tour tour-data layout-def demo"/);
    t.match(html, /data-identifier="demo"/);
    t.match(html, /data-focal-area="0.5 0.5"/);
    t.match(html, /data-author="OZ"/);
    t.match(html, /data-title="Demo"/);
    t.match(html, /data-image_url="imgsrc:99:27732437"/);
    t.match(html, /data-ott="@Felidae"/);
    t.match(html, /data-qs_opts="\?highlight=fan:#ff6b6b@Felidae"/);
    t.match(html, /data-transition_in="leap"/);
    t.match(html, /data-stop_wait="5000"/);
    t.match(html, /<h2 class="title">Cats<\/h2>/);
    t.match(html, /<div class="window_text">Look at &lt;cats&gt;<\/div>/);
    t.match(html, /class="embed-youtube"/);
    t.match(html, /data-ts_autoplay="tsstate-active_wait"/);
    t.match(html, /class="embed-image"/);
    t.match(html, /Special:Redirect\/file\/Rose_of_Jericho\.gif/);
    t.match(html, /src="https:\/\/onezoom\.github\.io\/tours\/frogs\/Various_frogs_and_toads\.jpeg"/);
    t.match(html, /href="\/tree\/pic_info\/99\/27732437"/);
    t.match(html, /class="tour_forward"/);
    t.match(html, /class="button tour_exit"/);
    t.match(html, /<option hidden selected value="">1 of 2<\/option>/);
    t.match(html, /<option value="0" disabled>Cats<\/option>/);
    t.match(html, /<option value="1">Dogs<\/option>/);
    t.equal(/data-ott="@Canidae"[\s\S]*data-transition_in/.test(html), false);
    t.end();
});

test('tourJsonToHtml: escapes attributes and newlines', (t) => {
    const html = tourJsonToHtml({
        title: 'A "quoted" title',
        description: '',
        author: '',
        tourstops: [{
            identifier: 's',
            template_data: {
                window_text: 'Hello\nworld',
            },
        }],
    });
    t.match(html, /data-identifier="preview"/);
    t.match(html, /data-title="A &quot;quoted&quot; title"/);
    t.match(html, /<div class="window_text">Hello<br>world<\/div>/);
    t.end();
});

test('compile: editor tour becomes playable HTML', (t) => {
    const html = tourJsonToHtml(editorTourToJson(tour({
        title: 'Editor to HTML',
        stops: [
            stop({
                identifier: 'a',
                location: '@Aves',
                textBlocks: [{ id: '1', text: 'Birds' }],
                mediaBlocks: [{ id: 'm1', kind: 'vimeo', videoId: '12345' }],
            }),
            stop({ identifier: 'b', location: '@Mammalia', transitionIn: 'fly_straight' }),
        ],
    })));
    t.match(html, /data-ott="@Aves"/);
    t.match(html, /data-ott="@Mammalia"/);
    t.match(html, /data-transition_in="fly_straight"/);
    t.match(html, /<div class="window_text">Birds<\/div>/);
    t.match(html, /class="embed-vimeo"/);
    t.match(html, /src="https:\/\/player\.vimeo\.com\/video\/12345"/);
    t.end();
});
