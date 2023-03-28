/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_navigation_pinpoint.js
  */
import { resolve_pinpoints } from '../src/navigation/pinpoint.js';
import { populate_data_repo } from './util_data_repo.js'
import test from 'tape';

test('resolve_pinpoints:ott', function (test) {
  return populate_data_repo().then(() => {
    // Resolve single pinpoint
    return resolve_pinpoints('@=988790').then((pp) => test.deepEqual(pp, {
      pinpoint: '@=988790',
      ott: 988790,
      ozid: 836250,
    }, "@=988790"));

 }).then(() => {
    // Resolve multiple pinpoints
    return resolve_pinpoints([
      '@=988790',
      988790,  // NB: Numeric not string
      '824869',
    ]).then((pps) => test.deepEqual(pps, [
      { pinpoint: '@=988790', ott: 988790, ozid: 836250 },
      { pinpoint: 988790, ott: 988790, ozid: 836250 },
      { pinpoint: '824869', ott: 824869, ozid: 836247 },
    ], "@=988790, 988790 (numeric), 824869"));

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
