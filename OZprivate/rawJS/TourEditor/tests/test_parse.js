/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_parse.js
 */
import test from 'tape';
import { editorTourToJson, tourJsonString } from '../src/compile';
import { parseEditorTour, parseTourJsonString } from '../src/parse';
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

function completeTour() {
    return tour({
        identifier: 'mammal_tour',
        title: 'Mammals',
        description: 'A walk',
        author: 'OZ',
        license: 'cc-by-4.0',
        thumbnail: { id: 'th1', kind: 'image', url: 'https://example.com/cat.jpg' },
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
                textBlocks: [{ id: 't1', text: 'Look at cats' }],
                mediaBlocks: [
                    { id: 'm1', kind: 'onezoom', src: 99, srcId: 27732437 },
                    { id: 'm2', kind: 'youtube', videoId: 'ORV3qV8GFF4', start: 30 },
                    { id: 'm3', kind: 'vimeo', videoId: '12345' },
                    { id: 'm4', kind: 'wikimedia', filename: 'Rose_of_Jericho.gif' },
                    { id: 'm5', kind: 'tours', path: 'frogs/Various_frogs_and_toads.jpeg' },
                    { id: 'm6', kind: 'image', url: 'https://example.com/cat.jpg' },
                    { id: 'm7', kind: 'audio', url: 'https://example.com/call.ogg' },
                    { id: 'm8', kind: 'link', url: 'https://example.com/file.bin' },
                ],
                transitionIn: 'leap',
                flyInSpeed: 2,
                autoAdvance: true,
                stopWaitSeconds: 5,
            }),
        ],
    });
}

test('parseEditorTour: round-trips compiled production JSON', (t) => {
    const original = completeTour();
    const loaded = parseEditorTour(editorTourToJson(original));
    t.deepEqual(editorTourToJson(loaded), editorTourToJson(original));
    t.equal(loaded.identifier, 'mammal_tour');
    t.equal(loaded.title, 'Mammals');
    t.equal(loaded.stops[0].title, 'Cats');
    t.equal(loaded.stops[0].location, '@Felidae');
    t.equal(loaded.stops[0].fillScreen, true);
    t.equal(loaded.stops[0].highlights[0].type, 'fan');
    t.equal(loaded.stops[0].highlights[0].color, '#ff6b6b');
    t.deepEqual(loaded.stops[0].highlights[0].pinpoints, ['@Felidae']);
    t.equal(loaded.stops[0].textBlocks[0].text, 'Look at cats');
    t.equal(loaded.stops[0].mediaBlocks[1].kind, 'youtube');
    t.equal(loaded.stops[0].mediaBlocks[1].videoId, 'ORV3qV8GFF4');
    t.equal(loaded.stops[0].mediaBlocks[1].start, 30);
    t.equal(loaded.stops[0].transitionIn, 'leap');
    t.equal(loaded.stops[0].flyInSpeed, 2);
    t.equal(loaded.stops[0].autoAdvance, true);
    t.equal(loaded.stops[0].stopWaitSeconds, 5);
    t.ok(loaded.stops[0].id);
    t.ok(loaded.thumbnail.id);
    t.end();
});

test('parseEditorTour: retains a tour identifier', (t) => {
    const loaded = parseEditorTour({
        identifier: 'mammal_tour_2',
        title: 'Mammals',
        tourstops: [],
    });
    t.equal(loaded.identifier, 'mammal_tour_2');
    t.end();
});

test('parseEditorTour: rejects an invalid tour identifier', (t) => {
    t.throws(
        () => parseEditorTour({ identifier: 'My-Tour', tourstops: [] }),
        /lowercase letters/,
    );
    t.end();
});

test('parseEditorTour: generates editor IDs and applies defaults', (t) => {
    const loaded = parseEditorTour({
        title: 'Cats',
        tourstops: [{
            identifier: 'cats',
            qs_opts: '?highlight=path:@Felidae',
            template_data: {
                title: 'Cats',
                window_text: ['Look at cats'],
                media: ['https://www.youtube.com/embed/W86cTIoMv2U'],
            },
        }],
    });
    t.ok(loaded.stops[0].id);
    t.equal(typeof loaded.stops[0].id, 'string');
    t.equal(loaded.stops[0].identifier, 'cats');
    t.equal(loaded.stops[0].title, 'Cats');
    t.equal(loaded.identifier, '');
    t.equal(loaded.license, 'all-rights-reserved');
    t.equal(loaded.thumbnail.kind, 'image');
    t.equal(loaded.thumbnail.url, '');
    t.ok(loaded.thumbnail.id);
    t.equal(loaded.stops[0].transitionIn, 'fly');
    t.equal(loaded.stops[0].location, null);
    t.equal(loaded.stops[0].autoAdvance, false);
    t.equal(loaded.stops[0].stopWaitSeconds, 5);
    t.ok(loaded.stops[0].highlights[0].id);
    t.equal(loaded.stops[0].highlights[0].type, 'path');
    t.equal(loaded.stops[0].highlights[0].color, '#ff6b6b');
    t.deepEqual(loaded.stops[0].highlights[0].pinpoints, ['@Felidae']);
    t.ok(loaded.stops[0].textBlocks[0].id);
    t.equal(loaded.stops[0].textBlocks[0].text, 'Look at cats');
    t.ok(loaded.stops[0].mediaBlocks[0].id);
    t.equal(loaded.stops[0].mediaBlocks[0].kind, 'youtube');
    t.equal(loaded.stops[0].mediaBlocks[0].videoId, 'W86cTIoMv2U');
    t.end();
});

test('parseEditorTour: reads window_text, media objects, and qs_opts', (t) => {
    const loaded = parseEditorTour({
        identifier: 'demo',
        image_url: 'imgsrc:99:27732437',
        tourstops: [{
            identifier: 'cats',
            ott: '@Felidae',
            qs_opts: '?into_node=max&highlight=fan:#00aa00@Felidae@Canidae',
            stop_wait: 2500,
            template_data: {
                window_text: [
                    'Always visible',
                    { text: 'Only on fly-in', 'visible-transition_in': true },
                ],
                media: [
                    { url: 'https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif' },
                ],
            },
        }],
    });
    t.equal(loaded.thumbnail.kind, 'onezoom');
    t.equal(loaded.thumbnail.src, 99);
    t.equal(loaded.thumbnail.srcId, 27732437);
    t.equal(loaded.stops[0].fillScreen, true);
    t.equal(loaded.stops[0].autoAdvance, true);
    t.equal(loaded.stops[0].stopWaitSeconds, 2.5);
    t.deepEqual(loaded.stops[0].highlights[0].pinpoints, ['@Felidae', '@Canidae']);
    t.equal(loaded.stops[0].highlights[0].color, '#00aa00');
    t.equal(loaded.stops[0].textBlocks[0].text, 'Always visible');
    t.equal(loaded.stops[0].textBlocks[1].text, 'Only on fly-in');
    t.equal(loaded.stops[0].mediaBlocks[0].kind, 'wikimedia');
    t.equal(loaded.stops[0].mediaBlocks[0].filename, 'Rose_of_Jericho.gif');
    t.end();
});

test('parseEditorTour: rejects a tour without stops', (t) => {
    t.throws(() => parseEditorTour({ title: 'Nope' }), /missing stops/);
    t.end();
});

test('parseEditorTour: rejects duplicate stop identifiers', (t) => {
    t.throws(
        () => parseEditorTour({
            tourstops: [
                { identifier: 'cats', template_data: { title: 'Cats' } },
                { identifier: 'cats', template_data: { title: 'More cats' } },
            ],
        }),
        /Stop identifier "cats" is not unique/,
    );
    t.end();
});

test('parseEditorTour: rejects invalid media', (t) => {
    t.throws(
        () => parseEditorTour({
            tourstops: [{ identifier: 'cats', template_data: { media: [123] } }],
        }),
        /Media block 1 on cats is not valid/,
    );
    t.end();
});

test('parseEditorTour: rejects invalid window_text', (t) => {
    t.throws(
        () => parseEditorTour({
            tourstops: [{ identifier: 'cats', template_data: { window_text: [123] } }],
        }),
        /Text block 1 on cats is not valid/,
    );
    t.end();
});

test('parseTourJsonString: round-trips compiled JSON text', (t) => {
    const original = completeTour();
    const loaded = parseTourJsonString(tourJsonString(original));
    t.deepEqual(editorTourToJson(loaded), editorTourToJson(original));
    t.end();
});

test('parseTourJsonString: uses a sanitized filename when the file has no identifier', (t) => {
    const loaded = parseTourJsonString(JSON.stringify({
        title: 'Mammals',
        tourstops: [],
    }), 'My Nice Tour!.json');
    t.equal(loaded.identifier, 'my_nice_tour');
    t.end();
});

test('parseTourJsonString: keeps a file identifier over the filename', (t) => {
    const loaded = parseTourJsonString(JSON.stringify({
        identifier: 'mammal_tour',
        tourstops: [],
    }), 'other_name.json');
    t.equal(loaded.identifier, 'mammal_tour');
    t.end();
});

test('parseTourJsonString: rejects invalid JSON', (t) => {
    t.throws(() => parseTourJsonString('{not json'), /not valid JSON/);
    t.end();
});
