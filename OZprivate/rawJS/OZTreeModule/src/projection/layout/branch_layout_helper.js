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
    this.get_bezier_shapes(node, shapes);
    if (true /*replace with better test*/) {
      this.draw_hightlight_on_search_route(node, shapes);
    }  
  }

    /**
     * Draw highlights on a branch
     * @param node is the node on which this should be drawn
     * @param shapes is the handle to which new shapes to be drawn should be pushed
     */
  draw_hightlight_on_search_route(node, shapes) {

      // interior node to draw over the top to tidy up ends of lines
      if (node.is_interior_node) {
          this.draw_interior_circle(node, shapes);
      }
      // define an array to contain all the color markings we need
      let markings_list = [];
      
      // how many possible marked areas are there
      let length = config.marked_area_color_map.length;
      for (let i=0; i<length; i++) {
          // area_id for that color
          let area_id = config.marked_area_color_map[i][0];
          // is this marked
          if(node.marked_areas.has(area_id))
          {
              // we need to mark this color
              markings_list.push(config.marked_area_color_map[i][1]);
          }
      }
     
      // now we need to actually mark them
      let num_markings = markings_list.length;
      if (num_markings ==1)
      {
          this.get_highlight_shapes(node, shapes, markings_list[0], 0.7);
      }
      else
      {
          for (let i = 0 ; i < num_markings ; i++)
          {
              this.get_highlight_shapes(node, shapes, markings_list[i], (num_markings-i)/(num_markings+1.0));
          }
      }
    
    /*
    let is_common_ancestor = node.route_to_search1 && node.route_to_search2;
    // is common ancestor is true for any node that's a common ancestor of both the search1 route and hte search2 route.
    if (node.is_interior_node) {
      this.draw_interior_circle(node, shapes);  
    }
      
    if (node.route_to_search) {
      this.get_highlight_shapes(node, shapes, 'search_hit', NORMAL);
    }
    
    // based on whether or not it's a common ancestor we can choose the thickness of the highlights
    if (node.route_to_search1 && is_common_ancestor) {
      this.get_highlight_shapes(node, shapes, 'search_hit1', NORMAL);
    } else if (node.route_to_search1 && !is_common_ancestor) {
      this.get_highlight_shapes(node, shapes, 'search_hit1', NORMAL);
    }
    
    if (node.route_to_search2 && is_common_ancestor) {
      this.get_highlight_shapes(node, shapes, 'search_hit2', THIN); // needs to be thinner if a second hit on a common ancestor branch
    } else if (node.route_to_search2 && !is_common_ancestor) {
      this.get_highlight_shapes(node, shapes, 'search_hit2', NORMAL);
    }
    */
  
  }

  set_bezier_shape(shape, node) {
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
  }

  node_line_width(node) {
    return node.bezr * node.rvar;
  }

  get_bezier_shapes(node, shapes) {
    let bezier_shape = BezierShape.create();
    this.set_bezier_shape(bezier_shape, node);
    bezier_shape.do_stroke = true;
    bezier_shape.stroke.line_width = this.node_line_width(node);
    bezier_shape.height = 0;
    bezier_shape.stroke.color = color_theme.get_color('branch.stroke', node);
    shapes.push(bezier_shape);
  }

  get_highlight_shapes(node, shapes, highlight_type, width_proportion) {
    this.draw_highlight_line(node, shapes, highlight_type, width_proportion);
    // highlight type is now a colour and not just a number that needs to be looked up
    //if (node.rvar < config.projection.node_low_res_thres && node.is_interior_node) {
      //this.draw_arrow(node, shapes, highlight_type, width_proportion); // James removed this to get rid of the arrow
    //}
  }

  draw_highlight_line(node, shapes, highlight_color, width_proportion) {
    let bezier_shape = BezierShape.create();
    this.set_bezier_shape(bezier_shape, node);
    bezier_shape.do_stroke = true;
    bezier_shape.stroke.line_width = node.bezr * node.rvar * width_proportion;
    bezier_shape.height = 1;
    bezier_shape.stroke.color = highlight_color;
    shapes.push(bezier_shape);
  }
    
  draw_interior_circle(node, shapes) {
    let arc_shape = ArcShape.create();
    arc_shape.x = node.xvar + node.rvar * node.arcx;
    arc_shape.y = node.yvar + node.rvar * node.arcy;
    arc_shape.r = node.rvar * node.arcr;
    arc_shape.circle = true;
    arc_shape.height = 1;
    arc_shape.do_fill = true;
    arc_shape.fill.color =  color_theme.get_color('branch.stroke', node);
    shapes.push(arc_shape);
  }

  draw_arrow(node, shapes, highlight_type, narrower) {
    // the positioning of this arrow isn't quite perfect and probably needs to be fixed
    let path_shape = PathShape.create();
    let x = node.xvar + node.rvar * node.arcx;
    let y = node.yvar + node.rvar * node.arcy;
    let r = node.rvar * node.arcr;
    let ctr_arg1 = narrower ? 0.17 : 0.4;
    let ctr_arg2 = narrower ? 0.55 : 0.7;
    let color_name = 'branch.highlight_arrow.fill';
    if (highlight_type) {
      color_name = 'branch.highlight_arrow_' + highlight_type + '.fill';  
    }  
    path_shape.path_length = 4;
    path_shape.height = 1;
    let tempsinpre = Math.sin(node.arca);
    let tempcospre = Math.cos(node.arca);
    let tempsin90pre = Math.sin(node.arca + Math.PI/2.0);
    let tempcos90pre = Math.cos(node.arca + Math.PI/2.0);
    let line_path = MoveToShape.create();
    line_path.x = x + ctr_arg1 * r * tempcospre;
    line_path.y = y + ctr_arg1 * r * tempsinpre;
    path_shape.path[0] = line_path;
    line_path = LineToShape.create();
    line_path.x = x - r * tempcospre + ctr_arg2 * r * tempcos90pre;
    line_path.y = y - r * tempsinpre + ctr_arg2 * r * tempsin90pre;
    path_shape.path[1] = line_path;
    line_path = LineToShape.create();
    line_path.x = x - r * tempcospre - ctr_arg2 * r * tempcos90pre;
    line_path.y = y - r * tempsinpre - ctr_arg2 * r * tempsin90pre;
    path_shape.path[2] = line_path;
    line_path = LineToShape.create();
    line_path.x = x + ctr_arg1 * r * tempcospre;
    line_path.y = y + ctr_arg1 * r * tempsinpre;
    path_shape.path[3] = line_path;
    path_shape.do_fill = true;
    path_shape.fill.color = color_theme.get_color(color_name, node);
    shapes.push(path_shape);
  }
  
}

export default BranchLayoutBase;
