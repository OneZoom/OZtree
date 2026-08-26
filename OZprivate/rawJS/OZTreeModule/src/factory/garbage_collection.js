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
  // ...and once a flight has landed, since we skip collecting during one (see below)
  add_hook("flying_finish", clear_garbage);
}


/**
 * Execute garbage collection. Restart next garbage collection at the end of the function.
 */
function clear_garbage() {
  // Don't collect mid-flight. A flight develops every branch it will need up-front, in
  // develop_branch_to_and_target(), but only targets one leg of the flight at a time---so
  // whatever the later legs need looks like garbage while an earlier leg is in the air, and
  // gets destroyed. The next leg then has nothing to target, and position_helper's
  // get_xyr_target() flies to wherever the previous leg was aiming instead.
  // Nothing is developed during a flight either (see renderer:reanchor_and_dynamic_load_tree),
  // so there is nothing here for us to keep pace with until it lands.
  if (tree_state.flying) return;

  let factory = get_factory();
  // flying_finish can fire before there is a tree to collect, e.g. cancel_flight() on resize
  if (!factory.root) return;
  find_unused_node_and_clear(factory.root, 0, 0);
}


/*
* Destroy all nodes which are above certain distance(detach_level) from the visible main branch(where dvar=true).
* (last_dvar_height) / (last_target_height) are (node)'s own distance from the closest
* dvar / targeted node at or above it, i.e. 0 if (node) is dvar / targeted itself.
*/
function find_unused_node_and_clear(node, last_dvar_height, last_target_height) {
  if (!node.has_child) return;

  if (!node.dvar && !node.targeted && !node.graphref) {
    // Out of reach of the visible branch, the flight path, and the anchor path. All 3
    // propagate up towards the root---re_calc() ORs dvar from a node's children,
    // target_by_code() marks the whole root-to-target path, and position_helper's
    // reanchor() marks root-to-anchor---so we don't have to look below for more.
    // (re_calc() can leave a stale dvar on a subtree it didn't visit this frame, but
    // that subtree is offscreen, so collecting it is what we want anyway)
    //
    // The anchor is the one node we can't do without: tree_state's xp/yp/ws are its
    // position, and re_calc() works everything else out from there. Collect it and the
    // deepest graphref node left standing inherits those co-ordinates instead, which
    // drops the view somewhere else in the tree entirely.
    //
    // Nor is it safe to assume the anchor is one of the nodes we can see: the renderer
    // doesn't reanchor mid-flight (see renderer:reanchor_and_dynamic_load_tree) and a
    // flight only does it itself on the steps that have to (position_helper's
    // more_flying_needed), so on landing we may still be anchored to a branch we set off
    // from and have long since left the screen.
    return find_unused_node_and_clear2(node, last_dvar_height, last_target_height);
  }

  // Still on the visible branch / flight path / anchor path, so nothing to collect here.
  // Look below for nodes that aren't, restarting the count
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