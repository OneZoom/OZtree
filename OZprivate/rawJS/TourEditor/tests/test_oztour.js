/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_oztour.js
 */
import test from 'tape';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { editorTourToJson } from '../src/compile';
import {
    downloadFilename,
    packOzTour,
    unpackOzTour,
} from '../src/oztour';
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

function zipFiles(files) {
    const entries = {};
    for (const [name, contents] of Object.entries(files)) {
        entries[name] = typeof contents === 'string' ? strToU8(contents) : contents;
    }
    return zipSync(entries);
}

test('packOzTour: writes production JSON', (t) => {
    const bytes = packOzTour(tour({
        identifier: 'mammal_tour',
        title: 'Mammals',
        stops: [stop({ identifier: 'cats', title: 'Cats' })],
    }));
    const json = JSON.parse(strFromU8(unzipSync(bytes)['tour.json']));
    t.equal(json.identifier, 'mammal_tour');
    t.ok(Array.isArray(json.tourstops));
    t.equal(json.tourstops[0].identifier, 'cats');
    t.equal(json.tourstops[0].template_data.title, 'Cats');
    t.equal('stops' in json, false);
    t.end();
});

test('packOzTour/unpackOzTour: round-trips an editor tour', (t) => {
    const original = tour({
        identifier: 'mammal_tour',
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
                textBlocks: [{ id: 't1', text: 'Look at cats' }],
                mediaBlocks: [{ id: 'm1', kind: 'youtube', videoId: 'W86cTIoMv2U' }],
                transitionIn: 'leap',
                flyInSpeed: 2,
                autoAdvance: true,
                stopWaitSeconds: 5,
            }),
        ],
    });

    const loaded = unpackOzTour(packOzTour(original));
    t.deepEqual(editorTourToJson(loaded), editorTourToJson(original));
    t.equal(loaded.identifier, 'mammal_tour');
    t.equal(loaded.stops[0].title, 'Cats');
    t.equal(loaded.stops[0].fillScreen, true);
    t.equal(loaded.stops[0].mediaBlocks[0].kind, 'youtube');
    t.ok(loaded.stops[0].id);
    t.end();
});

test('packOzTour/unpackOzTour: emoji survive the round-trip', (t) => {
    const original = tour({
        identifier: 'tree_of_life',
        title: '🌳 Tree of life',
        description: 'A walk among 🦁s and 🦜s',
        author: 'OneZoom 🔍',
        stops: [
            stop({
                identifier: 'cats',
                title: 'Cats 🐱',
                textBlocks: [{ id: 't1', text: 'Look at 🐈 and 🐈‍⬛' }],
            }),
        ],
    });
    const loaded = unpackOzTour(packOzTour(original));
    t.equal(loaded.title, '🌳 Tree of life');
    t.equal(loaded.description, 'A walk among 🦁s and 🦜s');
    t.equal(loaded.author, 'OneZoom 🔍');
    t.equal(loaded.stops[0].title, 'Cats 🐱');
    t.equal(loaded.stops[0].textBlocks[0].text, 'Look at 🐈 and 🐈‍⬛');
    t.end();
});

test('unpackOzTour: rejects missing manifest', (t) => {
    const bytes = zipFiles({
        'tour.json': JSON.stringify(editorTourToJson(createEmptyTour())),
    });
    t.throws(() => unpackOzTour(bytes), /missing manifest\.json/);
    t.end();
});

test('unpackOzTour: rejects unknown version', (t) => {
    const bytes = zipFiles({
        'manifest.json': JSON.stringify({ version: 99 }),
        'tour.json': JSON.stringify(editorTourToJson(createEmptyTour())),
    });
    t.throws(() => unpackOzTour(bytes), /version is not supported/);
    t.end();
});

test('unpackOzTour: rejects invalid tour JSON', (t) => {
    const bytes = zipFiles({
        'manifest.json': JSON.stringify({ version: 1 }),
        'tour.json': '{not json',
    });
    t.throws(() => unpackOzTour(bytes), /not valid JSON/);
    t.end();
});

test('unpackOzTour: rejects invalid zip bytes', (t) => {
    t.throws(() => unpackOzTour(new Uint8Array([1, 2, 3, 4])), /not a valid tour archive/);
    t.end();
});

test('downloadFilename: slugs the tour title', (t) => {
    t.equal(downloadFilename(tour({ title: 'My Nice Tour!' })), 'my_nice_tour.oztour');
    t.equal(downloadFilename(tour({ title: 'Tour 2024' })), 'tour_2024.oztour');
    t.equal(downloadFilename(createEmptyTour()), 'untitled.oztour');
    t.end();
});
