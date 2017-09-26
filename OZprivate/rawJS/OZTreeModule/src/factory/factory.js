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
  let range = null; //Debug only variable.
  let subbranch_depth = config.generation_on_subbranch_during_fly;
  if (to_leaf === 1 && node.is_leaf && node.metacode == to_index) {
    return node;
  } else if (to_leaf === -1 && node.is_interior_node && node.metacode == to_index) {
    _develop_branch_off_mainbranch(node, config.generation_at_searched_node);
    return node;
  } else if (node.is_leaf) {
    return "not found";
  } else if (to_leaf === 1) {
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
  _develop_branch(develop_child_index, node, subbranch_depth);
  return _dl_codein_fly(to_leaf, to_index, node.children[develop_child_index]);
}

/**
 * Develop next generation of the node. If the child is on main branch, then do not develop further. Otherwise, develop 'subbranch_depth' length of generations on that child.
 * @param {boolean} index_of_child_on_main_branch tells which child is on main branch
 * @param {Midnode} node 
 * @param {integer} subbranch_depth how many generations to develop on subbranch.
 */
function _develop_branch(index_of_child_on_main_branch, node, subbranch_depth) {
  if (node.is_leaf) return;
  if (!node.has_child) {
    let child_branch_depth = new Array(node.full_children_length).fill(subbranch_depth);
    child_branch_depth[index_of_child_on_main_branch] = 0;
    node.develop_children(child_branch_depth);
  } else {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      if (i !== index_of_child_on_main_branch) {
        _develop_branch_off_mainbranch(node.children[i], subbranch_depth-1);
      }
    }
  }
}

/**
 * Develop at least 'depth' generations from node.
 * @param {Midnode} node
 * @param {integer} depth
 */
function _develop_branch_off_mainbranch(node, depth) {
  if (node.is_leaf) return;
  if (depth > 0 && node.has_child) {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      _develop_branch_off_mainbranch(node.children[i], depth-1);  
    }
  } else if (depth > 0 && node.is_interior_node) {
    node.develop_children(depth);
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