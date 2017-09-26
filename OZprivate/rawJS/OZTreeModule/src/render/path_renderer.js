function render(context, shape) {
  context.beginPath();
  follow_path(context, shape);
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

function follow_path(context, shape) {
  if (shape.path_length === 0) {
    throw new Error("Path shape length not defined. Have you forgot to set path shape length?");
  }
  for (let i=0; i<shape.path_length; i++) {
    let _shape = shape.path[i];
    _shape.renderer.follow_path(context, _shape);
  }
}

export {render, follow_path};