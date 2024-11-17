import get_mouse_interactor from './mouse';
import get_touch_interactor from './touch';

const listenForDevicePixelRatioChanges = (callback) => {
  const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
  const media = matchMedia(mqString);
  const onUpdate = () => {
    callback();
    listenForDevicePixelRatioChanges(callback);
  }
  media.addEventListener("change", (onUpdate), { once: true });
};

class Interactor {
  constructor() {
    this.mouse_interactor = get_mouse_interactor();
    this.touch_interactor = get_touch_interactor();
  }
  bind_listener(canvas) {
    window.addEventListener('resize', this.window_resize.bind(this), false);
    listenForDevicePixelRatioChanges(this.window_resize.bind(this));
    this.mouse_interactor.bind_listener(canvas);
    this.touch_interactor.bind_listener(canvas);
  }
  add_controller(controller) {
    this.controller = controller;
    this.mouse_interactor.add_controller(controller);
    this.touch_interactor.add_controller(controller);
  }
  window_resize() {
    this.controller.resize_canvas();
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