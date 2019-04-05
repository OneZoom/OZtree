import config from '../../../global_config';
import SignpostLayoutBase from '../signpost_layout_helper';
import tree_settings from '../../../tree_settings';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';


/* Return bounding rect in on-screen terms */
function node_bounding_rect(n) {
    return [
      [n.xvar + (n.rvar * n.hxmin), n.yvar + (n.rvar * n.hymin)],
      [n.xvar + (n.rvar * n.hxmax), n.yvar + (n.rvar * n.hymax)],
    ];
}

class SignpostLayout extends SignpostLayoutBase {
  constructor() {
    super();
    this.signpost_height = -2;
    this.text_image_y_offset = 0.3;
    this.text_image_defpt = 10;
    this.text_stroke_width = 1;
  }

  /**
   * Calculate center / alpha of this signpost node
   */
  calc_center_point(node) {
    // The signpost sits on top of the node it's associated with
    this.centerx = node.xvar + node.rvar * node.arcx;
    this.centery = node.yvar + node.rvar * node.arcy;

    // The signpost should be at least as big the children's bounding box with the furthest edge
    // NB: Not our bounding box, since that includes our parent
    // NB: We don't enclose each children's bounding box, since that would be a huge over-estimate
    let bounding_radius = 0;
    if (node.rvar > tree_state.threshold) { // i.e. before projection/re_calc.js:drawreg2 stops bothering updating child node positions
        for (let i = 0; i < Math.min(10, node.children.length); i++) { // We're not going to learn anything new after the first handful
            let br = node_bounding_rect(node.children[i]);

            bounding_radius = Math.max(
                Math.abs(this.centerx - br[0][0]),
                Math.abs(this.centery - br[0][1]),
                Math.abs(this.centerx - br[1][0]),
                Math.abs(this.centery - br[1][1]),
                bounding_radius);
        }
        bounding_radius = bounding_radius * 1.05;
    } else {
        bounding_radius = 5.25;
    }
    this.centerr = bounding_radius / (0.97 * 0.6); /* Cancel out factor in main helper */

    // We fade in/out at the extremes of visibility
    this.alpha = Math.min(0.6, Math.max(0, 1 - Math.abs(bounding_radius - (config.projection.sign_thres - 60)) * 0.015));
  }

  /**
   * Instead of drawing around the image, fill a circle on top, to...
   * * Colour a node without a picture based on it's location in the tree
   * * Colourise a node with a picture, so text is more visible
   */
  pic_outline_shapes(node, shapes) {
    let arc_shape = ArcShape.create();
    arc_shape.x = this.centerx;
    arc_shape.y = this.centery;
    arc_shape.r = this.centerr * 0.97 * 0.6;
    arc_shape.circle = true;
    arc_shape.height = this.signpost_height;
    arc_shape.do_fill = true;
    arc_shape.fill.color = color_theme.get_color("signpost.pic.fill", node, this.alpha / 4);
    shapes.push(arc_shape);
  }

  /**
   * Generate shapes for signposts without pictures
   */
  name_without_pic_shapes(node, shapes) {
    // Nodes look the same, with or without text
    super.name_with_pic_shapes(node, shapes);
  }

}

export default SignpostLayout;
