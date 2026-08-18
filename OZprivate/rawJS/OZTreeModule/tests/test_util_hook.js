/**
 * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_util_hook.js
 */
import test from 'tape';
import {add_hook, remove_hook, call_hook} from '../src/util/hook.js';

/**
 * Regression test for hook removal bug
 * 
 * Issue: remove_hook(key, id) had inverted logic in its condition.
 * When called with a valid ID, it should delete that specific hook.
 * With the bug, it would clear ALL hooks for that key when id is truthy.
 * 
 * This test verifies that:
 * 1. Hooks can be added
 * 2. Specific hooks can be removed by ID
 * 3. Other hooks for the same key remain after removal
 * 4. Removed hooks don't get called
 */

test('add_hook returns an ID that can be used to remove the hook', function (t) {
  // Add a hook
  let callCount = 0;
  const id = add_hook('test_event', () => {
    callCount++;
  });

  // Verify the hook was called
  call_hook('test_event', null);
  t.equal(callCount, 1, 'Hook was called once');

  // Remove the hook by ID
  remove_hook('test_event', id);

  // Verify the hook is no longer called
  call_hook('test_event', null);
  t.equal(callCount, 1, 'Hook was not called again after removal');

  t.end();
});

test('remove_hook removes only the specified hook, not all hooks', function (t) {
  let handler1Called = false;
  let handler2Called = false;

  const id1 = add_hook('test_event', () => {
    handler1Called = true;
  });

  const id2 = add_hook('test_event', () => {
    handler2Called = true;
  });

  // Both hooks should be called
  call_hook('test_event', null);
  t.equal(handler1Called, true, 'Handler 1 was called');
  t.equal(handler2Called, true, 'Handler 2 was called');

  // Reset
  handler1Called = false;
  handler2Called = false;

  // Remove only the first hook
  remove_hook('test_event', id1);

  // Call again: only the second hook should be called
  call_hook('test_event', null);
  t.equal(handler1Called, false, 'Handler 1 was not called after removal');
  t.equal(handler2Called, true, 'Handler 2 was still called');

  // Reset and remove second hook to prove id2 remains a valid removal handle
  handler1Called = false;
  handler2Called = false;
  remove_hook('test_event', id2);

  call_hook('test_event', null);
  t.equal(handler1Called, false, 'Handler 1 was still not called after id2 removal');
  t.equal(handler2Called, false, 'Handler 2 was not called after id2 removal');

  t.end();
});

test('multiple hooks can be added and independently removed', function (t) {
  const calls = [];

  const id1 = add_hook('event', () => calls.push('handler1'));
  const id2 = add_hook('event', () => calls.push('handler2'));
  const id3 = add_hook('event', () => calls.push('handler3'));

  // All three should be called
  call_hook('event', null);
  t.deepEqual(calls, ['handler1', 'handler2', 'handler3'], 'All three handlers called initially');

  // Remove the middle one
  calls.length = 0;
  remove_hook('event', id2);
  call_hook('event', null);
  t.deepEqual(calls, ['handler1', 'handler3'], 'Handler 2 removed, handlers 1 and 3 called');

  // Remove the first one
  calls.length = 0;
  remove_hook('event', id1);
  call_hook('event', null);
  t.deepEqual(calls, ['handler3'], 'Handler 1 removed, only handler 3 called');

  // Remove the last one
  calls.length = 0;
  remove_hook('event', id3);
  call_hook('event', null);
  t.deepEqual(calls, [], 'All handlers removed, none called');

  t.end();
});

test('Tour use case: stopNodeSelection removes only its hook', function (t) {
  // Simulates the Tour.js use case where hooks are added and removed
  let tourHookCalled = false;
  let otherHookCalled = false;

  // Tour adds a hook
  const tourHookId = add_hook('mouse_down_on_node', () => {
    tourHookCalled = true;
  });

  // Another part of the system also adds a hook to the same event
  const otherHookId = add_hook('mouse_down_on_node', () => {
    otherHookCalled = true;
  });

  // When the tour is stopped, it should only remove its own hook
  remove_hook('mouse_down_on_node', tourHookId);

  // The other hook should still be called
  call_hook('mouse_down_on_node', null);
  t.equal(tourHookCalled, false, 'Tour hook was removed and not called');
  t.equal(otherHookCalled, true, 'Other hook was still called');

  // Remove the remaining hook to prove otherHookId is still a valid removal handle
  tourHookCalled = false;
  otherHookCalled = false;
  remove_hook('mouse_down_on_node', otherHookId);

  call_hook('mouse_down_on_node', null);
  t.equal(tourHookCalled, false, 'Tour hook remained removed after otherHookId removal');
  t.equal(otherHookCalled, false, 'Other hook was removed via otherHookId');

  t.end();
});
