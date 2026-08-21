/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_data_store.js
  */
import test from 'tape';
var jsdom = require('jsdom');
import DataStore from '../src/data_store/data_store';
import { DataStoreNotReadyError } from '../src/errors';
import { getDataStoreAPI } from './util_data_store';

test('data_store:null', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut";

    nodeToId(node) { return node.metacode; }
    sliceNameFor(node) { return null; }
    dataView(response) { return response.bytes(); }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut;

  return Promise.resolve().then(() => {
    test.deepEqual(ds.get({ metacode: 0 }), null, "No slices --> any metacode returns null");
    test.deepEqual(ds.get({ metacode: 4 }), null, "No slices --> any metacode returns null");
    test.deepEqual(ds.get({ metacode: 4 }, 88, 99), 99, "No slices --> return missingSlice");
    test.deepEqual(ds.get({ metacode: 4 }, 44), 44, "No slices --> fallback to missingValue");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store:json', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut";

    nodeToId(node) { return node.id; }
    sliceNameFor(node) { return `slice_${node.slice}.json`; }
    dataView(response) { return response.json(); }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut;

  return Promise.resolve().then(() => {
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), undefined, "Slice not available, retuns undefined");

    return global.window.fetch.waitFor("/static/slice_apple_pie_12345.json").then((reqId) => {
      window.fetch.resolve_json(reqId, ["a", "b", "c", "d"]);
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), "a", "Slice now available (0)");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:1 }), "b", "Slice now available (1)");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:5 }), null, "Slice now available, but no value in it (5)");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:5 }, 99), 99, "Can customise the missing value");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:5 }, 88, 99), 88, "Can customise the missing value");

    test.deepEqual(ds.get({ slice: 'pizza', id:0 }), undefined, "Slice not available, retuns undefined");
    test.deepEqual(ds.get({ slice: 'pizza', id:1 }), undefined, "Slice still not available");
    test.deepEqual(ds.get({ slice: 'cake', id:"c" }), undefined, "Slice not available, retuns undefined");

    return Promise.all([
      // NB: Only requesting it once
      global.window.fetch.waitFor("/static/slice_pizza_12345.json"),
      global.window.fetch.waitFor("/static/slice_cake_12345.json"),
    ]).then((reqIds) => {
      window.fetch.resolve_json(reqIds[0], ["pepperoni", "hawiian"]);
      window.fetch.resolve_json(reqIds[1], {"v": "victoria sponge", "c": "chocolate"});
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    })
  }).then(() => {
    test.deepEqual(ds.get({ slice: 'pizza', id:0 }), "pepperoni", "Pizza now available");
    test.deepEqual(ds.get({ slice: 'cake', id:"c" }), "chocolate", "Cake now available");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), "a", "Apple pie still available");
  }).then(() => {
    ds.clear();
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), undefined, "Apple pie no longer available after clear");
    test.deepEqual(ds.get({ slice: 'pizza', id:1 }), undefined, "Pizza no longer available after clear");

  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(Object.keys(w).sort(), [
      "/static/slice_apple_pie_12345.json",
      "/static/slice_pizza_12345.json",
    ], "pizza/apple pie requests left hanging"));
  }).then(() => {
    return Promise.all([
      // NB: Only requesting it once
      global.window.fetch.waitFor("/static/slice_pizza_12345.json"),
      global.window.fetch.waitFor("/static/slice_apple_pie_12345.json"),
    ]).then((reqIds) => {
      window.fetch.resolve_json(reqIds[0], ["pepperoni", "hawiian"]);
      window.fetch.resolve_json(reqIds[1], {"v": "victoria sponge", "c": "chocolate"});
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  });
});

test('data_store:get_or_fail', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut_gof";

    nodeToId(node) { return node.id; }
    sliceNameFor(node) { return node.slice ? `gof_${node.slice}.json` : null; }
    dataView(response) { return response.json(); }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_gof;
  // NB: A toString() so we can check what the error message says about the node
  const node = (slice, id) => ({ slice: slice, id: id, toString: () => `${slice}:${id}` });

  return Promise.resolve().then(() => {
    // No slice for the node at all: nothing to wait for, so no point failing
    test.deepEqual(ds.get_or_fail(node(null, 0)), null, "No slice for node --> missingSlice (null by default)");
    test.deepEqual(ds.get_or_fail(node(null, 0), 88, 99), 99, "No slice for node --> missingSlice");
    test.deepEqual(ds.get_or_fail(node(null, 0), 44), 44, "No slice for node --> missingSlice falls back to missingValue");

    // Slice not fetched yet: fail, regardless of what the missing* values say
    test.throws(
      () => ds.get_or_fail(node('apple_pie', 0)),
      DataStoreNotReadyError,
      "Slice not available --> throws DataStoreNotReadyError");
    test.throws(
      () => ds.get_or_fail(node('apple_pie', 0), 88, 99),
      DataStoreNotReadyError,
      "Slice not available --> throws, missingValue/missingSlice don't apply");
    try {
      ds.get_or_fail(node('apple_pie', 4));
      test.fail("Should have thrown");
    } catch (e) {
      test.deepEqual(e instanceof DataStoreNotReadyError, true, "Threw a DataStoreNotReadyError");
      test.deepEqual(e instanceof Error, true, "...which is also an Error");
      test.deepEqual(e.name, "DataStoreNotReadyError", "...named after its class");
      test.deepEqual(e.message, "ut_gof not yet available for node apple_pie:4", "...naming the data store & node");
    }

    // ...but, as with get(), the missing slice got queued up for fetching
    return global.window.fetch.waitFor("/static/gof_apple_pie_12345.json").then((reqId) => {
      window.fetch.resolve_json(reqId, ["a", "b", "c"]);
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get_or_fail(node('apple_pie', 0)), "a", "Slice now available (0)");
    test.deepEqual(ds.get_or_fail(node('apple_pie', 1)), "b", "Slice now available (1)");

    // Slice is here, a node with no value in it isn't something waiting will fix
    test.deepEqual(ds.get_or_fail(node('apple_pie', 5)), null, "Slice available, no value for node --> missingValue (null by default)");
    test.deepEqual(ds.get_or_fail(node('apple_pie', 5), 88), 88, "Slice available, no value for node --> missingValue");
    test.deepEqual(ds.get_or_fail(node('apple_pie', 5), 88, 99), 88, "Slice available, no value for node --> missingValue, not missingSlice");

    // A different slice is still missing though
    test.throws(
      () => ds.get_or_fail(node('pizza', 0)),
      DataStoreNotReadyError,
      "Other slice not available --> throws");

    return global.window.fetch.waitFor("/static/gof_pizza_12345.json").then((reqId) => {
      window.fetch.resolve_json(reqId, ["pepperoni"]);
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get_or_fail(node('pizza', 0)), "pepperoni", "Pizza now available");

    ds.clear();
    test.throws(
      () => ds.get_or_fail(node('apple_pie', 0)),
      DataStoreNotReadyError,
      "Throwing again after clear()");

    return global.window.fetch.waitFor("/static/gof_apple_pie_12345.json").then((reqId) => {
      window.fetch.resolve_json(reqId, ["a", "b", "c"]);
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get_or_fail(node('apple_pie', 0)), "a", "Apple pie available once more");

    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store:get_or_fail_subclass', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut_gof_sub";

    nodeToId(node) { return node.id; }
    sliceNameFor(node) { return `gofsub_${node.slice}.json`; }
    dataView(response) { return response.json(); }

    // A get() wrapper picking its own missing values, as ds_weighted_mean does
    get(node) {
      this.get_calls = (this.get_calls || 0) + 1;
      return super.get(node, 'no-value', 'no-slice');
    }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_gof_sub;

  return Promise.resolve().then(() => {
    test.throws(
      () => ds.get_or_fail({ slice: 'apple_pie', id: 0 }),
      DataStoreNotReadyError,
      "Slice not available --> still throws through the get() wrapper");

    return global.window.fetch.waitFor("/static/gofsub_apple_pie_12345.json").then((reqId) => {
      window.fetch.resolve_json(reqId, ["a", "b", "c"]);
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    ds.get_calls = 0;

    // NB: get_or_fail() goes via get(), so a subclass wrapping get() gets the same treatment
    // for free --- which is what ds_weighted_mean relies on
    test.deepEqual(ds.get_or_fail({ slice: 'apple_pie', id: 0 }), "a", "get_or_fail() returns values as normal");
    test.deepEqual(ds.get_or_fail({ slice: 'apple_pie', id: 5 }), 'no-value', "get_or_fail() picks up the get() wrapper's missingValue");
    test.deepEqual(ds.get_or_fail({ slice: 'apple_pie', id: 5 }, 88), 'no-value', "...even when the caller asks for something else, since the wrapper drops it");
    test.deepEqual(ds.get_calls, 3, "All of the above went via get()");

    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store:bytes', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut_bytes";

    nodeToId(node) { return node.id; }
    sliceNameFor(node) { return `slice_${node.slice}.dat`; }
    dataView(response) { return response.bytes(); }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_bytes;

  return Promise.resolve().then(() => {
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), undefined, "Slice not available, retuns undefined");

    return global.window.fetch.waitFor("/static/slice_apple_pie_12345.dat").then((reqId) => {
      window.fetch.resolve_bytes(reqId, "\x01\xAA\x03");
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), 0x01, "Slice now available (0)");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:1 }), 0xAA, "Slice now available (1)");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store:uint16', function (test) {
  class DataStoreUt extends DataStore {
    name = "ut_bytes";

    nodeToId(node) { return node.id; }
    sliceNameFor(node) { return `slice_${node.slice}_le.dat`; }
    dataView(response) { return response.arrayBuffer().then((ab) => new Uint16Array(ab)); }
  };
  const ds = getDataStoreAPI(test, [DataStoreUt]).ut_bytes;

  return Promise.resolve().then(() => {
    test.deepEqual(ds.isLittleEndian(), true, "Running on a little-endian CPU")
  
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), undefined, "Slice not available, retuns undefined");

    return global.window.fetch.waitFor("/static/slice_apple_pie_le_12345.dat").then((reqId) => {
      window.fetch.resolve_buffer(reqId, new Uint16Array([0xBEEF, 0xCAFE]));
      return new Promise((resolve) => setTimeout(resolve, 10));  // NB: Let fetch promises settle
    });
  }).then(() => {
    test.deepEqual(ds.get({ slice: 'apple_pie', id:0 }), 0xBEEF, "Slice now available (0)");
    test.deepEqual(ds.get({ slice: 'apple_pie', id:1 }), 0xCAFE, "Slice now available (1)");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});
