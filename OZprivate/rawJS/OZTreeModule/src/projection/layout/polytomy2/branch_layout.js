import BranchLayoutBase from '../branch_layout_base';
import PathShape from '../../shapes/path_shape';
import LineToShape from '../../shapes/line_to_shape';
import MoveToShape from '../../shapes/move_to_shape';
import {color_theme} from '../../../themes/color_theme';

// make a new class for the special branch

class PolytomyBranchLayout extends BranchLayoutBase {
  get_shapes(node, shapes) {
    let path_shape = PathShape.create();
    path_shape.path_length = 2;
    let move_to_shape = MoveToShape.create();
    move_to_shape.x = node.xvar + node.rvar * node.sx;
    move_to_shape.y = node.yvar + node.rvar * node.sy;
    path_shape.path[0] = move_to_shape;
    let line_to_shape = LineToShape.create();
    line_to_shape.x = node.xvar + node.rvar * node.ex;
    line_to_shape.y = node.yvar + node.rvar * node.ey;
    path_shape.path[1] = line_to_shape;
    path_shape.do_stroke = true;
    // this line does fixed branch widths of size 1 
    path_shape.stroke.line_width = 1.0;
    // uncomment this line for scaling branch widths
    // path_shape.stroke.line_width = node.branch_width * node.rvar;
    path_shape.height = 0;
    path_shape.stroke.color = color_theme.get_color('branch.stroke', node);
    shapes.push(path_shape);
  }  
}

export default PolytomyBranchLayout; // default means you can use any name for the function when you import it.
// you can only export default one thing otherwise you have to use the names to distingish them.
