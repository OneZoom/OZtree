/**
 * DataStore: Abstract data manager class for (mostly binary array) data
 *
 * A DataStore maps requests for data for a node back to binary array files.
 * Before using, an implementation must be injected into the DataStoreAPI (see src/data_store/api.js).
 *
 * An implementation for IUCN using DataStore could look like:
 *
 *     import DataStore from './data_store';
 *
 *     export default class DataStoreIUCN extends DataStore {
 *       name = "iucn";  // The name that this will be availble from DataStoreApi under
 *
 *       constructor(dataStoreApi) {
 *         super(dataStoreApi);
 *
 *         if (!this.isLittleEndian()) {
 *           throw new Error("Onezoom doesn't support big-endian CPUs");
 *         }
 *       }
 *
 *       // IUCN data indexed by ott
 *       nodeToId(node) {
 *         return node.ott;
 *       }
 *
 *       // Only one array for all IUCN data
 *       sliceNameFor(node) {
 *         // NB: There is no data for nodes in IUCN, so we only have a slice for leaves
 *         return node.is_leaf ? "iucn_le.dat" : null;
 *       }
 *
 *       // We read iucn.dat as a Uint16Array() (CPU-endianness)
 *       dataView(resp) {
 *         return resp.arrayBuffer().then((ab) => new Uint16Array(ab));
 *       }
 *     }
 *
 * We can use DataStore for non-binary-array data too, e.g. a cutmap implementation:
 *
 *     import DataStore from './data_store';
 *
 *     export default class DataStoreCutMap extends DataStore {
 *       name = "cutmap";  // The name that this will be availble from DataStoreApi under
 *
 *       setCutMapType(type) {
 *         // NB: This will auto-trigger the new slice to be fetched, as the name to look-up will change
 *         self._sliceName = type === "polytomy" ? "poly_cut_position_map.json" : "cut_position_map.json";
 *       }
 *
 *       nodeToId(node) {
 *         return node.end;
 *       }
 *
 *       // Fetch JSON file to populate cut-position map
 *       sliceNameFor(node) {
 *         return self._sliceName || 'cut_position_map.json';
 *       }
 *
 *       // Our "data array" is a JSON object
 *       dataView(resp) {
 *         return resp.json();
 *       }
 *     }
 */
import { DataStoreNotReadyError } from '../errors';

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
   * As get, but throws DataStoreNotReadyError if we need to request a slice
   *
   * NB: An undefined from get() can only mean a missing slice: the missingValue/missingSlice
   * defaults mean there's no way to ask it to return undefined for anything else
   */
  get_or_fail(node, missingValue = null, missingSlice = missingValue) {
    const out = this.get(node, missingValue, missingSlice);
    if (out === undefined) {
      throw new DataStoreNotReadyError(`${this.name} not yet available for node ${node.toString()}`);
    }
    return out;
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
