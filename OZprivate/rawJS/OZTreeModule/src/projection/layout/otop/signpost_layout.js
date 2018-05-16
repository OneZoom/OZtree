import SignpostLayoutBase from '../signpost_layout_helper';
import tree_settings from '../../../tree_settings';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';

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

    // The signpost is as big as the bounding box
    this.centerr = node.rvar * Math.max(node.hxmax - node.hxmin, node.hymax - node.hymin);

    // We fade in/out at the extremes of visibility, always have some transulcency
    this.alpha = Math.min(0.6, Math.max(0, 0.8 -(Math.pow((node.rvar - 85)/95, 2))));
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
