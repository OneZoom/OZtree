import config from '../global_config';
import tree_state from '../tree_state';
import {get_factory} from './factory';
import {add_hook} from '../util/index';
/**
 * Start Garbage collection.
 */
function init() {
  //Each time after canvas refresh, call reset_timer_after_draw_gc.
  add_hook("after_draw", clear_garbage);
}


/**
 * Execute garbage collection. Restart next garbage collection at the end of the function.
 */
function clear_garbage() {
  let factory = get_factory();
  find_unused_node_and_clear(factory.root, 0, 0);  
}


/*
* Destroy all nodes which are above certain distance(detach_level) from the visible main branch(where dvar=true).
*/
function find_unused_node_and_clear(node, last_dvar_height, last_target_height) {
  if (node.has_child) {
    if (node.dvar || node.targeted) {
      last_dvar_height = node.dvar ? 0 : (last_dvar_height+1);
      last_target_height = node.targeted ? 0 : (last_target_height+1);
    } else {
      find_unused_node_and_clear2(node, last_dvar_height, last_target_height);
    }
  }
}

function find_unused_node_and_clear2(node, last_dvar_height, last_target_height) {
  if (last_dvar_height >= config.gc.detach_level && last_target_height >= config.generation_on_subbranch_during_fly) {
    free_space_from_node(node);
  } else {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      find_unused_node_and_clear2(node.children[i], last_dvar_height+1, last_target_height+1);
    }
  }
}

/*
* Destroy all descendants of node and clear its reference to its children.
* node would remain on the tree after calling this function but all its descendants would gone.
* Its descendants would be recovered automatically if node is insight.
*/
function free_space_from_node(node) {
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    free_space_from_node2(node.children[i]);
  }
  node.children = [];
}

/*
* Destroy all descendants of node and destroy node itself
*/
function free_space_from_node2(node) {
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    free_space_from_node2(node.children[i]);
  }
  node.free();
}

/*
* Return the amount of developed descendants of node
*/
function calc_real_richness(node) {
  if (!node) return 0;
  let sum = 1;
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    sum += calc_real_richness(node.children[i]);
  }
  return sum;
}

export {init};