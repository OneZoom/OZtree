import BranchLayoutBase from '../branch_layout_helper';
import BezierShape from '../../shapes/bezier_shape';
import ArcShape from '../../shapes/arc_shape';
import {color_theme} from '../../../themes/color_theme';

// make a new class for the special branch

class BranchLayout extends BranchLayoutBase {
  /**
   * All branches are as thin as possible
   */
  node_line_width(node) {
    return 1;
  }

  /**
   *  Add shadowBlur to all branches
   */
  get_bezier_shapes(node, shapes, markings_list) {
    let bezier_shape = BezierShape.create();
    this.set_bezier_shape(bezier_shape, node, markings_list);
    bezier_shape.do_stroke = true;
    bezier_shape.stroke.line_width = this.node_line_width(node, markings_list);
    bezier_shape.height = 0;
    bezier_shape.stroke.color = color_theme.get_color('branch.stroke', node);

    // Blur dependent on what the line width would have been
    bezier_shape.shadow = { blur: Math.max(2, Math.min(10, node.rvar * 0.02)) };
    bezier_shape.stroke.line_cap = 'butt';

    shapes.push(bezier_shape);
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
    let markings_list = super.get_markings_list(node);

    // Lines are too thin, use dashes instead of nesting them inside
    for (let i = 0; i < markings_list.length; i++) {
      markings_list[i].widthProportion = Math.max(0.01 * node.rvar, 2);
      markings_list[i].dashSize = markings_list[i].widthProportion * 5;
      markings_list[i].shadow = { blur: 20 };
    }
    return markings_list;
  }

  /**
   * Don't bother covering branch joins, between 1px-width and shadowBlur
   * there's no point.
   */
  draw_interior_circle(node, shapes) {
    return;
  }
}

export default BranchLayout;
