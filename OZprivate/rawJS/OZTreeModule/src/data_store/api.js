import api_manager from '../api/api_manager';

import DataStoreIUCN from './ds_iucn.js';
import DataStoreCutMap from './ds_cutmap.js'

/**
 * Background fetcher for data store slices
 */
class DataStoreAPI {
  constructor() {
    this._dsNames = [];
    this._queue = {};
    this._notifyTimeoutMs = 100;  // How long before triggers, in ms
    this._subsequentTimeoutMs = 100;  // If there's still more to do, how long before we trigger, in ms
    this._batchSize = 5;  // How many we fetch in one go
    this._maxFails = 5;  // How many times we retry before start unleashing the error upstream
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
    Object.keys(this._dsNames).forEach((dsName) => {
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

    this._startTimer(this.notifyTimeoutMs);
  }

  // Start a timer if there isn't already one going
  _startTimer(timeout) {
    // Already waiting, don't bother
    if (!this._timer) return;

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
          return queue[sliceName].incoming(sliceName, response);
        }).then(() => {
          delete this._queue[sliceName];
        }).catch((error) => {
          // Note the failure & carry on
          console.error(error);
          this._fails[sliceName] = (this._fails[sliceName] || 0) + 1;
        });
      })).finally(() => {
        // Now we're done, let another timer start
        this._timer = undefined;
        // If there's more waiting (either added since we started, or over batchSize), go again
        if (Object.keys(this._queue).length > 0) this.startTimer(this._subsequentTimeoutMs);
      });
    }, timeout);
  }
}

// Return singleton instance with all DataStores added
const ds_api = new DataStoreAPI();
ds_api.inject(DataStoreIUCN);
ds_api.inject(DataStoreCutMap);
export default ds_api;
