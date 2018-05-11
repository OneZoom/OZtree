
function render(context, shape) {
  context.beginPath();
  follow_path(context, shape);
  if (shape.do_stroke) {
    context.lineCap = shape.stroke.line_cap ? shape.stroke.line_cap : "round";
    context.lineWidth = shape.stroke.line_width;
    context.strokeStyle = shape.stroke.color;
    context.stroke();  
  }
  // Render all markings on top of this line
  for (let i = 0; i < shape.markings_list.length; i++) {
    context.lineCap = shape.stroke.line_cap ? shape.stroke.line_cap : "round";
    context.lineWidth = shape.stroke.line_width * (shape.markings_list[i].widthProportion || 1);
    context.strokeStyle = shape.markings_list[i].strokeStyle;
    if (shape.markings_list[i].dashSize) {
        context.setLineDash([shape.markings_list[i].dashSize, 5 * (shape.markings_list[i].dashSize + context.lineWidth / 2)]);
        context.lineDashOffset = i * (shape.markings_list[i].dashSize + context.lineWidth / 2);
    }
    context.stroke();
    if (shape.markings_list[i].dashSize) {
      context.setLineDash([]);
      context.lineDashOffset = 0;
    }
  }
}

function follow_path(context, shape) {
  if (shape.sx) {   
    context.moveTo(shape.sx, shape.sy);
  }
  context.bezierCurveTo(shape.c1x, shape.c1y, shape.c2x, shape.c2y, shape.ex, shape.ey);
}

export {render, follow_path};