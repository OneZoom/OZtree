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
    this.border_radius = null;
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
    this.border_radius = null;
  }
  render(context) {
    image_render(context, this)
  }
}


function image_render(context, shape) {
  let image = shape.img ? shape.img : get_image(shape.src, shape.filename);
  if (!image_ready(image)) return;

  if (shape.border_radius || shape.alpha < 1) {
    context.save();
  }
  
  if (shape.border_radius) {
     context.beginPath();
     image_border_path(
       shape.x,
       shape.y,
       shape.w,
       shape.h,
       shape.border_radius,
       context
     );
     context.closePath();
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
  
  if (shape.border_radius || shape.alpha < 1) {
    context.restore();
    context.globalAlpha = 1;
  }
}

function image_border_path(x, y, width, height, radius, context) {
  if (radius === true) {
     // border_radius === true means a circle
     const radius = (width / 2);
     context.arc(
       x + radius,
       y + radius,
       radius,
       0,
       2 * Math.PI,
     );
  } else {
    // https://stackoverflow.com/a/19593950
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
  }
}

ImageShape.obj_pool = new ObjectPool(ImageShape, 200);

export default ImageShape;
