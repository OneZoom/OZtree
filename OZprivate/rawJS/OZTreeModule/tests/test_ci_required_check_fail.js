/**
 * Temporary: always fails so we can confirm OZTreeModule CI is a required
 * check on main. Delete this file once that is verified.
 *
 * Usage: npm test
 */
import test from 'tape';

test('CI required-check probe: this test is supposed to fail', (t) => {
    t.fail('Temporary failing test — delete test_ci_required_check_fail.js after verifying the required check');
    t.end();
});
