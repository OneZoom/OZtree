import DataStore from './data_store';

export default class DataStoreSlidingWindow extends DataStore {
  name = "sliding_window";  /** The name that this will be availble from DataStoreApi under */

  constructor(dataStoreApi) {
    super(dataStoreApi);

    if (!this.isLittleEndian()) {
      throw new Error("Onezoom doesn't support big-endian CPUs");
    }
  }

  // Data indexed by position in ordered_leaves / ordered_nodes
  nodeToId(node) {
    return node.metacode - 1;
  }

  sliceNameFor(node) {
    return node.is_leaf ? "sliding_window_leaves_f16.dat" : "sliding_window_nodes_f16.dat";
  }

  // We read iucn.dat as a Float16Array() (CPU-endianness)
  dataView(resp) {
    return resp.arrayBuffer().then((ab) => new Float16Array(ab));
  }

  get(node) {
    return super.get(node, 0, 0);
  }
}
