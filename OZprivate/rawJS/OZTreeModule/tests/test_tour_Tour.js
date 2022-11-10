/**
  * Usage: TOUR_DEBUG=1 npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_Tour.js
  */
import test from 'tape';
import { call_hook } from '../src/util';
import { setup_tour } from './util_tourwrapper';
import { getTimeoutValue, triggerTimeout } from './util_timeout';

test('tour.start:notourstops', function (test) {
  var t = setup_tour(test, `<div class="tour">
  </div>`);

  return t.tour.start().then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', []],
      ['ready_callback'],
      ['alert', 'This tour has no tourstops'],
    ]);

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('tour.flight', function (test) {
  var t = setup_tour(test, `<div class="tour">
    <div class="container" data-ott="91101"><h2>Tour stop 1</h2></div>
    <div class="container" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max"><h2>Tour stop 2</h2></div>
    <div class="container" data-ott="93303"><h2>Tour stop 3</h2></div>
  </div>`, null, false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202, 93303]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ], "Now flying (log entries)");
    // Playing, waiting for zoom to head to first node
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-flight" data-ott="91101" data-state="tsstate-transition_in"><h2>Tour stop 1</h2></div>',
      '<div class="container" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-inactive"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last" data-ott="93303" data-state="tsstate-inactive"><h2>Tour stop 3</h2></div>',
      '</div>',
    ], "Now flying (HTML)");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.log.slice(-2), [
      ['fly_on_tree_to', [ null, 1000, false, 1 ]],
      ['leap_to', [ 1000, undefined, false ]],
    ], "Arrived at tourstop, lept to location to be sure");
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-manual" data-ott="91101" data-state="tsstate-active_wait"><h2>Tour stop 1</h2></div>',
      '<div class="container" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-inactive"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last" data-ott="93303" data-state="tsstate-inactive"><h2>Tour stop 3</h2></div>',
      '</div>',
    ], "Waiting at first tourstop");
    test.deepEqual(t.tour.curr_stop().goto_next_timer, null, "No timer set, waiting for interaction")
    t.tour.user_forward();
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(1, 'tsstate-transition_in'),
    ]);

  }).then(function () {
    test.deepEqual(t.log.slice(-2), [
      ['leap_to', [ 1000, undefined, false ]],
      ['fly_on_tree_to', [ null, 1001, true, 4 ]],
    ], "Flying to next tourstop, included custom flight params");
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-trans-flight" data-ott="91101" data-state="tsstate-transition_out"><h2>Tour stop 1</h2></div>',
      '<div class="container block-flight" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-transition_in"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last" data-ott="93303" data-state="tsstate-inactive"><h2>Tour stop 3</h2></div>',
      '</div>'
    ], "Flying to next tourstop, transition_out for previous");
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-inactive'),
      t.wait_for_tourstop_state(1, 'tsstate-active_wait'),
    ]);

  }).then(function () {
    test.deepEqual(t.log.slice(-2), [
      ['fly_on_tree_to', [ null, 1001, true, 4 ]],
      ['leap_to', [ 1001, undefined, true ]],
    ], "Arrived at next tourstop, included custom flight params");
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-state="tsstate-inactive"><h2>Tour stop 1</h2></div>',
      '<div class="container block-timer" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-active_wait"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last" data-ott="93303" data-state="tsstate-inactive"><h2>Tour stop 3</h2></div>',
      '</div>',
    ], "Waiting at second tourstop");
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 5000, "Timer set that should trigger next transition")

    // Trigger timer manually, should be transitioning now
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return t.wait_for_tourstop_state(2, 'tsstate-transition_in');

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-state="tsstate-inactive"><h2>Tour stop 1</h2></div>',
      '<div class="container block-trans-flight" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-transition_out"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last block-flight" data-ott="93303" data-state="tsstate-transition_in"><h2>Tour stop 3</h2></div>',
      '</div>'
    ], "Flying to next tourstop, transition_out for previous");
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_state(1, 'tsstate-inactive'),
      t.wait_for_tourstop_state(2, 'tsstate-active_wait'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-state="tsstate-inactive"><h2>Tour stop 1</h2></div>',
      '<div class="container" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-inactive"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last block-manual" data-ott="93303" data-state="tsstate-active_wait"><h2>Tour stop 3</h2></div>',
      '</div>',
    ], "Waiting at final tourstop");
    test.deepEqual(t.tour.curr_stop().goto_next_timer, null, "No timer set, waiting for interaction")
    t.tour.user_forward();
    return Promise.all([
      t.wait_for_tour_state('tstate-inactive'),
      t.wait_for_tourstop_state(0, 'tsstate-inactive'),
      t.wait_for_tourstop_state(1, 'tsstate-inactive'),
      t.wait_for_tourstop_state(2, 'tsstate-inactive'),
    ])

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-inactive">',
      '<div class="container ts-first" data-ott="91101" data-state="tsstate-inactive"><h2>Tour stop 1</h2></div>',
      '<div class="container" data-ott="92202" data-stop_wait="5000" data-fly_in_speed="4" data-qs_opts="into_node=max" data-state="tsstate-inactive"><h2>Tour stop 2</h2></div>',
      '<div class="container ts-last" data-ott="93303" data-state="tsstate-inactive"><h2>Tour stop 3</h2></div>',
      '</div>',
    ], "All done, tour stopped");

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('tour:block-hiddentab', function (test) {
  var t = setup_tour(test, `<div class="tour">
    <div class="container" data-ott="91101" data-stop_wait="5000">t1</div>
    <div class="container" data-ott="92202" data-stop_wait="5000">t2</div>
  </div>`, null, false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ], "Fly to first node");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-timer" data-ott="91101" data-stop_wait="5000" data-state="tsstate-active_wait">t1</div>',
      '<div class="container ts-last" data-ott="92202" data-stop_wait="5000" data-state="tsstate-inactive">t2</div>',
      '</div>',
    ], "Waiting at first tourstop with timer");
    // Trigger visibility change
    Object.defineProperty(t.window.document, "visibilityState", {
      configurable: true,
      get: function() { return "hidden"; }
    });
    t.window.document.dispatchEvent(new t.window.CustomEvent('visibilitychange'));

    // Trigger timer manually, won't start transition though
    triggerTimeout(t.tour.curr_stop().goto_next_timer);

    return; // NB: block-hiddentab should already be set by now

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-hiddentab" data-ott="91101" data-stop_wait="5000" data-state="tsstate-active_wait">t1</div>',
      '<div class="container ts-last block-hiddentab" data-ott="92202" data-stop_wait="5000" data-state="tsstate-inactive">t2</div>',
      '</div>',
    ], "Still waiting at first tourstop, now with block-hiddentab");
    // Trigger visibility change, should now advance to next tourstop
    Object.defineProperty(t.window.document, "visibilityState", {
      configurable: true,
      get: function() { return "visible"; }
    });
    t.window.document.dispatchEvent(new t.window.CustomEvent('visibilitychange'));

    return t.wait_for_tourstop_state(1, 'tsstate-transition_in');
  }).then(function () {
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-inactive'),
      t.wait_for_tourstop_state(1, 'tsstate-active_wait'),
    ])

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-stop_wait="5000" data-state="tsstate-inactive">t1</div>',
      '<div class="container ts-last block-timer" data-ott="92202" data-stop_wait="5000" data-state="tsstate-active_wait">t2</div>',
      '</div>',
    ], "Moved to tourstop 2");

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('tour:block-tourpaused', function (test) {
  var t = setup_tour(test, `<div class="tour">
    <div class="container" data-ott="91101" data-stop_wait="5000">t1</div>
    <div class="container" data-ott="92202" data-stop_wait="5000">t2</div>
  </div>`, null, false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ], "Fly to first node");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-timer" data-ott="91101" data-stop_wait="5000" data-state="tsstate-active_wait">t1</div>',
      '<div class="container ts-last" data-ott="92202" data-stop_wait="5000" data-state="tsstate-inactive">t2</div>',
      '</div>',
    ], "Waiting at first tourstop with timer");
    // Pause tour
    t.tour.user_pause()

    // Trigger timer manually, won't start transition though
    triggerTimeout(t.tour.curr_stop().goto_next_timer);

    return; // NB: block-tourpaused should already be set by now

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-paused">',
      '<div class="container ts-first block-tourpaused" data-ott="91101" data-stop_wait="5000" data-state="tsstate-active_wait">t1</div>',
      '<div class="container ts-last" data-ott="92202" data-stop_wait="5000" data-state="tsstate-inactive">t2</div>',
      '</div>',
    ], "Paused at first tourstop, timer expired but blocked anyway");
    // Resume tour, we head to next tourstop
    t.tour.user_resume();

    return t.wait_for_tourstop_state(1, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-flight" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "Now transitioning to next tourstop");
    // Pause tour again
    t.tour.user_pause()

    return t.wait_for_tour_state('tstate-paused');
  }).then(function () {
    test.deepEqual(t.log.slice(-2), [
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
      [ 'flight-interrupted', 1001 ],
    ], "The flight was cancelled");
    test.deepEqual(t.oz.resolve_flight, null, "The flight was cancelled, flight promise now cleared");

    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-paused">',
      '<div class="container ts-first block-trans-flight block-trans-tourpaused" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-flight block-tourpaused" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "In tstate-paused, still transitioning");

    // Wait for now-broken flight promise to settle
    return t.oz.flight_promise;

  }).then(function () {
    // Resume tour, wait for flight to start back up
    t.tour.user_resume();

    return new Promise(function (resolve) {
      var int = setInterval(() => {
        if (t.oz.resolve_flight !== null) {
          clearInterval(int);
          resolve();
        }
      }, 10);
    });
    return new Promise(resolve => setTimeout(resolve, 1000));
  }).then(function () {
    test.deepEqual(t.log.slice(-2), [
      [ 'flight-interrupted', 1001 ],
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
    ], "Transitioning to tourstop again (logs)");
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-flight" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "Transitioning to tourstop again (HTML)");
    // Pause tour by triggering interaction hook, wait for promise to settle
    call_hook('window_size_change');
    return new Promise(function (resolve) {
      setTimeout(() => {
        resolve();
      }, 100)
    });

  }).then(function () {
    test.deepEqual(t.log.slice(-4), [
      [ 'flight-interrupted', 1001 ],
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
      [ 'interaction_callback', undefined ],
      [ 'flight-interrupted', 1001 ],
    ], "The flight was cancelled again (logs)");
    test.deepEqual(t.oz.resolve_flight, null);

    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-paused">',
      '<div class="container ts-first block-trans-tourpaused" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-tourpaused" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "In tstate-paused, still transitioning");

    // Resume tour
    t.tour.user_resume();
    return new Promise(function (resolve) {
      setTimeout(() => {
        resolve();
      }, 100)
    });

  }).then(function () {
    t.finish_flight();
    return t.wait_for_tourstop_state(1, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-stop_wait="5000" data-state="tsstate-inactive">t1</div>',
      '<div class="container ts-last block-timer" data-ott="92202" data-stop_wait="5000" data-state="tsstate-active_wait">t2</div>',
      '</div>',
    ], "Moved to tourstop 2");

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('tour:user_forward', function (test) {
  var t = setup_tour(test, `<div class="tour">
    <div class="container" data-ott="91101" data-stop_wait="5000">t1</div>
    <div class="container" data-ott="92202" data-stop_wait="5000">t2</div>
  </div>`, null, false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ], "Fly to first node (logs)");
    // Skip over flight
    t.tour.user_forward();

    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-active_wait'),
      t.wait_for_tourstop_state(1, 'tsstate-inactive'),
    ]);

  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-timer" data-ott="91101" data-stop_wait="5000" data-state="tsstate-active_wait">t1</div>',
      '<div class="container ts-last" data-ott="92202" data-stop_wait="5000" data-state="tsstate-inactive">t2</div>',
      '</div>',
    ], "Waiting at first tourstop with timer");
    // Skip over timer
    t.tour.user_forward();

    return t.wait_for_tourstop_state(1, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-flight" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "Now transitioning to next tourstop");

    t.tour.user_pause();
    return Promise.all([
      t.wait_for_tour_state("tstate-paused"),
      t.oz.flight_promise,  // NB: We don't resolve the flight, just wait for it to cancel
    ]);
  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-paused">',
      '<div class="container ts-first block-trans-tourpaused" data-ott="91101" data-stop_wait="5000" data-state="tsstate-transition_out">t1</div>',
      '<div class="container ts-last block-tourpaused" data-ott="92202" data-stop_wait="5000" data-state="tsstate-transition_in">t2</div>',
      '</div>'
    ], "Paused during transition");

    // Go forward, should both skip over flight and unpause
    t.tour.user_forward();
    return Promise.all([
      t.wait_for_tour_state("tstate-playing"),
      t.wait_for_tourstop_state(0, 'tsstate-inactive'),
      t.wait_for_tourstop_state(1, 'tsstate-active_wait'),
    ]);
  }).then(function () {
    test.deepEqual(t.tour_html(), [
      '<div class="tour" data-state="tstate-playing">',
      '<div class="container ts-first" data-ott="91101" data-stop_wait="5000" data-state="tsstate-inactive">t1</div>',
      '<div class="container ts-last block-timer" data-ott="92202" data-stop_wait="5000" data-state="tsstate-active_wait">t2</div>',
      '</div>'
    ], "Resumed, at next tourstop");

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
