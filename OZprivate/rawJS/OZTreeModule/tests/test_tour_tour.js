/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_tour.js
  */
import test from 'tape';
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

import process_taxon_list from '../src/api/process_taxon_list';
import config from '../src/global_config';

// record_url won't work with our fake onezoom
config.disable_record_url = true;

import Tour from '../src/tour/Tour';

function setup_tour(t, s, tour_name = undefined, interaction = null) {
  let log = [];
  function callback_to_log(n) {
      return function() { log.push([n, ...arguments]) }
  }
  let dom = new JSDOM(`
<html>
  <body>
    <div id="tour_wrapper">
    </div>
  </body>
</html>`);
  t.teardown(function () { dom.window.close() });

  global.window = dom.window;
  global.document = dom.window.document;
  global.alert = callback_to_log('alert');
  global.$ = require('../../../../static/js/jquery.js');
  global.window.jQuery = global.$;

  const fake_oz = {
    utils : {
      process_taxon_list: process_taxon_list,
      largest_visible_node: function () { return 1; },
    }
  };

  let tour = new Tour(fake_oz);
  tour.setup_setting(
    s,
    tour_name,
    callback_to_log('start_callback'),
    callback_to_log('end_callback'),
    callback_to_log('exit_callback'),
    interaction,
    callback_to_log('interaction_callback'),
    callback_to_log('ready_callback'),
  )

  return {
    oz: fake_oz,
    tour: tour,
    log: log,
    dom: dom,
    window: dom.window,
  };
}

test('tour.start', function (t) {
  var tt;

  tt = setup_tour(t, {
    tourstops: [],
  });
  
  tt.tour.start();
  t.deepEqual(tt.log, [
    ['alert', 'This tour has no tourstops'],
  ]);
  tt = setup_tour(t, {
    tourstops: [
      {"ott": "991547", "update_class": { "window_text": "Slide 1" }},
    ],
  });
  tt.tour.start();
  t.deepEqual(tt.log, [
  ]);
  tt.tour.clear();

  t.end();
});

test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  //process.exit(0)
});