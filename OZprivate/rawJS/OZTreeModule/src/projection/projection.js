import {pre_calc as _pre_calc, set_pre_calculator} from './pre_calc/pre_calc';
import _re_calc  from  './re_calc';
import _get_shapes from './shape_manager';
import {calc_horizon as _calc_horizon, update_parent_horizon as _update_parent_horizon, set_horizon_calculator} from './horizon_calc/horizon_calc';
import data_repo from '../factory/data_repo';
import { marked_area as _marked_area } from './marked_area/marked_area';

class Projection {
  pre_calc(node, from_root) {
    _pre_calc(node, from_root);
  }
  calc_horizon(node) {
    _calc_horizon(node);
  }
  update_parent_horizon(nodes) {
    _update_parent_horizon(nodes);
  }
  marked_area(node, area_map) {
    _marked_area(node, area_map)
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