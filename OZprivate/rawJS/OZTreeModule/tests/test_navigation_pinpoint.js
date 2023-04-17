/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_navigation_pinpoint.js
  */
import { resolve_pinpoints } from '../src/navigation/pinpoint.js';
import { populate_data_repo } from './util_data_repo.js'
import { populate_factory } from './util_factory'
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
      null,
      '@=988790',
      988790,  // NB: Numeric not string
      '824869',
    ]).then((pps) => test.deepEqual(pps, [
      { pinpoint: null, ozid: 1 },  // Empty pinpoints are assumed to be root
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

test('resolve_pinpoints:common_ancestor', function (test) {
  var factory;
  return populate_factory().then((f) => {
    // Init data_repo & factory
    factory = f;

  }).then(function () {
    // Resolve single pinpoint
    return resolve_pinpoints('@_ancestor=988790-824869').then((pp) => test.deepEqual(pp, {
      pinpoint: '@_ancestor=988790-824869',
      sub_pinpoints: [
        { pinpoint: '988790', ott: 988790, ozid: 836250 },
        { pinpoint: '824869', ott: 824869, ozid: 836247 },
      ],
      ozid: 836246,
    }, "@_ancestor=988790-824869"));

  }).then(function () {
    // Ancestor of a node below another is the first node
    return resolve_pinpoints('@_ancestor=244265-48401').then((pp) => test.deepEqual(pp, {
      pinpoint: '@_ancestor=244265-48401',
      sub_pinpoints: [
        { pinpoint: '244265', ott: 244265, ozid: 834744 },  // Mammals
        { pinpoint: '48401', ott: 48401, ozid: -836261 },  // Fijian monkey-faced bat (Mirimiri acrodonta)
      ],
      ozid: 834744,  // NB: The common ancestor is still mammals
    }, "@_ancestor=244265-48401"));

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
