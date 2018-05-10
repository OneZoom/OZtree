import BranchLayoutBase from '../branch_layout_helper';
import BezierShape from '../../shapes/bezier_shape';
import {color_theme} from '../../../themes/color_theme';

// make a new class for the special branch

class PolytomyBranchLayout extends BranchLayoutBase {
  // For polytomy, we insist on minimum line width
  node_line_width(node) {
    return 1.0;
  }
}

export default PolytomyBranchLayout; // default means you can use any name for the function when you import it.
// you can only export default one thing otherwise you have to use the names to distingish them.
