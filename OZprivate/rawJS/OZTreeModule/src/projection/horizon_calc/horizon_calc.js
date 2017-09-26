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

function update_parent_horizon(node) {
  if (node.upnode) {
    if (current_calculator.recalc_node_horizon(node.upnode)) {
      update_parent_horizon(node.upnode);
    }
  }
}

export {calc_horizon, update_parent_horizon, set_horizon_calculator};