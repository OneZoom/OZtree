import tree_state from '../../tree_state';
import {color_theme} from '../../themes/color_theme';
import ArcShape from '../shapes/arc_shape';
import TextShape from '../shapes/text_shape';
import ImageShape from '../shapes/image_shape';
import * as tree_setting from '../../tree_setting';
import {get_image, image_ready} from '../../image_cache'
import {global_button_action} from '../../button_manager';
import {live_area_config} from '../live_area_config';

class SignpostLayoutBase {
  get_shapes(node, shapes) {
      //*
    this.reset_hover_state();
    this.calc_center_point(node);
    if (!this.hovered && this.is_mouse_over_signpost(node)) {
      this.hovering = true;
      this.hovered = true;
      live_area_config.signpost.register_button_event(node);
    }
    this.pic_shapes(node, shapes);
    this.name_shapes(node, shapes);
    this.hovering = false;
       //*/
  }

  reset_hover_state() {
    this.hovered = global_button_action.action != null;
    this.hovering = false;
  }

  calc_center_point(node) {
    let ratio12 = 0.2;
    let ratio12r = 0.2;
    if (tree_setting.viewtype == "fern") {
      ratio12 = 0.0;
      ratio12r = 0.3;
    }
    
    if (tree_setting.viewtype == "natural") {
      ratio12 = 0.0;
      ratio12r = 0.0;
    }
    
    let centerpointx2 = node.xvar + node.rvar * (node.hxmax + node.hxmin) / 2;
    let centerpointy2 = node.yvar + node.rvar * (node.hymax + node.hymin) / 2;
    let radiusr2 = node.rvar * (node.hxmax - node.hxmin) * 0.40;
    
    let centerpointx3 = node.xvar + node.rvar * node.arcx;
    let centerpointy3 = node.yvar + node.rvar * node.arcy;
    let radiusr3 = node.rvar * node.arcr * 6.0;
    
    this.centerx = ratio12 * centerpointx3 + (1 - ratio12) * centerpointx2;
    this.centery = ratio12 * centerpointy3 + (1 - ratio12) * centerpointy2;
    this.centerr = ratio12r * radiusr3 + (1 - ratio12r) * radiusr2;
  }

  pic_shapes(node, shapes) {
    if (node.num_pics > 0) {
      let pic_info = node.get_picset_src_info(0);
      let image = get_image(pic_info[0],pic_info[1]);
      if (!image_ready(image)) return;
      
      let image_shape = ImageShape.create();
      image_shape.src = pic_info[0];  
      image_shape.filename = pic_info[1];  
      image_shape.x = this.centerx - this.centerr * 0.97 * 0.6;
      image_shape.y = this.centery - this.centerr * 0.97 * 0.6;
      image_shape.w = this.centerr * 2 * 0.97 * 0.6;
      image_shape.h = this.centerr * 2 * 0.97 * 0.6;
      image_shape.height = 5;
      let arc_shape = ArcShape.create();
      arc_shape.x = this.centerx;
      arc_shape.y = this.centery;
      arc_shape.r = this.centerr * 0.97 * 0.6;
      arc_shape.circle = true;
      image_shape.clip = arc_shape;
      shapes.push(image_shape);
      
      arc_shape = ArcShape.create();
      if (this.hovering) {
        arc_shape.r = this.centerr * 1.02 * 0.6;
        arc_shape.stroke.color = color_theme.get_color("signpost.pic_hover.stroke", node);
      } else {
        arc_shape.r = this.centerr * 0.6;
        arc_shape.stroke.color = color_theme.get_color("signpost.pic.stroke", node);
      }
      arc_shape.x = this.centerx;
      arc_shape.y = this.centery;
      arc_shape.circle = true;
      arc_shape.height = 6;
      arc_shape.do_stroke = true;
      arc_shape.stroke.line_width = this.centerr * 0.03 * 0.6;
      shapes.push(arc_shape);
      
      arc_shape = ArcShape.create();
      arc_shape.x = this.centerx;
      arc_shape.y = this.centery;
      arc_shape.r = this.centerr * 0.97 * 0.6;
      arc_shape.circle = true;
      arc_shape.height = 6;
      arc_shape.do_stroke = true;
      arc_shape.stroke.line_width = this.centerr * 0.03 * 0.6;
      arc_shape.stroke.color = color_theme.get_color("signpost.pic_inner.stroke", node);
      shapes.push(arc_shape);
    }
  }

  name_shapes(node, shapes) {
    if (node.num_pics === 0) {
      this.name_without_pic_shapes(node, shapes);
    } else {
      this.name_with_pic_shapes(node, shapes);
    }
  }

  name_with_pic_shapes(node, shapes) {
    let text = node.cname ? node.cname  : node.latin_name;
    let text_shape = TextShape.create();
    if (this.hovering) {
      text_shape.stroke.color = color_theme.get_color("signpost.pic_text_hover.stroke", node);
      text_shape.fill.color = color_theme.get_color("signpost.pic_text_hover.fill", node);
    } else {
      text_shape.stroke.color = color_theme.get_color("signpost.pic_text.stroke", node);
      text_shape.fill.color = color_theme.get_color("signpost.pic_text.fill", node);
    }
    text_shape.text = text;
    text_shape.x = this.centerx;
    text_shape.y = this.centery + this.centerr * 0.6;
    text_shape.width = this.centerr * 1.7;
    text_shape.defpt = Math.min(this.centerr*0.17, 25);
    text_shape.min_text_size = 9;
    text_shape.line = 2;
    text_shape.height = 7;
    text_shape.do_stroke = true;
    text_shape.stroke.line_width = Math.min(this.centerr*0.08, 6);
    text_shape.stroke.line_cap = 'round';
    text_shape.do_fill = true;
    shapes.push(text_shape);
  }

  name_without_pic_shapes(node, shapes) {
    let text_shape = TextShape.create();
    if (this.hovering) {
      text_shape.stroke.color = color_theme.get_color("signpost.pic_text_hover.stroke", node);
      text_shape.fill.color = color_theme.get_color("signpost.pic_text_hover.fill", node);
    } else {
      text_shape.stroke.color = color_theme.get_color("signpost.pic_text.stroke", node);
      text_shape.fill.color = color_theme.get_color("signpost.pic_text.fill", node);
    }
    text_shape.text = node.cname ? node.cname  : node.latin_name;
    text_shape.x = this.centerx;
    text_shape.y = this.centery;
    text_shape.width = this.centerr * 2;
    text_shape.defpt = Math.min(this.centerr*0.6, 25);
    text_shape.line = 2;
    text_shape.height = 7;
    text_shape.do_stroke = true;
    text_shape.stroke.line_width = Math.min(this.centerr*0.08, 6);
    text_shape.stroke.line_cap = 'round';
    text_shape.do_fill = true;
    shapes.push(text_shape);
  }

  is_mouse_over_signpost(node) {
    if (tree_state.button_x && tree_state.button_y) {
      let dist_to_center = this.dist_to_node_center(node, tree_state.button_x, tree_state.button_y);
      let radius = this.centerr * 0.6;
      return dist_to_center < radius;
    }
  }


  dist_to_node_center(node, mx, my) {
    let m_dx = this.centerx - mx;
    let m_dy = this.centery - my;
    return Math.sqrt(m_dx * m_dx + m_dy * m_dy);
  }
}

export default SignpostLayoutBase;
