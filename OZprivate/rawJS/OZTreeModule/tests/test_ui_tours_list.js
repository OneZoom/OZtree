/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_ui_tours_list.js
  */
import test from 'tape';

import { teaseTour } from '../src/ui/tours_list.js';

test('teaseTour', function (test) {
  var out;
  global.window = { fakeLs: {} };

  function tt (tourIds, progress) {
    Object.keys(progress || {}).forEach((k) => {
      global.window.fakeLs['ts-progress-' + k] = progress[k];
    });
    const out = teaseTour(tourIds.map((id) => ({ identifier: id })));
    return out ? out['identifier'] : out;
  }

  test.equal(tt([]), null, "No tours, returned null");

  test.equal(tt(['a', 'b', 'c']), 'a', "No progress, return first tourstop");
  test.equal(tt(['a', 'b', 'c'], {
    'a': [true, true],
  }), 'b', "a finished, return b");

  test.equal(tt(['a', 'b', 'c'], {
    'a': [true, true],
    'c': [true, false],
  }), 'c', "c in-progress, return c");

  test.equal(tt(['a', 'b', 'c'], {
    'a': [true, true],
    'b': [true, true],
    'c': [true, true],
  }), null, "All finished, return null");

  test.end();
});
