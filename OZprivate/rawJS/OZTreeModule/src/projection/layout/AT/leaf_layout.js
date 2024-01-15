import LeafLayoutBase from '../leaf_layout_base';
import {add_mr} from '../../move_restriction';
import config from '../../../global_config';
import tree_state from '../../../tree_state';

class ATLeafLayout extends LeafLayoutBase {
  /**
   * This leaf is little bit bigger than in the life.html. Default value is leaf_radius * 0.9;
   */
  get_fullleaf_r(node) {
     return this.get_leaf_radius(node);
  }

  /**
   * Always draw sponsorText at the bottom of node.
   */
  get_sponsor_text_direction() {
    return -1;
  }

    get_tip_leaf_shapes(node, shapes) {
        if(node.richness_val <= 1 || node.full_children_length === 0) {
            if (node.richness_val > 1) {
                this.undeveloped_temp_leaf_shapes(node, shapes);
            } else {
                this.full_leaf_shapes(node, shapes);
            }
            this.tip_leaf_text_image_shapes(node, shapes);
        }
    }
    
  get_fake_leaf_shapes(node, shapes) {
    if (node.richness_val > 1) {
      if (node.rvar < tree_state.threshold && node.has_child) {
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
}

export default ATLeafLayout;
