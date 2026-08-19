/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_oztour.js
 */
import test from 'tape';
import { strToU8, zipSync } from 'fflate';
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

test('packOzTour/unpackOzTour: round-trips an editor tour', (t) => {
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
                transitionIn: 'leap',
                flyInSpeed: 2,
                autoAdvance: true,
                stopWaitSeconds: 5,
            }),
        ],
    });

    t.deepEqual(unpackOzTour(packOzTour(original)), original);
    t.end();
});

test('packOzTour/unpackOzTour: emoji survive the round-trip', (t) => {
    const original = tour({
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
        'tour.json': JSON.stringify(createEmptyTour()),
    });
    t.throws(() => unpackOzTour(bytes), /missing manifest\.json/);
    t.end();
});

test('unpackOzTour: rejects unknown version', (t) => {
    const bytes = zipFiles({
        'manifest.json': JSON.stringify({ version: 99 }),
        'tour.json': JSON.stringify(createEmptyTour()),
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
    t.equal(downloadFilename(createEmptyTour()), 'untitled.oztour');
    t.end();
});
