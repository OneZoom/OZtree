/**
  * Usage: TOUR_DEBUG=1 npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_Screensaver.js
  */
import test from 'tape';
import { call_hook } from '../src/util';
import { setup_screensaver } from './util_tourwrapper';
import { getTimeoutValue, triggerTimeout } from './util_timeout';

test('screensaver.autostart_after_seconds', function (test) {
  // Make sure screensavers setup a timer to start/stop
  var t = setup_screensaver(test, `<div class="tour">
    <div class="container" data-ott="91101" data-stop_wait="1000"><h2>Tour stop 1</h2></div>
    <div class="container" data-ott="92202" data-stop_wait="2000"><h2>Tour stop 2</h2></div>
    <div class="container" data-ott="93303" data-stop_wait="3000"><h2>Tour stop 3</h2></div>
  </div>`, 'block', false);

  return Promise.resolve().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-inactive');
  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "Stopped (tour_states)");
  }).then(function () {  // NB: Give set_auto_start() an extra chance to settle
    test.ok(Math.abs(getTimeoutValue(t.tour.auto_activate_timer) - 60000 < 1000), "auto_activate_timer configured, armed, allowing for ~500ms setup-time")
    t.set_tree_state_inactivity_seconds(35)
    triggerTimeout(t.tour.auto_activate_timer)
    return new Promise((resolve) => setTimeout(resolve, 100));

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "Still stopped, since get_tree_inactive_duration didn't advance (tour_states)");
    test.ok(Math.abs(getTimeoutValue(t.tour.auto_activate_timer) - (60000 - 35000) < 100), "auto_activate_timer configured, armed, allowing for our 35 secs inactivity")
    t.set_tree_state_inactivity_seconds(66)
    triggerTimeout(t.tour.auto_activate_timer)
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-transition_in',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "Enough time passed, tour started (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.auto_activate_timer), null, "auto_activate_timer intactve")
    t.set_tree_state_inactivity_seconds(22)
    t.tour.clear()
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-inactive'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "Stopped again after clearing (tour_states)");
    test.ok(Math.abs(getTimeoutValue(t.tour.auto_activate_timer) - (60000 - 22000) < 100), "auto_activate_timer configured, armed, allowing for our 22 secs inactivity")

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('screensaver.loop_back_forth', function (test) {
  // Make sure screensavers loop back and forth
  var t = setup_screensaver(test, `<div class="tour">
    <div class="container" data-ott="91101" data-stop_wait="1000"><h2>Tour stop 1</h2></div>
    <div class="container" data-ott="92202" data-stop_wait="2000"><h2>Tour stop 2</h2></div>
    <div class="container" data-ott="93303" data-stop_wait="3000"><h2>Tour stop 3</h2></div>
  </div>`, 'block', false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    // Playing, flying into first node
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-transition_in',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "Flying to stop 1 (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-active_wait',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "At stop 1 (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 1000, "Timer set for tourstop 1")

    // Trigger timer manually, should be transitioning now
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(1, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-transition_out',
      'tsstate-transition_in',
      'tsstate-inactive',
    ], "Flying to stop 2 (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(1, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-inactive',
      'tsstate-active_wait',
      'tsstate-inactive',
    ], "At stop 2 (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 2000, "Timer set for tourstop 2")
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return Promise.all([
      t.wait_for_tourstop_state(1, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(2, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-inactive',
      'tsstate-transition_out',
      'tsstate-transition_in',
    ], "Flying to stop 3 (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(2, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-inactive',
      'tsstate-inactive',
      'tsstate-active_wait',
    ], "At stop 3 (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 3000, "Timer set for tourstop 3")
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return Promise.all([
      t.wait_for_tourstop_state(2, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(1, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-inactive',
      'tsstate-transition_in',
      'tsstate-transition_out',
    ], "Flying to stop 2, backwards (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(1, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-inactive',
      'tsstate-active_wait',
      'tsstate-inactive',
    ], "At stop 2 (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 2000, "Timer set for tourstop 2")
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return Promise.all([
      t.wait_for_tourstop_state(1, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(0, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-transition_in',
      'tsstate-transition_out',
      'tsstate-inactive',
    ], "Flying to stop 1, backwards (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-active_wait',
      'tsstate-inactive',
      'tsstate-inactive',
    ], "At stop 1 (tour_states)");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 1000, "Timer set for tourstop 1")

    // Trigger timer manually, should be transitioning now
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(1, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_states(), [
      'tstate-playing',
      'tsstate-transition_out',
      'tsstate-transition_in',
      'tsstate-inactive',
    ], "Flying to stop 2, forwards (tour_states)");
    t.finish_flight();
    return t.wait_for_tourstop_state(1, 'tsstate-active_wait');


  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});


test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
