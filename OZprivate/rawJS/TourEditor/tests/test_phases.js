/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_phases.js
 */
import test from 'tape';
import { togglePhase } from '../src/phases';

test('togglePhase: flips one phase', (t) => {
    t.deepEqual(togglePhase({
        transitionIn: false,
        active: true,
        transitionOut: false,
    }, 'transitionIn'), {
        transitionIn: true,
        active: true,
        transitionOut: false,
    });
    t.deepEqual(togglePhase({
        transitionIn: false,
        active: true,
        transitionOut: false,
    }, 'active'), {
        transitionIn: false,
        active: false,
        transitionOut: false,
    });
    t.end();
});
