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
* (last_dvar_height) / (last_target_height) are (node)'s own distance from the closest
* dvar / targeted node at or above it, i.e. 0 if (node) is dvar / targeted itself.
*/
function find_unused_node_and_clear(node, last_dvar_height, last_target_height) {
  if (!node.has_child) return;

  if (!node.dvar && !node.targeted) {
    // Out of reach of both the visible branch and the flight path. Both propagate up
    // towards the root---re_calc() ORs dvar from a node's children, target_by_code()
    // marks the whole root-to-target path---so we don't have to look below for more.
    // (re_calc() can leave a stale dvar on a subtree it didn't visit this frame, but
    // that subtree is offscreen, so collecting it is what we want anyway)
    return find_unused_node_and_clear2(node, last_dvar_height, last_target_height);
  }

  // Still on the visible branch / flight path, so nothing to collect here. Look below
  // for nodes that aren't, restarting the count for whichever of the 2 a child renews
  for (let i=0; i<node.children.length; i++) {
    find_unused_node_and_clear(
      node.children[i],
      node.children[i].dvar ? 0 : (last_dvar_height+1),
      node.children[i].targeted ? 0 : (last_target_height+1),
    );
  }
}

function find_unused_node_and_clear2(node, last_dvar_height, last_target_height) {
  if (last_dvar_height >= config.gc.detach_level && last_target_height >= config.generation_on_subbranch_during_fly) {
    // NB: We can't undevelop a single node, as there's no convention for a node with half-developed children
    //     Instead, undevelop below this node
    node.children = [];
  } else {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      find_unused_node_and_clear2(node.children[i], last_dvar_height+1, last_target_height+1);
    }
  }
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