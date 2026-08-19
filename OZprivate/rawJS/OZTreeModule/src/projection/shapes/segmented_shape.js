import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class SegmentedShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.sx = NaN;
    this.sy = NaN;
    this.do_stroke = false;

    //following parameters would be override each time a bezier_shape is created.
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
    return shape_render(context, this);
  }
}

function shape_render(context, shape) {
  context.beginPath();
  shape_follow_path(context, shape);
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

function shape_follow_path(context, shape) {
  let path_functions = {
      move: ({x, y}) => context.moveTo(x, y),
      line: ({x, y}) => context.lineTo(x, y),
      bezier: ({cp1x, cp1y, cp2x, cp2y, x, y}) => context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
  }

  if (shape.sx) {
    context.moveTo(shape.sx, shape.sy);
  }

  for (let i = 0; i < shape.path_points.length; i++) {
    path_functions[shape.path_points[i].fn](shape.path_points[i]);
  }
}

SegmentedShape.obj_pool = new ObjectPool(SegmentedShape, 100);

export default SegmentedShape;
