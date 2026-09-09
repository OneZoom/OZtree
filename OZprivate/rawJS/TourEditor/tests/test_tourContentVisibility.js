/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_tourContentVisibility.js
 */
import test from 'tape';
import {
    defaultContentVisibility,
    parseContentVisibility,
    contentVisibilityFlags,
} from '../src/tourContentVisibility';

const stopActiveOnly = { transitionIn: false, active: true, transitionOut: false };
const stopInAndActive = { transitionIn: true, active: true, transitionOut: false };
const stopAll = { transitionIn: true, active: true, transitionOut: true };

test('content visibility: no flags means all phases', (t) => {
    t.deepEqual(parseContentVisibility({}), defaultContentVisibility);
    t.deepEqual(parseContentVisibility({ text: 'hello' }), defaultContentVisibility);
    t.deepEqual(parseContentVisibility({ 'visible-transition_in': true }), {
        transitionIn: true,
        active: false,
        transitionOut: false,
    });
    t.deepEqual(parseContentVisibility({
        'visible-transition_in': true,
        'visible-active_wait': true,
    }), {
        transitionIn: true,
        active: true,
        transitionOut: false,
    });
    t.end();
});

test('content visibility: flags only when narrower than the stop', (t) => {
    t.deepEqual(contentVisibilityFlags(defaultContentVisibility, stopActiveOnly), {});
    t.deepEqual(contentVisibilityFlags(stopActiveOnly, stopActiveOnly), {});
    t.deepEqual(contentVisibilityFlags(defaultContentVisibility, stopInAndActive), {});
    t.deepEqual(contentVisibilityFlags({
        transitionIn: false,
        active: true,
        transitionOut: false,
    }, stopInAndActive), {
        'visible-active_wait': true,
    });
    t.deepEqual(contentVisibilityFlags({
        transitionIn: true,
        active: false,
        transitionOut: false,
    }, stopInAndActive), {
        'visible-transition_in': true,
    });
    t.deepEqual(contentVisibilityFlags({
        transitionIn: true,
        active: true,
        transitionOut: false,
    }, stopAll), {
        'visible-transition_in': true,
        'visible-active_wait': true,
    });
    t.end();
});
