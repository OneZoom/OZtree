/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_data_store_api.js
  */
import test from 'tape';
var jsdom = require('jsdom');
import DataStore from '../src/data_store/data_store';
import { DataStoreNotReadyError } from '../src/errors';
import { getDataStoreAPI } from './util_data_store';

/** A DataStore with a slice per (node.slice), for the tests below to starve of data */
class DataStoreUt extends DataStore {
  name = "ut_retry";

  nodeToId(node) { return node.id; }
  sliceNameFor(node) { return `retry_${node.slice}.json`; }
  dataView(response) { return response.json(); }
};

/** NB: Let fetch promises settle, so a resolved request is out of the fake fetch's list */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

test('data_store_api:retryWhenDataStoreReady:no_fail', function (test) {
  const dsApi = getDataStoreAPI(test);
  let fnCalls = 0;

  return dsApi.retryWhenDataStoreReady(() => { fnCalls++; }).then((out) => {
    test.deepEqual(fnCalls, 1, "Called fn once");
    test.deepEqual(out, undefined, "Resolved with nothing (fn's return value is ignored)");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "Nothing fetched"));
  });
});

test('data_store_api:retryWhenDataStoreReady:other_error', function (test) {
  const dsApi = getDataStoreAPI(test);
  let fnCalls = 0;

  // Anything that isn't a DataStoreNotReadyError isn't ours to swallow
  return dsApi.retryWhenDataStoreReady(() => {
    fnCalls++;
    throw new Error("Grunty pig");
  }).then(() => {
    test.fail("Should have rejected");
  }, (e) => {
    test.deepEqual(e.message, "Grunty pig", "Rejected with fn's error");
    test.deepEqual(fnCalls, 1, "Didn't retry fn");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "Nothing fetched"));
  });
});

test('data_store_api:retryWhenDataStoreReady:nothing_queued', function (test) {
  const dsApi = getDataStoreAPI(test);
  let fnCalls = 0;

  test.deepEqual(Object.keys(dsApi._queue), [], "Precondition: nothing queued");

  // fn is unhappy, but nothing is queued or in-flight so waiting won't fix it. Give up
  // rather than spin forever
  return dsApi.retryWhenDataStoreReady(() => {
    fnCalls++;
    throw new DataStoreNotReadyError("I want data that nobody is fetching");
  }).then(() => {
    test.deepEqual(fnCalls, 1, "Gave up rather than retrying fn");
  }, (e) => {
    test.fail("Should have resolved, got " + e);
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "Nothing fetched"));
  });
});

test('data_store_api:retryWhenDataStoreReady:waits_for_slices', function (test) {
  const dsApi = getDataStoreAPI(test, [DataStoreUt]);
  const ds = dsApi.ut_retry;
  let fnCalls = 0, out = null;

  // Needs 2 slices, and only asks for the second once it has the first, so 3 goes in total
  const fn = () => {
    fnCalls++;
    out = [
      ds.get_or_fail({ slice: 'apple_pie', id: 0 }),
      ds.get_or_fail({ slice: 'pizza', id: 0 }),
    ];
  };

  const p = dsApi.retryWhenDataStoreReady(fn);
  test.deepEqual(fnCalls, 1, "fn called synchronously, before we start waiting");

  return global.window.fetch.waitFor("/static/retry_apple_pie_12345.json").then((reqId) => {
    test.deepEqual(fnCalls, 1, "Still waiting on apple_pie, not spinning on fn");
    window.fetch.resolve_json(reqId, ["a", "b"]);

    // NB: Only requested once the apple_pie retry got far enough to ask for it
    return global.window.fetch.waitFor("/static/retry_pizza_12345.json");
  }).then((reqId) => {
    test.deepEqual(fnCalls, 2, "Queue drained --> retried fn, which got as far as pizza");
    window.fetch.resolve_json(reqId, ["pepperoni"]);
    return p;
  }).then(() => {
    test.deepEqual(fnCalls, 3, "Retried fn once more, which made it to the end");
    test.deepEqual(out, ["a", "pepperoni"], "Final call to fn saw both slices");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store_api:retryWhenDataStoreReady:concurrent', function (test) {
  const dsApi = getDataStoreAPI(test, [DataStoreUt]);
  const ds = dsApi.ut_retry;
  const fnCalls = { cake: 0, trifle: 0 };

  const fn = (sliceName) => () => {
    fnCalls[sliceName]++;
    ds.get_or_fail({ slice: sliceName, id: 0 });
  };

  // 2 separate callers, both left waiting on the same drain
  const ps = Promise.all([
    dsApi.retryWhenDataStoreReady(fn('cake')),
    dsApi.retryWhenDataStoreReady(fn('trifle')),
  ]);
  test.deepEqual(fnCalls, { cake: 1, trifle: 1 }, "Both fns called, both waiting");

  return Promise.all([
    global.window.fetch.waitFor("/static/retry_cake_12345.json"),
    global.window.fetch.waitFor("/static/retry_trifle_12345.json"),
  ]).then((reqIds) => {
    // NB: Both slices batched into the same round of fetching
    window.fetch.resolve_json(reqIds[0], ["victoria sponge"]);
    window.fetch.resolve_json(reqIds[1], ["sherry"]);
    return ps;
  }).then(() => {
    test.deepEqual(fnCalls, { cake: 2, trifle: 2 }, "Both waiters woken up & retried once");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});

test('data_store_api:retryWhenDataStoreReady:fetch_failure', function (test) {
  const dsApi = getDataStoreAPI(test, [DataStoreUt]);
  const ds = dsApi.ut_retry;
  let fnCalls = 0, out = null;

  const fn = () => {
    fnCalls++;
    out = ds.get_or_fail({ slice: 'kedgeree', id: 0 });
  };

  const p = dsApi.retryWhenDataStoreReady(fn);

  return global.window.fetch.waitFor("/static/retry_kedgeree_12345.json").then((reqId) => {
    // A failed fetch still empties the queue, so we get woken up rather than hanging forever
    window.fetch.resolve_servfail(reqId);
    return settle();
  }).then(() => {
    return global.window.fetch.waitFor("/static/retry_kedgeree_12345.json");
  }).then((reqId) => {
    test.deepEqual(fnCalls, 2, "Woken up after the failure, retried fn & asked for the slice again");
    window.fetch.resolve_json(reqId, ["smoked haddock"]);
    return p;
  }).then(() => {
    test.deepEqual(fnCalls, 3, "Retried fn once the slice finally turned up");
    test.deepEqual(out, "smoked haddock", "Final call to fn got its value");
  }).then(() => {
    return global.window.fetch.waitingWithTimeout().then((w) => test.deepEqual(w, {}, "No requests left in queue"));
  });
});
