import LeafLayoutBase from '../leaf_layout_base';

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

  /**
   * Fake branches should be rendered with a semi-circle, not a leaf
   */
  get_fake_leaf_shapes(node, shapes) {
      if (node.full_children_length === 0 || node.richness_val < 1) {
          // We're only interested in nodes that would have children
          return;
      }

      let start_x = node.xvar + node.rvar * node.arcx,
          start_y = node.yvar + node.rvar * node.arcy,
          radius = node.rvar;

      // We can move anywhere within our fake leaf, which can grow to 10x the screen (or enough to stop being fake)
      add_mr(start_x, start_y, radius, 10);

      if (node.full_children_length > 20 && node.rvar < (tree_state.threshold * 100)) {
          // This fake leaf is pretty small, just draw a semi-circle
          let arc_shape = ArcShape.create();
          arc_shape.x = start_x;
          arc_shape.y = start_y;
          arc_shape.r = radius;
          arc_shape.circle = false;
          arc_shape.start_angle = node.arca - Math.PI/2;
          arc_shape.end_angle = node.arca + Math.PI/2;
          arc_shape.counter_wise = false;
          arc_shape.height = 2;
          arc_shape.do_fill = true;
          arc_shape.fill.color = color_theme.get_color('branch.stroke', node);
          shapes.push(arc_shape);
          return;
      }

      // Use the children's position to draw a single fan object
      let s = BezierShape.create();
      s.sx = s.sy = s.ex = s.ey = null;

      if (node.children.length > 0) {
        // We have children, but got forced not to render them. Draw a fan around all the children
        for (let i = 0; i < node.children.length; i++) {
          s.path_points.push(['move', start_x, start_y]);
          s.path_points.push([
            'line',
            start_x + node.rvar * node.nextr[i] * node.children[i].bezex,
            start_y + node.rvar * node.nextr[i] * node.children[i].bezey,
          ]);
        }
      } else {
        // Undeveloped child nodes, guess what the fan would look like
        let inc_angle = Math.PI / node.full_children_length;
        let start_angle = node.arca - Math.PI/2 + (inc_angle / 2);
        for (let i = 0; i < node.full_children_length; i++) {
          s.path_points.push(['move', start_x, start_y]);
          s.path_points.push([
            'line',
            start_x + radius * Math.cos(start_angle + inc_angle * i),
            start_y + radius * Math.sin(start_angle + inc_angle * i),
          ]);
        }
      }

      // Draw our fan like we would the branches
      s.do_stroke = true;
      s.stroke.line_width = 1;
      s.height = 0;
      s.stroke.color = color_theme.get_color('branch.stroke', node);
      shapes.push(s);
  }
}

export default PolytomyLeafLayoutBase;
