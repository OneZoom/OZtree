import LeafLayoutBase from '../leaf_layout_helper';

import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';
import ArcTextShape from '../../shapes/arc_text_shape';
import TextShape from '../../shapes/text_shape';
import PathShape from '../../shapes/path_shape';
import ImageShape from '../../shapes/image_shape';
import BezierShape from '../../shapes/bezier_shape';
import MoveToShape from '../../shapes/move_to_shape';
import LineToShape from '../../shapes/line_to_shape';
import tree_state from '../../../tree_state';
import {get_abs_x, get_abs_y, get_abs_r} from '../utils';
import {global_button_action} from '../../../button_manager';
import {live_area_config} from '../../live_area_config';
import {add_mr} from '../../move_restriction';
import {get_image, image_ready} from '../../../image_cache';
import {extxt, spec_num_full} from '../../../factory/utils';
import config from '../../../global_config';

class PolytomyLeafLayoutBase extends LeafLayoutBase {
    // redefine the leafbase so that we don't get a background coloured slither around the leaf
    // and optimise as drawing tiny leaves round
    fullLeafBase(x,y,r,angle,node,shapes) {
        // Too small to tell the difference, just generate a circle
        if (r < 4) {
            this.circularLeafBase(x,y,r,angle,node,shapes);
            return;
        }

        this.leafBaseLiveAreaTest(x,y,r,node);
        this.randomNaturalLeaf(x,y,r,angle,node,shapes);
        this.hovering = false;
    }

  // Fake branches should be rendered with a semi-circle, not a leaf
  get_fake_leaf_shapes(node, shapes) {
    if (node.richness_val > 1) {
      if (node.rvar < tree_state.threshold && node.has_child) {
        if (node.children.length > 2) {
           // This "fake leaf" has more than 2 children, so render as a semi-circle
           let arc_shape = ArcShape.create();
           arc_shape.x = node.xvar + node.rvar * node.arcx;
           arc_shape.y = node.yvar + node.rvar * node.arcy;
           arc_shape.r = node.rvar * node.arcr * 10;
           arc_shape.circle = false;
           arc_shape.start_angle = node.arca - Math.PI/2;
           arc_shape.end_angle = node.arca + Math.PI/2;
           arc_shape.height = 2;
           arc_shape.do_fill = true;
           arc_shape.fill.color = color_theme.get_color('branch.stroke', node);
           shapes.push(arc_shape);

        } else {
            super.get_fake_leaf_shapes(node, shapes);
        }
      }
    }
  }
}

export default PolytomyLeafLayoutBase;
