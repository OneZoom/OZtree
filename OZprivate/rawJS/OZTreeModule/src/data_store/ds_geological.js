import { DataStoreNotReadyError } from '../errors';
import DataStore from './data_store';

// Sourced from oz_tree_build/tree_build/step_treeprop.py
export const GEOLOGICAL_PERIODS = [
    {"eon": "Unknown","era": "Unknown","period": "Unknown","epoch": "Unknown","short_text": "Unknown","long_text": "Unknown","color": "#999999","mya_start": -1e9,"number": 0},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Quaternary","epoch": "Anthropocene","short_text": "Anthropocene","long_text": "Anthropocene mass extinction event","color": "#1A1A1A","mya_start": 0.000246,"number": 1},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Quaternary","epoch": "Holocene","short_text": "Holocene Epoch","long_text": "Holocene Epoch, Quaternary Period","color": "#74746C","mya_start": 0.0117,"number": 2},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Quaternary","epoch": "Pleistocene","short_text": "Pleistocene Epoch","long_text": "Pleistocene Epoch, Quaternary Period","color": "#818179","mya_start": 2.58,"number": 3},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Neogene","epoch": "Pliocene","short_text": "Neogene Period","long_text": "Pliocene Epoch, Neogene Period","color": "#9B7B4D","mya_start": 5.333,"number": 4},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Neogene","epoch": "Miocene","short_text": "Neogene Period","long_text": "Miocene Epoch, Neogene Period","color": "#A98555","mya_start": 23.04,"number": 5},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Paleogene","epoch": "Oligocene","short_text": "Paleogene Period","long_text": "Oligocene Epoch, Paleogene Period","color": "#826333","mya_start": 33.9,"number": 6},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Paleogene","epoch": "Eocene","short_text": "Paleogene Period","long_text": "Eocene Epoch, Paleogene Period","color": "#8C6C3D","mya_start": 56,"number": 7},
    {"eon": "Phanerozoic","era": "Cenozoic","period": "Paleogene","epoch": "Paleocene","short_text": "Paleogene Period","long_text": "Paleocene Epoch, Paleogene Period","color": "#967447","mya_start": 66,"number": 8},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Cretaceous","epoch": "Upper","short_text": "Cretaceous–Paleogene extinction","long_text": "Cretaceous–Paleogene extinction","color": "#1A1A1A","mya_start": 65.9999,"number": 9},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Cretaceous","epoch": "Upper","short_text": "Cretaceous Period","long_text": "(Upper) Cretaceous Period","color": "#657347","mya_start": 100.5,"number": 10},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Cretaceous","epoch": "Lower","short_text": "Cretaceous Period","long_text": "(Lower) Cretaceous Period","color": "#6C7A4D","mya_start": 143.1,"number": 11},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Jurassic","epoch": "Upper","short_text": "Jurassic Period","long_text": "(Upper) Jurassic Period","color": "#385536","mya_start": 161.5,"number": 12},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Jurassic","epoch": "Middle","short_text": "Jurassic Period","long_text": "(Middle) Jurassic Period","color": "#3E5B3A","mya_start": 174.7,"number": 13},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Jurassic","epoch": "Lower","short_text": "Jurassic Period","long_text": "(Lower) Jurassic Period","color": "#45613F","mya_start": 201.4,"number": 14},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Triassic","epoch": "Upper","short_text": "Triassic–Jurassic extinction event","long_text": "Triassic–Jurassic extinction event","color": "#1A1A1A","mya_start": 201.3,"number": 15},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Triassic","epoch": "Upper","short_text": "Triassic Period","long_text": "(Upper) Triassic Period","color": "#704329","mya_start": 237,"number": 16},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Triassic","epoch": "Middle","short_text": "Triassic Period","long_text": "(Middle) Triassic Period","color": "#7A4A2B","mya_start": 246.7,"number": 17},
    {"eon": "Phanerozoic","era": "Mesozoic","period": "Triassic","epoch": "Lower","short_text": "Triassic Period","long_text": "(Lower) Triassic Period","color": "#7A4A2B","mya_start": 251.902,"number": 18},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Permian","epoch": "Lopingian","short_text": "Permian–Triassic extinction event","long_text": "Permian–Triassic extinction event \"Great dying\"","color": "#1A1A1A","mya_start": 252,"number": 19},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Permian","epoch": "Lopingian","short_text": "Permian Period","long_text": "Lopingian Epoch, Permian Period","color": "#62572F","mya_start": 259.51,"number": 20},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Permian","epoch": "Guadalupian","short_text": "Permian Period","long_text": "Guadalupian Epoch, Permian Period","color": "#6A5D35","mya_start": 274.4,"number": 21},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Permian","epoch": "Cisuralian","short_text": "Permian Period","long_text": "Cisuralian Epoch, Permian Period","color": "#71643A","mya_start": 298.9,"number": 22},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Carboniferous","epoch": "Pennsylvanian","short_text": "Carboniferous Period","long_text": "Pennsylvanian Epoch, Carboniferous Period","color": "#294A2B","mya_start": 323.4,"number": 23},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Carboniferous","epoch": "Mississippian","short_text": "Carboniferous Period","long_text": "Mississippian Epoch, Carboniferous Period","color": "#2F4F2F","mya_start": 358.86,"number": 24},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Devonian","epoch": "Upper","short_text": "Late Devonian mass extinction","long_text": "Late Devonian mass extinction","color": "#1A1A1A","mya_start": 372,"number": 25},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Devonian","epoch": "Upper","short_text": "Devonian Period","long_text": "(Upper Epoch, Devonian Period","color": "#62632B","mya_start": 382.31,"number": 26},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Devonian","epoch": "Middle","short_text": "Devonian Period","long_text": "(Middle) Devonian Period","color": "#6B6B2F","mya_start": 393.47,"number": 27},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Devonian","epoch": "Lower","short_text": "Devonian Period","long_text": "(Lower) Devonian Period","color": "#727333","mya_start": 419.62,"number": 28},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Silurian","epoch": "Pridoli","short_text": "Silurian Period","long_text": "Pridoli Epoch, Silurian Period","color": "#536534","mya_start": 422.7,"number": 29},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Silurian","epoch": "Ludlow","short_text": "Silurian Period","long_text": "Ludlow Epoch, Silurian Period","color": "#5A6A3A","mya_start": 426.7,"number": 30},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Silurian","epoch": "Wenlock","short_text": "Silurian Period","long_text": "Wenlock Epoch, Silurian Period","color": "#60713D","mya_start": 432.9,"number": 31},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Silurian","epoch": "Llandovery","short_text": "Silurian Period","long_text": "Llandovery Epoch, Silurian Period","color": "#566F3A","mya_start": 443.1,"number": 32},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Ordovician","epoch": "Upper","short_text": "Late Ordovician mass extinction","long_text": "Late Ordovician mass extinction","color": "#1A1A1A","mya_start": 445,"number": 33},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Ordovician","epoch": "Upper","short_text": "Ordovician Period","long_text": "(Upper) Ordovician Period","color": "#426846","mya_start": 458.2,"number": 34},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Ordovician","epoch": "Middle","short_text": "Ordovician Period","long_text": "(Middle) Ordovician Period","color": "#486B4A","mya_start": 471.3,"number": 35},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Ordovician","epoch": "Lower","short_text": "Ordovician Period","long_text": "(Lower) Ordovician Period","color": "#4E704C","mya_start": 486.85,"number": 36},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Cambrian","epoch": "Furongian","short_text": "Cambrian Period","long_text": "Furongian Epoch, Cambrian Period","color": "#28594D","mya_start": 497,"number": 37},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Cambrian","epoch": "Miaolingian","short_text": "Cambrian Period","long_text": "Miaolingian Epoch, Cambrian Period","color": "#2E5D50","mya_start": 506.5,"number": 38},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Cambrian","epoch": "Series 2","short_text": "Cambrian Period","long_text": "Series 2 Epoch, Cambrian Period","color": "#336353","mya_start": 521,"number": 39},
    {"eon": "Phanerozoic","era": "Paleozoic","period": "Cambrian","epoch": "Terreneuvian","short_text": "Cambrian Period","long_text": "Terreneuvian Epoch, Cambrian Period","color": "#2A6255","mya_start": 538.8,"number": 40},
    {"eon": "Proterozoic","era": "Neo-proterozoic","period": "Ediacaran","epoch": "-","short_text": "Neo-proterozoic Era","long_text": "Ediacaran Period, Neo-proterozoic Era","color": "#35464F","mya_start": 635,"number": 41},
    {"eon": "Proterozoic","era": "Neo-proterozoic","period": "Cryogenian","epoch": "-","short_text": "Neo-proterozoic Era","long_text": "Cryogenian Period, Neo-proterozoic Era","color": "#3B4A52","mya_start": 720,"number": 42},
    {"eon": "Proterozoic","era": "Neo-proterozoic","period": "Tonian","epoch": "-","short_text": "Neo-proterozoic Era","long_text": "Tonian Period, Neo-proterozoic Era","color": "#40505A","mya_start": 1000,"number": 43},
    {"eon": "Proterozoic","era": "Meso-proterozoic","period": "Stenian","epoch": "-","short_text": "Meso-proterozoic Era","long_text": "Stenian Period, Meso-proterozoic Era","color": "#3A4D58","mya_start": 1200,"number": 44},
    {"eon": "Proterozoic","era": "Meso-proterozoic","period": "Ectasian","epoch": "-","short_text": "Meso-proterozoic Era","long_text": "Ectasian Period, Meso-proterozoic Era","color": "#45525A","mya_start": 1400,"number": 45},
    {"eon": "Proterozoic","era": "Meso-proterozoic","period": "Calymmian","epoch": "-","short_text": "Meso-proterozoic Era","long_text": "Calymmian Period, Meso-proterozoic Era","color": "#394953","mya_start": 1600,"number": 46},
    {"eon": "Proterozoic","era": "Paleo-proterozoic","period": "Statherian","epoch": "-","short_text": "Paleo-proterozoic Era","long_text": "Statherian Period, Paleo-proterozoic Era","color": "#46535A","mya_start": 1800,"number": 47},
    {"eon": "Proterozoic","era": "Paleo-proterozoic","period": "Orosirian","epoch": "-","short_text": "Paleo-proterozoic Era","long_text": "Orosirian Period, Paleo-proterozoic Era","color": "#33444D","mya_start": 2050,"number": 48},
    {"eon": "Proterozoic","era": "Paleo-proterozoic","period": "Rhyacian","epoch": "-","short_text": "Paleo-proterozoic Era","long_text": "Rhyacian Period, Paleo-proterozoic Era","color": "#3E4B55","mya_start": 2300,"number": 49},
    {"eon": "Proterozoic","era": "Paleo-proterozoic","period": "Siderian","epoch": "-","short_text": "Paleo-proterozoic Era","long_text": "Siderian Period, Paleo-proterozoic Era","color": "#2F414A","mya_start": 2500,"number": 50},
    {"eon": "Archean","era": "Neo-Archean","period": "-","epoch": "-","short_text": "Neo-Archean Era","long_text": "Neo-Archean Era","color": "#302D2A","mya_start": 2800,"number": 51},
    {"eon": "Archean","era": "Meso-Archean","period": "-","epoch": "-","short_text": "Meso-Archean Era","long_text": "Meso-Archean Era","color": "#35312D","mya_start": 3200,"number": 52},
    {"eon": "Archean","era": "Paleo-Archean","period": "-","epoch": "-","short_text": "Paleo-Archean Era","long_text": "Paleo-Archean Era","color": "#2B2927","mya_start": 3600,"number": 53},
    {"eon": "Archean","era": "Eo-Archean","period": "-","epoch": "-","short_text": "Eo-Archean Era","long_text": "Eo-Archean Era","color": "#272624","mya_start": 4031,"number": 54},
    {"eon": "Hadean","era": "-","period": "-","epoch": "-","short_text": "Hadean Eon","long_text": "Hadean Eon","color": "#1A1A1A","mya_start": 4567,"number": 55},
];

/** Memoised color_range() arrays, keyed by (min << 8) | max */
const COLOR_RANGE_CACHE = new Map();

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

  /**
   * Colors of geological periods to represent on the node's branch
   *
   * Return DataStoreNotReadyError() if data hasn't been fetched from server.
   */
  branch_periods_colors(node) {
    if (!node.upnode) {
      const val_node = super.get_or_fail(node);
      return [GEOLOGICAL_PERIODS[val_node].color];
    }

    const val_node = super.get(node);
    const val_up = super.get(node.upnode);
    if (val_up === undefined || val_node === undefined) {
      throw new DataStoreNotReadyError(`${this.name} not yet available for node ${node.toString()}..${node.upnode.toString()}`);
    }

    // We get called for every node on every frame, but there are only a handful of distinct
    // (val_a, val_b) pairs, so memoise the colours. NB: Both values are bytes, pack into one key
    const key = (val_up << 8) | val_node;

    let out = COLOR_RANGE_CACHE.get(key);
    if (out === undefined) {
      out = GEOLOGICAL_PERIODS.slice((key & 0xFF), (key >> 8) + 1).map((p) => p.color).reverse();
      COLOR_RANGE_CACHE.set(key, out);
    }
    return out;
  }

  /**
   * Number of geological periods the node's branch passes through.
   * Should be equivalent to branch_periods_colors(node).length
   *
   * Return DataStoreNotReadyError() if data hasn't been fetched from server.
   */
  branch_periods_count(node) {
    if (!node.upnode) {
      return 1;
    }

    const val_node = super.get(node);
    const val_up = super.get(node.upnode);
    if (val_up === undefined || val_node === undefined) {
      throw new DataStoreNotReadyError(`${this.name} not yet available for node ${node.toString()}..${node.upnode.toString()}`);
    }

    return val_up - val_node + 1;
  }
}
