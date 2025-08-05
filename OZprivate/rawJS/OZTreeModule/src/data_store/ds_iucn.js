import DataStore from './data_store';

export default class DataStoreIUCN extends DataStore {
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
    return "iucn_le.dat";
  }

  // We read iucn.dat as a Uint16Array() (CPU-endianness)
  dataView(resp) {
    return resp.arrayBuffer().then((ab) => new Uint16Array(ab));
  }
}
