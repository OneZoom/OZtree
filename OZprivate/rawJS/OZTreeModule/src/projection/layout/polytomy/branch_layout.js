import BranchLayoutBase from '../branch_layout_helper';
import BezierShape from '../../shapes/bezier_shape';
import {color_theme} from '../../../themes/color_theme';

// make a new class for the special branch

class PolytomyBranchLayout extends BranchLayoutBase {
  node_line_width(node) {
    // Lines should be at least 1px wide, otherwise you can't see them
    return Math.max(super.node_line_width(node), 1);
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
      markings_list[i].widthProportion = 1;
      markings_list[i].dashSize = 10;
    }
    return markings_list;
  }

  /**
   * Don't bother covering branch joins
   */
  draw_interior_circle(node, shapes) {
    return;
  }
}

export default PolytomyBranchLayout; // default means you can use any name for the function when you import it.
// you can only export default one thing otherwise you have to use the names to distingish them.
