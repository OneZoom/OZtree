import {get_interior_shapes, get_leaf_shapes, get_signpost_shapes, get_branch_shapes} from './layout/layout_manager';
import config from '../global_config';
import {ArrayPool} from '../util/index';
import {reset_mr} from './move_restriction';
import BezierShape from './shapes/bezier_shape';
import TextShape from './shapes/text_shape';

let visible_nodes = new ArrayPool(1300);
let signpost_nodes = new ArrayPool(100);
/**
 * Get shapes of node and all of its descendants.
 * Sort all shapes by its height to make sure they will be overlapped by the right order.
 */
function get_shapes(node, shapes) {
  reset_mr();
  visible_nodes.reset();
  signpost_nodes.reset();
  get_visible_and_signpost_nodes(node, visible_nodes, signpost_nodes, false);
  let length = visible_nodes.length;
  for (let i=length-1; i>=0; i--) {
    get_shapes_of_node(visible_nodes.get(i), shapes);
    draw_bounding_box(visible_nodes.get(i), shapes);
  }
  length = signpost_nodes.length;
  for (let i=0; i<length; i++) {
    get_signpost_shapes(signpost_nodes.get(i), shapes);
  }
  //Sort shapes in a height ascending order so that lower height shapes would be drawn first.
  //try to draw shapes with same fill color first to avoid context switch.
  shapes.sort(height_comparator);
}

/**
 * Debug helper: Draw all bounding boxes.
 *
 * To enable, set onezoom.config.debug_bounding_box, e.g. in developer console:
 * onezoom.config.debug_bounding_box = 0x01
 * onezoom.config.debug_bounding_box = (node => node.latin_name == 'Thermoproteaceae' ? 0x03 : 0)
 *
 * Value is a bitmask of options, or function returning bitmask:
 *  0x01 - Bounding box text label
 *  0x02 - Draw bounding box for node+parent
 *  0x04 - Outer bounding box including children
 */
function draw_bounding_box(node, shapes) {
  var s, debug = config.debug_bounding_box || 0;

  // If set to a function, evaluate for current node
  if (typeof debug === 'function') debug = debug(node);

  if (debug & 0x04) { // Bounding box including children
    s = BezierShape.create();
    s.sx = s.sy = s.ex = s.ey = null;
    s.path_points.push(['move', node.xvar + node.rvar * node.hxmin, node.yvar + node.rvar * node.hymin]);
    s.path_points.push(['line', node.xvar + node.rvar * node.hxmin, node.yvar + node.rvar * node.hymax]);
    s.path_points.push(['line', node.xvar + node.rvar * node.hxmax, node.yvar + node.rvar * node.hymax]);
    s.path_points.push(['line', node.xvar + node.rvar * node.hxmax, node.yvar + node.rvar * node.hymin]);
    s.path_points.push(['line', node.xvar + node.rvar * node.hxmin, node.yvar + node.rvar * node.hymin]);
    s.do_stroke = true;
    s.stroke.line_width = 1;
    s.height = 0;
    s.stroke.color = 'hsl(' + Math.sin(node.metacode) * 360 + ', 100%, 60%)';
    shapes.push(s);
  }

  if (debug & 0x2) { // Bounding box for node + parent
    s = BezierShape.create();
    s.sx = s.sy = s.ex = s.ey = null;
    s.path_points.push(['move', node.xvar + node.rvar * node.gxmin, node.yvar + node.rvar * node.gymin]);
    s.path_points.push(['line', node.xvar + node.rvar * node.gxmin, node.yvar + node.rvar * node.gymax]);
    s.path_points.push(['line', node.xvar + node.rvar * node.gxmax, node.yvar + node.rvar * node.gymax]);
    s.path_points.push(['line', node.xvar + node.rvar * node.gxmax, node.yvar + node.rvar * node.gymin]);
    s.path_points.push(['line', node.xvar + node.rvar * node.gxmin, node.yvar + node.rvar * node.gymin]);
    s.do_stroke = true;
    s.stroke.line_width = 1;
    s.height = 0;
    s.stroke.color = 'hsl(' + Math.sin(node.metacode) * 360 + ', 100%, 80%)';
    shapes.push(s);
  }

  if (debug & 0x1) { // Bounding box text label
    s = TextShape.create();
    s.text = "" + node.latin_name;
    s.width = (node.xvar + node.rvar * node.gxmax) - (node.xvar + node.rvar * node.gxmin);
    s.height = 5;
    s.x = node.xvar + node.rvar * node.gxmin + (s.width / 2);
    s.y = node.yvar + node.rvar * node.gymin + s.height;
    s.defpt = 10;
    s.line = 2;
    s.do_stroke = true;
    s.stroke = { line_width: 1, color: 'black' };
    s.do_fill = true;
    s.fill = {color: 'hsl(' + Math.sin(node.metacode) * 360 + ', 100%, 80%)'};
    shapes.push(s);
  }

}

function height_comparator(a, b) {
  if (a.height > b.height) {
    return 1;   //draw b first
  } else if (a.height < b.height) {
    return -1;  //draw a first
  } else if (a.uid < b.uid) {
    return -1;  //draw a first
  } else if (a.uid > b.uid) {
    return 1;   //draw b first
  } else {
    return 0;
  }
}

/**
 * If an interior node's children has not been created or not visible, then 
 * we would draw it as fake leaf. Hence call get_leaf_shapes on it.
 */
function get_shapes_of_node(node, shapes) {
  get_branch_shapes(node, shapes);

  if (!node.force_fake) {
    for (let i=0; i<node.children.length; i++) {
      if (node.children[i].gvar) {
        get_interior_shapes(node, shapes);
        return;
      }
    }
  }
  get_leaf_shapes(node, shapes);
}


/**
 * Recurse from (node), populating the arrays (visible_nodes) & (signpost_nodes)
 * with node objects that are visible and should have a signpost respectively.
 */
function get_visible_and_signpost_nodes(node, visible_nodes, signpost_nodes, under_signpost) {
  if (node.gvar) {
    visible_nodes.push(node);
    node.under_signpost = under_signpost;
  }
  if (node.dvar && node.has_child) {
    if (!under_signpost) {
      let is_signpost_node = config.projection.draw_signpost
          && node.draw_signpost_common
          && node.rvar <= config.projection.sign_thres
          && config.projection.threshold_txt*35 < node.rvar * (node.hxmax - node.hxmin);
      if (is_signpost_node) {
        under_signpost = true;
        node.under_signpost = under_signpost;
        signpost_nodes.push(node);
      }  
    }
    
    if (node.children.length > 3 && node.children.length * 0.8 > node.rvar) {
      // This node is massively wide and we're zoomed out, so ignore the children and force a fake leaf
      node.force_fake = true;
      if (!node.gvar) {
        // We're pretending to be our desendants, so remain visible regardless of us being on-screen
        visible_nodes.push(node);
      }
    } else {
      node.force_fake = false;
      for (let i=0; i<node.children.length; i++) {
        get_visible_and_signpost_nodes(node.children[i], visible_nodes, signpost_nodes, under_signpost);
      }
    }
  }
}

export default get_shapes;
