var jsdom = require('jsdom');
const { JSDOM } = jsdom;

import { UserInterruptError } from '../src/errors';
import config from '../src/global_config';

import Tour from '../src/tour/Tour';
import Screensaver from '../src/tour/Screensaver';
import tree_state from '../src/tree_state';
import data_repo from '../src/factory/data_repo';

// record_url won't work with our fake onezoom
config.disable_record_url = true;

export function setup_screensaver(test, s, interaction = 'exit', verbose_test = false) {
    // Internally bodge interaction to also hold the fact we want a screensaver
    return setup_tour(test, s, 'screensaver__' + interaction, verbose_test)
}

export function setup_tour(test, s, interaction = null, verbose_test = false) {
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

  verbose_test = verbose_test || process.env.TOUR_DEBUG;
  global.window = dom.window;
  global.window.is_testing = verbose_test;
  global.window.tour_trace = verbose_test;
  global.document = dom.window.document;
  global.alert = callback_to_log('alert');
  global.$ = require('../../../../static/js/jquery.js');
  global.window.jQuery = global.$;

  function flight_promise(p) {
    fake_oz.flight_promise = p.finally(function () {
      fake_oz.flight_promise = undefined;
    }).catch(function (e) {
      // Eat any errors here, so we don't accidentally cause unhandled promises
      if (!(e instanceof UserInterruptError)) {
        console.warn("Cancelled flight failed", e)
      }
    });
    return p;
  }

  const fake_oz = {
    cur_node: 1,
    resolve_flight: null,

    controller: {
      is_tree_visible: () => true,
      cancel_flight: function () {
        if (fake_oz.resolve_flight) fake_oz.resolve_flight(true);
        return (fake_oz.flight_promise || Promise.resolve()).catch(function (e) {
          if (e instanceof UserInterruptError) return;
          console.warn("Cancelled flight failed", e);
        });
      },
      fly_on_tree_to: function (unused, ozid) {
        log.push(["fly_on_tree_to", Array.from(arguments)]);

        // Wait for test to "resolve" the flight, then continue
        return flight_promise(new Promise(function (resolve) {
          fake_oz.resolve_flight = resolve;
        }).then((cancelled) => {
          fake_oz.resolve_flight = null;
          if (cancelled) {
            // Pretend to be interrupted, don't make it to node
            log.push(["flight-interrupted", ozid])
            throw new UserInterruptError('Fly is interrupted');
          }
          fake_oz.cur_node = ozid;
        }));
      },
      leap_to: function (ozid) {
        log.push(["leap_to", Array.from(arguments)]);

        // Cancel any previous flight
        if (fake_oz.resolve_flight) fake_oz.controller.cancel_flight();

        // Wait for test to "resolve" the flight, then continue
        return flight_promise(new Promise(function (resolve) {
          fake_oz.resolve_flight = resolve;
        }).then(() => {
          fake_oz.resolve_flight = null;
          fake_oz.cur_node = ozid;
        }));
      },
    },
    utils : {
      largest_visible_node: function () { return fake_oz.cur_node; },
    }
  };

  // Populate data repo so we don't try and poke the API
  for (let i = 91100; i < 93399; i++) {
      data_repo.ott_id_map[i] = i - 90000;
  }

  let tour;
  if (interaction && interaction.startsWith('screensaver__')) {
    tour = new Screensaver(fake_oz);
    tour.setup_setting(
      new dom.window.Text(s),  // NB: Skips URL fetching and renders from DOM node
      callback_to_log('start_callback'),
      true,  // loop_back_forth
      callback_to_log('exit_callback'),
      interaction.replace(/^screensaver__/, ''),
      callback_to_log('interaction_callback'),
      60,  // autostart_after_seconds
    )
  } else {
    tour = new Tour(fake_oz);
    tour.setup_setting(
      new dom.window.Text(s),  // NB: Skips URL fetching and renders from DOM node
      callback_to_log('start_callback'),
      callback_to_log('end_callback'),
      callback_to_log('exit_callback'),
      interaction,
      callback_to_log('interaction_callback'),
      callback_to_log('ready_callback'),
    )
  }

  // Common observer to wait for state changes
  const state_observer = new dom.window.MutationObserver((mutation_list) => {
    mutation_list.forEach((mutation) => {
      const el = mutation.target;

      if (el.getAttribute('data-state') === el.expecting.state) {
        el.expecting.resolve();
      }
    });
  });
  state_observer.wait_for_state = function (selector, state) {
    var el_ts = dom.window.document.querySelector(selector);
    if (!el_ts) throw new Error("Couldn't find " + selector);

    return new Promise((resolve) => {
      el_ts.expecting = { state: state, resolve: resolve };
      if (el_ts.getAttribute('data-state') === el_ts.expecting.state) {
        // Already there, resolve now
        return resolve()
      }
      state_observer.observe(el_ts, { attributes: true, attributeFilter: ["data-state"], attributeOldValue: true });
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
    tour_states: function () {
      // Return state of tour & all tourstops
      return this.tour_html().map(function (str) {
        return (/data-state="([^"]+)"/.exec(str) || [null, null])[1]
      }).filter((x) => x !== null)
    },
    wait_for_tourstop_state: function (ts_idx, state) {
      return state_observer.wait_for_state('.tour > .container:nth-of-type(' + (ts_idx + 1) + ')', state)
    },
    wait_for_tour_state: function (state) {
      return state_observer.wait_for_state('.tour', state)
    },
    set_tree_state_inactivity_seconds: function (secs) {
      tree_state.last_active_at = new Date(new Date().getTime() - secs*1000)
      tree_state.last_render_at = tree_state.last_active_at;
    },
    finish_flight: function () {
      fake_oz.resolve_flight();
    }
  };
}
