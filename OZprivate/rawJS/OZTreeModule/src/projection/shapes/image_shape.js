import * as renderer from '../../render/image_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class ImageShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.sx = 1.0;
    this.sy = 1.0;
    this.x = 1.0;
    this.y = 1.0;
    this.sw = NaN;
    this.sh = NaN;
    this.w = NaN;
    this.h = NaN;
  }
  release() {
    this.img = null;
    this.src = null;
    this.preferred_res = null;
    this.filename = null;
    this.sw = NaN;
    this.sh = NaN;
    this.w = NaN;
    this.h = NaN;
    if (this.clip) {
      if (Object.prototype.toString.call(this.clip) === "[object Array]") {
        for (let i=0; i<this.clip.length; i++) {
          this.clip[i].free();
        }
      } else {
        this.clip.free();
      }
      this.clip = null;
    }
  }
}

ImageShape.obj_pool = new ObjectPool(ImageShape, 200);

export default ImageShape;