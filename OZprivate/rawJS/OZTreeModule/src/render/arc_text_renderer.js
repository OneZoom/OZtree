function render(context, shape) {
  // save the context state so we don't mess it up
  context.save();    
  // we need a monospaced font in order for this not to look rubbish
  if (shape.font_style) {
    context.font = shape.font_style + ' ' + ((Math.floor(shape.width)).toString() + 'px courier');
  } else {
    context.font = ((Math.floor(shape.width)).toString() + 'px courier');
  }
  // context.fillStyle = textColor;
  if (shape.do_fill) {
    context.fillStyle = shape.fill.color;
  }
  
  context.translate(shape.x, shape.y);
  context.rotate(shape.start_angle);
  if (shape.text_direction == -1) {
    context.rotate(Math.PI)
  }
  
  // loop around each character
  for (let i = 0 ; i < shape.text.length ; i ++) {
    // push context onto context state stack
    context.save();
    // move from centre to edge of circle
    context.translate(0,shape.text_direction*(-shape.r));
    // fill text
    context.fillText(shape.text[i],0,0);
    // restore context by popping back from context state stack
    context.restore();
    // rotate ready for next position
    context.rotate(shape.text_direction*shape.gap_angle);
  }
  
  // restore the context
  context.restore();
}

export {render};