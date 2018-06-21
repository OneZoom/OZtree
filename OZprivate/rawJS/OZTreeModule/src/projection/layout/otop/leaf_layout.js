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
      // Extract username from querystring, or fall back to 0's
      let user = window.location.search.match(/[&?]project_user=([^&]+)/);
      user = user ? user[1] : '0'.repeat(32);
      api_wrapper({
          url: 'http://40.115.43.52/userprofiles/' + user + '/random',
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

      rings = human_data.wonChallenges.map(function (challenge) {
          return challenge.color;
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
          s.stroke.shadow = { blur: 10 };
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

  /** Draw the special human leaf */
  human_leaf_shapes(node, shapes) {
      // Return either the first or second half of array
      function array_half(arr, latter_half) {
          var half_idx = Math.floor(arr.length / 2);

          return arr.slice(latter_half ? half_idx : 0, latter_half ? arr.length: half_idx);
      }

      // Fetch the human leaf data
      let data = this.fetch_human_subleaf_data();
      if (!data) {
          return;
      }

      // Draw the gradient background
      let s = ArcShape.create();
      s.x = this.get_leaf_x(node);
      s.y = this.get_leaf_y(node);
      s.r = this.get_fullleaf_r(node) * 1.8;
      s.circle = true;
      s.do_fill = true;
      s.do_stroke = false;
      s.fill.color = { from: 'rgba(0, 44, 100, 0.8)', start: this.get_fullleaf_r(node) * 0.5 };
      s.height = 0;
      shapes.push(s);

      // Draw an inner & outer ring of humans
      [0.81, 0.53].map(function (circle_ratio, i) {
          let s = ArcShape.create();
          s.x = this.get_leaf_x(node);
          s.y = this.get_leaf_y(node);
          s.r = this.get_fullleaf_r(node) * circle_ratio;
          s.circle = true;
          s.do_fill = false;
          s.do_stroke = true;
          s.stroke.line_width = (0.01 * s.r);
          s.stroke.color = 'rgba(255,255,255,0.8)';
          s.stroke.shadow = { blur: 10 };
          s.height = 0;
          shapes.push(s);

          // Draw half of the related humans
          let humans = array_half(data, i === 1);
          for (let j = 1; j < humans.length; j++) {
              this.human_subleaf(
                  node, shapes,
                  // NB: i/2 offsets the second ring of images so there's less overlap
                  s.x + Math.cos((j + i / 2) * (Math.PI * 2 / (humans.length - 1))) * s.r,
                  s.y + Math.sin((j + i / 2) * (Math.PI * 2 / (humans.length - 1))) * s.r,
                  this.get_fullleaf_r(node) / (humans[j].isVip ? 7 : 10),
                  humans[j]
              );
          }
      }.bind(this));

      // Draw the main human image
      this.human_subleaf(
          node, shapes,
          this.get_leaf_x(node),
          this.get_leaf_y(node),
          this.get_fullleaf_r(node) * 0.15,
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
