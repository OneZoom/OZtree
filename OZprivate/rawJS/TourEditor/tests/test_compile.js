/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_compile.js
 */
import test from 'tape';
import { editorTourToJson, tourJsonFilename, tourJsonString, tourJsonToHtml } from '../src/compile';
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

test('tourJsonFilename: slugs the tour title', (t) => {
    t.equal(tourJsonFilename(tour({ title: 'My Nice Tour!' })), 'my_nice_tour.json');
    t.equal(tourJsonFilename(createEmptyTour()), 'untitled.json');
    t.end();
});

test('tourJsonString: pretty-prints production JSON', (t) => {
    const json = tourJsonString(createEmptyTour());
    t.equal(json, `${JSON.stringify(editorTourToJson(createEmptyTour()), null, 2)}\n`);
    t.end();
});

test('editorTourToJson: empty tour', (t) => {
    t.deepEqual(editorTourToJson(createEmptyTour()), {
        identifier: 'untitled',
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
                comment: 'needs a nicer photo',
                templateComment: 'this sound should autoplay',
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
        comment: 'needs a nicer photo',
        template_data: {
            title: 'Cats',
            comment: 'this sound should autoplay',
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
    t.equal(json.identifier, 'mammals');
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

test('editorTourToJson: writes stop visibility flags', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            visibility: { transitionIn: true, active: false, transitionOut: true },
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data, {
        'visible-transition_in': true,
        'hidden-active_wait': true,
        'visible-transition_out': true,
    });
    t.end();
});

test('editorTourToJson: writes text visibility flags only when narrower than the stop', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            visibility: { transitionIn: true, active: true, transitionOut: false },
            textBlocks: [
                { id: 't1', text: 'Follows the stop' },
                { id: 't2', text: 'Only while flying in', visibility: {
                    transitionIn: true, active: false, transitionOut: false,
                } },
                { id: 't3', text: 'Only while waiting', visibility: {
                    transitionIn: false, active: true, transitionOut: false,
                } },
            ],
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data.window_text, [
        'Follows the stop',
        { text: 'Only while flying in', 'visible-transition_in': true },
        { text: 'Only while waiting', 'visible-active_wait': true },
    ]);
    t.end();
});

test('editorTourToJson: writes media visibility flags only when narrower than the stop', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            visibility: { transitionIn: true, active: true, transitionOut: false },
            mediaBlocks: [
                { id: 'm1', kind: 'image', url: 'https://example.com/follow.jpg' },
                { id: 'm2', kind: 'image', url: 'https://example.com/in.jpg', visibility: {
                    transitionIn: true, active: false, transitionOut: false,
                } },
                { id: 'm3', kind: 'youtube', videoId: 'W86cTIoMv2U', visibility: {
                    transitionIn: false, active: true, transitionOut: false,
                } },
            ],
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data.media, [
        'https://example.com/follow.jpg',
        { url: 'https://example.com/in.jpg', 'visible-transition_in': true },
        { url: 'https://www.youtube.com/embed/W86cTIoMv2U', 'visible-active_wait': true },
    ]);
    t.end();
});

test('editorTourToJson: omits media visibility flags that match a default stop', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            mediaBlocks: [
                { id: 'm1', kind: 'image', url: 'https://example.com/always.jpg', visibility: {
                    transitionIn: true, active: true, transitionOut: true,
                } },
                { id: 'm2', kind: 'image', url: 'https://example.com/active.jpg', visibility: {
                    transitionIn: false, active: true, transitionOut: false,
                } },
            ],
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data.media, [
        'https://example.com/always.jpg',
        'https://example.com/active.jpg',
    ]);
    t.end();
});

test('editorTourToJson: omits text visibility flags that match a default stop', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            textBlocks: [
                { id: 't1', text: 'Always', visibility: {
                    transitionIn: true, active: true, transitionOut: true,
                } },
                { id: 't2', text: 'Active only', visibility: {
                    transitionIn: false, active: true, transitionOut: false,
                } },
            ],
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data.window_text, ['Always', 'Active only']);
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

test('tourJsonToHtml: OneZoom imgsrc with a negative srcId', (t) => {
    const html = tourJsonToHtml({
        title: 'Demo',
        description: '',
        author: '',
        tourstops: [{
            identifier: 's',
            template_data: {
                media: ['imgsrc:3:-27123592'],
            },
        }],
    });
    t.match(html, /href="\/tree\/pic_info\/3\/-27123592"/);
    t.end();
});

test('tourJsonToHtml: stop visibility classes', (t) => {
    const html = tourJsonToHtml({
        title: '',
        description: '',
        author: '',
        tourstops: [{
            identifier: 's',
            template_data: {
                'visible-transition_in': true,
                'hidden-active_wait': true,
            },
        }],
    });
    t.match(html, /class="container tour_container visible-transition_in hidden-active_wait"/);
    t.end();
});

test('tourJsonToHtml: window_text visibility classes', (t) => {
    const html = tourJsonToHtml({
        title: '',
        description: '',
        author: '',
        tourstops: [{
            identifier: 's',
            template_data: {
                window_text: [
                    'Always',
                    { text: 'Fly in', 'visible-transition_in': true },
                    { text: 'Wait', 'visible-active_wait': true },
                ],
            },
        }],
    });
    t.match(html, /<div class="window_text">Always<\/div>/);
    t.match(html, /<div class="window_text visible-transition_in">Fly in<\/div>/);
    t.match(html, /<div class="window_text visible-active_wait">Wait<\/div>/);
    t.end();
});

test('tourJsonToHtml: media visibility classes', (t) => {
    const html = tourJsonToHtml({
        title: '',
        description: '',
        author: '',
        tourstops: [{
            identifier: 's',
            template_data: {
                media: [
                    'https://example.com/always.jpg',
                    { url: 'https://example.com/in.jpg', 'visible-transition_in': true },
                    { url: 'https://example.com/wait.jpg', 'visible-active_wait': true },
                ],
            },
        }],
    });
    t.match(html, /class="embed-image"[^>]*><img src="https:\/\/example\.com\/always\.jpg"/);
    t.match(html, /class="embed-image visible-transition_in"/);
    t.match(html, /class="embed-image visible-active_wait"/);
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
