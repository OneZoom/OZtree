import config from './global_config';
import {call_hook} from './util/index';

/*
 * Extract this class from controller otherwise controller and interactor would rely on each other: controller setup interactor, interactor relies on xp, yp, ws, flying state and so on.
 * I think it's best to extract the data which represents the tree current state out of controller, then this object would be like a service provider for other modules.
 */

class TreeState {
  constructor(canvas, root) {
    this._flying = false;
    this._xp = null;
    this._yp = null;
    this._ws = null;
    this.ok_up = true;
    this.ok_down = true;
    this.ok_left = true;
    this.ok_right = true;
    this.ok_zoom = true;
    this.ok_lim = true;
    this.global_button_action = null;
    this.min_text_size = 3;
    this.threshold = config.threshold.default;
    this.recommond_threshold = config.threshold.default;
    this.action = null;
    this.canvas_repaint_recently = false;
    this.fly_timer = null;
    this.handler = {};
    this.url_parsed = false;
    let self = this;
    setTimeout(function() {
      self.url_parsed = true;
    }, 5000);
  }
  setup_canvas(canvas) {
    this._canvas = canvas;
    if (this._xp === null) {
      this._xp = canvas.width/3;
      this._yp = canvas.height - 200;
      this._ws = 1;   
    }
    this.widthres = canvas.width;
    this.heightres = canvas.height;
    call_hook("window_size_change");
  }
  get flying() {
    return this._flying;
  }
  set flying(val) {
    this._flying = val;
    if (val === false) {
      clearTimeout(this.fly_timer);
      call_hook("flying_finish");
    }
  }
  get xp() {
    return this._xp;
  }
  get yp() {
    return this._yp;
  }
  get ws() {
    return this._ws;
  }
  set xp(val) {
    if (!isNaN(val)) {
      this._xp = val;
    } else {
      throw new Error("xp is NaN");
    }
  }
  set yp(val) {
    if (!isNaN(val)) {
      this._yp = val;
    } else {
      throw new Error("yp is NaN");
    } 
  }
  set ws(val) {
    if (!isNaN(val)) {
      this._ws = val;
    } else {
      throw new Error("ws is NaN");
    }
  }
  set_action(action) {
    this.action = action;
    this.action_timestamp = new Date().getTime();
  }
  is_idle() {
    if (this.action) {
      let now = new Date().getTime();
      if ((now - this.action_timestamp) > 400) {
        this.action = null;
      }
    }
    return this.action === null;
  }
  is_dragging() {
    return this.action === "pan" && (this.mouse_hold || this.touch_hold);
  }
  print_pos() {
    console.log("(xp, yp, ws) -> (" + this.xp.toFixed(0) + ", " + this.yp.toFixed(0) + ", " + this.ws.toFixed(4) + ")");
  }
}

let tree_state = new TreeState();

export default tree_state;