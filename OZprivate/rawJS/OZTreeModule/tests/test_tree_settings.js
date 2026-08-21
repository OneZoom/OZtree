/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_tree_settings.js
  */
import test from 'tape';
var jsdom = require('jsdom');
import DataStore from '../src/data_store/data_store';
import tree_settings from '../src/tree_settings';
import { getDataStoreAPI } from './util_data_store';

/**
 * NB: Every viewtype used below is a binary one, so rebuild_tree() never crosses the
 * polytomy boundary. That's deliberate: crossing it calls set_layout()/set_factory_midnode(),
 * which reconfigure the layout globally and would leak into every test that runs after us
 */

class DataStoreUt extends DataStore {
  name = "ut_treesettings";

  nodeToId(node) { return node.id; }
  sliceNameFor(node) { return `treesettings_${node.slice}.json`; }
  dataView(response) { return response.json(); }
};

/**
 * A stand-in for the handful of controller methods rebuild_tree() pokes, logging the order
 * it pokes them in. The 2 that lay out a tree ask (ds) for data first, as the real ones
 * would via the pre-calculator, and thus throw DataStoreNotReadyError until it turns up
 */
function fake_controller(ds, root) {
  const calls = [];

  return {
    calls: calls,
    root: { ozid: 91 },
    factory: { root: root },
    binary_tree: null,
    polytomy_tree: null,

    stop_refresh_loop: () => calls.push('stop_refresh_loop'),
    draw_loading: () => calls.push('draw_loading'),
    re_calc: () => calls.push('re_calc'),
    dynamic_load_and_calc: function (ozid) {
      calls.push('dynamic_load_and_calc:' + ozid);
      ds.get_or_fail({ slice: 'layout', id: 0 });
    },
    rebuild_tree: function () {
      calls.push('rebuild_tree');
      ds.get_or_fail({ slice: 'layout', id: 0 });
    },
  };
}

test('tree_settings:rebuild_tree:existing_tree', function (test) {
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_treesettings;
  const existing_tree = { ozid: 91, iam: "an already-built binary tree" };
  const controller = fake_controller(ds, existing_tree);
  let resolved = false;

  const p = tree_settings.rebuild_tree('spiral', 'natural', controller).then(() => { resolved = true });

  test.deepEqual(controller.factory.root, existing_tree, "Existing tree handed back to the factory");
  test.deepEqual(controller.calls, [
    'stop_refresh_loop',
    'draw_loading',
    'dynamic_load_and_calc:91',
  ], "Stopped drawing the old tree, then had a first go at laying the tree out");

  return global.window.fetch.waitFor("/static/treesettings_layout_12345.json").then((reqId) => {
    test.deepEqual(resolved, false, "Not resolved yet: the layout is still missing its data");
    test.deepEqual(controller.calls.indexOf('re_calc'), -1, "...and didn't get as far as re_calc()");

    window.fetch.resolve_json(reqId, ["a", "b"]);
    return p;
  }).then(() => {
    test.deepEqual(controller.calls, [
      'stop_refresh_loop',
      'draw_loading',
      'dynamic_load_and_calc:91',
      'dynamic_load_and_calc:91',
      're_calc',
    ], "Laid the whole tree out again once the data arrived, and only then resolved");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('tree_settings:rebuild_tree:no_existing_tree', function (test) {
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_treesettings;
  const controller = fake_controller(ds, null);
  let resolved = false;

  const p = tree_settings.rebuild_tree('spiral', 'natural', controller).then(() => { resolved = true });

  test.deepEqual(controller.calls, [
    'stop_refresh_loop',
    'draw_loading',
  ], "Nothing to re-use, so drawing stopped & rebuild deferred to give loading a chance to paint");

  return global.window.fetch.waitFor("/static/treesettings_layout_12345.json").then((reqId) => {
    test.deepEqual(controller.calls.indexOf('rebuild_tree') > -1, true, "Tree rebuild attempted");
    test.deepEqual(resolved, false, "Not resolved yet: the rebuild is still missing its data");

    window.fetch.resolve_json(reqId, ["a", "b"]);
    return p;
  }).then(() => {
    test.deepEqual(controller.calls, [
      'stop_refresh_loop',
      'draw_loading',
      'rebuild_tree',
      'rebuild_tree',
    ], "Rebuilt again once the data arrived, and only then resolved");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('tree_settings:rebuild_tree:data_already_available', function (test) {
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_treesettings;
  const controller = fake_controller(ds, { ozid: 91 });

  // Prime the data store first, so there's nothing to wait for when we get going
  ds.get({ slice: 'layout', id: 0 });
  return global.window.fetch.waitFor("/static/treesettings_layout_12345.json").then((reqId) => {
    window.fetch.resolve_json(reqId, ["a", "b"]);
    return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
  }).then(() => {
    return tree_settings.rebuild_tree('spiral', 'natural', controller);
  }).then(() => {
    test.deepEqual(controller.calls, [
      'stop_refresh_loop',
      'draw_loading',
      'dynamic_load_and_calc:91',
      're_calc',
    ], "Laid out in one go, no retry needed");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});
