import {add_hook, remove_hook, call_hook} from './hook.js';

/**
 * Regression test for hook removal bug
 * 
 * Issue: remove_hook(key, id) has inverted logic in its condition.
 * When called with a valid ID, it should delete that specific hook.
 * Instead, the current code clears ALL hooks for that key when id is truthy.
 * 
 * This test verifies that:
 * 1. Hooks can be added
 * 2. Specific hooks can be removed by ID
 * 3. Other hooks for the same key remain after removal
 * 4. Removed hooks don't get called
 */

describe('hook system', () => {
  
  test('add_hook returns an ID that can be used to remove the hook', () => {
    // Add a hook
    let callCount = 0;
    const id = add_hook('test_event', () => {
      callCount++;
    });

    // Verify the hook was called
    call_hook('test_event', null);
    expect(callCount).toBe(1);

    // Remove the hook by ID
    remove_hook('test_event', id);

    // Verify the hook is no longer called
    call_hook('test_event', null);
    expect(callCount).toBe(1); // Should still be 1, not 2
  });

  test('remove_hook removes only the specified hook, not all hooks', () => {
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
    expect(handler1Called).toBe(true);
    expect(handler2Called).toBe(true);

    // Reset
    handler1Called = false;
    handler2Called = false;

    // Remove only the first hook
    remove_hook('test_event', id1);

    // Call again: only the second hook should be called
    call_hook('test_event', null);
    expect(handler1Called).toBe(false); // First hook was removed
    expect(handler2Called).toBe(true);  // Second hook still exists
  });

  test('multiple hooks can be added and independently removed', () => {
    const calls = [];

    const id1 = add_hook('event', () => calls.push('handler1'));
    const id2 = add_hook('event', () => calls.push('handler2'));
    const id3 = add_hook('event', () => calls.push('handler3'));

    // All three should be called
    call_hook('event', null);
    expect(calls).toEqual(['handler1', 'handler2', 'handler3']);

    // Remove the middle one
    calls.length = 0;
    remove_hook('event', id2);
    call_hook('event', null);
    expect(calls).toEqual(['handler1', 'handler3']);

    // Remove the first one
    calls.length = 0;
    remove_hook('event', id1);
    call_hook('event', null);
    expect(calls).toEqual(['handler3']);

    // Remove the last one
    calls.length = 0;
    remove_hook('event', id3);
    call_hook('event', null);
    expect(calls).toEqual([]);
  });

  test('Tour use case: stopNodeSelection removes only its hook', () => {
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
    expect(tourHookCalled).toBe(false);
    expect(otherHookCalled).toBe(true);
  });

});
