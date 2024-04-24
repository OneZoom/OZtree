/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_handler_QsOpts.js
  */
import handler_qsopts from '../src/tour/handler/QsOpts.js';
import test from 'tape';

import { setup_tour } from './util_tourwrapper';

function fake_tour() {
  var fake_tour = { states: [], onezoom: { controller: { } } };

  fake_tour.tourstop_observer = function (target_sel, expected_states, add_fn, remove_fn) {
    fake_tour._tourstop = {};
    fake_tour.add_fn = (qsopts_attr) => {
      var el_ts = { getAttribute : (k) => k === 'data-qs_opts' ? qsopts_attr : undefined };

      fake_tour.states = []
      add_fn(fake_tour, fake_tour._tourstop, el_ts);
      return fake_tour.states;
    }
    fake_tour.remove_fn = () => {
      fake_tour.states = []
      remove_fn(fake_tour, fake_tour._tourstop);
      return fake_tour.states;
    }
  };
  fake_tour.onezoom.controller.set_treestate = (x) => fake_tour.states.push(x);
  return fake_tour;
}

function set_location_search(qs) {
  global.window = { location: { search: qs } };
}

test('handler_qsopts', function (test) {
  var ft = fake_tour();
  handler_qsopts(ft).then(function () {
    // into_node gets ignored, we don't do anything
    set_location_search('');
    test.deepEqual(ft.add_fn('into_node=max'), [ ]);
    test.deepEqual(ft.remove_fn(), [ ]);
    set_location_search('into_node=maxxer');
    test.deepEqual(ft.add_fn('into_node=max'), [ ]);
    test.deepEqual(ft.remove_fn(), [ ]);

    // Empty initial search, clear added items
    set_location_search('');
    test.deepEqual(ft.add_fn('highlight=path:@woo'), [ '?highlight=path:@woo' ]);
    test.deepEqual(ft.remove_fn(), [ '?highlight=' ]);
    test.deepEqual(ft.add_fn('highlight=path:@woo&lang=fr'), [ '?highlight=path:@woo&lang=fr' ]);
    test.deepEqual(ft.remove_fn(), [ '?highlight=&lang=' ]);

    // Initial language gets revered when need be
    set_location_search('lang=is');
    test.deepEqual(ft.add_fn('highlight=path:@woo'), [ '?highlight=path:@woo' ]);
    test.deepEqual(ft.remove_fn(), [ '?highlight=' ]);
    test.deepEqual(ft.add_fn('highlight=path:@woo&lang=fr'), [ '?highlight=path:@woo&lang=fr' ]);
    test.deepEqual(ft.remove_fn(), [ '?highlight=&lang=is' ]);

    // Initial highlights are restored
    set_location_search('highlight=a&highlight=b');
    test.deepEqual(ft.add_fn('highlight=path:@woo'), [ '?highlight=path:@woo' ]);
    test.deepEqual(ft.remove_fn(), [ '?highlight=a&highlight=b' ]);
    test.deepEqual(ft.add_fn('lang=fr&highlight=path:@woo'), [ '?lang=fr&highlight=path:@woo' ]);
    test.deepEqual(ft.remove_fn(), [ '?lang=&highlight=a&highlight=b' ]);

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('handler_qsopts:event_ordering', function (test) {
  var t = setup_tour(test, `<div class="tour">
    <div class="container" data-ott="91101" data-qs_opts="cols=AT"><h2>Tour stop 1</h2></div>
    <div class="container" data-ott="92202" data-qs_opts="cols=AT"><h2>Tour stop 2</h2></div>
    <div class="container" data-ott="93303" data-qs_opts="cols=XT"><h2>Tour stop 3</h2></div>
  </div>`, 'block', false);

  return t.tour.start().then(function () {
    return t.wait_for_tourstop_state(0, 'tsstate-transition_in');
  }).then(function () {
    test.deepEqual(t.log, [
      ['ready_callback'],
      ['start_callback'],
      [ 'set_treestate:', '?cols=AT' ],
      ['fly_on_tree_to', [null, 1101, false, 1]],
    ], "Now flying, activated AT (log entries)");
    t.finish_flight();
    return t.wait_for_tourstop_state(0, 'tsstate-active_wait');

  }).then(function () {
    test.deepEqual(t.log, [
      [ 'ready_callback' ], [ 'start_callback' ],
      [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 1101, false, 1 ] ],
      [ 'leap_to', [ 1101, undefined, false ] ],
    ], "At first stop, activated AT (log entries)");
    test.deepEqual(t.tour.onezoom.treestate, '?cols=AT');
    t.tour.user_forward();
    return Promise.all([
      t.wait_for_tourstop_state(0, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(1, 'tsstate-transition_in'),
    ]).then(() => t.finish_flight()).then(() => t.wait_for_tourstop_state(1, 'tsstate-active_wait'));

  }).then(function () {
    test.deepEqual(t.log, [
      [ 'ready_callback' ], [ 'start_callback' ],
      [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 1101, false, 1 ] ],
      [ 'leap_to', [ 1101, undefined, false ] ],
      [ 'set_treestate:', '?cols=' ], [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 2202, false, 1 ] ],
      [ 'leap_to', [ 2202, undefined, false ] ],
    ], "At second stop, deactivated *then* reactivated AT (log entries)");
    test.deepEqual(t.tour.onezoom.treestate, '?cols=AT');
    t.tour.user_forward();
    return Promise.all([
      t.wait_for_tourstop_state(1, 'tsstate-transition_out'),
      t.wait_for_tourstop_state(2, 'tsstate-transition_in'),
    ]).then(() => t.finish_flight()).then(() => t.wait_for_tourstop_state(2, 'tsstate-active_wait'));

  }).then(function () {
    test.deepEqual(t.log, [
      [ 'ready_callback' ], [ 'start_callback' ],
      [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 1101, false, 1 ] ],
      [ 'leap_to', [ 1101, undefined, false ] ],
      [ 'set_treestate:', '?cols=' ], [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 2202, false, 1 ] ],
      [ 'leap_to', [ 2202, undefined, false ] ],
      [ 'set_treestate:', '?cols=' ], [ 'set_treestate:', '?cols=XT' ],
      [ 'fly_on_tree_to', [ null, 3303, false, 1 ] ],
      [ 'leap_to', [ 3303, undefined, false ] ],
    ], "At third stop, deactivated *then* activated XT (log entries)");
    test.deepEqual(t.tour.onezoom.treestate, '?cols=XT');
    t.tour.user_exit();
    return t.wait_for_tourstop_state(2, 'tsstate-inactive');

  }).then(function () {
    test.deepEqual(t.log, [
      [ 'ready_callback' ], [ 'start_callback' ],
      [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 1101, false, 1 ] ],
      [ 'leap_to', [ 1101, undefined, false ] ],
      [ 'set_treestate:', '?cols=' ], [ 'set_treestate:', '?cols=AT' ],
      [ 'fly_on_tree_to', [ null, 2202, false, 1 ] ],
      [ 'leap_to', [ 2202, undefined, false ] ],
      [ 'set_treestate:', '?cols=' ], [ 'set_treestate:', '?cols=XT' ],
      [ 'fly_on_tree_to', [ null, 3303, false, 1 ] ],
      [ 'leap_to', [ 3303, undefined, false ] ],
      [ 'exit_callback' ],
      [ 'set_treestate:', '?cols=' ],
    ], "Tour stopped, state restored");
    test.deepEqual(t.tour.onezoom.treestate, '?cols=');

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
