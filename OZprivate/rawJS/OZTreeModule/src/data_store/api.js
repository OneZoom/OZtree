import api_manager from '../api/api_manager';
import { DataStoreNotReadyError } from '../errors';

/**
 * Abstract interface a set of raw array data files
 *
 * The DataStore singleton mediates access to a number of per-node/per-leaf
 * data structures, downloading binary arrays as needed.
 *
 * To use a data store, access it via. the singleton, e.g:
 *
 *     import data_store_api from 'data_store/api';
 *     console.log(data_store_api.geological.get(node));
 *
 * ...if the backing array hasn't yet been retrieved, then this will fetch in the background.
 *
 * To implement a data store, create a subclass of DataStore (see src/data_store/data_store.js)
 * and inject it at the end of this file:
 *
 *     ds_api.inject(DataStoreIUCN);
 *
 */
class DataStoreAPI {
  constructor() {
    this._dsNames = [];
    this._queue = {};
    this._notifyTimeoutMs = 100;  // How long before triggers, in ms
    this._subsequentTimeoutMs = 100;  // If there's still more to do, how long before we trigger, in ms
    this._fails = {};
    this._batchSize = 5;  // How many we fetch in one go
    this._maxFails = 5;  // How many times we retry before start unleashing the error upstream
    this._drainResolves = [];  // resolve() of every promise awaitQueue() is holding open
  }

  /**
   * Create a DataStore instance from DsClass, add it to the API
   */
  inject(DsClass) {
    const ds = new DsClass(this);
    this._dsNames.push(ds.name);
    this[ds.name] = ds;
  }

  /**
   * Clear all data stores, e.g. on visualisation change
   */
  clear() {
    this._dsNames.forEach((dsName) => {
      this[dsName].clear();
    });
  }

  /**
   * Notify DataStoreAPI there's a missing slice to fetch
   * - sliceName: The data slice to fetch
   * - dataStore: The DataStore object to eventually be notified with dataStore.incoming(sliceName, resp);
   */
  notify(sliceName, dataStore) {
    // Add slice to overall queue
    if (this._queue[sliceName] && this._queue[sliceName] !== dataStore) {
      throw new Error("Data stores sharing slices not supported");
    }
    if ((this._fails[sliceName] || 0) > this._maxFails) {
      // Keeps failing, send error upwards
      throw new Error("Cannot fetch " + sliceName);
    }
    this._queue[sliceName] = dataStore;

    this._startTimer(this._notifyTimeoutMs);
  }


  /**
   * Call fn(), if it throws DataStoreNotReadyError (triggered by get_or_fail)
   * then wait for queues to empty and retry
   */
  retryWhenDataStoreReady(fn) {
    try {
      fn();
    } catch (e) {
      if (!(e instanceof DataStoreNotReadyError)) return Promise.reject(e);

      // Nothing queued and nothing in flight, so nothing to wait for
      if (!this._timer && Object.keys(this._queue).length === 0) return Promise.resolve();

      return (new Promise((resolve) => this._drainResolves.push(resolve))).then(() => {
        return this.retryWhenDataStoreReady(fn);
      });
    }
    return Promise.resolve();
  }

  // Start a timer if there isn't already one going
  _startTimer(timeout) {
    // Already waiting, don't bother
    if (this._timer) return;

    // Otherwise, start a new timer
    this._timer = window.setTimeout(() => {
      const sliceNames = Object.keys(this._queue);

      // If more to fetch, limit to the batch size
      if (sliceNames.length > this._batchSize) {
        sliceNames.splice(this._batchSize, sliceNames.length - this._batchSize);
      }

      // Fetch everything in the current batch
      return Promise.all(sliceNames.map((sliceName) => {
        return api_manager.static_tree_data(sliceName).then((response) => {
          if (!response.ok) throw new Error(`Data store fetch ${sliceName} failed ${response.status}:${response.statusText}`);
          return this._queue[sliceName].incoming(sliceName, response);
        }).then(() => {
          delete this._queue[sliceName];
        }).catch((error) => {
          // Note the failure & carry on
          console.error("Data store slice fetch error", error);
          this._fails[sliceName] = (this._fails[sliceName] || 0) + 1;
          delete this._queue[sliceName];
        });
      })).finally(() => {
        // Now we're done, let another timer start
        this._timer = undefined;
        // If there's more waiting (either added since we started, or over batchSize), go again
        if (Object.keys(this._queue).length > 0) {
          this._startTimer(this._subsequentTimeoutMs);
        } else {
          // Queue empty, wake anything waiting on it (see awaitQueue). Take the list first:
          // a resolved promise may well queue up more work, and that has its own wait
          const drainResolves = this._drainResolves;
          this._drainResolves = [];
          drainResolves.forEach((resolve) => resolve());
        }
      });
    }, timeout);
  }
}

// Return singleton instance with all DataStores added
const ds_api = new DataStoreAPI();
export default ds_api;
