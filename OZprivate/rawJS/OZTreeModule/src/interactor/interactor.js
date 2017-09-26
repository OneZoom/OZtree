import get_mouse_interactor from './mouse';
import get_touch_interactor from './touch';

class Interactor {
  constructor() {
    this.mouse_interactor = get_mouse_interactor();
    this.touch_interactor = get_touch_interactor();
  }
  bind_listener(canvas) {
    this.mouse_interactor.bind_listener(canvas);
    this.touch_interactor.bind_listener(canvas);
  }
  add_controller(controller) {
    this.mouse_interactor.add_controller(controller);
    this.touch_interactor.add_controller(controller);
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