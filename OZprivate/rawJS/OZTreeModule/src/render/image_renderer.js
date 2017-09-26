import {get_image, image_ready} from '../image_cache';

function render(context, shape) {
  let image = shape.img ? shape.img : get_image(shape.src, shape.filename);
  if (!image_ready(image)) return;
  
  //Clip context.
  //shape.clip maybe a shape object or an array of shapes.
  if (shape.clip) {
    context.save();
    context.beginPath();
    if (Object.prototype.toString.call(shape.clip) === "[object Array]") {
      for (let i=0; i<shape.clip.length; i++) {
        shape.clip[i].renderer.follow_path(context, shape.clip[i]);
      }
    } else {
      shape.clip.renderer.follow_path(context, shape.clip);
    }
    context.clip();
  }
  
  if (shape.sx && shape.sy && shape.sw && shape.sh) {
    context.drawImage(image, shape.sx, shape.sy, shape.sw, shape.sh, shape.x, shape.y, shape.w, shape.h);  
  } else {
    context.drawImage(image, shape.x, shape.y, shape.w, shape.h);
  }
  
  
  if (shape.clip) {
    context.restore();
  }
}

export {render};