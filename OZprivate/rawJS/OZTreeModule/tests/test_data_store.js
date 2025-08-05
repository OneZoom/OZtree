/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_data_store.js
  */
import test from 'tape';
var jsdom = require('jsdom');
import DataStore from '../src/data_store/data_store';
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

test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
