/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_compile.js
 */
import test from 'tape';
import { editorTourToJson, tourJsonFilename, tourJsonString, tourPreviewHtml } from '../src/compile';
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

test('editorTourToJson: writes media embed extras', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            mediaBlocks: [{
                id: 'm1',
                kind: 'image',
                url: 'https://example.com/cat.jpg',
                ts_autoplay: 'tsstate-transition_in tsstate-active_wait',
                alt: 'A cat',
                title: 'Cat photo',
            }],
        })],
    }));
    t.deepEqual(json.tourstops[0].template_data.media, [{
        url: 'https://example.com/cat.jpg',
        ts_autoplay: 'tsstate-transition_in tsstate-active_wait',
        alt: 'A cat',
        title: 'Cat photo',
    }]);
    t.end();
});

test('editorTourToJson: writes extraQueryStrings into qs_opts', (t) => {
    const json = editorTourToJson(tour({
        stops: [stop({
            identifier: 'cats',
            fillScreen: true,
            extraQueryStrings: [
                { key: 'cols', value: 'popularity' },
                { key: 'pop', value: 'ol_329457' },
            ],
        })],
    }));
    t.equal(json.tourstops[0].qs_opts, '?into_node=max&cols=popularity&pop=ol_329457');
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

/** Run (fn) with window / fetch stubbed out, collecting the requests fetch was given. */
async function withFetch(response, fn) {
    const calls = [];
    const oldWindow = global.window;
    const oldFetch = global.fetch;
    global.window = { server_urls: { tour_preview_api: 'https://oz.example.com/tour/preview.html' } };
    global.fetch = (url, options) => {
        calls.push({ url, options });
        return Promise.resolve(response);
    };
    try {
        return { calls, result: await fn() };
    } finally {
        global.window = oldWindow;
        global.fetch = oldFetch;
    }
}

test('tourPreviewHtml: POSTs the document as JSON and returns the rendered HTML', async (t) => {
    const { calls, result } = await withFetch({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<div class="tour tour-preview">...</div>'),
    }, () => tourPreviewHtml(editorTourToJson(tour({ title: 'Mammals', stops: [stop({})] }))));

    t.equal(calls.length, 1);
    t.equal(calls[0].url, 'https://oz.example.com/tour/preview.html');
    t.equal(calls[0].options.method, 'POST');
    // The server refuses anything else, so that a cross-origin form cannot reach it
    t.equal(calls[0].options.headers['Content-Type'], 'application/json');
    t.deepEqual(JSON.parse(calls[0].options.body).identifier, 'mammals');
    t.equal(result, '<div class="tour tour-preview">...</div>');
    t.end();
});

test('tourPreviewHtml: reports the reason the server gave', async (t) => {
    await withFetch({
        ok: false,
        status: 422,
        text: () => Promise.resolve('Must have at least one tourstop'),
    }, async () => {
        try {
            await tourPreviewHtml(editorTourToJson(createEmptyTour()));
            t.fail('should have thrown');
        } catch (err) {
            t.equal(err.message, 'Must have at least one tourstop');
        }
    });
    t.end();
});

test('tourPreviewHtml: ignores an error page a tour author cannot act on', async (t) => {
    await withFetch({
        ok: false,
        status: 500,
        text: () => Promise.resolve('<html><body>Internal error</body></html>'),
    }, async () => {
        try {
            await tourPreviewHtml(editorTourToJson(createEmptyTour()));
            t.fail('should have thrown');
        } catch (err) {
            t.equal(err.message, 'The server could not render this tour (error 500).');
        }
    });
    t.end();
});
