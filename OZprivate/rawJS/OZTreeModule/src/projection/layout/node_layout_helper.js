import config from '../../global_config';
import tree_state from '../../tree_state';
import {color_theme} from '../../themes/color_theme';
import ArcShape from '../shapes/arc_shape';
import TextShape from '../shapes/text_shape';
import ImageShape from '../shapes/image_shape';
import ArcTextShape from '../shapes/arc_text_shape';
import {ageAsText, gpmapper, is_primary_or_secondary_name} from '../../factory/utils';
import {add_mr} from '../move_restriction';
import {get_abs_x, get_abs_y, get_abs_r, substitute_variables} from './utils';
import {global_button_action} from '../../button_manager';
import {live_area_config} from '../live_area_config';


class NodeLayoutBase {
  get_shapes(node, shapes) {
    this.reset_hover_state();
    this.calc_twh(node);
    if (!node.under_signpost) {
      add_mr(get_abs_x(node, node.arcx), get_abs_y(node, node.arcy), get_abs_r(node, node.arcr));
      this.highlight_part_shapes(node, shapes);
      this.interior_circle_shapes(node, shapes);
      this.low_res_shapes(node, shapes);
      this.high_res_shapes(node, shapes);
    }
  }
  
  reset_hover_state() {
    this.hovered = global_button_action.action != null;
    this.hovering = false;
  }
  
  calc_twh(node) {
    this.twidth = config.projection.Twidth * (config.projection.partc - config.projection.partl2) * node.rvar;  
    this.theight = config.projection.Tsize  * (config.projection.partc - config.projection.partl2) / 2.0 * node.rvar;
    this.theight2 = config.projection.Tsize  * (config.projection.partc - config.projection.partl2) / 3.0 * node.rvar;
  }
  
  high_res_shapes(node, shapes) {
    if (config.projection.draw_all_details && node.rvar >= config.projection.node_high_res_thres) {
      this.high_res_sponsor_shapes(node, shapes);
      this.high_res_image_shapes(node, shapes);
      this.high_res_text_shapes(node, shapes);
    }
  }
  
  high_res_image_shapes(node, shapes) {
    if (node.num_pics > 0) {
      let index = 3;
      index -= node.cname? 2: 0;
      index -= node.latin_name? 1: 0;
      let y_factor = [0.07, 0.07, 0.07, -0.07];
      let width_factor = [1.43, 1.43, 1.43, 1.45];
      let height_factor = [0.77, 0.77, 0.77, 0.78];
      this.autopic_set_shapes(
        node,
        node.xvar + node.arcx * node.rvar,
        node.yvar + node.arcy * node.rvar + this.twidth * y_factor[index],
        this.twidth * width_factor[index],
        this.twidth * height_factor[index],
        shapes);
    }
  }
  
  autopic_set_shapes(node, x, y, width, height, shapes) {
    // calls autopic for a set of images in 2 rows
    if (node.num_pics < 4) {
      let picwidth2 = width/node.num_pics;
      for (let i = 0 ; i < node.num_pics ; i ++) {            
        this.autopic_shapes(
          node, 
          i, 
          x - width / 2 + picwidth2 * (i + 0.5),
          y,
          picwidth2 * 0.88,
          height * 0.85,
          true,
          shapes);
      }
    } else {
      let toprow = Math.floor(node.num_pics/2);
      let bottomrow = node.num_pics-toprow;
      let picwidth2 = width/4;//(toprow);
      for (let ij = 0 ; ij < toprow ; ij ++) {            
        this.autopic_shapes(
          node, 
          ij,
          x - toprow * picwidth2 / 2 + picwidth2 * (ij + 0.5),
          y - height / 4,
          picwidth2 * 0.85,
          height / 2 * 0.85,
          true,
          shapes);
      }
      picwidth2 = width/4;//(bottomrow);
      for (let j = 0 ; j < (bottomrow) ; j ++) {            
        this.autopic_shapes(
          node, 
          toprow + j,
          x - bottomrow * picwidth2 / 2 + picwidth2 * (j + 0.5),
          y + height / 4,
          picwidth2 * 0.85,
          height / 2 * 0.85,
          true,
          shapes);
      }
    }
  }

  live_area_autopic_text(img_width, img_height, x, y) {
    let mx = tree_state.button_x;
    let my = tree_state.button_y;
    return mx && my && 
      mx > (x-img_width/2) && mx < (x+img_width/2) && 
      my > (y-img_height/2) && my < (y+img_height/2 + img_height*0.15);
  }

  autopic_shapes(node, index, x, y, width, height, draw_text, shapes) {
    // this is the image to which (c) should be added
    let img_width = height > width ? width : height;
    let img_height = height > width ? width : height;
    /* There is a bug here, because node.get_picset_src_info() doesn't always return 
     * licence information (i.e. the text to write). Look in data_repo.js and image_details.js
     * for details.
     */
    this.copyright(shapes,x+img_width*0.46,y+img_height*0.46,img_width/33,
      node.get_picset_src_info(index), 
      color_theme.get_color("interior.copyright.text.fill", node),
      color_theme.get_color("interior.copyright.stroke", node),
      color_theme.get_color("interior.copyright.fill", node),
      color_theme.get_color("interior.copyright.text_hover.fill", node),
      color_theme.get_color("interior.copyright_hover.stroke", node),
      color_theme.get_color("interior.copyright_hover.fill", node)
      ); // draw copyright sympbol
    
    if (!this.hovered && this.live_area_autopic_text(img_width, img_height, x, y)) {
      this.hovering = true;
      this.hovered = true;
      live_area_config.interior_image.register_button_event(-node.get_picset_code(index));
    }
      
    this.autodraw_ls_shape(node, index, x-img_width/2, y-img_height/2, img_width, img_height, shapes);
    // draw the actual image itself
  

    
    let common = node.get_picset_common(index);
    let latin = node.get_picset_latin(index);
    let text_to_draw = common ? common : latin;
    let font_style = common ? null : "italic";

    if (text_to_draw && draw_text) {
      let text_shape = TextShape.create();
      if (this.hovering) {
        text_shape.stroke.color = color_theme.get_color('interior.pic_text_hover.stroke', node);
        text_shape.stroke.line_width = Math.min(12, img_height*0.05);
        text_shape.do_stroke = true;
        text_shape.fill.color = color_theme.get_color('interior.pic_text_hover.fill', node);
      } else {
        text_shape.fill.color = color_theme.get_color('interior.pic_text.fill', node);
      }
      text_shape.index = index;
      text_shape.x = x;
      text_shape.y = y + height * 0.085 + img_height/2;
      text_shape.width = width;
      text_shape.defpt = height * 0.1;
      text_shape.height = 3;
      text_shape.line = 1;
      text_shape.font_style = font_style;
      text_shape.text = text_to_draw;
      text_shape.do_fill = true;
      shapes.push(text_shape);
    }
    this.hovering = false;
  }
    
    /*
     * this function: draws a copyright symbol and handles zooming in as well as clicking
     * copied from leaf_layout_helper.
     * picinfo should be an array of [pic_src, pic_src_id, text]
     */
    copyright(shapes,x,y,r,picinfo, textColor, strokeColor, fillColor, textHighlightColor, strokeHighlightColor, fillHighlightColor) {
        let text = picinfo[2] || "Click for more details";
        if (!this.hovered && this.liveAreaTest(x,y,r)) {
            this.hovered = true;
            this.hovering = true;
            live_area_config.copyright.register_button_event(picinfo[0], picinfo[1]);
            
        };
        add_mr(x,y,r*3);
        let arc_shape = ArcShape.create();
        if (this.hovering) {
            arc_shape.stroke.color = strokeHighlightColor;
            arc_shape.fill.color = fillHighlightColor;
        } else {
            arc_shape.stroke.color = strokeColor;
            arc_shape.fill.color = fillColor;
        }
        arc_shape.height = 6;
        arc_shape.x = x;
        arc_shape.y = y;
        arc_shape.r = r;
        arc_shape.circle = true;
        arc_shape.do_stroke = true;
        arc_shape.stroke.line_width = r * 0.05;
        arc_shape.do_fill = true;
        shapes.push(arc_shape);
        
        let text_shape = TextShape.create();
        text_shape.x = x;
        text_shape.y = y;
        text_shape.min_text_size_extra = 0;
        text_shape.height = 7;
        text_shape.do_fill = true;
        if (this.hovering) {
            text_shape.font_style = 'bold';
            text_shape.fill.color = textHighlightColor;
        } else {
            text_shape.fill.color = textColor;
        }
        if (text && r > 160) {
            text_shape.width = r * 1.8;
            text_shape.defpt = r;
            text_shape.text = text;
            text_shape.line = 3;
        } else if (text && r <= 160 && r > 40) {
            text_shape.width = r * 1.5;
            text_shape.defpt = r;
            text_shape.text = text.substr(0,30) + " ...";
            text_shape.line = 2;
        } else {
            text_shape.width = r;
            text_shape.defpt = r * 2;
            text_shape.text = "C";
        }
        shapes.push(text_shape);
        this.hovering = false;
    }

    liveAreaTest(x,y,r) {
        return this.mouse_over_circle( x, y, r);
    }

    mouse_over_circle(x,y,r) {
        let mx = tree_state.button_x;
        let my = tree_state.button_y;
        return mx && my && (this.dist_sqr_to_center(x,y,mx,my) <= r * r);
    }
    
    dist_sqr_to_center(x,y,mx,my) {
        if (mx && my) {
            return (mx-x) * (mx-x) + (my-y) * (my-y);
        } else {
            return 0;
        }
    }
    
    
  autodraw_ls_shape(node, index, x, y, w, h, shapes) {
    let pic_info = node.get_picset_src_info(index);
    if(w > 800 || h > 800) {
      this.autodraw_l_shape(node,pic_info[0],pic_info[1],x,y,w,h, shapes);
    } else {
      this.autodraw_s_shape(node,pic_info[0],pic_info[1],x,y,w,h, shapes);
    }
  }

  autodraw_s_shape(node, src, filename, x, y, w, h, shapes) {
    let image_shape = ImageShape.create();
    image_shape.src = src;
    image_shape.filename = filename;
    image_shape.x = x;
    image_shape.y = y;
    image_shape.w = w;
    image_shape.h = h;
    image_shape.height = 3;
    shapes.push(image_shape);
  }

  autodraw_l_shape(node, src, filename, x, y, w, h, shapes) {
    //could ask for a larger image here
    this.autodraw_s_shape(node, src, filename, x, y, w, h, shapes);
  }

  high_res_text_shapes(node, shapes) {
    if ((node.cname || node.latin_name) && !this.hovered && this.is_mouse_over_high_res_text(node)) {
      this.hovered = true;
      this.hovering = true;
      live_area_config.interior_high_res_text.register_button_event(node);
    }
    this.high_res_header_shapes(node, shapes);
    this.high_res_center_text_shapes(node, shapes);
    this.hovering = false;
  }

  high_res_header_shapes(node, shapes) {
    if (node.num_pics === 0) {
      this.high_res_textonly_header_shapes(node, shapes);
    } else {
      this.high_res_pic_header_shapes(node, shapes);
    }
  }

  fill_high_res_header_shape(text_shape, node) {
    if (this.hovering) {
      text_shape.stroke.color = color_theme.get_color('interior.text_hover.stroke', node);
      text_shape.stroke.line_width = Math.min(14, 0.045 * node.rvar * node.arcr * (1-config.projection.partl2/2.0));
      text_shape.do_stroke = true;
    }
    text_shape.x = node.xvar + node.rvar * node.arcx;
    text_shape.defpt = this.theight2/6;
    text_shape.line = 1;
    text_shape.height = 3;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color('interior.text.fill', node);
  }

  high_res_textonly_header_shapes(node, shapes) {
    let text = this.get_textonly_header(node);
    let y_factor = [1.1, 1.35, 1.6];
    let width_factor = [1.5, 1.2, 1];
    for (let i=0; i<5; i++) {
      if (text[i]) {
        let text_shape = TextShape.create();
        this.fill_high_res_header_shape(text_shape, node);
        text_shape.y = node.yvar + node.rvar * node.arcy - this.theight2 * y_factor[i];
        text_shape.width = this.twidth * width_factor[i];
        text_shape.text = text[i];
        shapes.push(text_shape);
      }
    }
  }

  high_res_pic_header_shapes(node, shapes) {
    let text = this.get_pic_header_text(node);
    let y_factor = [1.09, 1.31, 1.53, 1.75, 1.97];
    let width_factor = [1.4, 1.3, 1.2, 1, 0.7];
    for (let i=0; i<5; i++) {
      if (text[i]) {
        let text_shape = TextShape.create();
        this.fill_high_res_header_shape(text_shape, node);
        text_shape.y = node.yvar + node.rvar * node.arcy - this.theight2 * y_factor[i];
        text_shape.width = this.twidth * width_factor[i];
        text_shape.text = text[i];
        shapes.push(text_shape);
      }
    }
  }

  high_res_center_text_shapes(node, shapes) {
    if (node.num_pics === 0) {
      this.high_res_ctext_without_pic_shapes(node, shapes);
    } else {
      this.high_res_ctext_with_pic_shapes(node, shapes);
    }
  }

  fill_high_res_ctext_shape(text_shape, node) {
    if (this.hovering) {    
      text_shape.stroke.color = color_theme.get_color('interior.text_hover.stroke', node);
      text_shape.stroke.line_width = Math.min(14, 0.045 * node.rvar * node.arcr * (1-config.projection.partl2/2.0));
      text_shape.do_stroke = true;
    }
    text_shape.x = node.xvar + node.rvar * node.arcx;
    text_shape.height = 3;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color('interior.text.fill', node);
  }

  high_res_ctext_without_pic_shapes(node, shapes) {
    if (node.cname) {
      let text_shape = TextShape.create();
      this.fill_high_res_ctext_shape(text_shape, node);
      text_shape.y = node.yvar + node.rvar * node.arcy;
      text_shape.width = this.twidth * 1.5;
      text_shape.defpt = this.theight2/2;
      text_shape.text = node.cname;
      shapes.push(text_shape);
    }
    if (node.latin_name) {
      let text_shape = TextShape.create();
      this.fill_high_res_ctext_shape(text_shape, node);
      text_shape.y = node.yvar + node.rvar * node.arcy + (node.cname ? this.theight2 * 1.3 : 0);
      text_shape.width = this.twidth * (node.cname ? 1.3 : 1.5);
      text_shape.defpt = this.theight2 / (node.cname ? 4.0 : 2.0);
      text_shape.text = (node.cname? OZstrings['sciname'] : "") + node.latin_name;
      shapes.push(text_shape);
    }
    let text_shape = TextShape.create();
    this.fill_high_res_ctext_shape(text_shape, node);
    let index = 3;
    index -= node.cname? 2: 0;
    index -= node.latin_name? 1: 0;
    let y_factor = [1.65, 1.55, 1.55, 0];
    let defpt_factor = [4.0, 4.0, 4.0, 2.0];
    text_shape.y = node.yvar + node.rvar * node.arcy + this.theight2 * y_factor[index];
    text_shape.width = this.twidth * 1.25;
    text_shape.defpt = this.theight2 / defpt_factor[index];
    text_shape.text = node.spec_num_full;
    shapes.push(text_shape);
  }

  high_res_ctext_with_pic_shapes(node, shapes) {
    if (node.cname) {
      let text_shape = TextShape.create();
      this.fill_high_res_ctext_shape(text_shape, node);
      text_shape.y = node.yvar + node.rvar * node.arcy - this.theight2* 1.15;
      text_shape.width = this.twidth * 1.37;
      text_shape.defpt = this.theight2/ (node.cname.length>25 ? 4:2.5);
      text_shape.text = node.cname;
      text_shape.line = node.cname.length > 25 ? 2 : 1;
      shapes.push(text_shape);
    }
    if (node.latin_name) {
      let text_shape = TextShape.create();
      this.fill_high_res_ctext_shape(text_shape, node);
      text_shape.y = node.yvar + node.rvar * node.arcy + (node.cname ? this.theight2 * 1.5 : -this.theight2 * 1.15);
      text_shape.width = this.twidth * (node.cname ? 1.25: 1.37);
      text_shape.defpt = this.theight2 / (node.cname ? 5: 2.5);
      text_shape.text = (node.cname? OZstrings['sciname'] : "") + node.latin_name;
      shapes.push(text_shape);
    }
    let text_shape = TextShape.create();
    this.fill_high_res_ctext_shape(text_shape, node);
    let index = 3;
    index -= node.cname? 2: 0;
    index -= node.latin_name? 1: 0;
    let y_factor = [1.8, 1.6, 1.6, 1.45];
    let defpt_factor = [5, 5, 5, 2.5];
    let width_factor = [1.25, 1.25, 1.25, 1.37];
    text_shape.y = node.yvar + node.rvar * node.arcy + this.theight2 * y_factor[index];
    text_shape.width = this.twidth * width_factor[index];
    text_shape.defpt = this.theight2 / defpt_factor[index];
    text_shape.text = node.spec_num_full;
    shapes.push(text_shape);
  }

  live_area_high_res_sponsor_test(node) {
    return this.is_mouse_over_node(node) && !this.is_mouse_over_high_res_inner_circle(node);
  }

  high_res_sponsor_shapes(node, shapes) {
    if (!config.projection.draw_sponsors) return;
    // sort out the text we want to appear
    let sponsor_text = this.get_sponsor_text(node);

    // calculate text size
    let text_width = 2.5/Math.max(32.0,sponsor_text.length);
    // calculate gap between characters (in radians)
    let tempgap = Math.PI*2/(Math.max(32.0,sponsor_text.length))*0.38;
    // calculate the offset needed to centralise the text
    let tempadd = (Math.PI-(sponsor_text.length)*(tempgap))/2.0;
    let node_tr = node.rvar * node.arcr * (1 - config.projection.partl2/2.0);
    let arc_text_shape = ArcTextShape.create();
    if (!this.hovered && this.live_area_high_res_sponsor_test(node)) {
      this.hovered = true;
      this.hovering = true;
      live_area_config.interior_sponsor_text.register_button_event(node);
    }
    if (this.hovering) {
      arc_text_shape.font_style = 'bold';
      arc_text_shape.fill.color = color_theme.get_color('interior.sponsor_text_hover.fill');
    } else {
      arc_text_shape.fill.color = color_theme.get_color('interior.sponsor_text.fill');      
    }
    arc_text_shape.x = node.xvar + node.rvar * node.arcx;
    arc_text_shape.y = node.yvar + node.rvar * node.arcy;
    arc_text_shape.r = node_tr;
    arc_text_shape.text = sponsor_text;
    arc_text_shape.text_direction = -1;
    arc_text_shape.font_style = null;
    arc_text_shape.start_angle = -Math.PI*0.5 - tempadd;
    arc_text_shape.gap_angle = tempgap;
    arc_text_shape.width = node_tr * text_width;
    arc_text_shape.height = 5;
    arc_text_shape.do_fill = true;
    this.hovering = false;
    shapes.push(arc_text_shape);
  }

  low_res_shapes(node, shapes) {
    let condition = config.projection.draw_all_details 
      && node.rvar > config.projection.node_low_res_thres && node.rvar < config.projection.node_high_res_thres;
    if (condition) {
      this.low_res_text_shapes(node, shapes);
      this.low_res_date_shapes(node, shapes);
    }
  }

  low_res_date_shapes(node, shapes) {
    let text_shape = TextShape.create();
    text_shape.text = this.get_date_str(node);
    text_shape.x = node.xvar + node.rvar * node.arcx;
    text_shape.y = node.yvar + node.rvar * node.arcy - this.theight2 * 1.55;
    text_shape.width = this.twidth;
    text_shape.defpt = this.theight2 * 0.6;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color('interior.text.fill', node);
    text_shape.height = 3;
    text_shape.line = 1;
    shapes.push(text_shape);
  }

  fill_low_res_text_style(text_shape, node) {
    text_shape.x = node.xvar + node.rvar * node.arcx;
    text_shape.y = node.yvar + node.rvar * node.arcy;
    text_shape.width = node.rvar * node.arcr * 1.65 * (1-config.projection.partl2/2.0);
    text_shape.defpt = this.theight2 * 0.57;
    text_shape.height = 3;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color('interior.text.fill', node);
  }

  fill_low_res_text_content(text_shape, node) {
    if (node.cname) {
      text_shape.text = node.cname;
      text_shape.line = 3;
    } else if (node.latin_name) {
      text_shape.text = node.latin_name;
      text_shape.line = 2;
    } else if (node.richness_val >= 10000) {
      text_shape.text = node.spec_num_full;
      text_shape.line = 2;
    } else {
      text_shape.text = node.spec_num_full;
      text_shape.line = 1;
    }
  }

  low_res_text_shapes(node, shapes) {
    let text_shape = TextShape.create();
    this.fill_low_res_text_style(text_shape, node);
    this.fill_low_res_text_content(text_shape, node);
    shapes.push(text_shape);
  }

  live_area_interior_circle_test(node) {
    return node.rvar < config.projection.node_high_res_thres && this.is_mouse_over_node(node);
  }

  interior_circle_shapes(node, shapes) {
    let condition = node.rvar > config.projection.node_low_res_thres && config.projection.interior_circle_draw;
    if (!condition) return;
    let arc_shape = ArcShape.create();
    if (!this.hovered && this.live_area_interior_circle_test(node)) {
      this.hovered = true;
      this.hovering = true;
      live_area_config.interior_low_res_circle.register_button_event(node);
    }
    arc_shape.x = node.xvar + node.rvar * node.arcx;
    arc_shape.y = node.yvar + node.rvar * node.arcy;
    arc_shape.r = node.rvar * node.arcr * (1-config.projection.partl2/2.0);
    arc_shape.circle = true;
    arc_shape.height = 2;
    arc_shape.order = "fill_first";
    arc_shape.do_stroke = true;
    arc_shape.stroke.line_width = node.arcr * config.projection.partl2 * node.rvar;
    arc_shape.stroke.color = color_theme.get_color('interior.circle.stroke', node);
    
      /*
       // James - I think this code allows the stroke around an interior circle to be a different colour depending on whether it's a search hit or not. This never happens, which I think is beacuse it's bugged
       // for now I'm simply removing as this was not such an important feature anyway.
       // it MIGHT be so that the paths stop neatly at the edge of the circle - james needs to test this still.
    if (node.has_child) {
      let is_common_ancestor = true;
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        if (!node.children[i].route_to_search) { // the bug is here, requires all descendents to be marked in order for it to work
          is_common_ancestor = false;
          break;
        }
      }
      if (is_common_ancestor) {
        arc_shape.stroke.color = color_theme.get_color('interior.circle_searchin.stroke', node)  
      }      
    }
       */
    arc_shape.do_fill = true;
    arc_shape.fill.color = color_theme.get_color('interior.circle.fill', node);
    if (this.hovering) {
      arc_shape.stroke.color = color_theme.get_color('interior.circle_hover.stroke', node);  
      arc_shape.fill.color = color_theme.get_color('interior.circle_hover.fill', node);
    }
    this.hovering = false;
    shapes.push(arc_shape);
  }

  highlight_part_shapes(node, shapes) {
    if (tree_state.highlighting_this) {
      let arc_shape = ArcShape.create();
      arc_shape.x = node.xvar + node.rvar * node.arcx;
      arc_shape.y = node.yvar + node.rvar * node.arcy;
      arc_shape.r = node.rvar * node.arcr;
      arc_shape.height = 2;
      arc_shape.circle = true;
      arc_shape.do_fill = true;
      arc_shape.fill.color = color_theme.get_color('interior.circle_highlight.outer.fill', node);
      shapes.push(arc_shape);
    }
  }

  get_date_str(node) {
    let date_str;
    if (node.lengthbr > 10) {
      date_str = (Math.round((node.lengthbr)*10)/10.0).toString() + " Ma";
    } else if (node.lengthbr > 1) {
      date_str = (Math.round((node.lengthbr)*100)/100.0).toString()  + " Ma";
    } else if (node.lengthbr > 0) {
      date_str = (Math.round((node.lengthbr)*10000)/10.0).toString()  + " Ka";
    } else {
      date_str = "";
    }
    return date_str;
  }

  get_textonly_header(node) {
    let ntxt = OZstrings['node_labels']['text_only']
    let textonly_header;
    if (node.lengthbr && node.lengthbr>0) {
      let vars = {'date_with_units':ageAsText(node.lengthbr), 'geo_time':gpmapper(node.lengthbr, true)};
      if (is_primary_or_secondary_name(node)) {
        textonly_header = substitute_variables(ntxt['dated']['named'], vars).split("\n").reverse();
      } else {
        textonly_header = substitute_variables(ntxt['dated']['unnamed'], vars).split("\n").reverse();
      }
    } else {
      if (is_primary_or_secondary_name(node)) {
        textonly_header = ntxt['undated']['named'].split("\n").reverse();
      } else {
        textonly_header = ntxt['undated']['unnamed'].split("\n").reverse();
      }
    }
    return textonly_header;
  }

  get_pic_header_text(node) {
    let ntxt = OZstrings['node_labels']['with_pic']
    let pic_header_text;
    //NB - these are in reverse order, as we often don't use the top two lines
    if (node.lengthbr && (node.lengthbr>0)) {
      let vars = {'date_with_units':ageAsText(node.lengthbr), 'geo_time':gpmapper(node.lengthbr, true)};
      if (is_primary_or_secondary_name(node)) {
        pic_header_text = substitute_variables(ntxt['dated']['named'], vars).split("\n").reverse();
      } else {
        pic_header_text = substitute_variables(ntxt['dated']['unnamed'], vars).split("\n").reverse();
      }
    } else {
      if (is_primary_or_secondary_name(node)) {
        pic_header_text = ntxt['undated']['named'].split("\n").reverse();
      } else {
        pic_header_text = ntxt['undated']['unnamed'].split("\n").reverse();
      }
    }
    return pic_header_text;
  }

  get_sponsor_text(node) {
    if (node.cname && node.cname.length > 1 && node.cname.length < 40 && isNaN(node.cname.substring(0, node.cname.length-1))) {
      return substitute_variables(OZstrings['sponsor_text']['node']['named'],{'group_name':node.cname}).toUpperCase();
    } else {
      return OZstrings['sponsor_text']['node']['unnamed'].toUpperCase();
    }  
  }

  is_mouse_over_high_res_inner_circle(node) {
    let mouse_over = false;
    if (node.rvar >= config.projection.node_high_res_thres && tree_state.button_x && tree_state.button_y) {
      let dx_to_node_center = get_abs_x(node, node.arcx) - tree_state.button_x;
      let dy_to_node_center = get_abs_y(node, node.arcy) - tree_state.button_y;
      let button_to_node_center_sqr = dx_to_node_center * dx_to_node_center + dy_to_node_center * dy_to_node_center;
      let node_inner_circle_radius = get_abs_r(node, node.arcr) * (1 - config.projection.partl2);
      let node_inner_circle_radius_sqr = node_inner_circle_radius * node_inner_circle_radius;
      mouse_over = button_to_node_center_sqr < node_inner_circle_radius_sqr;
    }
    return mouse_over;
  }

  is_mouse_over_node(node) {
    if (tree_state.button_x && tree_state.button_y) {      
      let mouse_dist = this.dist_to_node_center(node, tree_state.button_x, tree_state.button_y);
      return mouse_dist < node.rvar * node.arcr;
    } else {
      return false;
    }
  }

  is_mouse_over_high_res_text(node) {
    let mouse_over = false;
    let nodey = node.yvar + node.rvar * node.arcy;
    let noder = node.rvar * node.arcr * (1 - config.projection.partl2/2.0);
    if (this.is_mouse_over_high_res_inner_circle(node)) {
      if (node.latin_name || node.cname) {
        if ((tree_state.button_y > (nodey + noder * 0.55)) || (tree_state.button_y < (nodey - noder * 0.35))) {
          mouse_over = true;
        }
      } else {
        if ((tree_state.button_y > (nodey + noder * 0.4)) || (tree_state.button_y < (nodey - noder * 0.5))) {
          mouse_over = true;
        }
      }
    }
    return mouse_over;
  }

  dist_to_node_center(node, mx, my) {
    let m_dx = get_abs_x(node, node.arcx) - mx;
    let m_dy = get_abs_y(node, node.arcy) - my;
    return Math.sqrt(m_dx * m_dx + m_dy * m_dy);
  }
}

export default NodeLayoutBase;
