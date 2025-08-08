/**
 * Fake window.fetch with a version that does no network access
 *
 * if (!global.window) global.window = { setTimeout: setTimeout };
 * if (!global.window.fetch) window.fetch = fakeFetch();
 */
export default function fakeFetch() {
  const f = function (url, opts) {
    let reqId = url + '  ';
    if (!f.requests) f.requests = {};
    while (f.requests[reqId]) reqId += "a";
    f.requests[reqId] = {url: url, opts: opts};

    console.log(`==== New request ${reqId}`);

    return new Promise((resolve, reject) => {
      f.requests[reqId].resolve = resolve;
      f.requests[reqId].reject = reject;

      // If something was waiting for this request, give it a poke
      if ((f.waitingFor || {})[url]) {
        f.waitingFor[url](reqId);
        delete f.waitingFor[url];
      }
    }).finally(() => {
      delete f.requests[reqId];
    });
  }

  // List all waiting fetch requests and their IDs
  f.waiting = function (abortOld) {
    const out = {};
    Object.keys(f.requests || {}).forEach((reqId) => {
      if (f.requests[reqId].resolve) {
        const url = f.requests[reqId].url;
        if (!out[url]) out[url] = [];
        out[url].push(reqId);
        if (abortOld) {
          f.requests[reqId].reject(new Error("abort"));
        }
      }
    });
    return out;
  };

  // Let fetch promises settle, then return list of waiting items
  f.waitingWithTimeout = function (abortOld) {
    return new Promise((resolve) => setTimeout(() => {
      resolve(f.waiting(abortOld))
    }, 100));
  };

  // Wait for a request for the given URL, return the request ID
  f.waitFor = function (url) {
    // Is there a request already waiting?
    for (let reqId of Object.keys(f.requests || {})) {
      if (f.requests[reqId].url === url) {
        return Promise.resolve(reqId);
      }
    }

    // Log that we want to know about the next request
    if (!f.waitingFor) f.waitingFor = {};
    return new Promise((resolve) => {
      f.waitingFor[url] = resolve;
    });
  };

  // Reject as network error
  f.resolve_neterr = function (reqId) {
    f.requests[reqId].reject(new Error("Your network cable is unplugged or summat"));
  }

  // Resolve request as a server failure
  f.resolve_servfail = function (reqId) {
    f.requests[reqId].resolve({ ok: false, status: 500, statusText: "Oh noes" });
  };

  // Resolve request as a server failure
  f.resolve_servfail = function (reqId) {
    f.requests[reqId].resolve({ ok: false, status: 500, statusText: "Oh noes" });
  };

  // Resolve with a JSON promise
  f.resolve_json = function (reqId, data) {
    f.requests[reqId].resolve({ ok: true, status: 200, statusText: "OK", json: () => Promise.resolve(data) });
  };

  // Resolve with a bytes promise
  f.resolve_bytes = function (reqId, dataString) {
    f.requests[reqId].resolve({ ok: true, status: 200, statusText: "OK", bytes: () => Promise.resolve(Uint8Array.from(dataString.split("").map(x => x.charCodeAt()))) });
  };

  // Resolve with an arrayBuffer promise
  f.resolve_buffer = function (reqId, intArray) {
    f.requests[reqId].resolve({ ok: true, status: 200, statusText: "OK", arrayBuffer: () => Promise.resolve(intArray.buffer) });
  };

  return f;
}
