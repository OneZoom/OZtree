/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_data_store_ds_geological.js
  */
import test from 'tape';
var jsdom = require('jsdom');
import { DataStoreNotReadyError } from '../src/errors';
import { GEOLOGICAL_PERIODS } from '../src/data_store/ds_geological';
import { getDataStoreAPI } from './util_data_store';

const LEAVES_URL = "/static/geological_leaves_u8_12345.dat";
const NODES_URL = "/static/geological_nodes_u8_12345.dat";

/**
 * Colour of each period, indexed by period number, so tests can talk about periods
 * without being rewritten every time the palette changes
 */
const PERIOD_COLORS = GEOLOGICAL_PERIODS.map((p) => p.color);

/** NB: A toString() so we can check what any error message says about the node */
const mk_leaf = (metacode, upnode) => ({ metacode: metacode, is_leaf: true, upnode: upnode, toString: () => `leaf:${metacode}` });
const mk_node = (metacode, upnode) => ({ metacode: metacode, is_leaf: false, upnode: upnode, toString: () => `node:${metacode}` });

/** NB: Let fetch promises settle, so a resolved request is out of the fake fetch's list */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

/**
 * Answer the pending requests for (slices), e.g.
 *     resolve_slices({ [NODES_URL]: [14, 8, 12] })
 * ...then wait for the data stores to digest them
 */
function resolve_slices(slices) {
  return Promise.all(Object.keys(slices).map((url) => {
    return global.window.fetch.waitFor(url).then((reqId) => {
      window.fetch.resolve_buffer(reqId, Uint8Array.from(slices[url]));
    });
  })).then(settle);
}

/**
 * Ask about (nodes) so the store queues up the slices they need, then answer with
 * (slices), e.g.
 *     load_slices(ds, [leaf], { [LEAVES_URL]: [1], [NODES_URL]: [14, 8] })
 */
function load_slices(ds, nodes, slices) {
  nodes.forEach((node) => {
    try {
      ds.branch_periods_colors(node);
    } catch (e) {
      // NB: We're expecting this, it's how the slices get requested
      if (!(e instanceof DataStoreNotReadyError)) throw e;
    }
  });
  return resolve_slices(slices);
}

/**
 * The geological store is on the DataStoreAPI singleton, which outlives any one
 * test, so start from a known-empty state
 */
function getGeological(test) {
  const ds = getDataStoreAPI(test).geological;
  ds.clear();
  return ds;
}

test('ds_geological:not_ready', function (test) {
  const ds = getGeological(test);
  // A leaf hanging off a node: leaf & node data live in separate slices
  const node = mk_node(2);
  const leaf = mk_leaf(1, node);

  return Promise.resolve().then(() => {
    try {
      ds.branch_periods_colors(leaf);
      test.fail("Should have thrown");
    } catch (e) {
      test.deepEqual(e instanceof DataStoreNotReadyError, true, "No data yet --> threw a DataStoreNotReadyError");
      test.deepEqual(e.message, "geological not yet available for node leaf:1..node:2", "...naming both ends of the branch");
    }
    test.throws(
      () => ds.branch_periods_count(leaf),
      DataStoreNotReadyError,
      "branch_periods_count() throws too");

    // NB: Both nodes get fetched before either is tested, so a branch missing *both*
    // slices queues up both of them, rather than needing a round-trip each
    return resolve_slices({
      [LEAVES_URL]: [1],
      [NODES_URL]: [14, 8],
    });
  }).then(() => {
    test.deepEqual(ds.branch_periods_count(leaf), 8, "Both slices in, now we get an answer");

    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('ds_geological:branch', function (test) {
  const ds = getGeological(test);
  //     (root, Lower Jurassic) -- (node:2, Paleocene) -- (leaf:1, Anthropocene)
  //                            \                      \- (leaf:2, Pleistocene)
  //                             \- (node:3, Upper Jurassic)
  // NB: An upnode is always at least as old as the node below it, i.e. a higher period number
  const root = mk_node(1);
  const node_2 = mk_node(2, root);
  const node_3 = mk_node(3, root);
  const leaf_1 = mk_leaf(1, node_2);
  const leaf_2 = mk_leaf(2, node_2);

  return load_slices(ds, [leaf_1, node_3], {
    // NB: nodeToId() is (metacode - 1), so the first entry is metacode 1
    [LEAVES_URL]: [1, 3],
    [NODES_URL]: [14, 8, 12],
  }).then(() => {
    test.deepEqual(ds.branch_periods_colors(leaf_1), [
      PERIOD_COLORS[8],  // Paleocene: the upnode's own period
      PERIOD_COLORS[7],  // Eocene
      PERIOD_COLORS[6],  // Oligocene
      PERIOD_COLORS[5],  // Miocene
      PERIOD_COLORS[4],  // Pliocene
      PERIOD_COLORS[3],  // Pleistocene
      PERIOD_COLORS[2],  // Holocene
      PERIOD_COLORS[1],  // Anthropocene: the node's own period
    ], "Every period from upnode to node inclusive, oldest first");
    test.deepEqual(ds.branch_periods_count(leaf_1), 8, "...and the count agrees");

    test.deepEqual(ds.branch_periods_colors(leaf_2), [
      PERIOD_COLORS[8],  // Paleocene
      PERIOD_COLORS[7],  // Eocene
      PERIOD_COLORS[6],  // Oligocene
      PERIOD_COLORS[5],  // Miocene
      PERIOD_COLORS[4],  // Pliocene
      PERIOD_COLORS[3],  // Pleistocene
    ], "A shorter branch off the same upnode stops at the leaf's own period");
    test.deepEqual(ds.branch_periods_count(leaf_2), 6, "...and the count agrees");

    test.deepEqual(ds.branch_periods_colors(node_3), [
      PERIOD_COLORS[14],  // Lower Jurassic: the root's period
      PERIOD_COLORS[13],  // Middle Jurassic
      PERIOD_COLORS[12],  // Upper Jurassic: node:3's own period
    ], "Interior nodes work the same way, from their upnode down");
    test.deepEqual(ds.branch_periods_count(node_3), 3, "...and the count agrees");

    test.deepEqual(ds.branch_periods_colors(node_2).length, 7, "node:2 covers Lower Jurassic..Paleocene");
    test.deepEqual(ds.branch_periods_count(node_2), 7, "...and the count agrees");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('ds_geological:no_upnode', function (test) {
  const ds = getGeological(test);
  const root = mk_node(2);

  return Promise.resolve().then(() => {
    // NB: count doesn't need any data to say "1", colors does
    test.deepEqual(ds.branch_periods_count(root), 1, "The root has no branch, so only one period");
    test.throws(
      () => ds.branch_periods_colors(root),
      DataStoreNotReadyError,
      "...but its colour is whatever period it sits in, so we have to wait for data");

    return resolve_slices({ [NODES_URL]: [14, 8] });
  }).then(() => {
    test.deepEqual(ds.branch_periods_colors(root), [PERIOD_COLORS[8]], "Just the root's own period");
    test.deepEqual(ds.branch_periods_count(root), 1, "...which is one period, as promised");
    test.deepEqual(ds.branch_periods_colors(root).length, ds.branch_periods_count(root), "colors().length matches count()");

    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('ds_geological:single_period', function (test) {
  const ds = getGeological(test);
  const node = mk_node(1);
  const leaf = mk_leaf(1, node);

  return load_slices(ds, [leaf], {
    [LEAVES_URL]: [5],
    [NODES_URL]: [5],
  }).then(() => {
    // A branch that doesn't leave the period it started in
    test.deepEqual(ds.branch_periods_colors(leaf), [PERIOD_COLORS[5]], "Node & upnode in the same period --> one colour");
    test.deepEqual(ds.branch_periods_count(leaf), 1, "...and a count of 1");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('ds_geological:memoised', function (test) {
  const ds = getGeological(test);
  const node = mk_node(1);
  // 2 leaves in the same period, hanging off the same node
  const leaf_1 = mk_leaf(1, node);
  const leaf_2 = mk_leaf(2, node);
  const leaf_3 = mk_leaf(3, node);

  return load_slices(ds, [leaf_1], {
    [LEAVES_URL]: [3, 3, 1],
    [NODES_URL]: [8],
  }).then(() => {
    const out = ds.branch_periods_colors(leaf_1);

    // We're called for every node on every frame, so the (upnode, node) pairs are memoised
    test.deepEqual(ds.branch_periods_colors(leaf_1) === out, true, "Same node --> same array, not a fresh copy");
    test.deepEqual(ds.branch_periods_colors(leaf_2) === out, true, "Different node, same period pair --> same array");
    test.deepEqual(ds.branch_periods_colors(leaf_3) === out, false, "Different period pair --> different array");
    test.deepEqual(out, [
      PERIOD_COLORS[8], PERIOD_COLORS[7], PERIOD_COLORS[6],
      PERIOD_COLORS[5], PERIOD_COLORS[4], PERIOD_COLORS[3],
    ], "The memoised array is still the right answer");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('ds_geological:clear', function (test) {
  const ds = getGeological(test);
  const node = mk_node(1);
  const leaf = mk_leaf(1, node);

  return load_slices(ds, [leaf], {
    [LEAVES_URL]: [3],
    [NODES_URL]: [8],
  }).then(() => {
    test.deepEqual(ds.branch_periods_count(leaf), 6, "Precondition: we have data");

    // e.g. on visualisation change
    ds.clear();
    test.throws(
      () => ds.branch_periods_count(leaf),
      DataStoreNotReadyError,
      "Data thrown away --> back to waiting for slices");

    return resolve_slices({
      [LEAVES_URL]: [3],
      [NODES_URL]: [8],
    });
  }).then(() => {
    test.deepEqual(ds.branch_periods_count(leaf), 6, "Slices re-fetched, we have answers again");

    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});
