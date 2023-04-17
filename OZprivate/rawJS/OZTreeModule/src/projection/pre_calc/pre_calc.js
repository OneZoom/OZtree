import spiral_pre_calc from './spiral_pre_calc';
import natural_pre_calc from './natural_pre_calc';
import fern_pre_calc from './fern_pre_calc';
import balanced_pre_calc from './balanced_pre_calc';
import polytomy_pre_calc from './polytomy_pre_calc';
import {add_hook} from '../../util/index';

let pre_calc_array = [spiral_pre_calc, natural_pre_calc, fern_pre_calc, balanced_pre_calc, polytomy_pre_calc];
let pre_calculator;

function set_pre_calculator(viewtype) {
  for (let i=0; i<pre_calc_array.length; i++) {
    if (viewtype === pre_calc_array[i].viewtype) {
      pre_calculator = pre_calc_array[i];
      pre_calculator.setup();
      return;
    }
  }
  throw new Error(viewtype + " viewtype is not defined in projection/pre_calc/pre_calc.js");
}

function pre_calc(node) {
  pre_calculator.pre_calc(node);
}

export {pre_calc, set_pre_calculator};