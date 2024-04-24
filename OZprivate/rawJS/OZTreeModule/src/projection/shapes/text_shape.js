import BaseShape from './base_shape';
import {ObjectPool, auto_text, auto_text2, auto_text3} from '../../util/index';

class TextShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.font_style = this.font_style ? this.font_style : null;
    this.min_text_size_extra = this.min_text_size_extra ? this.min_text_size_extra : 0;
    this.height = this.height ? this.height : 5;
    this.defpt = 1.0;
    this.x = 1.0;
    this.y = 1.0;
    this.width = 1.0;
    this.line = 1;
    this.do_stroke = false;
    this.do_fill = false;
    this.stroke  = {
      line_cap: 'round',
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.fill = {
      color: 'rgb(255, 255, 255)'
    }
  }
  release() {
    this.do_stroke = false;
    this.do_fill = false;
    this.line = 1;
    this.font_style = null;
  }
  render(context) {
    return text_render(context, this);
  }
}

function text_render(context, shape) {
  let handler = null;
  if (!shape.line || shape.line === 1) {
    handler = auto_text;
  } else if (shape.line && shape.line === 2) {
    handler = auto_text2;
  } else if (shape.line && shape.line === 3) {
    handler = auto_text3;
  }
  if (handler) {
    if (shape.do_stroke) {
      context.strokeStyle = shape.stroke.color;
      context.lineWidth = shape.stroke.line_width;
      if (shape.stroke.line_cap) {
        context.lineCap = shape.stroke.line_cap;
      }
    }
    
    if (shape.do_fill) {
      context.fillStyle = shape.fill.color;
    }
    handler(shape.do_stroke, shape.font_style, shape.text, shape.x, shape.y, shape.width, shape.defpt, context, shape.min_text_size_extra);
  }    
}

TextShape.obj_pool = new ObjectPool(TextShape, 1000);

export default TextShape;
