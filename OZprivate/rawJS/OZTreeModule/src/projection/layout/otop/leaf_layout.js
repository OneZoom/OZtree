import LeafLayoutBase from '../leaf_layout_helper';
import ArcShape from '../../shapes/arc_shape';
import {add_mr} from '../../move_restriction';
import config from '../../../global_config';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import {get_image, image_ready} from '../../../image_cache';
import BezierShape from '../../shapes/bezier_shape';

class LeafLayout extends LeafLayoutBase {
  /**
   * This leaf is little bit bigger than in the life.html. Default value is leaf_radius * 0.9;
   */
  get_fullleaf_r(node) {
     return this.get_leaf_radius(node);
  }

  /** Don't draw a leaf for homo sapiens, we do this later */
  fullLeaf(shapes, x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText) {
    if (latinText !== 'Homo sapiens') {
        super.fullLeaf.apply(this, arguments);
    }
  }

  /**
   * Use circularLeafBase for full leaves
   */
  full_leaf_shapes(node, shapes) {
    add_mr(this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node));

    if (node.latin_name === 'Homo sapiens') {
        this.human_leaf_shapes(node, shapes);
        return;
    }

    this.circularLeafBase(
      node.xvar + node.rvar * node.arcx,
      node.yvar + node.rvar * node.arcy,
      node.rvar * node.arcr,
      node.arca,
      node,
      shapes
    );
  }

  human_subleaf(node, shapes, x, y, r, image_src, image_filename, rings) {
      let imageObject = get_image(image_src, image_filename);
      imageObject = image_ready(imageObject) ? imageObject : null;

      this.circle_cut_image(shapes, imageObject, x, y, r, color_theme.get_color("leaf.inside.fill",node), null, node);
  }

  human_subleaf_pos(i, total, x, y, dist) {
      let offset, extra_dist, per_item_angle = (4*Math.PI/3) / total;

      if (i < (total / 2)) {
          offset = -(Math.PI/3); // Back 60deg
          extra_dist = (i % 2 === 0 ? 1.3 : 1.8);
      } else {
          offset = per_item_angle; // Forward 60deg+1 item
          extra_dist = (i % 2 === 0 ? 1.8 : 1.3);
      }

      return {
          x: x + dist * Math.cos(offset + i * per_item_angle) * extra_dist,
          y: y + dist * Math.sin(offset + i * per_item_angle) * extra_dist,
      };
  }

  /** Draw the special human leaf */
  human_leaf_shapes(node, shapes) {
      let bezier_shape, sub_pos, subleaf_count = 14;

      for (let i = 0; i < subleaf_count; i++) {
          sub_pos = this.human_subleaf_pos(i, subleaf_count, this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node));

          // Draw line connecting the subleaf
          bezier_shape = BezierShape.create();
          bezier_shape.sx = bezier_shape.c1x = this.get_leaf_x(node);
          bezier_shape.sy = bezier_shape.c1y = this.get_leaf_y(node);
          bezier_shape.ex = bezier_shape.c2x = sub_pos.x;
          bezier_shape.ey = bezier_shape.c2y = sub_pos.y;
          bezier_shape.do_stroke = true;
          bezier_shape.stroke.line_width = 1;
          bezier_shape.height = 0;
          bezier_shape.stroke.color = color_theme.get_color('branch.stroke', node);
          bezier_shape.stroke.line_cap = 'butt';
          bezier_shape.shadow = { blur: 2 },
          shapes.push(bezier_shape);

          // Draw the human
          this.human_subleaf(
              node, shapes,
              sub_pos.x,
              sub_pos.y,
              this.get_fullleaf_r(node) / 5,
              node.pic_src, node.pic_filename,
              []
          );
      }

      // Draw the main human image
      this.human_subleaf(
          node, shapes,
          this.get_leaf_x(node),
          this.get_leaf_y(node),
          this.get_fullleaf_r(node) / 3,
          node.pic_src, node.pic_filename,
          []
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
