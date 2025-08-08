import DataStore from './data_store';

export default class DataStoreIUCN extends DataStore {
  name = "iucn";  /** The name that this will be availble from DataStoreApi under */

  constructor() {
    super();

    if (!this.isLittleEndian()) {
      throw new Error("Onezoom doesn't support big-endian CPUs");
    }
  }

  // IUCN data indexed by ott
  nodeToId(node) {
    return node.ott;
  }

  // Only one array for all IUCN data
  sliceNameFor(node) {
    // TODO: We could choose le & be here, but no point.
    // NB: There is no data for nodes in IUCN, so it has no slice
    return node.is_leaf ? "iucn_le.dat" : null;
  }

  // We read iucn.dat as a Uint16Array() (CPU-endianness)
  dataView(resp) {
    return resp.arrayBuffer().then((ab) => new Uint16Array(ab));
  }
}
