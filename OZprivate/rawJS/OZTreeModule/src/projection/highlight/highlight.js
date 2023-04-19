/**
 * OneZoom Tree Highlighting
 *
 * A *highlight string* is of the form: ``(type):[color](@pinpoint)[(@pinpoint)...]``, where
 * (type) is one of
 * * "path": Path between 2 nodes, one descending from the other.
 *   If one pinpoint provided a path from root->pinpoint is drawn,
 *   if two pinpoints a path from 1st to second is drawn.
 * * "fan": All nodes below the first pinpoint are highlighted,
 *   extra pinpoints are exceptions, e.g. "@Mammalia@Glires" Means highlight all Mammals apart from Rodents.
 * (color) is an optional HTML colour spec, if omitted one will be chosen.
 * (@pinpoint) are pinpoints as defined in src/navigation/pinpoint.js
 *
 * Before they can be used, they need to be converted to a *highlight object* with resolve_highlights().
 * A highlight object contains:
 * * "str": The original highlight string, e.g. ``path:@Mammalia``
 * * "type": The type portion of the highlight string, e.g. ``path``
 * * "color": The color from the highlight string, or the assigned color, e.g. ``rgb(0,0,0)``
 * * "pinpoints": The pinpoints from the highlight string, split into an array, e.g. ``["@Mammalia"]``
 * * "ozids": Array of numeric OZids matching each pinpoint, e.g. ``[12345]``
 *
 * @module projection/highlight/highlight
 */
import tree_state from '../../tree_state';
import { resolve_pinpoints } from '../../navigation/pinpoint.js';

const FUTURE = "f";
const ACTIVE = "a";
const PAST = "p";

/**
 * Convert highlight strings / highlight objects into fully populated highlight objects
 *
 * @param highlights Array of highlight objects / highlight strings
 * @param color_picker Function to choose new colours, given an array of existing colours
 * @return Array of highlight objects, with all details filled in
 */
export function resolve_highlights(highlights, color_picker) {
  if (!highlights) return Promise.resolve([]);

  // Break up strings into their components
  highlights.forEach((h, i) => {
    // Swap bare strings with a new object
    if (typeof h === "string") {
      highlights[i] = { str: h };
      h = highlights[i];
    }

    let m = h.str.match(/(?<type>path|fan):(?<color>^@)*(?<pinpoints>.*)/);
    if (!m) throw new Error("Unparsable highlight: '" + h.str + "'");

    h.type = h.type || m.groups.type;
    h.color = h.color || m.groups.color;  // NB: Preserve assigned colours
    h.pinpoints = h.pinpoints || m.groups.pinpoints.split(/(?=@)/);

    if (h.type === 'path' && h.pinpoints.length === 1) {
      // Assume paths with one pinpoint start at the root
      h.pinpoints = ['@_ozid=1', h.pinpoints[0]];
    }
  });

  // Fill in any missing colours
  highlights.forEach((h, i) => {
    h.color = h.color || color_picker(highlights.map((h) => h.color).filter((x) => !!x));
  });

  // Resolve pinpoints without ozids, add back to highlights
  return resolve_pinpoints([].concat.apply([], highlights.map((h) => h.ozids ? [] : h.pinpoints))).then((pinpoints) => {
    // Make lookup table for pinpoint -> ID
    var pp_lookup = {};
    pinpoints.forEach((p) => { pp_lookup[p.pinpoint] = p.ozid; });

    // Fill in highlights that are missing ozids array
    highlights.forEach((h, i) => {
      h.ozids = h.ozids || h.pinpoints.map((pp) => pp_lookup[pp]);
    });

    return highlights;
  });
};

/**
 * Get list of currently applied highlight objects
 */
export function current_highlights() {
  return tree_state.highlights || [];
}

/**
 * Apply new list of highlight objects to a tree
 */
export function highlight_update(root_node, highlights) {
  if (!root_node.is_root) throw new Error("Must update highlights from root");
  tree_state.highlights = highlights || [];

  // Apply highlights to all developed nodes
  return highlight_propogate(root_node);
}

/**
 * Propogate highlights from (node) downwards
 */
export function highlight_propogate(node) {
  // Only do this for developed nodes
  if (!node.has_child) return;

  if (node.is_root) {
    // Initially regard all highlights as starting in the future
    node.highlight_status = new Array(current_highlights().length);
    node.highlight_status.fill(FUTURE);
  } else {
    // Can't propogate if it hasn't been started at root
    // (probably highlight_update() hasn't been called yet)
    if (!node.highlight_status) return;
  }

  // Copy highlight status to children, most common case will be not changing
  node.children.forEach((child_node) => {
    child_node.highlight_status = node.highlight_status.slice();
  });

  current_highlights().forEach((h, i) => {
    // Do nothing for inactive highlights
    if (node.highlight_status[i] == PAST) return;

    if (node.highlight_status[i] == FUTURE) {
      // Highlight hasn't started yet, do nothing
      if (h.ozids[0] !== node.ozid) return;

      // Highlight starts here, ACTIVE for children but not applied to ourselves
      // (so we don't get a tail for our fans)
      node.children.forEach((child_node, child_idx) => {
        child_node.highlight_status[i] = ACTIVE;
      });
      if (node.is_root) {
        // Special case, the root node should have a tail.
        node.highlight_status[i] = ACTIVE;
      }
    }

    // Highlight ACTIVE, should it stay active?
    if (h.type === 'fan') {
      // Don't propogate fans if child is one of the end points
      node.children.forEach((child_node, child_idx) => {
        if (h.ozids.indexOf(child_node.ozid) > 0) child_node.highlight_status[i] = PAST;
      });
    } else if (h.type === 'path') {
      // Propogate paths only when on the way to the end point
      let next_idx = node.child_index_towards(h.ozids[1]);
      node.children.forEach((child_node, child_idx) => {
        if (child_idx !== next_idx) child_node.highlight_status[i] = PAST;
      });
    } else {
      throw new Error("Unknown highlight type '" + h.type + "'");
    }
  });

  // Recurse
  for (let i = 0; i < node.children.length; i++) {
    highlight_propogate(node.children[i]);
  }
}

/**
 * Return active highlight objects for (node)
 */
export function highlights_for(node) {
  var highlights = current_highlights();

  return highlights.filter((x, i) => node.highlight_status[i] === ACTIVE);
}
