/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_Tour.js
  */
import test from 'tape';
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

import config from '../src/global_config';

// record_url won't work with our fake onezoom
config.disable_record_url = true;

import Tour from '../src/tour/Tour';

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
    utils : {
      process_taxon_list: function (ott_id_array_json, unused, unused_2, resolve) {
          log.push(["process_taxon_list", JSON.parse(ott_id_array_json)]);
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

  return {
    oz: fake_oz,
    tour: tour,
    log: log,
    dom: dom,
    window: dom.window,
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

test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
