import tree_state from '../tree_state';
import {record_url_delayed} from '../navigation/record';
import {global_button_action} from '../button_manager';
import config from '../global_config';
import { call_hook } from '../util';

class MouseInteractor {
  constructor() {
    this.mouseX = null;
    this.mouseY = null;
    this.clicking = false;
    this.scrolling = false;
    this.timeLastScroll = null;
  }
  
  add_controller(controller) {
    this.controller = controller;
  }
  
  bind_listener(canvas) {
    this.canvas = canvas;
    canvas.onmousedown = this.mouse_down.bind(this);
    canvas.onmouseup = this.mouse_up.bind(this);
    canvas.onmouseout = this.mouse_out.bind(this);
    canvas.onmousemove = this.mouse_move.bind(this);
    canvas.onmouseover = this.mouse_in.bind(this);
    canvas.onkeydown = this.key_down.bind(this);
    canvas.onkeyup = this.key_up.bind(this);
    if (canvas.addEventListener) {
      canvas.addEventListener('wheel', this.mouse_wheel.bind(this), false);
      canvas.addEventListener('dblclick', this.mouse_dblclick.bind(this), false);
    } else if (canvas.attachEvent) {
      canvas.attachEvent('onmousewheel', this.mouse_wheel.bind(this));
    }
  }
  
  mouse_dblclick(event) {
    if (!call_hook('mouse_dblclick')) return;
    
    this.controller.cancel_flight();
    set_mouse_position(this, event);
    tree_state.mouse_hold = false;
    this.clicking = false;
    if (!global_button_action.action) {
      this.controller.dbl_click(this.mouseX, this.mouseY);
    }
  }
  
  mouse_wheel(event) {
    if (!call_hook('mouse_wheel')) return;

    this.controller.cancel_flight();
    event.preventDefault();
    event.stopPropagation();
    var canvas = this.canvas
    let delta = ('wheelDelta' in event) ? event.wheelDelta : -event.detail/2;
    // 0.84 is sensitivity
    let temp_sensitivity = config.sensitivity;
    let timeNow =(new Date().getTime())
    if(this.timeLastScroll && (timeNow - this.timeLastScroll)<40) {
      temp_sensitivity = Math.pow(temp_sensitivity,((timeNow - this.timeLastScroll)/40))
    }
    this.timeLastScroll= timeNow;
    
    set_mouse_position(this, event);
        
    if (Math.abs(delta - 0) > 0.05) {
      record_url_delayed(this.controller);
      /* set cursor to zoom-in or zoom-out, but set it to go back to default if we haven't scolled for a while */
      if (this.cursor_animator) clearInterval(this.cursor_animator);
      this.cursor_animator = setTimeout(function(){canvas.style.cursor='default';}, 250);
      if ((parseFloat(delta)) > 0.0) {
        canvas.style.cursor='zoom-in';
        this.controller.zoomin(this.mouseX, this.mouseY, temp_sensitivity);
      } else {
        canvas.style.cursor='zoom-out';
        this.controller.zoomout(this.mouseX, this.mouseY, temp_sensitivity);
      }
    }  
  }
  
  mouse_down(event) {
    if (!call_hook('mouse_down')) return;

    this.controller.cancel_flight();
    set_mouse_position(this, event);
    this.clicking = true;
    tree_state.mouse_hold = true;
    var canvas = this.canvas
    this.cursor_animator = setTimeout(function(){canvas.style.cursor='move';}, 150);
    this.controller.trigger_refresh_loop();
  }
  
  mouse_move(event) {
    if (!call_hook('mouse_move')) return;

    if (tree_state.mouse_hold) {
      let new_mouse_x = event.clientX - this.canvas.offsetLeft;
      let new_mouse_y = event.clientY - this.canvas.offsetTop;
      let delta_x = new_mouse_x - this.mouseX;
      let delta_y = new_mouse_y - this.mouseY;
      set_mouse_position(this, event);
      
      //could check here for this.scrolling, and implement the equivalent of
      //mouse_wheel(event) when e.g. to zoom when mouse moved && shift key down
      
      this.clicking = this.clicking && is_clicking(delta_x, delta_y);
      this.controller.pan(delta_x, delta_y);
    } else {
      set_mouse_position(this, event);
    }
  }
  
  mouse_up(event) {
    if (!call_hook('mouse_up')) return;

    /**
     * It's important to call record_url_delayed before controller.click. 
     * Controller.click might record url immediately and if call record_url_delayed after controller.click, then
     * record_url would be called twice.
     * 
     * On the other hand, if call record_url_delayed before controller.click, when controller.click calls record_url, since 
     * record_url would clear timer set by record_url_delayed function, only one record_url would be called as a result.
     */
    record_url_delayed(this.controller);
    if (this.cursor_animator) clearInterval(this.cursor_animator);
    this.canvas.style.cursor='default';
    if (this.clicking) {
      this.controller.click();
    }
    this.clicking = false;
    tree_state.mouse_hold = false;
    this.controller.trigger_refresh_loop();
  }

  mouse_out(event) {
    this.clicking = false;
    tree_state.mouse_hold = false;
    this.canvas.style.cursor='default';
    this.scrolling=false;
  }

  mouse_in(event) {
    this.canvas.style.cursor='default';
  }
  
  key_down(event) {
  }

  key_up(event) {
  }

}

function set_mouse_position(interactor, event) {
  interactor.mouseX = event.clientX - interactor.canvas.offsetLeft;
  interactor.mouseY = event.clientY - interactor.canvas.offsetTop;
  tree_state.button_x = interactor.mouseX;
  tree_state.button_y = interactor.mouseY;
  interactor.controller.trigger_refresh_loop();
}

/**
 * If mouse move longer than 3 pixels, then it would not be considered as click.
 */
function is_clicking(delta_x, delta_y) {
  return Math.pow(delta_x,2)<9 && Math.pow(delta_y,2)<9
}


let mouse_interactor;
function get_mouse_interactor() {
  if (!mouse_interactor) {
    mouse_interactor = new MouseInteractor();
  }
  return mouse_interactor;
}
export default get_mouse_interactor;