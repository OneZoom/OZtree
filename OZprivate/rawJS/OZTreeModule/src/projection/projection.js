import {pre_calc as _pre_calc, set_pre_calculator} from './pre_calc/pre_calc';
import _re_calc  from  './re_calc';
import _get_shapes from './shape_manager';
import {calc_horizon as _calc_horizon, set_horizon_calculator} from './horizon_calc/horizon_calc';
import data_repo from '../factory/data_repo';
import { highlight_propogate as _highlight_propogate } from './highlight/highlight';

class Projection {
  pre_calc(node) {
    _pre_calc(node);
  }
  calc_horizon(node) {
    _calc_horizon(node);
  }
  highlight_propogate(node) {
    _highlight_propogate(node)
  }
  re_calc(node, xp, yp, ws) {
    _re_calc(node, xp, yp, ws);
  }
  get_shapes(node, shapes) {
    _get_shapes(node, shapes);
  }
}


let projection;
function get_projection() {
  if (!projection) {
    projection = new Projection();
  }
  return projection;
}
export default get_projection;