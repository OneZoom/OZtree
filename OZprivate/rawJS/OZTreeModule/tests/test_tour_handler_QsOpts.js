/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tour_handler_QsOpts.js
  */
import handler_qsopts from '../src/tour/handler/QsOpts.js';
import test from 'tape';

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
