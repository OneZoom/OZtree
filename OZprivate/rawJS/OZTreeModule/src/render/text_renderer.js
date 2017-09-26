import {auto_text, auto_text2, auto_text3} from '../util/index';

function render(context, shape) {
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

export {render};