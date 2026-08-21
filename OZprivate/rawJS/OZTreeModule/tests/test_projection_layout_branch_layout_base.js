/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_projection_layout_branch_layout_base.js
  */
import test from 'tape';

// Pulled in first to break a cycle: the layouts reach back round to branch_layout_base
// through tree_settings, and asking for it before they have been loaded leaves it undefined
import '../src/tree_settings';
import BranchLayoutBase from '../src/projection/layout/branch_layout_base';
import { set_theme } from '../src/themes/color_theme';
import { mk_node } from './util_midnode_mock';

/** A node whose branch is drawn as (count) cubic segments, each 1 long, running out along x */
function mk_branch_node(count) {
  const node = mk_node({ rvar: 1, xvar: 0, yvar: 0, bezr: 2 });

  // The branch starts at (0, 0), which is where branch_restart() leaves it
  node.branch_restart();
  for (let i = 0; i < count; i++) {
    Object.assign(node.branch_point(), {
      cp1x: i, cp1y: 0, cp2x: i + 1, cp2y: 0, x: i + 1, y: 0,
    });
  }
  return node;
}

/** The colour of the shape as a whole and of each of its points, for a branch of (count) segments */
function shape_colors(count, colors) {
  const shapes = [];

  set_theme({ branch: { stroke: () => colors } });
  new BranchLayoutBase().get_bezier_shapes(mk_branch_node(count), shapes, []);
  return [shapes[0].stroke.color].concat((shapes[0].path_points || []).map((p) => p.color));
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

  t.end();
});

test('branch_layout_base:points_are_filled_in_again_not_made_afresh', function (t) {
  const shapes = [];

  // A tapered branch of 3 segments, with colours spread along it: every field a point can
  // carry is in use here
  const tapered = mk_branch_node(3);
  // ...tapering the points the branch is drawn to, i.e. all but the start it sets off from
  tapered.branch_points.slice(1).forEach((p, i) => Object.assign(p, { line_width: i + 1, tx: 1, ty: 0 }));
  set_theme({ branch: { stroke: () => ['the-early', 'the-late'] } });
  new BranchLayoutBase().get_bezier_shapes(tapered, shapes, []);
  const points = shapes[0].path_points.slice();
  t.deepEqual(points.map((p) => [p.color, p.line_width, p.tx]),
    [['the-early', 1, 1], ['the-late', 2, 1], ['the-late', 3, 1]], "Tapered, coloured branch");

  // Once the shape is freed, the next one to be drawn gets those same points back
  shapes[0].free();
  set_theme({ branch: { stroke: () => 'the-only' } });
  new BranchLayoutBase().get_bezier_shapes(mk_branch_node(2), shapes, []);
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
  // A branch of one segment is drawn as a single cubic rather than a segmented line, which
  // leaves one place to put a colour: the colour at the node
  t.deepEqual(shape_colors(1, ['the-early', 'the-late']), ['the-late']);
  t.deepEqual(shape_colors(1, 'the-only'), ['the-only']);

  t.end();
});

test('branch_layout_base:branch_points_are_placed_by_the_nodes_position', function (t) {
  const shapes = [];
  const node = mk_branch_node(2);

  // A branch is laid out in the node's own co-ordinate space, and drawn scaled by rvar and
  // moved to where the node sits on screen
  Object.assign(node, { rvar: 10, xvar: 100, yvar: 200 });
  set_theme({ branch: { stroke: () => ['the-only'] } });
  new BranchLayoutBase().get_bezier_shapes(node, shapes, []);
  t.deepEqual([shapes[0].sx, shapes[0].sy], [100, 200]);
  t.deepEqual(shapes[0].path_points.map((p) => [p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y]), [
    [100, 200, 110, 200, 110, 200],
    [110, 200, 120, 200, 120, 200],
  ]);
  // ...and stroked at the width the node asks for, likewise scaled
  t.deepEqual(shapes[0].stroke.line_width, 2 * 10);

  const single = [];
  new BranchLayoutBase().get_bezier_shapes(Object.assign(mk_branch_node(1), {
    rvar: 10, xvar: 100, yvar: 200,
  }), single, []);
  t.deepEqual(
    [single[0].sx, single[0].sy, single[0].c1x, single[0].c1y, single[0].c2x, single[0].c2y, single[0].ex, single[0].ey],
    [100, 200, 100, 200, 110, 200, 110, 200],
  );
  t.deepEqual(single[0].stroke.line_width, 2 * 10);

  t.end();
});
