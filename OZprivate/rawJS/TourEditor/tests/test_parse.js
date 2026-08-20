/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_parse.js
 */
import test from 'tape';
import { parseEditorTour } from '../src/parse';
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

test('parseEditorTour: round-trips a complete editor tour', (t) => {
    const original = tour({
        title: 'Mammals',
        description: 'A walk',
        author: 'OZ',
        license: 'cc-by-4.0',
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

    t.deepEqual(parseEditorTour(JSON.parse(JSON.stringify(original))), original);
    t.end();
});

test('parseEditorTour: regenerates missing IDs', (t) => {
    const loaded = parseEditorTour({
        title: 'Cats',
        stops: [{
            identifier: 'cats',
            title: 'Cats',
            highlights: [{ type: 'path', pinpoints: ['@Felidae'] }],
            textBlocks: [{ text: 'Look at cats' }],
            mediaBlocks: [{ kind: 'youtube', videoId: 'W86cTIoMv2U' }],
        }],
    });
    t.ok(loaded.stops[0].id);
    t.equal(typeof loaded.stops[0].id, 'string');
    t.equal(loaded.stops[0].identifier, 'cats');
    t.equal(loaded.stops[0].title, 'Cats');
    t.equal(loaded.license, 'all-rights-reserved');
    t.equal(loaded.stops[0].transitionIn, 'fly');
    t.equal(loaded.stops[0].location, null);
    t.ok(loaded.stops[0].highlights[0].id);
    t.equal(loaded.stops[0].highlights[0].type, 'path');
    t.equal(loaded.stops[0].highlights[0].color, '#ff6b6b');
    t.ok(loaded.stops[0].textBlocks[0].id);
    t.equal(loaded.stops[0].textBlocks[0].text, 'Look at cats');
    t.ok(loaded.stops[0].mediaBlocks[0].id);
    t.equal(loaded.stops[0].mediaBlocks[0].kind, 'youtube');
    t.equal(loaded.stops[0].mediaBlocks[0].videoId, 'W86cTIoMv2U');
    t.end();
});

test('parseEditorTour: rejects a tour without stops', (t) => {
    t.throws(() => parseEditorTour({ title: 'Nope' }), /missing stops/);
    t.end();
});

test('parseEditorTour: rejects duplicate stop identifiers', (t) => {
    t.throws(
        () => parseEditorTour({
            stops: [
                { identifier: 'cats', title: 'Cats' },
                { identifier: 'cats', title: 'More cats' },
            ],
        }),
        /Stop identifier "cats" is not unique/,
    );
    t.end();
});

test('parseEditorTour: rejects an invalid highlight', (t) => {
    t.throws(
        () => parseEditorTour({
            stops: [{ identifier: 'cats', highlights: ['not-an-object'] }],
        }),
        /Highlight 1 on cats is not valid/,
    );
    t.end();
});

test('parseEditorTour: rejects an invalid media block', (t) => {
    t.throws(
        () => parseEditorTour({
            stops: [{ identifier: 'cats', mediaBlocks: [{ kind: 'flash' }] }],
        }),
        /Media block 1 on cats is not valid/,
    );
    t.end();
});
