import LeafLayoutBase from '../leaf_layout_helper';
import ArcShape from '../../shapes/arc_shape';
import {add_mr} from '../../move_restriction';
import config from '../../../global_config';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';

class LeafLayout extends LeafLayoutBase {
  /**
   * This leaf is little bit bigger than in the life.html. Default value is leaf_radius * 0.9;
   */
  get_fullleaf_r(node) {
     return this.get_leaf_radius(node);
  }

  /**
   * Use circularLeafBase for full leaves
   */
  full_leaf_shapes(node, shapes) {
    add_mr(this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node));
    this.circularLeafBase(
      node.xvar + node.rvar * node.arcx,
      node.yvar + node.rvar * node.arcy,
      node.rvar * node.arcr,
      node.arca,
      node,
      shapes
    );
  }

  /**
   * Fake branches should be rendered with a semi-circle, not a leaf
   */
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
          this.circularLeafBase(
            node.xvar + node.rvar * node.nextx[0],
            node.yvar + node.rvar * node.nexty[0],
            node.rvar * config.projection.leafmult * 0.75 * config.projection.partc,
            node.arca,
            node,
            shapes
          );
        }
      }
    }
  }

  /**
   * Cover the node with the image, don't just draw a small central node
   */
  fullLeaf_detail3_pics(shapes,x,y,r,conservation_text,imageObject,requiresCrop,cropMult,cropLeft,cropTop, node) {
    this.circle_cut_image(shapes,imageObject, x,y,r,
      color_theme.get_color("leaf.inside.fill",node),
      undefined,
      node);
  }
}

export default LeafLayout;
