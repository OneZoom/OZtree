import {color_theme} from '../../themes/color_theme';
import BezierShape from '../shapes/bezier_shape';
import ArcShape from '../shapes/arc_shape';
import PathShape from '../shapes/path_shape';
import LineToShape from '../shapes/line_to_shape';
import MoveToShape from '../shapes/move_to_shape';
import config from '../../global_config';
import { highlights_for } from '../highlight/highlight.js';

const THIN = true;
const NORMAL = false;

class BranchLayoutBase {
    
  // this is the main routine that draws the node
  get_shapes(node, shapes) {
    this.get_bezier_shapes(node, shapes, this.get_markings_list(node));
    if (node.is_interior_node && (! node.has_child)) {
      // draw this only if we're on the end of an undeveloped branch
      // hence we'd be an interior branch with no children (yet) as they are not developed
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
      return highlights_for(node).map((m, i, ar) => ({
          strokeStyle: m.color,
          widthProportion: ar.length === 1 ? 0.7 : (ar.length-i)/(ar.length+1.0),
      }));
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
    
  /**
   * Draw circle to cover node endings, hiding any gap between branch shapes
   */
  draw_interior_circle(node, shapes) {
        let arc_shape = ArcShape.create();
        arc_shape.x = node.xvar + node.rvar * node.arcx;
        arc_shape.y = node.yvar + node.rvar * node.arcy;
        arc_shape.r = node.rvar * node.arcr;
        arc_shape.circle = true;
        arc_shape.height = 2;
        arc_shape.order = "fill_first";
        arc_shape.do_stroke = true;
        arc_shape.do_fill = true;
        arc_shape.stroke.line_width = node.arcr * config.projection.partl2 * node.rvar;
        arc_shape.fill.color =  color_theme.get_color('interior.undeveloped.fill', node);
        arc_shape.stroke.color = color_theme.get_color('interior.undeveloped.stroke', node);
        shapes.push(arc_shape);
        
    }
    
    
}

export default BranchLayoutBase;
