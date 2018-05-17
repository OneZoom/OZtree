
function render(context, shape) {
  context.beginPath();
  follow_path(context, shape);
  if (shape.do_stroke) {
    context.lineCap = shape.stroke.line_cap ? shape.stroke.line_cap : "round";
    context.lineWidth = shape.stroke.line_width;
    context.strokeStyle = shape.stroke.color;
    if (shape.shadow) {
      context.shadowBlur = shape.shadow.blur || 0;
      context.shadowColor = shape.shadow.color || shape.stroke.color;
    }
    context.stroke();  
    if (shape.shadow) {
      context.shadowBlur = 0;
    }
  }
  // Render all markings on top of this line
  for (let i = 0; i < shape.markings_list.length; i++) {
    context.lineWidth = shape.stroke.line_width * (shape.markings_list[i].widthProportion || 1);
    context.strokeStyle = shape.markings_list[i].strokeStyle
    context.lineCap = 'butt';  // NB: We'd need gaps to support other cap types
    if (shape.markings_list[i].dashSize) {
        let dash = shape.markings_list[i].dashSize;
        // Dash, then a gap for total number of dashes
        context.setLineDash([dash, (shape.markings_list.length - 1) * dash]);
        // Start after i dashes;
        context.lineDashOffset = i * dash;
    }
    if (shape.markings_list[i].shadow) {
      context.shadowBlur = shape.markings_list[i].shadow.blur || 0;
      context.shadowColor = shape.markings_list[i].shadow.color || shape.markings_list[i].strokeStyle;
    }
    context.stroke();
    if (shape.markings_list[i].shadow) {
      context.shadowBlur = 0;
    }
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