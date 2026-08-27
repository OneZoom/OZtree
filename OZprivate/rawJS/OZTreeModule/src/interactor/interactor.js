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
    const on_resize = this.window_resize.bind(this);
    listenForDevicePixelRatioChanges(on_resize);
    // canvas size can change without a window resize (e.g. editor sidebar).
    if (typeof ResizeObserver !== 'undefined') {
      this.resize_observer = new ResizeObserver(on_resize);
      this.resize_observer.observe(canvas);
    } else {
      window.addEventListener('resize', on_resize, false);
    }
    this.mouse_interactor.bind_listener(canvas);
    this.touch_interactor.bind_listener(canvas);
  }
  add_controller(controller) {
    this.controller = controller;
    this.mouse_interactor.add_controller(controller);
    this.touch_interactor.add_controller(controller);
  }
  window_resize() {
    if (!this.controller || !this.controller.canvas) return;
    const canvas = this.controller.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio;
    if (this._observed_width === width && this._observed_height === height && this._observed_dpr === dpr) {
      return;
    }
    this._observed_width = width;
    this._observed_height = height;
    this._observed_dpr = dpr;
    this.controller.resize_canvas();
    // Draw immediately so that there's no blank frames
    this.controller.draw_single_frame();
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