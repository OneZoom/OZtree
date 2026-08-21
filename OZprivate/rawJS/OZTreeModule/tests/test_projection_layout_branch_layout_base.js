/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_projection_layout_branch_layout_base.js
  */
import test from 'tape';

// Pulled in first to break a cycle: the layouts reach back round to branch_layout_base
// through tree_settings, and asking for it before they have been loaded leaves it undefined
import '../src/tree_settings';
import BranchLayoutBase from '../src/projection/layout/branch_layout_base';
import { set_theme } from '../src/themes/color_theme';

/** A node whose branch is drawn as (count) cubic segments, each 1 long, running out along x */
function mk_node(count) {
  const path_points = [];

  for (let i = 0; i < count; i++) {
    path_points.push({ x: i + 1, y: 0, c1x: i, c1y: 0, c2x: i + 1, c2y: 0 });
  }
  return { rvar: 1, xvar: 0, yvar: 0, bezsx: 0, bezsy: 0, bezr: 2, path_points: path_points };
}

/** The colour of the shape as a whole and of each of its points, for a branch of (count) segments */
function shape_colors(count, colors) {
  const shapes = [];

  set_theme({ branch: { stroke: () => colors } });
  new BranchLayoutBase().get_bezier_shapes(mk_node(count), shapes, []);
  return [shapes[0].stroke.color].concat(shapes[0].path_points.map((p) => p.color));
}

test('branch_layout_base:one_color_is_the_whole_branch', function (t) {
  // Nothing to spread along the path: the line is that colour from end to end, and no point
  // of it needs to say anything about its own colour
  t.deepEqual(shape_colors(3, ['the-only']), ['the-only', undefined, undefined, undefined]);

  // A theme naming a single colour rather than a list of them comes out the same way
  t.deepEqual(shape_colors(2, 'the-only'), ['the-only', undefined, undefined]);

  t.end();
});

test('branch_layout_base:colors_spread_along_the_branch', function (t) {
  // Colours run from where the branch starts to where it ends, in equal shares of it; the
  // line's own colour is the last of them, the colour at the node itself
  t.deepEqual(shape_colors(4, ['the-early', 'the-late']),
    ['the-late', 'the-early', 'the-early', 'the-late', 'the-late']);
  t.deepEqual(shape_colors(4, ['a', 'b', 'c']), ['c', 'a', 'b', 'b', 'c']);

  // Each segment takes the colour covering its middle, so a branch with fewer segments than
  // colours shows the ones that reach the places it can draw and drops the rest
  t.deepEqual(shape_colors(2, ['a', 'b', 'c']), ['c', 'a', 'c']);
  t.deepEqual(shape_colors(1, ['a', 'b']), ['b', 'b']);

  t.end();
});

test('branch_layout_base:points_are_filled_in_again_not_made_afresh', function (t) {
  const shapes = [];

  // A tapered branch of 3 segments, with colours spread along it: every field a point can
  // carry is in use here
  const tapered = mk_node(3);
  tapered.path_points.forEach((p, i) => Object.assign(p, { line_width: i + 1, tx: 1, ty: 0 }));
  set_theme({ branch: { stroke: () => ['the-early', 'the-late'] } });
  new BranchLayoutBase().get_bezier_shapes(tapered, shapes, []);
  const points = shapes[0].path_points.slice();
  t.deepEqual(points.map((p) => [p.color, p.line_width, p.tx]),
    [['the-early', 1, 1], ['the-late', 2, 1], ['the-late', 3, 1]], "Tapered, coloured branch");

  // Once the shape is freed, the next one to be drawn gets those same points back
  shapes[0].free();
  set_theme({ branch: { stroke: () => 'the-only' } });
  new BranchLayoutBase().get_bezier_shapes(mk_node(2), shapes, []);
  t.deepEqual(shapes[1].path_points.filter((p) => points.indexOf(p) > -1).length, 2,
    "Both points of the next branch are ones the last branch was using");

  // ...saying nothing about colour, width or direction, none of which this branch asked for.
  // Anything left behind here would be a stray colour or taper picked up from the last one
  t.deepEqual(shapes[1].path_points.map((p) => [p.color, p.line_width, p.tx, p.ty]),
    [[undefined, undefined, undefined, undefined], [undefined, undefined, undefined, undefined]],
    "Nothing left over from the branch that had them before");

  t.end();
});

test('branch_layout_base:colors_a_branch_drawn_as_a_single_curve', function (t) {
  // A layout that gives no path_points of its own has its branch drawn as one cubic, which
  // leaves one place to put a colour: the colour at the node
  const node = mk_node(0), shapes = [];

  delete node.path_points;
  Object.assign(node, { bezc1x: 0, bezc1y: 0, bezc2x: 1, bezc2y: 0, bezex: 1, bezey: 0 });
  set_theme({ branch: { stroke: () => ['the-early', 'the-late'] } });
  new BranchLayoutBase().get_bezier_shapes(node, shapes, []);
  t.deepEqual(shapes[0].path_points.map((p) => p.color), ['the-late']);
  t.deepEqual(shapes[0].stroke.color, 'the-late');

  t.end();
});
