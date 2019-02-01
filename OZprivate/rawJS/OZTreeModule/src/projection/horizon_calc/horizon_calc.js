import bezier_horizon_calc from './bezier_horizon_calc';
import polytomy_horizon_calc from './polytomy_horizon_calc';

/**
 * We may draw the tree in a different way other than bezier curve. Hence it is necessary to make 
 * horizon calculation expandable. This class would select the proper horizon calculation algorithm 
 * based on current selected horizon calculation type.
 */
let horizon_calc_array = [bezier_horizon_calc, polytomy_horizon_calc];
let current_calculator = null;

function set_horizon_calculator(horizon_calc_type) {
  for (let i=0; i<horizon_calc_array.length; i++) {
    if (horizon_calc_type === horizon_calc_array[i].horizon_calc_type) {
      current_calculator = horizon_calc_array[i];
      return;
    }
  }
  throw new Error(horizon_calc_type + " horizon calc type is not defined in projection/horizon_calc/horizon_calc.js");
}

function calc_horizon(node) {
  current_calculator.calc_horizon(node);
}

/**
 * Run current_calculator.recalc_node_horizon for given array of nodes and
 * any parents of these nodes until nothing changes in update.
 */
function update_parent_horizon(nodes) {
  var next_nodes = {}, i;

  if (nodes.length === 0) {
    // Either run out of changing nodes, or got to the root
    return;
  }

  // Recalc horizon for all nodes, collect parents of items that changed
  for (i = 0; i < nodes.length; i++) {
    if (current_calculator.recalc_node_horizon(nodes[i]) && nodes.upnode) {
      // This node changed in re-calc, so do the parent too.
      next_nodes[nodes.upnode.metacode] = nodes.upnode;
    }
  }

  // Recurse over this list
  // NB: This is breadth-first, so any common parents are recursed over
  // (hopefully) only once. This won't catch all cases, but enough to keep
  // peformance high
  update_parent_horizon(Object.values(next_nodes));
}

function update_parent_horizon_inner(node, taint) {
  if (node && node.taint_update_parent_horizon !== taint) {
    // Parent hasn't been touched, so touch it.
    if (current_calculator.recalc_node_horizon(node)) {
      update_parent_horizon(node.upnode, taint);
    }
    node.taint_update_parent_horizon = taint;
  }
}

export {calc_horizon, update_parent_horizon, set_horizon_calculator};