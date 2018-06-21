
let TWO_PI = 2*Math.PI;
  
function render(context, shape) {
  context.beginPath();
  follow_path(context, shape);
  if (shape.order === "fill_first") {
    fill(context, shape);
    stroke(context, shape);
  } else {
    stroke(context, shape);
    fill(context, shape); 
  }
}

/**
 * If shape.circle is true, then the arc is a complete circle.
 */
function follow_path(context, shape) {
  let start_angle, end_angle, counter_wise;
  if (shape.circle) {
    start_angle = 0;
    end_angle = TWO_PI;
    counter_wise = true;
  } else {
    start_angle = shape.start_angle;
    end_angle = shape.end_angle;
    counter_wise = shape.counter_wise;
  }
  context.arc(shape.x, shape.y, shape.r, start_angle, end_angle, counter_wise);
}

function fill(context, shape) {
  if (shape.do_fill) {
    context.fillStyle = shape.fill.color;
    context.fill();
  }
}

function stroke(context, shape) {
  if (shape.do_stroke) {
    if (shape.stroke.shadow) {
      context.shadowBlur = shape.stroke.shadow.blur || 10;
      context.shadowColor = shape.stroke.shadow.color || shape.stroke.color;
    }
    context.lineWidth = shape.stroke.line_width;
    context.strokeStyle = shape.stroke.color;
    context.stroke();
    if (shape.stroke.shadow) {
      context.shadowBlur = 0;
    }
  } 
}

export {render, follow_path};