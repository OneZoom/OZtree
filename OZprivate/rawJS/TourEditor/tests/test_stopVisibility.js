/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_stopVisibility.js
 */
import test from 'tape';
import {
    defaultStopVisibility,
    parseStopVisibility,
    stopVisibilityClassNames,
    stopVisibilityFlags,
} from '../src/stopVisibility';

test('stop visibility: default active, hidden-active_wait turns it off', (t) => {
    t.deepEqual(parseStopVisibility({}), defaultStopVisibility);
    t.deepEqual(parseStopVisibility({ 'visible-transition_in': true }), {
        transitionIn: true,
        active: true,
        transitionOut: false,
    });
    t.deepEqual(parseStopVisibility({ 'hidden-active_wait': true, 'visible-transition_out': true }), {
        transitionIn: false,
        active: false,
        transitionOut: true,
    });
    t.deepEqual(stopVisibilityFlags(defaultStopVisibility), {});
    t.deepEqual(stopVisibilityFlags({
        transitionIn: true,
        active: false,
        transitionOut: true,
    }), {
        'visible-transition_in': true,
        'hidden-active_wait': true,
        'visible-transition_out': true,
    });
    t.equal(
        stopVisibilityClassNames({ 'visible-transition_in': true, 'hidden-active_wait': true }),
        'visible-transition_in hidden-active_wait',
    );
    t.end();
});
