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
