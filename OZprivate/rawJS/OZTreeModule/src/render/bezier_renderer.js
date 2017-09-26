
function render(context, shape) {
  context.beginPath();
  follow_path(context, shape);
  if (shape.do_stroke) {
    context.lineCap = shape.stroke.line_cap ? shape.stroke.line_cap : "round";
    context.lineWidth = shape.stroke.line_width;
    context.strokeStyle = shape.stroke.color;
    context.stroke();  
  }
}

function follow_path(context, shape) {
  if (shape.sx) {   
    context.moveTo(shape.sx, shape.sy);
  }
  context.bezierCurveTo(shape.c1x, shape.c1y, shape.c2x, shape.c2y, shape.ex, shape.ey);
}

export {render, follow_path};