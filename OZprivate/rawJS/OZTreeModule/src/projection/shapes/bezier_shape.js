import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class BezierShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.sx = NaN;
    this.sy = NaN;
    this.do_stroke = false;
    
    //following parameters would be override each time a bezier_shape is created.
    this.c1x = 1.0;
    this.c1y = 1.0;
    this.c2x = 1.0;
    this.c2y = 1.0;
    this.ex = 1.0;
    this.ey = 1.0;
    this.path_points = [];
    this.stroke  = {
      line_cap: 'round',
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.markings_list = [];
    this.shadow = false;
  }
  release() {
    this.sx = NaN;
    this.sy = NaN;
    this.do_stroke = false;
    this.path_points = [];
    this.markings_list = [];
    this.shadow = false;
  }
  render(context) {
    return bezier_render(context, this);
  }
  follow_path(context) {
    return bezier_follow_path(context, this);
  }
}

function bezier_render(context, shape) {
  context.beginPath();
  shape.follow_path(context);
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
    if (shape.markings_list[i].dashSize) {
        context.lineCap = 'butt';  // NB: We'd need gaps to support other cap types
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

function bezier_follow_path(context, shape) {
  let path_functions = {
      move: context.moveTo,
      line: context.lineTo,
      bezier: context.bezier,
  }

  if (shape.sx) {   
    context.moveTo(shape.sx, shape.sy);
  }

  for (let i = 0; i < shape.path_points.length; i++) {
    path_functions[shape.path_points[i][0]].apply(context, shape.path_points[i].slice(1));
  }

  if (shape.ex) {
    context.bezierCurveTo(shape.c1x, shape.c1y, shape.c2x, shape.c2y, shape.ex, shape.ey);
  }
}

BezierShape.obj_pool = new ObjectPool(BezierShape, 15000);

export default BezierShape;
