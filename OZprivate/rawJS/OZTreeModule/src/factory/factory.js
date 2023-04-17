import data_repo from './data_repo';

let Midnode;
function set_factory_midnode(val) {
  Midnode = val;
}
/**
 * Factory builds the tree.
 */
class Factory {
  constructor() {
  }
  
  /**
   * Builds the initial tree
   */
  build_tree() {
    this.root = Midnode.create();
    this.root.init(0, data_repo.raw_data.length-1, 1, 1, null, 20);
  }
  
  get_root() {
    return this.root;
  }
  
  /**
   * Develop undeveloped branches in the current visible viewport.
   * @return {Midnode} Return the first (i.e. highest) node which existed before this function call and their descendants are created by this function call.
   */
  dynamic_loading_by_visibility() {
    let developed_node_count = [0];
    return _create_undeveloped_nodes(this.root, developed_node_count);
  }
  
  /**
   * Develop undeveloped parts to connect the current tree to the specified node.
   * @param {integer} OZid OneZoom id (metacode), negative value means leaf, positive means node
   */
  dynamic_loading_by_metacode(OZid) {
    let node = this.root;
    OZid = parseInt(OZid);

    while (true) {
      // Are we already there? If so develop and return
      if (node.ozid === OZid) {
        return node;
      }

      // Find the next child then try again
      node = next_hop(OZid, node);
    }
  }

  dynamic_load_to_common_ancestor(OZids) {
    let node = this.root;
    let next_node, first_next_node;
    if (OZids.length === 0) throw new Error("Cannot find common ancestor of nothing")
    OZids = Array.from(new Set(OZids))  // Remove duplicates by converting to Set & back

    while (true) {
      for (let i = 0; i < OZids.length; i++) {
        // If we're already at our end node, stop (e.g. Mammals<->Human)
        next_node = OZids[i] !== node.ozid ? next_hop(OZids[i], node) : node;
        if (i === 0) {
          // Save the first one to compare to
          first_next_node = next_node;
          if (OZids.length === 1 && OZids[i] === node.ozid) {
            // Only given one unique node, once we find it return it.
            return node;
          }
        } else if (next_node.ozid !== first_next_node.ozid) {
          // One of the next nodes is different, so node is the common ancestor
          return node;
        }
      }
      node = first_next_node;
    }
  }
}

/**
 * Dynamic load all children of (node), return the child which is the next hop towards (OZid)
 *
 * @param {integer} OZid OneZoom id (metacode) to find, negative value means leaf, positive means node
 * @param {Midnode} node to start at (read: factory.root)
 */
function next_hop(OZid, node) {
  let develop_child_index = node.child_index_towards(OZid);

  if (develop_child_index !== null) {
    // Found the next child in the tree, develop all immediate children & recurse in
    node.develop_children(1);
    return(node.children[develop_child_index]);
  } else {
    throw Error("Couldn't find OZid " + OZid + " within " + node.metacode);
  }
}

/**
 * Starting from node, search its descendants to find nodes which are visible and not fully developed. Develop descendants of those nodes and 
 * keep track of the upmost developed node
 * @param {Midnode} node
 * @param {Array} developed_nodes_count Counter stop process after 1000 nods
 * @return {Midnode} The upmost node below which development is going on
 */
function _create_undeveloped_nodes(node, developed_nodes_count) {
    if (developed_nodes_count[0].length > 1000) {
        // Already got enough nodes to be getting on with, any more is likely
        // to impact render speed
        return null;
    }
    if (node.gvar && node.is_interior_node && !node.has_child) {
        // There's stuff below this node to develop, so do that and return this node
        node.develop_children(2);
        developed_nodes_count[0]++;
        return node;
    }
    if (node.dvar) {
        // Nothing to develop, but maybe the children have something?
        let rv = null;
        for (let i=0; i<node.children.length; i++) {
            let n = _create_undeveloped_nodes(node.children[i], developed_nodes_count);
            // If we find one child to develop, return that
            // If we find more than one, return ourselves
            if (n) rv = !rv ? n : node;
        }
        return rv;
    }
    return null;
}

let factory;
function get_factory() {
  if (!factory) {
    factory = new Factory();
  }
  return factory;
}
export {get_factory, set_factory_midnode};