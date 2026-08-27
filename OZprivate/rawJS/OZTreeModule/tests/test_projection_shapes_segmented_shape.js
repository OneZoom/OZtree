/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_projection_shapes_segmented_shape.js
  */
import test from 'tape';

import SegmentedShape from '../src/projection/shapes/segmented_shape';

/**
 * Round a drawn co-ordinate: the outline of a line is arrived at by arithmetic on the
 * control points of the path it follows, and lands a rounding error either side of the
 * values a test would name. Adding 0 folds -0 in with 0, which the same arithmetic throws up
 * wherever a normal lies along an axis
 */
function round(n) {
  return Math.round(n * 1000) / 1000 + 0;
}

/** Stand in for a canvas context, noting down every drawing call made on it */
function mk_context() {
  return {
    calls: [],
    call: function (name, args) { this.calls.push([name].concat(args.map(round))); },

    beginPath: function () { this.calls.push(['beginPath']); },
    closePath: function () { this.calls.push(['closePath']); },
    moveTo: function (...args) { this.call('moveTo', args); },
    lineTo: function (...args) { this.call('lineTo', args); },
    bezierCurveTo: function (...args) { this.call('bezierCurveTo', args); },
    arc: function (x, y, r, from, to, anticlockwise) {
      this.calls.push(['arc', round(x), round(y), round(r), round(from), round(to), anticlockwise]);
    },
    setLineDash: function (dash) { this.calls.push(['setLineDash', dash.join(',')]); },
    fill: function () { this.calls.push(['fill', this.fillStyle]); },
    stroke: function () { this.calls.push(['stroke', this.strokeStyle, round(this.lineWidth)]); },
  };
}

/** A shape drawn along the path in points, starting at (0, 0) */
function mk_shape(points, extra) {
  const shape = SegmentedShape.create();

  shape.sx = 0;
  shape.sy = 0;
  shape.path_points = points;
  shape.do_stroke = true;
  shape.stroke.line_width = 8;
  shape.stroke.color = 'the-branch';
  shape.markings_list = [];
  return Object.assign(shape, extra || {});
}

/** Just the calls that add to a path or draw one, i.e. what the shape actually drew */
function drawing_calls(context, only) {
  return context.calls.filter((call) => only ? only.indexOf(call[0]) > -1 : call[0] !== 'setLineDash');
}

test('segmented_shape:uniform_width_is_stroked', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'line', x: 10, y: 0 },
    { fn: 'bezier', cp1x: 12, cp1y: 0, cp2x: 18, cp2y: 0, x: 20, y: 0 },
  ]);

  // Without a width of its own anywhere along it, the line is one path stroked at one width,
  // and each marking is that same path stroked again over the top of it
  shape.markings_list = [{ strokeStyle: 'the-marking', widthProportion: 0.5 }];
  shape.render(context);
  t.deepEqual(drawing_calls(context), [
    ['beginPath'],
    ['moveTo', 0, 0],
    ['lineTo', 10, 0],
    ['bezierCurveTo', 12, 0, 18, 0, 20, 0],
    ['stroke', 'the-branch', 8],
    ['stroke', 'the-marking', 4],
  ]);

  t.end();
});

test('segmented_shape:tapering_width_is_filled', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'line', x: 10, y: 0, line_width: 2, tx: 1, ty: 0 },
  ], { start_line_width: 4, start_tx: 1, start_ty: 0 });

  // A line 4 wide where it starts and 2 where it ends can't be stroked -- a stroke has one
  // width throughout -- so it is filled instead: out along one side half a width from the
  // path, round the end, and back down the other, both ends rounded off with a half turn as
  // a round line cap would be
  shape.render(context);
  t.deepEqual(drawing_calls(context), [
    ['beginPath'],
    ['moveTo', 0, 2],
    ['lineTo', 10, 1],
    ['arc', 10, 0, 1, round(Math.PI / 2), round(-Math.PI / 2), true],
    ['lineTo', 0, -2],
    ['arc', 0, 0, 2, round(-Math.PI / 2), round(Math.PI / 2), true],
    ['closePath'],
    ['fill', 'the-branch'],
  ]);

  t.end();
});

test('segmented_shape:tapering_curve_offsets_control_points', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'bezier', cp1x: 4, cp1y: 0, cp2x: 8, cp2y: 4, x: 12, y: 4, line_width: 2, tx: 1, ty: 0 },
  ], { start_line_width: 4, start_tx: 0, start_ty: 1 });

  // The edge of a cubic is the same cubic with each end moved out along its own normal, its
  // control points going with the end they belong to. Here the line sets off down the y axis
  // 4 wide, so its first edge point is 2 back along x, and arrives along the x axis 2 wide,
  // so its last is 1 further down y
  shape.render(context);
  t.deepEqual(drawing_calls(context, ['moveTo', 'bezierCurveTo', 'lineTo']), [
    ['moveTo', -2, 0],
    ['bezierCurveTo', 4 - 2, 0, 8, 4 + 1, 12, 4 + 1],
    // Back down the other side the two control points swap over, along with the ends
    ['bezierCurveTo', 8, 4 - 1, 4 + 2, 0, 2, 0],
  ]);

  t.end();
});

test('segmented_shape:tapering_takes_tangents_from_the_curve', function (t) {
  const supplied = mk_context(), derived = mk_context();
  const points = [
    { fn: 'bezier', cp1x: 4, cp1y: 0, cp2x: 8, cp2y: 0, x: 12, y: 0, line_width: 2 },
  ];

  // Told which way the line is travelling at a point, the outline turns that a quarter turn
  // to find its edges; left to work it out, it takes the direction from the curve itself,
  // which for a cubic is the pull of the control point at the end in question
  mk_shape(points.map((p) => Object.assign({}, p, { tx: 1, ty: 0 })),
    { start_line_width: 4, start_tx: 1, start_ty: 0 }).render(supplied);
  mk_shape(points, { start_line_width: 4 }).render(derived);
  t.deepEqual(drawing_calls(derived), drawing_calls(supplied));

  t.end();
});

test('segmented_shape:tapering_markings_and_dashes', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'line', x: 10, y: 0, line_width: 2, tx: 1, ty: 0 },
  ], { start_line_width: 4, start_tx: 1, start_ty: 0 });

  shape.markings_list = [
    { strokeStyle: 'the-marking', widthProportion: 0.5 },
    { strokeStyle: 'the-dashes', widthProportion: 0.5, dashSize: 3 },
  ];
  shape.render(context);
  // A marking is the same outline filled again at its share of the width...
  t.deepEqual(drawing_calls(context, ['moveTo', 'fill']), [
    ['moveTo', 0, 2],
    ['fill', 'the-branch'],
    ['moveTo', 0, 1],
    ['fill', 'the-marking'],
    // ...but dashes can't be filled, so a dashed one falls back to laying the path back out
    // and stroking down the middle of the line at a single width
    ['moveTo', 0, 0],
  ]);
  t.deepEqual(drawing_calls(context).pop(), ['stroke', 'the-dashes', 4]);

  t.end();
});

test('segmented_shape:colors_are_filled_a_stretch_at_a_time', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'line', x: 10, y: 0, line_width: 2, tx: 1, ty: 0, color: 'the-early' },
    { fn: 'line', x: 20, y: 0, line_width: 2, tx: 1, ty: 0, color: 'the-late' },
    { fn: 'line', x: 30, y: 0, line_width: 2, tx: 1, ty: 0, color: 'the-late' },
    { fn: 'line', x: 40, y: 0, line_width: 2, tx: 1, ty: 0 },
  ], { start_line_width: 4, start_tx: 1, start_ty: 0 });

  // A line that changes colour is a tapering one, so it is filled rather than stroked, and a
  // fill is one colour throughout just as it is one width: each colour is one outline, the two
  // neighbouring stretches of the same colour making a single one between them, and a point
  // that doesn't name a colour taking the line's own. Both ends of each are rounded off as a
  // stroke's cap would be, and they go down back to front, so the stretch a colour change ends
  // laps forward over the one it starts rather than leaving a seam
  shape.render(context);
  t.deepEqual(drawing_calls(context, ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill']), [
    ['beginPath'],
    ['moveTo', 30, 1],
    ['lineTo', 40, 1],
    ['lineTo', 30, -1],
    ['closePath'],
    ['fill', 'the-branch'],
    ['beginPath'],
    ['moveTo', 10, 1],
    ['lineTo', 20, 1],
    ['lineTo', 30, 1],
    ['lineTo', 20, -1],
    ['lineTo', 10, -1],
    ['closePath'],
    ['fill', 'the-late'],
    ['beginPath'],
    ['moveTo', 0, 2],
    ['lineTo', 10, 1],
    ['lineTo', 0, -2],
    ['closePath'],
    ['fill', 'the-early'],
  ]);

  // A marking is one colour, so it is the whole line in one outline and one fill
  const marked = mk_context();
  shape.markings_list = [{ strokeStyle: 'the-marking', widthProportion: 0.5 }];
  shape.render(marked);
  t.deepEqual(drawing_calls(marked, ['fill']), [
    ['fill', 'the-branch'],
    ['fill', 'the-late'],
    ['fill', 'the-early'],
    ['fill', 'the-marking'],
  ]);

  t.end();
});

test('segmented_shape:tapering_breaks_at_a_move', function (t) {
  const context = mk_context();
  const shape = mk_shape([
    { fn: 'line', x: 10, y: 0, line_width: 2, tx: 1, ty: 0 },
    { fn: 'move', x: 20, y: 0, line_width: 2, tx: 1, ty: 0 },
    { fn: 'line', x: 30, y: 0, line_width: 2, tx: 1, ty: 0 },
  ], { start_line_width: 4, start_tx: 1, start_ty: 0 });

  // A move breaks the line in two, so the fill is 2 outlines rather than one running through
  // the gap between them -- but still a single path, filled once
  shape.render(context);
  t.deepEqual(drawing_calls(context, ['beginPath', 'moveTo', 'closePath', 'fill']), [
    ['beginPath'],
    ['moveTo', 20, 1],
    ['closePath'],
    ['moveTo', 0, 2],
    ['closePath'],
    ['fill', 'the-branch'],
  ]);

  t.end();
});
