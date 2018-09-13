import get_mouse_interactor from './mouse';
import get_touch_interactor from './touch';

class Interactor {
  constructor() {
    this.mouse_interactor = get_mouse_interactor();
    this.touch_interactor = get_touch_interactor();
  }
  bind_listener(canvas) {
    window.addEventListener('resize', this.window_resize.bind(this), false);
    this.mouse_interactor.bind_listener(canvas);
    this.touch_interactor.bind_listener(canvas);
  }
  add_controller(controller) {
    this.controller = controller;
    this.mouse_interactor.add_controller(controller);
    this.touch_interactor.add_controller(controller);
  }
  window_resize(event) {
    this.controller.trigger_refresh_loop();
  }
}

let interactor;
function get_interactor() {
  if (!interactor) {
    interactor = new Interactor();
  }
  return interactor;
}

export default get_interactor;