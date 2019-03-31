import data_repo from './data_repo';
import tree_state from '../tree_state';
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
    window.xxx = this.root;
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
    if (tree_state.flying) return [];
    let developed_node_arr = [];
    _create_undeveloped_nodes(this.root, developed_node_arr);
    return developed_node_arr;
  }
  
  /**
   * Develop undeveloped parts to connect the current tree to the specified node.
   * @param {integer} to_leaf 1 means the specified node is an interior node. -1 means its a leaf.
   * @param {integer} to_index metacode of the node
   */
  dynamic_loading_by_metacode(to_leaf, to_index) {
    return _dl_codein_fly(to_leaf, to_index, this.root);
  }
}

/**
 * This function dynamic loads the branches from node to the searched index.
 * It terminates when the searched node/leaf is found. Otherwise it continues to search.
 * If node has not developed any descendants and found the searched index in one of its child, develop node's children and continue search in one of its children.
 * @param {integer} to_leaf 1 means the specified node is an interior node. -1 means its a leaf.
 * @param {integer} to_index metacode of the node
 * @param {Midnode} node 
 */
function _dl_codein_fly(to_leaf, to_index, node) {
  let develop_child_index = null;
  let subbranch_depth = config.generation_on_subbranch_during_fly;

  // Are we already there? If so develop and return
  if (to_leaf === 1 && node.is_leaf && node.metacode == to_index) {
    return node;
  } else if (to_leaf === -1 && node.is_interior_node && node.metacode == to_index) {
    node.develop_children(config.generation_at_searched_node);
    return node;
  } else if (node.is_leaf) {
    return "not found";
  }

  // Try and find the next hop towards to_index
  if (to_leaf === 1) {
    //all_children_length is the length of children regardless they are developed or not.
    for (let index=0; index<node.full_children_length; index++) {
      if (node.child_leaf_meta_start[index] <= to_index && node.child_leaf_meta_end[index] >= to_index) {
        develop_child_index = index;
        break;
      }
    }
  } else if (to_leaf !== 1) {
    for (let index=0; index<node.full_children_length; index++) {
      if (node.child_node_meta_start[index] <= to_index && node.child_node_meta_end[index] >= to_index) {
        develop_child_index = index;
        break;
      }
    }
  }

  if (develop_child_index !== null) {
    // Found the next child in the tree, develop everything around it and recurse in
    node.develop_children(subbranch_depth, develop_child_index);
    return _dl_codein_fly(to_leaf, to_index, node.children[develop_child_index]);
  } else {
    throw Error("Couldn't find node " + to_index + " within " + node.metacode);
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