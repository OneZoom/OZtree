/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_tour.js
 */
import test from 'tape';
import {
    createEmptyTour,
    sanitizePartialTourIdentifier,
    sanitizeTourIdentifier,
    tourFileSlug,
} from '../src/tour';

function tour(partial) {
    return {
        ...createEmptyTour(),
        ...partial,
    };
}

test('tourFileSlug: uses identifier or falls back to the title slug', (t) => {
    t.equal(tourFileSlug(tour({ title: 'My Nice Tour!' })), 'my_nice_tour');
    t.equal(tourFileSlug(tour({ title: 'Tour 2024' })), 'tour_2024');
    t.equal(tourFileSlug(tour({
        identifier: 'kept_id',
        title: 'My Nice Tour!',
    })), 'kept_id');
    t.end();
});

test('sanitizeTourIdentifier: lowercase letters, numbers, and underscores', (t) => {
    t.equal(sanitizeTourIdentifier('My-Tour!'), 'my_tour');
    t.equal(sanitizeTourIdentifier('tour2'), 'tour2');
    t.equal(sanitizeTourIdentifier('mammal_tour'), 'mammal_tour');
    t.equal(sanitizeTourIdentifier('_my_tour_'), 'my_tour');
    t.end();
});

test('sanitizePartialTourIdentifier: keeps trailing underscores while typing', (t) => {
    t.equal(sanitizePartialTourIdentifier('my_'), 'my_');
    t.equal(sanitizePartialTourIdentifier('My-Tour'), 'my_tour');
    t.equal(sanitizeTourIdentifier(sanitizePartialTourIdentifier('my_')), 'my');
    t.end();
});
