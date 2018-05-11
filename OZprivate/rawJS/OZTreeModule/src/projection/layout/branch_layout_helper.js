import {color_theme} from '../../themes/color_theme';
import BezierShape from '../shapes/bezier_shape';
import ArcShape from '../shapes/arc_shape';
import PathShape from '../shapes/path_shape';
import LineToShape from '../shapes/line_to_shape';
import MoveToShape from '../shapes/move_to_shape';
import config from '../../global_config';

const THIN = true;
const NORMAL = false;

class BranchLayoutBase {
    
  // this is the main routine that draws the node
  get_shapes(node, shapes) {
    this.get_bezier_shapes(node, shapes, this.get_markings_list(node));
    if (node.is_interior_node) {
      this.draw_interior_circle(node, shapes);
    }
  }

  /**
   * Generate list of highlights for this node
   * @param {Object} node The node in question
   * @return {Array} A list of objects containing:
   *  * strokeStyle: The stroke (i.e. colour) for this line
   *  * widthProportion: The width proportion of the main line width
   *  * dashSize: The size of dash to use, if the highlight is to be dashed
   */
  get_markings_list(node) {
      // define an array to contain all the color markings we need
      let markings_list = [];
      
      // how many possible marked areas are there
      for (let i=0; i<config.marked_area_color_map.length; i++) {
          // area_id for that color
          let area_id = config.marked_area_color_map[i][0];
          // is this marked
          if(node.marked_areas.has(area_id))
          {
              // we need to mark this color
              markings_list.push({strokeStyle: config.marked_area_color_map[i][1]});
          }
      }

      // Annotate markings_list with width proportion
      let num_markings = markings_list.length;
      for (let i=0; i < num_markings; i++) {
          markings_list[i].widthProportion = num_markings === 1 ? 0.7 : (num_markings-i)/(num_markings+1.0);
      }

      return markings_list;
  }

  set_bezier_shape(shape, node, markings_list) {
    shape.sx = node.bezsx * node.rvar + node.xvar;
    shape.sy = node.bezsy * node.rvar + node.yvar;
    shape.c1x = node.bezc1x * node.rvar + node.xvar;
    shape.c1y = node.bezc1y * node.rvar + node.yvar;
    shape.c2x = node.bezc2x * node.rvar + node.xvar;
    shape.c2y = node.bezc2y * node.rvar + node.yvar;
    shape.ex = node.bezex * node.rvar + node.xvar;
    shape.ey = node.bezey * node.rvar + node.yvar;
    shape.stroke.line_cap = 'round';
    shape.height = 1;
    shape.markings_list = markings_list || [];
  }

  node_line_width(node) {
    return node.bezr * node.rvar;
  }

  get_bezier_shapes(node, shapes, markings_list) {
    let bezier_shape = BezierShape.create();
    this.set_bezier_shape(bezier_shape, node, markings_list);
    bezier_shape.do_stroke = true;
    bezier_shape.stroke.line_width = this.node_line_width(node, markings_list);
    bezier_shape.height = 0;
    bezier_shape.stroke.color = color_theme.get_color('branch.stroke', node);
    shapes.push(bezier_shape);
  }
    
  draw_interior_circle(node, shapes) {
    let arc_shape = ArcShape.create();
    arc_shape.x = node.xvar + node.rvar * node.arcx;
    arc_shape.y = node.yvar + node.rvar * node.arcy;
    arc_shape.r = node.rvar * node.arcr;
    arc_shape.circle = true;
    arc_shape.height = -1;
    arc_shape.do_fill = true;
    arc_shape.fill.color =  color_theme.get_color('branch.stroke', node);
    shapes.push(arc_shape);
  }
}

export default BranchLayoutBase;
