import data_repo from './data_repo';
import config from '../global_config';

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
   * @return {Array} This returns an array of nodes which are interior nodes and which existed before this function call and their descendants are created by this function call.
   */
  dynamic_loading() {
    let developed_node_arr = [];
    _create_undeveloped_nodes(this.root, developed_node_arr);
    return developed_node_arr;
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
        if (node.is_interior_node) node.develop_children(config.generation_at_searched_node);
        return node;
      }

      // Find the next child then try again
      node = next_hop(OZid, node, config.generation_on_subbranch_during_fly);
    }
  }

  dynamic_load_to_common_ancestor(OZids) {
    let node = this.root;
    let next_node, first_next_node;
    if (OZids.length === 0) throw new Error("Cannot find common ancestor of nothing")

    while (true) {
      if (OZids.filter((OZid) => node.ozid !== OZid).length === 0) {
        // All OZids match the current node. i.e. got handed a set of identical OZids (or just one)
        if (node.is_interior_node) node.develop_children(config.generation_at_searched_node);
        return node;
      }

      for (let i = 0; i < OZids.length; i++) {
        next_node = next_hop(OZids[i], node, config.generation_on_subbranch_during_fly);
        if (i === 0) {
          // Save the first one to compare to
          first_next_node = next_node;
        } else if (next_node.ozid !== first_next_node.ozid) {
          // One of the next nodes is different, so node is the common ancestor
          if (node.is_interior_node) node.develop_children(config.generation_at_searched_node);
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
function next_hop(OZid, node, subbranch_depth) {
  let develop_child_index = null;

  // Try and find the next hop towards OZid
  if (node.is_leaf) {
    // No point trying to find children of a leaf node
  } else if (OZid < 0) {
    //all_children_length is the length of children regardless they are developed or not.
    for (let index=0; index<node.full_children_length; index++) {
      if (node.child_leaf_meta_start[index] <= -OZid && node.child_leaf_meta_end[index] >= -OZid) {
        develop_child_index = index;
        break;
      }
    }
  } else {
    for (let index=0; index<node.full_children_length; index++) {
      if (node.child_node_meta_start[index] <= OZid && node.child_node_meta_end[index] >= OZid) {
        develop_child_index = index;
        break;
      }
    }
  }

  if (develop_child_index !== null) {
    // Found the next child in the tree, develop everything around it and recurse in
    node.develop_children(subbranch_depth, develop_child_index);
    return(node.children[develop_child_index]);
  } else {
    throw Error("Couldn't find OZid " + OZid + " within " + node.metacode);
  }
}

/**
 * Starting from node, search its descendants to find nodes which are visible and not fully developed. Develop descendants of those nodes and 
 * push them in developed_nodes_arr array.
 * @param {Midnode} node
 * @param {Array} developed_nodes_arr
 */
function _create_undeveloped_nodes(node, developed_nodes_arr) {
    let node_developed = false;

    if (developed_nodes_arr.length > 1000) {
        // Already got enough nodes to be getting on with, any more is likely
        // to impact render speed
        return;
    }
    if (node.gvar && node.is_interior_node && !node.has_child) {
        node.develop_children(2);
        node_developed = true;
        developed_nodes_arr.push(node);
    }
    if (!node_developed && node.dvar) {
        let length = node.children.length;
        for (let i=0; i<length; i++) {
            _create_undeveloped_nodes(node.children[i], developed_nodes_arr);
        }
    }
}

let factory;
function get_factory() {
  if (!factory) {
    factory = new Factory();
  }
  return factory;
}
export {get_factory, set_factory_midnode};