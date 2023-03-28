import tree_state from '../tree_state';
import {record_url_delayed} from '../navigation/record';
import { call_hook } from '../util';

class TouchInteractor {
  constructor() {
    this.touchX = [];
    this.touchY = [];
    this.clicking = false;
  }
  
  add_controller(controller) {
    this.controller = controller;
  }
  
  bind_listener(canvas) {
    this.canvas = canvas;
    canvas.addEventListener("touchstart", this.touch_start.bind(this), false);
    canvas.addEventListener("touchmove", this.touch_move.bind(this), false);
    canvas.addEventListener("touchend", this.touch_end.bind(this), false);
  }
  touch_start(event) {
    if (!call_hook('touch_start')) return;

    this.controller.close_all();
    event.preventDefault();
    event.stopPropagation();
    this.controller.cancel_flight();
    set_finger_position(this, event);
    tree_state.touch_hold = true;
    if(event.targetTouches.length >= 2) {
      this.clicking = false;          
    } else if (event.targetTouches.length == 1) {      
      this.clicking = true;
    }
    // Jog the tree slightly to ensure that node hover-over states update
    // NB: Obviously a hack, ideally we'd force this update without - see #155
    this.controller.pan(1, 0);
  }
  
  touch_move(event) {
    if (!call_hook('touch_move')) return;

    event.preventDefault();    
    event.stopPropagation();
    if(event.targetTouches.length >= 2) {// might need to fix this
      //finger positions [f1x, f1y],  [f2x, f2y]
      let f1x = get_touch_x(this, event.targetTouches[0]);
      let f1y = get_touch_y(this, event.targetTouches[0]);
      let f2x = get_touch_x(this, event.targetTouches[1]);
      let f2y = get_touch_y(this, event.targetTouches[1]);
      
      //d1 =  distance(finger 1, previous finger 1),  d2 = (finger 2, previous finger 2)
      let d1 = get_dist_btw_points(f1x, f1y, this.touchX[0], this.touchY[0]);
      let d2 = get_dist_btw_points(f2x, f2y, this.touchX[1], this.touchY[1]);
      
      //scale point. 
      //The scale point sits in the middle of two fingers.
      //(d1+d2 == 0) => center of two fingers (both finger not moved.)
      //(d1+d2 > 0) => move the scale point closer to the finger which moves less.
      //If one of the finger is motionless, then the scale point would be on that finger. The tree would scale centered on that finger.
      let cx = (d1+d2) ? ((f1x * d2 + f2x * d1) / (d1 + d2)) : (f1x/2 + f2x/2);
      let cy = (d1+d2) ? ((f1y * d2 + f2y * d1) / (d1 + d2)) : (f1y/2 + f2y/2);
      
      //Calculate delta_x and delta_y to drag the tree.
      let delta_x = f1x/2 + f2x/2 - this.touchX[0]/2 - this.touchX[1]/2;
      let delta_y = f1y/2 + f2y/2 - this.touchY[0]/2 - this.touchY[1]/2;
      
      
      let dist_btw_fingers = get_dist_btw_points(f1x, f1y, f2x, f2y);
      let dist_btw_prev_fingers = get_dist_btw_points(this.touchX[0], this.touchY[0], this.touchX[1], this.touchY[1]);
      let zoomfactor = dist_btw_fingers / dist_btw_prev_fingers;
      this.controller.pan_and_zoom(delta_x, delta_y, cx, cy, zoomfactor);      
    } else if (event.targetTouches.length == 1) {
      let delta_x = get_touch_x(this, event.targetTouches[0]) - this.touchX[0];
      let delta_y = get_touch_y(this, event.targetTouches[0]) - this.touchY[0];
      this.clicking = this.clicking && is_clicking(delta_x, delta_y);
      this.controller.pan(delta_x, delta_y);
    }
    set_finger_position(this, event);        
  }
  
  touch_end(event) {
    if (!call_hook('touch_end')) return;
    
    event.preventDefault();    
    event.stopPropagation();
    if(event.targetTouches.length == 0) {
      /**
       * It's important to call record_url_delayed before controller.click. 
       * Controller.click might record url immediately and if call record_url_delayed after controller.click, then
       * record_url would be called twice.
       * 
       * On the other hand, if call record_url_delayed before controller.click, when controller.click calls record_url, since 
       * record_url would clear timer set by record_url_delayed function, only one record_url would be called as a result.
       */
      record_url_delayed(this.controller);
      tree_state.touch_hold = false;
      if (this.clicking) {
        this.controller.click();
      }
      tree_state.button_x = null;
      tree_state.button_y = null;
      this.clicking = false;
    } else if(event.targetTouches.length == 1) {
      this.clicking = false;
      set_finger_position(this, event);
    } else if(event.targetTouches.length >= 2) {
      set_finger_position(this, event);
    }
  }
}

function get_dist_btw_points(x1, y1, x2, y2) {
  let dist_sqrt = (x1-x2) * (x1-x2) + (y1-y2) * (y1-y2);
  return Math.pow(dist_sqrt, 0.5);
}

function set_finger_position(interactor, event) {
  let touch = event.targetTouches[0];
  interactor.touchX[0] = get_touch_x(interactor, touch);
  interactor.touchY[0] = get_touch_y(interactor, touch);
  
  if (event.targetTouches.length >= 2) {
    touch = event.targetTouches[1];
    interactor.touchX[1] = get_touch_x(interactor, touch);
    interactor.touchY[1] = get_touch_y(interactor, touch);
    //button (x,y) is used when detecting live area. Do not highlight live area when two fingers on screen.
    tree_state.button_x = null;
    tree_state.button_y = null;
  } else {
    interactor.touchX[1] = null;
    interactor.touchY[1] = null;
    tree_state.button_x = interactor.touchX[0];
    tree_state.button_y = interactor.touchY[0];
  }
}

function get_touch_x(interactor, touch) {
  return touch.pageX - interactor.canvas.offsetLeft;
}

function get_touch_y(interactor, touch) {
  return touch.pageY - interactor.canvas.offsetTop;
}

function is_clicking(delta_x, delta_y) {
  return Math.pow(delta_x,2)<25 && Math.pow(delta_y,2)<25
}

let touch_interactor;
function get_touch_interactor() {
  if (!touch_interactor) {
    touch_interactor = new TouchInteractor();    
  }
  return touch_interactor;
}

export default get_touch_interactor;