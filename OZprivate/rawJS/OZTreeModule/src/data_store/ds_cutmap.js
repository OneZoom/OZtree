import DataStore from './data_store';

export default class DataStoreCutMap extends DataStore {
  setCutMapType(type) {
    // NB: This will auto-trigger the new slice to be fetched, as the name to look-up will change
    self._sliceName = type === "polytomy" ? "poly_cut_position_map.json" : "cut_position_map.json";
  }

  nodeToId(node) {
    return node.end;
  }

  // Fetch JSON file to populate cut-position map
  sliceNameFor(node) {
    return self._sliceName || 'cut_position_map.json';
  }

  // Our "data array" is a JSON object
  dataView(resp) {
    return resp.json();
  }
}
