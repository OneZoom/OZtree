import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

const TWO_PI = 2*Math.PI;

class ArcShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.x = 1.0;
    this.y = 1.0;
    this.r = 1.0;
    this.order = null;
    this.circle = false;
    this.stroke  = {
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.fill = {
      color: 'rgb(255, 255, 255)'
    }
  }
  release() {
    this.do_stroke = false;
    this.stroke  = {
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.do_fill = false;
    this.order = null;
    this.circle = false;
  }
  render(context) {
    context.beginPath();
    this.follow_path(context);
    if (this.order === "fill_first") {
      fill(context, this);
      stroke(context, this);
    } else {
      stroke(context, this);
      fill(context, this); 
    }
  }
  follow_path(context) {
    return arc_follow_path(context, this);
  }
}

/**
 * If shape.circle is true, then the arc is a complete circle.
 */
function arc_follow_path(context, shape) {
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
  if (shape.do_fill == 'erase') {
    let prev = context.globalCompositeOperation;
    context.globalCompositeOperation = 'destination-out';
    context.fill();
    context.globalCompositeOperation = prev;
  } else if (shape.do_fill) {
    if (shape.fill.color.from) {
        // { from: (color at centre), start: (optional: inner radius of solid color), to: (optional: color at edge, or transparent) }
        let gradient = context.createRadialGradient(
            shape.x, shape.y, shape.fill.color.start || 0,
            shape.x, shape.y, shape.r
        );
        gradient.addColorStop(0, shape.fill.color.from);
        gradient.addColorStop(1, shape.fill.color.to || 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
    } else {
        context.fillStyle = shape.fill.color;
    }
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

ArcShape.obj_pool = new ObjectPool(ArcShape, 8000);

export default ArcShape;
