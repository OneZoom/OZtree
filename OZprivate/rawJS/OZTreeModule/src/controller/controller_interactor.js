import tree_state from '../tree_state';
import * as position_helper from '../position_helper';
import config from '../global_config';
import {global_button_action, click_on_button_cb, is_popup_state} from '../button_manager';
import {record_url} from '../navigation/record';

/**
 * Part of Controller class. It contains functions for mouse and touch events.
 */
export default function (Controller) {
  Controller.prototype.get_anim_speed = function() {
    return position_helper.get_anim_speed();
  }
  
  Controller.prototype.set_anim_speed = function(val) {
    let prev_speed = this.get_anim_speed();
    position_helper.set_anim_speed(val);
    console.log('Current anim speed is ' + val);
    console.log('Previous speed was ' + prev_speed);
    console.log('Be caution: the greater anim speed you set, the slower the animation would be. The default value is 10');
  }
  
  Controller.prototype.pan_and_zoom = function(dx, dy, cx, cy, scale) {
    tree_state.set_action("pan_and_zoom");
    this.pan(dx, dy, true);
    if (scale > 1) {
      this.zoomin(cx, cy, 1/scale, true);  
    } else {
      this.zoomout(cx, cy, scale, true);
    }    
  }
  
  Controller.prototype.zoomin = function(cx, cy, scale, called_from_other_action) {
    if (tree_state.ok_zoom && tree_state.ok_lim) {
      if (!called_from_other_action) {
        tree_state.set_action("zoomin");  
      }      
      tree_state.ws = tree_state.ws/scale;
      tree_state.xp = cx + (tree_state.xp - cx)/scale;
      tree_state.yp = cy + (tree_state.yp - cy)/scale;
      this.re_calc();
      this.trigger_refresh_loop();
    }
  }
  
  Controller.prototype.zoomout = function(cx, cy, scale, called_from_other_action) {
    let root = this.root;
    if (root.rvar*(root.hxmax-root.hxmin) < tree_state.widthres*0.7 && root.rvar*(root.hymax-root.hymin) < tree_state.heightres*0.7) {
      return;
    }      
    if (!called_from_other_action) {
      tree_state.set_action("zoomout");  
    }    
    tree_state.ws = tree_state.ws * scale;
    tree_state.xp = cx + (tree_state.xp - cx)*scale;
    tree_state.yp = cy + (tree_state.yp - cy)*scale;
    this.re_calc();
    this.trigger_refresh_loop();
  }
  
  Controller.prototype.pan = function(delta_x, delta_y, called_from_other_action) {
    let dir = '';
    if (delta_x > 0 && tree_state.ok_right === 1) {
      tree_state.xp += delta_x;    
      dir += 'left';
    } else if (delta_x <= 0 && tree_state.ok_left === 1) {
      tree_state.xp += delta_x;    
      dir += 'right';
    }
    
    if (delta_y > 0 && tree_state.ok_down === 1) {
      tree_state.yp += delta_y;    
      dir += 'up';
    }  else if (delta_y <= 0 && tree_state.ok_up === 1) {
      tree_state.yp += delta_y;
      dir += 'down';
    }   
    if (dir && !called_from_other_action) {
      tree_state.set_action("pan-" + dir);
    }
    this.re_calc();
    this.trigger_refresh_loop();
  }
  
  /**
   * Call live area callbacks if click on live area.
   * If a popup window is opened, record url before and after open the popup. If click to jump, then record url after jump. If click to fly, url will be recorded 
   * when the fly is finished.
   */
  Controller.prototype.click = function() {
    this.close_all();
    if (is_popup_state()) {
      record_url();
    }
    
    click_on_button_cb(this); 
    
    if (is_popup_state()) {
      record_url({record_popup: true});
    } else if (global_button_action.action === "jump") {
      record_url();
    }
  }
  
  /**
   * Double click to zoom at (mx, my) with an total sensitivity of Math.pow(config.anim.zoom_sensitivity, 4)
   */
  Controller.prototype.dbl_click = function(mx, my) {
    this.zoomin_anim(mx, my, config.anim.zoom_sensitivity, 4);
  }
}
