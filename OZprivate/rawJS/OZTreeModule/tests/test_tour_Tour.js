/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_Tour.js
  */
import test from 'tape';
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
import { UserInterruptError } from '../src/errors';
import { call_hook } from '../src/util';

import config from '../src/global_config';

// record_url won't work with our fake onezoom
config.disable_record_url = true;

import Tour from '../src/tour/Tour';

/** How long the timer is waiting for */
function getTimeoutValue(timer) {
    return timer._idleTimeout;
}

/** Force timeout to happen now, close it */
function triggerTimeout(timer) {
    timer._onTimeout();
    clearTimeout(timer);
}

function setup_tour(test, s, interaction = null, verbose_test = false) {
  let log = [];
  function callback_to_log(n) {
      return function() {
          if (verbose_test) console.log([n, ...arguments]);
          log.push([n, ...arguments]);
      }
  }
  let dom = new JSDOM(`
<html>
  <body>
    <div id="tour_wrapper">
    </div>
  </body>
</html>`);
  test.teardown(function () { dom.window.close() });

  global.window = dom.window;
  global.window.is_testing = verbose_test;
  global.document = dom.window.document;
  global.alert = callback_to_log('alert');
  global.$ = require('../../../../static/js/jquery.js');
  global.window.jQuery = global.$;

  const fake_oz = {
    cur_node: 1,
    resolve_flight: null,

    controller: {
      is_tree_visible: () => true,
      cancel_flight: function () {
        if (fake_oz.resolve_flight) fake_oz.resolve_flight(true);
      },
      fly_on_tree_to: function (unused, ozid) {
        log.push(["fly_on_tree_to", Array.from(arguments)]);

        // Wait for test to "resolve" the flight, then continue
        return new Promise(function (resolve) {
          fake_oz.resolve_flight = resolve;
        }).then((cancelled) => {
          fake_oz.resolve_flight = null;
          if (cancelled) {
            // Pretend to be interrupted, don't make it to node
            log.push(["flight-interrupted", ozid])
            throw new UserInterruptError('Fly is interrupted');
          }
          fake_oz.cur_node = ozid;
        });
      },
      leap_to: function (ozid) {
        log.push(["leap_to", Array.from(arguments)]);

        // Cancel any previous flight
        if (fake_oz.resolve_flight) fake_oz.controller.cancel_flight();

        // Wait for test to "resolve" the flight, then continue
        return new Promise(function (resolve) {
          fake_oz.resolve_flight = resolve;
        }).then(() => {
          fake_oz.resolve_flight = null;
          fake_oz.cur_node = ozid;
        });
      },
    },
    data_repo: { ott_id_map: {} },
    utils : {
      process_taxon_list: function (ott_id_array_json, unused, unused_2, resolve) {
          // Convert [{ OTT: x }, ...] to a list of OTTs.
          var otts = JSON.parse(ott_id_array_json).map((x) => parseInt(x.OTT));

          fake_oz.data_repo.ott_id_map = {};
          otts.forEach((ott, id) => { fake_oz.data_repo.ott_id_map[ott] = 1000 + id });
          log.push(["process_taxon_list", otts]);

          resolve();
      },
      largest_visible_node: function () { return fake_oz.cur_node; },
    }
  };

  let tour = new Tour(fake_oz);
  tour.setup_setting(
    new dom.window.Text(s),  // NB: Skips URL fetching and renders from DOM node
    callback_to_log('start_callback'),
    callback_to_log('end_callback'),
    callback_to_log('exit_callback'),
    interaction,
    callback_to_log('interaction_callback'),
    callback_to_log('ready_callback'),
  )

  // Common observer to wait for class changes
  const class_observer = new dom.window.MutationObserver((mutation_list) => {
    mutation_list.forEach((mutation) => {
      const el = mutation.target;

      if (el.classList.contains(el.expecting.class_name)) {
        el.expecting.resolve();
      }
    });
  });
  class_observer.wait_for_class = function (selector, class_name) {
    var el_ts = dom.window.document.querySelector(selector);
    if (!el_ts) throw new Error("Couldn't find " + selector);

    return new Promise((resolve) => {
      el_ts.expecting = { class_name: class_name, resolve: resolve };
      if (el_ts.classList.contains(class_name)) {
        // Already there, resolve now
        return resolve()
      }
      class_observer.observe(el_ts, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    });
  };

  return {
    oz: fake_oz,
    tour: tour,
    log: log,
    dom: dom,
    window: dom.window,
    tour_html: function () {
      // Return tour HTML broken up into array
      var tw = dom.window.document.getElementById('tour_wrapper');
      return tw.innerHTML.replace(/^\s+/, '').split(/\n\s+/);
    },
    wait_for_tourstop_class: function (ts_idx, class_name) {
      return class_observer.wait_for_class('.tour > .container:nth-of-type(' + (ts_idx + 1) + ')', class_name)
    },
    wait_for_tour_class: function (class_name) {
      return class_observer.wait_for_class('.tour', class_name)
    },
    finish_flight: function () {
      fake_oz.resolve_flight();
    }
  };
}

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
    <div class="container" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>
    <div class="container" data-ott="93303"><h2>Tour stop 3</h2></div>
  </div>`, null, false);

  return t.tour.start().then(function () {
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202, 93303]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ]);
    // Playing, waiting for zoom to head to first node
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-transition_in ts-first block-flight" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-inactive" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-inactive ts-last" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>',
    ]);
    t.finish_flight();
    return t.wait_for_tourstop_class(0, 'tsstate-active_wait');

  }).then(function () {
    // Waiting at first tourstop
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-active_wait ts-first block-manual" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-inactive" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-inactive ts-last" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>',
    ]);
    // No timer set, waiting for interaction
    test.deepEqual(t.tour.curr_stop().goto_next_timer, null)
    t.tour.user_forward();
    return t.wait_for_tourstop_class(1, 'tsstate-transition_in');

  }).then(function () {
    // Flying to next tourstop, transition_out for previous
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-transition_out ts-first block-trans-flight" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-transition_in block-flight" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-inactive ts-last" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>'
    ]);
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_class(0, 'tsstate-inactive'),
      t.wait_for_tourstop_class(1, 'tsstate-active_wait'),
    ]);

  }).then(function () {
    // Waiting at second tourstop
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-active_wait block-timer" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-inactive ts-last" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>',
    ]);
    // Timer set that should trigger next transition
    test.deepEqual(getTimeoutValue(t.tour.curr_stop().goto_next_timer), 5000)

    // Trigger timer manually, should be transitioning now
    triggerTimeout(t.tour.curr_stop().goto_next_timer);
    return t.wait_for_tourstop_class(2, 'tsstate-transition_in');

  }).then(function () {
    // Flying to next tourstop, transition_out for previous
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-transition_out block-trans-flight" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-transition_in ts-last block-flight" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>'
    ]);
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_class(1, 'tsstate-inactive'),
      t.wait_for_tourstop_class(2, 'tsstate-active_wait'),
    ]);

  }).then(function () {
    // Waiting at final tourstop
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-inactive" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-active_wait ts-last block-manual" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>',
    ]);
    // No timer set, waiting for interaction
    test.deepEqual(t.tour.curr_stop().goto_next_timer, null)
    t.tour.user_forward();
    return t.wait_for_tourstop_class(2, 'tsstate-inactive');

  }).then(function () {
    // All done, tour stopped
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-inactive">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101"><h2>Tour stop 1</h2></div>',
      '<div class="container tsstate-inactive" data-ott="92202" data-stop_wait="5000"><h2>Tour stop 2</h2></div>',
      '<div class="container tsstate-inactive ts-last" data-ott="93303"><h2>Tour stop 3</h2></div>',
      '</div>',
    ]);

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
    // Fly to first node
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ]);
    t.finish_flight();
    return t.wait_for_tourstop_class(0, 'tsstate-active_wait');

  }).then(function () {
    // Waiting at first tourstop with timer
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-active_wait ts-first block-timer" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-inactive ts-last" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);
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
    // Still waiting at first tourstop, now with block-hiddentab
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-active_wait ts-first block-hiddentab" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-inactive ts-last block-hiddentab" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);
    // Trigger visibility change, should now advance to next tourstop
    Object.defineProperty(t.window.document, "visibilityState", {
      configurable: true,
      get: function() { return "visible"; }
    });
    t.window.document.dispatchEvent(new t.window.CustomEvent('visibilitychange'));

    return t.wait_for_tourstop_class(1, 'tsstate-transition_in');
  }).then(function () {
    t.finish_flight();
    return Promise.all([
      t.wait_for_tourstop_class(0, 'tsstate-inactive'),
      t.wait_for_tourstop_class(1, 'tsstate-active_wait'),
    ])

  }).then(function () {
    // Moved to tourstop 2
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-active_wait ts-last block-timer" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);

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
    // Fly to first node
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ]);
    t.finish_flight();
    return t.wait_for_tourstop_class(0, 'tsstate-active_wait');

  }).then(function () {
    // Waiting at first tourstop with timer
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-active_wait ts-first block-timer" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-inactive ts-last" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);
    // Pause tour
    t.tour.user_pause()

    // Trigger timer manually, won't start transition though
    triggerTimeout(t.tour.curr_stop().goto_next_timer);

    return; // NB: block-tourpaused should already be set by now

  }).then(function () {
    // Paused at first tourstop, timer expired but blocked anyway
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-paused">',
      '<div class="container tsstate-active_wait ts-first block-tourpaused" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-inactive ts-last" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);
    // Resume tour, we head to next tourstop
    t.tour.user_resume();

    return t.wait_for_tourstop_class(1, 'tsstate-transition_in');
  }).then(function () {
    // Now transitioning to next tourstop
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-transition_out ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-transition_in ts-last block-flight" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>'
    ]);
    // Pause tour again
    t.tour.user_pause()

    return t.wait_for_tourstop_class(1, 'block-tourpaused');
  }).then(function () {
    // The flight was cancelled
    test.deepEqual(t.log.slice(-2), [
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
      [ 'flight-interrupted', 1001 ],
    ]);
    test.deepEqual(t.oz.resolve_flight, null);

    // In tstate-paused, still transitioning
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-paused">',
      '<div class="container tsstate-transition_out ts-first block-trans-flight block-trans-tourpaused" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-transition_in ts-last block-flight block-tourpaused" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>'
    ]);

    // Wait for now-broken flight promise to settle, then try resuming
    return new Promise(function (resolve) {
      setTimeout(() => {
        t.tour.user_resume();
        resolve();
      }, 100)
    });
  }).then(function () {
    // Transitioning to tourstop again
    test.deepEqual(t.log.slice(-2), [
      [ 'flight-interrupted', 1001 ],
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
    ]);
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-transition_out ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-transition_in ts-last block-flight" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>'
    ]);
    // Pause tour by triggering interaction hook, wait for promise to settle
    call_hook('window_size_change');
    return new Promise(function (resolve) {
      setTimeout(() => {
        resolve();
      }, 100)
    });

  }).then(function () {
    // The flight was cancelled again
    test.deepEqual(t.log.slice(-4), [
      [ 'flight-interrupted', 1001 ],
      [ 'fly_on_tree_to', [ null, 1001, false, 1 ] ],
      [ 'interaction_callback', undefined ],
      [ 'flight-interrupted', 1001 ],
    ]);
    test.deepEqual(t.oz.resolve_flight, null);

    // In tstate-paused, still transitioning
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-paused">',
      '<div class="container tsstate-transition_out ts-first block-trans-tourpaused" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-transition_in ts-last block-tourpaused" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>'
    ]);

    // Resume tour
    t.tour.user_resume();
    return new Promise(function (resolve) {
      setTimeout(() => {
        resolve();
      }, 100)
    });

  }).then(function () {
    t.finish_flight();
    return t.wait_for_tourstop_class(1, 'tsstate-active_wait');

  }).then(function () {
    // Moved to tourstop 2
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-inactive ts-first" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-active_wait ts-last block-timer" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);

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
    // Fly to first node
    test.deepEqual(t.log, [
      ['process_taxon_list', [91101, 92202]],
      ['ready_callback'],
      ['start_callback'],
      ['fly_on_tree_to', [null, 1000, false, 1]],
    ]);
    // Skip over flight
    t.tour.user_forward();
    return new Promise(resolve => setTimeout(resolve, 3000));
    //return t.wait_for_tourstop_class(0, 'tsstate-active_wait');

  }).then(function () {
    // Waiting at first tourstop with timer
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-active_wait ts-first block-timer" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-inactive ts-last" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>',
    ]);
    // Skip over timer
    t.tour.user_forward();

    return t.wait_for_tourstop_class(1, 'tsstate-transition_in');
  }).then(function () {
    // Now transitioning to next tourstop
    test.deepEqual(t.tour_html(), [
      '<div class="tour tstate-playing">',
      '<div class="container tsstate-transition_out ts-first block-trans-flight" data-ott="91101" data-stop_wait="5000">t1</div>',
      '<div class="container tsstate-transition_in ts-last block-flight" data-ott="92202" data-stop_wait="5000">t2</div>',
      '</div>'
    ]);

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
