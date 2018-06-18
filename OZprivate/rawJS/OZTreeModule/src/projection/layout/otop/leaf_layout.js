import LeafLayoutBase from '../leaf_layout_helper';
import ArcShape from '../../shapes/arc_shape';
import {add_mr} from '../../move_restriction';
import config from '../../../global_config';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import {get_image, image_ready} from '../../../image_cache';
import api_wrapper from '../../../api/api_wrapper';

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

  /**
   * Fetch data for human subleaf from UCAYA API
   *
   * Assumes the caller will keep polling until the data is available,
   * the first call will trigger the fetch (and return null). Subsequent
   * calls will also return null until data is available.
   */
  fetch_human_subleaf_data() {
      if (this._human_subleaf_data) {
          // Got data, return it
          if (this._human_subleaf_data.data) {
              return this._human_subleaf_data.data;
          }
          // Still fetching, wait
          return null;
      }

      this._human_subleaf_data = {
          data: null,
      }
      api_wrapper({
          url: 'http://40.115.43.52/userprofiles/15d32f1e4f0f4fde8e9b2a75ff01dbc6/random',
          method: 'GET',
          success: function (data) {
              this._human_subleaf_data.data = data;
          }.bind(this),
          error: function () {
              this._human_subleaf_data = null;
          }.bind(this),
      });
      return null;
  }

  /**
   * Draw an individual human in the human leaf
   *
   * human_data should contain:
   * - userProfile.picture: URL to image of human
   * - wonChallenges: Array of challenges this human has completed.
   */
  human_subleaf(node, shapes, x, y, r, human_data) {
      let s, rings, imageObject;

      // Try and fetch the image
      imageObject = get_image(
          human_data.userProfile.picture,
          human_data.userProfile.picture
      );
      imageObject = image_ready(imageObject) ? imageObject : null;

      rings = human_data.wonChallenges.map(function () {
          return 'rgba(192, 236, 210, 0.8)';
      })

      for (let i = 0; i < rings.length; i++) {
          s = ArcShape.create();
          s.x = x; s.y = y;
          s.r = r + (0.1 * r) * (rings.length - i);
          s.circle = true;
          s.do_fill = true;
          s.order = "fill_first";
          s.fill.color = 'rgba(0,0,0,0.8)';
          s.do_stroke = true;
          s.stroke.line_width = (0.05 * r);
          s.stroke.color = rings[i];
          s.height = 0;
          shapes.push(s);
      }

      this.circle_cut_image(shapes, imageObject, x, y, r, color_theme.get_color("leaf.inside.fill",node), null, node);

      // Apply a wash atop image
      s = ArcShape.create();
      s.height = 5;
      s.x = x;
      s.y = y;
      s.r = r * 0.975;
      s.circle = true;
      s.do_fill = true;
      s.fill.color = 'hsla(199, 100%, 50%, 0.3)';
      shapes.push(s);
  }

  /**
   * Calculate the position of the (i)th sub-leaf around the
   * human node, out of (total) human nodes.
   */
  human_subleaf_pos(i, total, x, y, dist) {
      let offset, extra_dist, per_item_angle = (4*Math.PI/3) / total;

      if (i < (total / 2)) {
          offset = -(Math.PI/3); // Back 60deg
          extra_dist = (i % 2 === 0 ? 1.0 : 1.7);
      } else {
          offset = per_item_angle; // Forward 60deg+1 item
          extra_dist = (i % 2 === 0 ? 1.7 : 1.0);
      }

      return {
          x: x + dist * Math.cos(offset + i * per_item_angle) * extra_dist,
          y: y + dist * Math.sin(offset + i * per_item_angle) * extra_dist,
      };
  }

  /** Draw the special human leaf */
  human_leaf_shapes(node, shapes) {
      let sub_pos, data = this.fetch_human_subleaf_data();

      if (!data) {
          return;
      }

      for (let i = 1; i < data.length; i++) {
          sub_pos = this.human_subleaf_pos(
              i - 0,
              data.length - 1,
              this.get_leaf_x(node),
              this.get_leaf_y(node),
              this.get_fullleaf_r(node)
          );

          // Draw the human
          this.human_subleaf(
              node, shapes,
              sub_pos.x,
              sub_pos.y,
              this.get_fullleaf_r(node) / (data[i].isVip ? 2 : 5),
              data[i]
          );
      }

      // Draw the main human image
      this.human_subleaf(
          node, shapes,
          this.get_leaf_x(node),
          this.get_leaf_y(node),
          this.get_fullleaf_r(node) / 2,
          data[0]
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
           arc_shape.counter_wise = false;
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

    // Apply a wash atop images
    let s = ArcShape.create();
    s.height = 5;
    s.x = x;
    s.y = y;
    s.r = r * 0.975;
    s.circle = true;
    s.do_fill = true;
    s.fill.color = color_theme.get_color("leaf.inside.fill", node, 0.3);
    shapes.push(s);
  }
}

export default LeafLayout;
