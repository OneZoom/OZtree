/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tree_state.js
  */
import { populate_factory } from './util_factory'
import test from 'tape';

import tree_state from '../src/tree_state.js'

function test_focal_area(test, expected, message) {
  // Round first
  expected.xmin = Math.round(expected.xmin);
  expected.xmax = Math.round(expected.xmax);
  expected.ymin = Math.round(expected.ymin);
  expected.ymax = Math.round(expected.ymax);
  
  // Fill in derived values
  expected.width = expected.xmax - expected.xmin;
  expected.height = expected.ymax - expected.ymin;
  expected.xcentre = (expected.xmax + expected.xmin) / 2;
  expected.ycentre = (expected.ymax + expected.ymin) / 2;

  test.deepEqual(tree_state.focal_area, expected, message);
}

test('focal_area', function (test) {
  tree_state.setup_canvas({ width: 2000, height: 1000 });
  test_focal_area(test, {
    xmin: 2000 * 0.025,
    xmax: 2000 - 2000 * 0.025,
    ymin: 1000 * 0.025,
    ymax: 1000 - 1000 * 0.025,
  }, "Applied border to 2000x1000");

  tree_state.setup_canvas({ width: 500, height: 900 });
  test_focal_area(test, {
    xmin: 500 * 0.025,
    xmax: 500 - 500 * 0.025,
    ymin: 900 * 0.025,
    ymax: 900 - 900 * 0.025,
  }, "Applied border to 500x900");

  test.end();
});


test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
