import DataStore from './data_store';

// Sourced from https://stratigraphy.org/supplementary#data
// NB: Should be kept in sync with oz_tree_build/taxon_mapping_and_popularity/tree_props/geological.py
const GEOLOGICAL_PERIODS = [
    {"period": "Unknown", "epoch": "Unknown", "mya_start": -1e9},
    {"period": "Quaternary", "epoch": "Holocene", "mya_start": 0.0117},
    {"period": "Quaternary", "epoch": "Pleistocene", "mya_start": 2.58},
    {"period": "Neogene", "epoch": "Pliocene", "mya_start": 5.333},
    {"period": "Neogene", "epoch": "Miocene", "mya_start": 23.04},
    {"period": "Paleogene", "epoch": "Oligocene", "mya_start": 33.9},
    {"period": "Paleogene", "epoch": "Eocene", "mya_start": 56},
    {"period": "Paleogene", "epoch": "Paleocene", "mya_start": 66},
    {"period": "Cretaceous", "epoch": "Upper", "mya_start": 100.5},
    {"period": "Cretaceous", "epoch": "Lower", "mya_start": 143.1},
    {"period": "Jurassic", "epoch": "Upper", "mya_start": 161.5},
    {"period": "Jurassic", "epoch": "Middle", "mya_start": 174.7},
    {"period": "Jurassic", "epoch": "Lower", "mya_start": 201.4},
    {"period": "Triassic", "epoch": "Upper", "mya_start": 237},
    {"period": "Triassic", "epoch": "Middle", "mya_start": 246.7},
    {"period": "Triassic", "epoch": "Lower", "mya_start": 251.902},
    {"period": "Permian", "epoch": "Lopingian", "mya_start": 259.51},
    {"period": "Permian", "epoch": "Guadalupian", "mya_start": 274.4},
    {"period": "Permian", "epoch": "Cisuralian", "mya_start": 298.9},
    {"period": "Carboniferous", "epoch": "Pennsylvanian", "mya_start": 323.4},
    {"period": "Carboniferous", "epoch": "Mississippian", "mya_start": 358.86},
    {"period": "Devonian", "epoch": "Upper", "mya_start": 382.31},
    {"period": "Devonian", "epoch": "Middle", "mya_start": 393.47},
    {"period": "Devonian", "epoch": "Lower", "mya_start": 419.62},
    {"period": "Silurian", "epoch": "Pridoli", "mya_start": 422.7},
    {"period": "Silurian", "epoch": "Ludlow", "mya_start": 426.7},
    {"period": "Silurian", "epoch": "Wenlock", "mya_start": 432.9},
    {"period": "Silurian", "epoch": "Llandovery", "mya_start": 443.1},
    {"period": "Ordovician", "epoch": "Upper", "mya_start": 458.2},
    {"period": "Ordovician", "epoch": "Middle", "mya_start": 471.3},
    {"period": "Ordovician", "epoch": "Lower", "mya_start": 486.85},
    {"period": "Cambrian", "epoch": "Furongian", "mya_start": 497},
    {"period": "Cambrian", "epoch": "Miaolingian", "mya_start": 506.5},
    {"period": "Cambrian", "epoch": "Series 2", "mya_start": 521},
    {"period": "Cambrian", "epoch": "Terreneuvian", "mya_start": 538.8},
    {"period": "Proterozoic", "epoch": "Neo-proterozoic", "mya_start": 1000},
    {"period": "Proterozoic", "epoch": "Meso-proterozoic", "mya_start": 1600},
    {"period": "Proterozoic", "epoch": "Paleo-proterozoic", "mya_start": 2500},
    {"period": "Archean", "epoch": "Neo-Archean", "mya_start": 2800},
    {"period": "Archean", "epoch": "Meso-Archean", "mya_start": 3200},
    {"period": "Archean", "epoch": "Paleo-Archean", "mya_start": 3600},
    {"period": "Archean", "epoch": "Eo-Archean", "mya_start": 4031},
    {"period": "Hadean", "epoch": "Hadean", "mya_start": 4567},
]

export default class DataStoreGeological extends DataStore {
  name = "geological";  /** The name that this will be availble from DataStoreApi under */

  // Data indexed by position in ordered_leaves / ordered_nodes
  nodeToId(node) {
    return node.metacode - 1;
  }

  sliceNameFor(node) {
    return node.is_leaf ? "geological_leaves_u8.dat" : "geological_nodes_u8.dat";
  }

  // We read iucn.dat as a Uint8Array()
  dataView(resp) {
    return resp.arrayBuffer().then((ab) => new Uint8Array(ab));
  }

  get(node) {
    const out = super.get(node, null, null);
    if (out === undefined || out === null) return {"period": "Loading", "epoch": "Loading"};
    return GEOLOGICAL_PERIODS[out] || GEOLOGICAL_PERIODS[0];
  }
}
