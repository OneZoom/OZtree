/**
 * DataStore: Data manager for (mostly binary array) data
 */
export default class DataStore {
  name = "changeme";  /** The name this DataStore will be added to DataStoreAPI as */

  /**
   * Convert a node to a DataStore id (read: array offset)
   * By default use the metacode
   */
  nodeToId(node) {
    return node.metacode;
  }

  /**
   * Convert a node into an array slice name
   * (i.e. the data array that this node will be found in)
   *
   * If null is returned, then it's assumed that there is no data for the node
   */
  sliceNameFor(node) {
    return this.is_leaf ? "data_leaf.dat" : "data_node.dat";
  }

  /**
   * Convert a window.fetch Response into a data view
   * By default, convert into Uint8Array of bytes
   *
   * See: https://developer.mozilla.org/en-US/docs/Web/API/Response
   */
  dataView(response) {
    // Read as Uint8Array by default
    return response.bytes();
  }

  constructor(dataStoreApi) {
    this.clear();  // Init internal structures
    this.dataStoreApi = dataStoreApi;
  }

  /**
   * Get value from DataStore for given node
   * - missingValue: Value to return when node has no value in slice
   * - missingSlice: Value to return when node has no slice assigned
   *
   * If slice is missing, queue up request to fetch it & return undefined
   * Otherwise return value/missingValue/missingSlice (default null)
   */
  get(node, missingValue = null, missingSlice = missingValue) {
    const sliceName = this.sliceNameFor(node);
    if (sliceName === null) return missingSlice;
    const view = this._slices[sliceName];

    if (!view) {
      this.dataStoreApi.notify(sliceName, this);
      return undefined;
    }
    const out = view[this.nodeToId(node)];
    return out === undefined ? missingValue : out;
  }

  /**
   * A requested slice has come in, process & save it
   * This will be called by DataStoreAPI
   */
  incoming(sliceName, response) {
    return this.dataView(response).then((view) => {
      this._slices[sliceName] = view;
    });
  }

  /**
   * Clear all existing slices from memory
   */
  clear() {
    this._slices = {};
  }

  /**
   * Helper to test platform endian-ness
   *
   * Uint16Array() buffers are CPU endian-ness, so we should fetch data with the correct endian-ness.
   * Use this to decide what to fetch.
   *
   * However, everything is little-endian nowadays, so we can just treat big-endian as an error
   * (sorry, IBM mainframe users).
   */
  isLittleEndian() {
    if (globalThis._platLittleEndian === undefined) {
      globalThis._platLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
    }
    return globalThis._platLittleEndian;
  }
}
