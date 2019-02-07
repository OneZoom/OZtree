import LeafLayoutBase from '../leaf_layout_helper';
import ArcShape from '../../shapes/arc_shape';
import BezierShape from '../../shapes/bezier_shape';
import ImageShape from '../../shapes/image_shape';
import {add_mr} from '../../move_restriction';
import config from '../../../global_config';
import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import {get_image, image_ready} from '../../../image_cache';
import api_wrapper from '../../../api/api_wrapper';

const l_consts = {
    r_image: 0.935,
    r_wash: 0.97,
    r_circularbase: 0.97,
    r_circularbaseoutline: 0.30,
    r_human_wash: 1.3,
    r_human_wash_start: 0.9,
    r_sponsor_minsize: 200,
}

class LeafLayout extends LeafLayoutBase {
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

  /** Decrease the overall / outline radius so our wash is visible */
  circularLeafBase(x,y,r,angle,node,shapes) {
    this.leafBaseLiveAreaTest(x,y,r,node);
    this.circularOutlinedLeaf(x,y,r * l_consts.r_circularbase, r * l_consts.r_circularbaseoutline,node,shapes);
    this.hovering = false;
  }

  /** We put the sponsor text on the opposite side to normal */
  get_sponsor_text_direction(angle) {
    // set to -1 if text is below
    const TWO_PI = Math.PI*2.0;
    if ((angle%TWO_PI)>Math.PI) {
      return 1;
    } else {
      return -1;
    }
  }

  get_sponsor_text(node) {
    if (!node.sponsor_name) {
      // If not already sponsored, don't show anything
      return [" ", "", 1];
    }
    return super.get_sponsor_text.call(this, node);
  }

  /** Inrcrease the leaf radius before which we show the sponsor text */
  fullLeaf_sponsor(shapes,x,y,r) {
    if (r > l_consts.r_sponsor_minsize) {
        super.fullLeaf_sponsor.apply(this, arguments);
    }
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
      let user = window.location.search.match(/[&?]ucaya_user=([^&]+)/);
      user = user ? user[1] : '0'.repeat(32);
      api_wrapper({
          url: 'https://onetreeoneplanet.azurewebsites.net/userprofiles/' + user + '/random',
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

      if (human_data.is_self && window.otop_profile_image) {
          // The WebViewBridge gave us an image, use it
          imageObject = window.otop_profile_image;
      } else {
          // Try and fetch the image
          imageObject = get_image(
              human_data.userProfile.picture,
              human_data.userProfile.picture
          );
          imageObject = image_ready(imageObject) ? imageObject : null;
      }

      rings = {};
      human_data.wonChallenges.map(function (challenge) {
          if (rings[challenge.id]) {
              rings[challenge.id].level++;
          } else {
              rings[challenge.id] = {
                  color: challenge.color,
                  level: 1,
              };
          }
      });
      rings = Object.values(rings);

      let total_width = 1;
      for (let i = 0; i < rings.length; i++) {
          s = ArcShape.create();
          s.x = x; s.y = y;
          s.r = r + 0.05 * r * (total_width + rings[i].level / 2);
          s.circle = true;
          s.do_fill = true;
          s.order = "fill_first";
          s.fill.color = 'rgba(0,0,0,0.8)';
          s.do_stroke = true;
          s.stroke.line_width = rings[i].level * 0.05 * r;
          s.stroke.color = rings[i].color;
          s.stroke.shadow = { blur: 10 };
          s.height = 0;
          shapes.push(s);
          total_width = total_width + (rings[i].level) + 1;
      }

      this.circle_cut_image(shapes, imageObject, x, y, r, color_theme.get_color("leaf.inside.fill",node), null, node);
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

      // Add a blue wash underneath, to hide background lights
      let s = ArcShape.create();
      s.x = this.get_leaf_x(node);
      s.y = this.get_leaf_y(node);
      s.r = this.get_fullleaf_r(node) * 1.2;
      s.circle = true;
      s.do_fill = true;
      s.do_stroke = false;
      s.fill.color = { from: 'rgba(0, 15, 58, 0.8)', start: this.get_fullleaf_r(node) * 0.5 };
      s.height = 0;
      shapes.push(s);

      // Try and fetch the background image, draw it if available, and we are zoomed in enough.
      let imageObject = get_image('otop:otop-human-leaf.png', 'otop:otop-human-leaf.png');
      imageObject = image_ready(imageObject) ? imageObject : null;
      if (this.get_fullleaf_r(node) > 30 && imageObject) {
          let s = ImageShape.create();
          s.img = imageObject;
          s.w = s.h = this.get_fullleaf_r(node) * 1.63;
          s.x = this.get_leaf_x(node) - (s.w / 2);
          s.y = this.get_leaf_y(node) - (s.w / 2);
          s.height = 0;
          shapes.push(s);
      } else {
          // Approximate the image with a gradient background
          let s = ArcShape.create();
          s.x = this.get_leaf_x(node);
          s.y = this.get_leaf_y(node);
          s.r = this.get_fullleaf_r(node) * 1.5;
          s.circle = true;
          s.do_fill = true;
          s.do_stroke = false;
          s.fill.color = { from: '#103a96', start: this.get_fullleaf_r(node) * 0.2 };
          s.height = 0;
          shapes.push(s);
      }

      // Draw an inner & outer ring of humans
      [0.81, 0.54].map(function (circle_ratio, i) {
          let s = ArcShape.create();
          s.x = this.get_leaf_x(node);
          s.y = this.get_leaf_y(node);
          s.r = this.get_fullleaf_r(node) * circle_ratio;
          s.circle = true;
          s.do_fill = false;
          s.do_stroke = true;
          s.stroke.line_width = (0.007 * s.r);
          s.stroke.color = 'rgba(234,234,234,0.8)';
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

      // Add a blue wash across the top
      s = ArcShape.create();
      s.x = this.get_leaf_x(node);
      s.y = this.get_leaf_y(node);
      s.r = this.get_fullleaf_r(node) * l_consts.r_human_wash;
      s.circle = true;
      s.do_fill = true;
      s.do_stroke = false;
      s.fill.color = { from: 'rgba(27, 92, 175, 0.3)', start: this.get_fullleaf_r(node) * l_consts.r_human_wash_start };
      s.height = 0;
      shapes.push(s);

      // Draw the main human image
      data[0].is_self = true;
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
      if (node.full_children_length === 0 || node.richness_val < 1) {
          // We're only interested in nodes that would have children
          return;
      }

      let start_x = node.xvar + node.rvar * node.arcx,
          start_y = node.yvar + node.rvar * node.arcy,
          radius = node.rvar + node.arcr * 0.9;

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
      } else {
          let s = BezierShape.create();
          s.sx = s.sy = s.ex = s.ey = null;

          // Draw a fan around the current node, approximating what the nodes would look like
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

          // Draw our fan like we would the branches
          s.do_stroke = true;
          s.stroke.line_width = 1;
          s.height = 0;
          s.stroke.color = color_theme.get_color('branch.stroke', node);
          shapes.push(s);
      }
  }

  /**
   * Cover the node with the image, don't just draw a small central node
   */
  fullLeaf_detail3_pics(shapes,x,y,r,conservation_text,imageObject,requiresCrop,cropMult,cropLeft,cropTop, node) {
    this.circle_cut_image(shapes,imageObject, x,y,r * l_consts.r_image,
      color_theme.get_color("leaf.inside.fill",node),
      undefined,
      node);

    // Apply a wash atop images
    let s = ArcShape.create();
    s.height = 5;
    s.x = x;
    s.y = y;
    s.r = r * l_consts.r_wash;
    s.circle = true;
    s.do_fill = true;
    s.fill.color = color_theme.get_color("leaf.inside.fill", node, 0.3);
    shapes.push(s);
  }
}

export default LeafLayout;
