import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class PathShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.x = NaN;
    this.y = NaN;
    this.do_fill = false;
    this.do_stroke = false;
    this.path = new Array(9);
    this.path_length = 0;
    this.fill = {
      color: 'rgb(255, 255, 255)'
    };
    this.stroke = {
      color: 'rgb(255, 255, 255)',
      linw_width: 1
    }
  }
  release() {
    for (let i=0; i<this.path_length; i++) {
      let _shape = this.path[i];
      _shape.free();  
    }
    this.path_length = 0;
    this.do_fill = false;
    this.do_stroke = false;
  }
  render(context) {
    return path_render(context, this);
  }
  follow_path(context) {
    return path_follow_path(context, this);
  }
}

function path_render(context, shape) {
  context.beginPath();
  shape.follow_path(context);
  if (shape.do_fill) {
    context.fillStyle = shape.fill.color;
    context.fill();
  }
  if (shape.do_stroke) {
    context.lineWidth = shape.stroke.line_width;
    context.strokeStyle = shape.stroke.color;
    context.stroke();
  } 
}

function path_follow_path(context, shape) {
  if (shape.path_length === 0) {
    throw new Error("Path shape length not defined. Have you forgot to set path shape length?");
  }
  for (let i=0; i<shape.path_length; i++) {
    shape.path[i].follow_path(context);
  }
}


PathShape.obj_pool = new ObjectPool(PathShape, 4500);

export default PathShape;
