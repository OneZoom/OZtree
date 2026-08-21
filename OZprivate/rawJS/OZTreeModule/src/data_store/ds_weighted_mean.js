import DataStore from './data_store';

export default class DataStoreWeightedMean extends DataStore {
  name = "weighted_mean";  /** The name that this will be availble from DataStoreApi under */

  static slice_names = {
    leaf: "weighted_mean_ratio_leaves_f16.dat",
    node: "weighted_mean_ratio_nodes_f16.dat",
  };

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
    return DataStoreWeightedMean.slice_names[node.is_leaf ? 'leaf' : 'node'];
  }

  // We read iucn.dat as a Float16Array() (CPU-endianness)
  dataView(resp) {
    return resp.arrayBuffer().then((ab) => new Float16Array(ab));
  }

  get(node) {
    const out = super.get(node, 0, 0);

    if (out === undefined) {
      // Whoever is asking is laying out a tree, and won't get far without both halves of
      // this: a node's 2 children can be one of each kind. So queue up the other one now
      // rather than have them lay out as far as the first child of the other kind and stop
      // all over again (see projection/pre_calc/spiral_pre_calc's DataStoreNotReadyError)
      Object.values(DataStoreWeightedMean.slice_names).forEach((sliceName) => {
        if (!this._slices[sliceName]) this.dataStoreApi.notify(sliceName, this);
      });
    }
    return out;
  }
}
