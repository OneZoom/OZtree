import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';
import {get_image, image_ready} from '../../image_cache';


class ImageShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.sx = 1.0;
    this.sy = 1.0;
    this.x = 1.0;
    this.y = 1.0;
    this.sw = NaN;
    this.sh = NaN;
    this.w = NaN;
    this.h = NaN;
    this.alpha = 1;  // Specify an alpha-blend level to be used when rendering this image
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
    this.alpha = 1;
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
  render(context) {
    image_render(context, this)
  }
}


function image_render(context, shape) {
  let image = shape.img ? shape.img : get_image(shape.src, shape.filename);
  if (!image_ready(image)) return;

  if (shape.clip || shape.alpha < 1) {
    context.save();
  }
  
  //Clip context.
  //shape.clip maybe a shape object or an array of shapes.
  if (shape.clip) {
    context.beginPath();
    if (Object.prototype.toString.call(shape.clip) === "[object Array]") {
      for (let i=0; i<shape.clip.length; i++) {
        shape.clip[i].follow_path(context);
      }
    } else {
      shape.clip.follow_path(context);
    }
    context.clip();
  }
  
  if (shape.alpha < 1) {
    context.globalAlpha = shape.alpha;
  }
  if (shape.sx && shape.sy && shape.sw && shape.sh) {
    context.drawImage(image, shape.sx, shape.sy, shape.sw, shape.sh, shape.x, shape.y, shape.w, shape.h);  
  } else {
    context.drawImage(image, shape.x, shape.y, shape.w, shape.h);
  }
  
  if (shape.clip || shape.alpha < 1) {
    context.restore();
    context.globalAlpha = 1;
  }
}


ImageShape.obj_pool = new ObjectPool(ImageShape, 200);

export default ImageShape;
