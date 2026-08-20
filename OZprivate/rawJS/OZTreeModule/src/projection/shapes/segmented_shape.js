import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class SegmentedShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.sx = NaN;
    this.sy = NaN;
    this.start_line_width = undefined;
    this.start_tx = undefined;
    this.start_ty = undefined;
    this.do_stroke = false;

    //following parameters would be override each time a bezier_shape is created.
    // Each point is {fn: "move"|"line"|"bezier", ...args}, drawn end to end from (sx, sy).
    // A point can also give a line_width of its own, the width of the line where it sits, in
    // place of stroke.line_width, and a unit tangent (tx, ty), the direction the line is
    // travelling there: a line whose width varies is drawn by filling its outline rather
    // than stroking it, and the outline runs along either side of that tangent. The path's
    // own start carries the same two in start_line_width and (start_tx, start_ty), being the
    // one point of the line no segment ends on. See shape_fill_outline() below.
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
    this.start_line_width = undefined;
    this.start_tx = undefined;
    this.start_ty = undefined;
    this.do_stroke = false;
    this.path_points = [];
    this.markings_list = [];
    this.shadow = false;
  }
  render(context) {
    return shape_render(context, this);
  }
}

const path_functions = {
    move: (context, {x, y}) => context.moveTo(x, y),
    line: (context, {x, y}) => context.lineTo(x, y),
    bezier: (context, {cp1x, cp1y, cp2x, cp2y, x, y}) => context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
}

function shape_render(context, shape) {
  // A point can set a line_width of its own, tapering the line. Canvas has no way to stroke
  // that -- a stroke has one width throughout -- so a tapering line is drawn by filling the
  // region it covers instead. Dashes can't be filled, so a dashed marking falls back to
  // stroking the line down the middle at a single width.
  let tapered = false;
  for (let i = 0; i < shape.path_points.length; i++) {
    if (shape.path_points[i].line_width !== undefined) {
      tapered = true;
      break;
    }
  }
  // Where the edges of the line run, worked out once and reused at every width it is drawn at
  const edges = tapered ? shape_outline_edges(shape) : null;

  if (!tapered) {
    context.beginPath();
    shape_follow_path(context, shape);
  }
  if (shape.do_stroke) {
    context.lineCap = shape.stroke.line_cap ? shape.stroke.line_cap : "round";
    context.strokeStyle = shape.stroke.color;
    if (shape.shadow) {
      context.shadowBlur = shape.shadow.blur || 0;
      context.shadowColor = shape.shadow.color || shape.stroke.color;
    }
    if (tapered) {
      context.fillStyle = shape.stroke.color;
      shape_fill_outline(context, shape, edges, 1);
    } else {
      context.lineWidth = shape.stroke.line_width;
      context.stroke();
    }
    if (shape.shadow) {
      context.shadowBlur = 0;
    }
  }
  // Render all markings on top of this line
  for (let i = 0; i < shape.markings_list.length; i++) {
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
    if (tapered && !shape.markings_list[i].dashSize) {
      context.fillStyle = shape.markings_list[i].strokeStyle;
      shape_fill_outline(context, shape, edges, shape.markings_list[i].widthProportion || 1);
    } else {
      if (tapered) {
        // Nothing has drawn the line down the middle, and filling the outline left our own
        // path behind, so lay it out again to dash along
        context.beginPath();
        shape_follow_path(context, shape);
      }
      context.lineWidth = shape.stroke.line_width * (shape.markings_list[i].widthProportion || 1);
      context.stroke();
    }
    if (shape.markings_list[i].shadow) {
      context.shadowBlur = 0;
    }
    if (shape.markings_list[i].dashSize) {
      context.setLineDash([]);
      context.lineDashOffset = 0;
    }
  }
}

/**
 * Every point the line passes through, the start of the path included, each as
 * {x, y, nx, ny, line_width}: where it is, the unit normal there -- the direction to move in
 * to reach the edge of the line -- and how wide the line is at that point.
 *
 * Point i of this is the end of segment i - 1 of the path, and point 0 the path's own start,
 * so it is one longer than path_points. Widths are the ones the caller gave, falling back to
 * the shape's own; normals come from turning the tangent a quarter turn, and the tangent is
 * the one the caller gave, or failing that the direction the curve is travelling in as it
 * arrives: a cubic arrives pulled from its second control point, and a straight line and a
 * move both travel their own direction.
 */
function shape_outline_edges(shape) {
  const points = shape.path_points;
  const edges = [];

  for (let i = 0; i <= points.length; i++) {
    // The segments arriving at this point and leaving it, either of which may not exist:
    // there is nothing before the path's start, and nothing after its end
    const arriving = i > 0 ? points[i - 1] : null;
    const leaving = i < points.length ? points[i] : null;
    const previous = i > 1 ? points[i - 2] : null;
    const x = arriving ? arriving.x : shape.sx;
    const y = arriving ? arriving.y : shape.sy;
    const line_width = (arriving ? arriving.line_width : shape.start_line_width);
    let tx = arriving ? arriving.tx : shape.start_tx;
    let ty = arriving ? arriving.ty : shape.start_ty;

    if (tx === undefined) {
      // A move starts a stretch of line rather than ending one, so it takes its direction
      // from the segment leaving it, as the path's own start does
      if (arriving && arriving.fn !== 'move') {
        tx = x - (arriving.cp2x !== undefined ? arriving.cp2x : (previous ? previous.x : shape.sx));
        ty = y - (arriving.cp2y !== undefined ? arriving.cp2y : (previous ? previous.y : shape.sy));
      } else if (leaving) {
        tx = (leaving.cp1x !== undefined ? leaving.cp1x : leaving.x) - x;
        ty = (leaving.cp1y !== undefined ? leaving.cp1y : leaving.y) - y;
      } else {
        tx = 1;
        ty = 0;
      }
      const length = Math.hypot(tx, ty) || 1;
      tx /= length;
      ty /= length;
    }

    edges.push({
      x: x,
      y: y,
      // A quarter turn from the way the line is going is the way out to the edge of it
      nx: -ty,
      ny: tx,
      line_width: line_width === undefined ? shape.stroke.line_width : line_width,
    });
  }
  return edges;
}

/**
 * Fill the region the line covers at width_proportion of its width, i.e. its outline: out
 * along one side of the path, round the end, and back along the other side.
 *
 * This is how a line of varying width gets drawn at all, canvas having only one lineWidth
 * per stroke. Stroking segment by segment, each at its own width, would draw the same region
 * as a chain of separately composited capsules, and every place two of them overlapped would
 * bead along the edge where their part-covered pixels combined -- an edge that gets no
 * smoother for cutting the curve into more segments, only busier. Filling puts a single edge
 * around the whole line however finely it was divided up.
 *
 * The offset of a cubic isn't a cubic, but a shallow one's is near enough: we move each end
 * out along its own normal and take the control points with the end they belong to. The
 * error grows with how far round a segment bends, so the same division into shallow segments
 * that keeps a path faithful to the curve it follows keeps its outline faithful too.
 */
function shape_fill_outline(context, shape, edges, width_proportion) {
  let start = 0;

  context.beginPath();
  for (let i = 1; i <= edges.length; i++) {
    // A move breaks the line: the outline closes around what we have and starts again there
    if (i === edges.length || shape.path_points[i - 1].fn === 'move') {
      // A stretch of one point has no length to run an outline along, so nothing to fill
      if (i - start > 1) outline_run(context, shape, edges, start, i - 1, width_proportion);
      start = i;
    }
  }
  context.fill();
}

/**
 * Add the outline of one unbroken stretch of the line, from edges[from] to edges[to], to the
 * path being built: out along one side, round the end, back along the other, and closed off
 * around the start.
 */
function outline_run(context, shape, edges, from, to, width_proportion) {
  const half_width = (i) => edges[i].line_width * width_proportion / 2;
  let h = half_width(from);

  context.moveTo(edges[from].x + edges[from].nx * h, edges[from].y + edges[from].ny * h);
  for (let i = from + 1; i <= to; i++) {
    outline_segment(context, shape.path_points[i - 1], 1, edges[i - 1], half_width(i - 1), edges[i], half_width(i));
  }
  outline_cap(context, edges[to], half_width(to), 1);
  for (let i = to; i > from; i--) {
    outline_segment(context, shape.path_points[i - 1], -1, edges[i], half_width(i), edges[i - 1], half_width(i - 1));
  }
  outline_cap(context, edges[from], half_width(from), -1);
  context.closePath();
}

/**
 * Add the edge of one segment to the path, running from the edge point at a to the edge
 * point at b, half a width out along the normal at either end.
 *
 * sign is which side of the line we are drawing, 1 on the way out and -1 on the way back --
 * which also means running the segment backwards, so its control points swap over with the
 * ends they belong to.
 */
function outline_segment(context, point, sign, a, a_half_width, b, b_half_width) {
  if (point.fn === 'bezier') {
    const reversed = sign < 0;

    context.bezierCurveTo(
      (reversed ? point.cp2x : point.cp1x) + sign * a.nx * a_half_width,
      (reversed ? point.cp2y : point.cp1y) + sign * a.ny * a_half_width,
      (reversed ? point.cp1x : point.cp2x) + sign * b.nx * b_half_width,
      (reversed ? point.cp1y : point.cp2y) + sign * b.ny * b_half_width,
      b.x + sign * b.nx * b_half_width,
      b.y + sign * b.ny * b_half_width,
    );
  } else {
    context.lineTo(b.x + sign * b.nx * b_half_width, b.y + sign * b.ny * b_half_width);
  }
}

/**
 * Round off the end of the line at edge, i.e. half a turn around it from the side we arrived
 * on to the side we leave on, the fill's answer to a round line cap.
 *
 * Both ends turn the same way round, the one that takes the arc out past the point rather
 * than back through the line: at the far end (sign 1) that means going from the normal to
 * its opposite the way that passes through the tangent, and at the near end (sign -1) from
 * the opposite back to the normal, passing through the tangent reversed. Canvas measures
 * angles clockwise, so both are the anticlockwise way round.
 */
function outline_cap(context, edge, half_width, sign) {
  context.arc(
    edge.x, edge.y, half_width,
    Math.atan2(sign * edge.ny, sign * edge.nx),
    Math.atan2(-sign * edge.ny, -sign * edge.nx),
    true,
  );
}

function shape_follow_path(context, shape) {
  // NB: Tested for being a number rather than for being truthy, so that a path starting at
  // exactly x = 0 still gets its opening move
  if (!Number.isNaN(shape.sx)) {
    context.moveTo(shape.sx, shape.sy);
  }

  for (let i = 0; i < shape.path_points.length; i++) {
    path_functions[shape.path_points[i].fn](context, shape.path_points[i]);
  }
}

SegmentedShape.obj_pool = new ObjectPool(SegmentedShape, 100);

export default SegmentedShape;
