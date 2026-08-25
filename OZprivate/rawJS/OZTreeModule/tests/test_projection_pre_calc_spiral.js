/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_projection_pre_calc_spiral.js
  */
import test from 'tape';
import almostEqual from 'almost-equal';

import spiral_pre_calc from '../src/projection/pre_calc/spiral_pre_calc';
import {calc_horizon} from '../src/projection/horizon_calc/horizon_calc';
import {mk_node as mk_mock_node} from './util_midnode_mock';

// Constants baked into spiral_pre_calc, repeated here so expectations read as geometry
const ROOT_ARCA = Math.PI * (3 / 2);  // Root points straight up
const ANGLE_RIGHT = Math.PI * 0.22;  // The richer child carries on around the spiral...
const ANGLE_LEFT = Math.PI * 0.46;  // ...the poorer child branches off more sharply
const RATIO_RIGHT = 1 / 1.3;  // The richer child is also the larger of the two
const RATIO_LEFT = 1 / 2.25;
const DEFAULT_BEZR = 0.55;  // partl1, the width of a branch
const LEAF_ARCR = 3.2 * 0.4;  // leafmult * partc

function close(t, actual, expected, msg) {
  t.ok(
    almostEqual(actual, expected, almostEqual.FLT_EPSILON, almostEqual.FLT_EPSILON),
    msg + ' (' + actual + ' ~= ' + expected + ')',
  );
}

function mk_leaf(richness_val) {
  return mk_mock_node({ richness_val: richness_val });
}

function mk_node(richness_val, children) {
  return mk_mock_node({
    richness_val: richness_val,
    has_child: true,
    children: children,
    nextr: [],
    nextx: [],
    nexty: [],
  });
}

function mk_root(children) {
  let node = mk_node(1, children);
  node.is_root = true;
  return node;
}

/**
 * A child's reference point should sit 1.3 along the parent's angle, then be
 * shifted perpendicular to that angle by half the difference in branch widths.
 * (sign is +1 for the richer/right child, -1 for the poorer/left child)
 */
function check_next_point(t, node, index, ratio, sign, msg) {
  let dx = node.nextx[index] - 1.3 * Math.cos(node.arca);
  let dy = node.nexty[index] - 1.3 * Math.sin(node.arca);

  close(t, dx * Math.cos(node.arca) + dy * Math.sin(node.arca), 0, msg + ': offset is perpendicular to parent angle');
  close(t,
    dx * Math.cos(node.arca + Math.PI / 2) + dy * Math.sin(node.arca + Math.PI / 2),
    sign * (node.bezr - DEFAULT_BEZR * ratio) / 2,
    msg + ': offset by half the difference in branch widths');
}

test('spiral_pre_calc:viewtype', function (t) {
  t.equal(spiral_pre_calc.viewtype, 'spiral');

  t.end();
});

test('spiral_pre_calc:setup', function (t) {
  let root = mk_root([mk_leaf(0.3), mk_leaf(0.7)]);

  // setup() selects the bezier horizon calculator, so horizons can be calculated
  // for the bezier curves pre_calc() generates
  spiral_pre_calc.setup();
  spiral_pre_calc.pre_calc(root);
  calc_horizon(root);

  // Root's own box covers its bezier curve (padded by half its width) and its arc
  let start = root.branch_start, end = root.branch_end;
  let bez_xmin = Math.min(start.x, end.cp1x, end.cp2x, end.x) - root.bezr / 2;
  let bez_xmax = Math.max(start.x, end.cp1x, end.cp2x, end.x) + root.bezr / 2;
  close(t, root.gxmin, Math.min(bez_xmin, root.arcx - root.arcr * 1.305), 'gxmin');
  close(t, root.gxmax, Math.max(bez_xmax, root.arcx + root.arcr * 1.305), 'gxmax');
  // ...and the horizon grows to contain the children too
  t.ok(root.hxmin <= root.gxmin, 'hxmin at least as wide as gxmin');
  t.ok(root.hxmax >= root.gxmax, 'hxmax at least as wide as gxmax');

  t.end();
});

test('spiral_pre_calc:root', function (t) {
  // A root with no children at all: gets the fixed root bezier, drawn as a leaf
  let root = mk_root(undefined);
  delete root.has_child;

  spiral_pre_calc.pre_calc(root);
  close(t, root.arca, ROOT_ARCA, 'arca points straight up');
  t.equal(root.branch_points.length, 2, 'Branch is a single cubic');
  t.deepEqual([root.branch_start.x, root.branch_start.y], [0, 0], 'Curve starts at the origin');
  t.deepEqual([root.branch_end.x, root.branch_end.y], [0, -1], 'Curve ends one unit up');
  t.deepEqual([root.branch_end.cp1x, root.branch_end.cp1y], [0, -0.05], 'Control point 1');
  t.deepEqual([root.branch_end.cp2x, root.branch_end.cp2y], [0, -0.95], 'Control point 2');
  t.equal(root.bezr, DEFAULT_BEZR, 'Branch width');

  // Leaf circle sits posmult beyond the end of the branch, in the direction of arca
  close(t, root.arcx, root.branch_end.x + 0.9 * Math.cos(ROOT_ARCA), 'arcx');
  close(t, root.arcy, root.branch_end.y + 0.9 * Math.sin(ROOT_ARCA), 'arcy');
  close(t, root.arcr, LEAF_ARCR, 'arcr');

  t.end();
});

test('spiral_pre_calc:children', function (t) {
  let root = mk_root([mk_leaf(0.3), mk_leaf(0.7)]);
  spiral_pre_calc.pre_calc(root);

  // children[1] is richer, so it's the one that carries on around the spiral
  let rich = root.children[1], poor = root.children[0];

  // An internal node's arc is a joint at the end of its branch, not a leaf circle
  close(t, root.arcx, root.branch_end.x * 1.01, 'root arcx');
  close(t, root.arcy, root.branch_end.y * 1.01, 'root arcy');
  close(t, root.arcr, root.bezr / 2, 'root arcr');

  close(t, rich.arca, ROOT_ARCA + ANGLE_RIGHT, 'Richer child turns right by the smaller angle');
  close(t, poor.arca, ROOT_ARCA - ANGLE_LEFT, 'Poorer child turns left by the larger angle');
  t.deepEqual(root.nextr, [RATIO_LEFT, RATIO_RIGHT], 'Richer child drawn at the larger scale');

  check_next_point(t, root, 1, RATIO_RIGHT, 1, 'Richer child');
  check_next_point(t, root, 0, RATIO_LEFT, -1, 'Poorer child');

  // Both children's curves end one unit along their own angle
  close(t, rich.branch_end.x, Math.cos(rich.arca), 'Richer child end x');
  close(t, rich.branch_end.y, Math.sin(rich.arca), 'Richer child end y');
  close(t, poor.branch_end.x, Math.cos(poor.arca), 'Poorer child end x');
  close(t, poor.branch_end.y, Math.sin(poor.arca), 'Poorer child end y');

  // Both start back down the parent's branch, scaled into the child's own co-ordinates
  close(t, rich.branch_start.x, -0.3 * Math.cos(ROOT_ARCA) / RATIO_RIGHT, 'Richer child start x');
  close(t, rich.branch_start.y, -0.3 * Math.sin(ROOT_ARCA) / RATIO_RIGHT, 'Richer child start y');
  close(t, poor.branch_start.x, -0.3 * Math.cos(ROOT_ARCA) / RATIO_LEFT, 'Poorer child start x');
  close(t, poor.branch_start.y, -0.3 * Math.sin(ROOT_ARCA) / RATIO_LEFT, 'Poorer child start y');

  // The poorer child's second control point pulls its curve straight towards its end point
  close(t, poor.branch_end.cp2x, 0.9 * poor.branch_end.x, 'Poorer child cp2x');
  close(t, poor.branch_end.cp2y, 0.9 * poor.branch_end.y, 'Poorer child cp2y');

  // Children aren't given a width, so fall back to the default
  t.equal(rich.bezr, DEFAULT_BEZR, 'Richer child bezr');
  t.equal(poor.bezr, DEFAULT_BEZR, 'Poorer child bezr');

  // Both children are leaves
  close(t, rich.arcr, LEAF_ARCR, 'Richer child arcr');
  close(t, poor.arcr, LEAF_ARCR, 'Poorer child arcr');
  close(t, rich.arcx, rich.branch_end.x + 0.9 * Math.cos(rich.arca), 'Richer child arcx');
  close(t, rich.arcy, rich.branch_end.y + 0.9 * Math.sin(rich.arca), 'Richer child arcy');

  t.end();
});

test('spiral_pre_calc:children_order', function (t) {
  // The same 2 children, in either order
  let root_a = mk_root([mk_leaf(0.3), mk_leaf(0.7)]);
  let root_b = mk_root([mk_leaf(0.7), mk_leaf(0.3)]);

  spiral_pre_calc.pre_calc(root_a);
  spiral_pre_calc.pre_calc(root_b);

  // Layout follows richness, not the order the children happen to be in
  t.deepEqual(root_a.children[0], root_b.children[1], 'Poorer child laid out the same either way');
  t.deepEqual(root_a.children[1], root_b.children[0], 'Richer child laid out the same either way');
  t.deepEqual(root_a.nextr, root_b.nextr.slice().reverse(), 'nextr mirrored');
  t.deepEqual(root_a.nextx, root_b.nextx.slice().reverse(), 'nextx mirrored');
  t.deepEqual(root_a.nexty, root_b.nexty.slice().reverse(), 'nexty mirrored');

  t.end();
});

test('spiral_pre_calc:children_equal_richness', function (t) {
  let root = mk_root([mk_leaf(0.5), mk_leaf(0.5)]);
  spiral_pre_calc.pre_calc(root);

  // A tie goes to the first child
  t.deepEqual(root.nextr, [RATIO_RIGHT, RATIO_LEFT], 'First child treated as the richer one');
  close(t, root.children[0].arca, ROOT_ARCA + ANGLE_RIGHT, 'First child turns right');
  close(t, root.children[1].arca, ROOT_ARCA - ANGLE_LEFT, 'Second child turns left');

  t.end();
});

test('spiral_pre_calc:recursion', function (t) {
  // Poorer child of the root is itself a node with 2 children
  let branch = mk_node(0.3, [mk_leaf(0.1), mk_leaf(0.2)]);
  let root = mk_root([branch, mk_leaf(0.7)]);
  spiral_pre_calc.pre_calc(root);

  // The branch is drawn as a joint, its children as leaves
  close(t, branch.arcr, branch.bezr / 2, 'branch arcr');
  close(t, branch.children[0].arcr, LEAF_ARCR, 'grandchild 0 arcr');
  close(t, branch.children[1].arcr, LEAF_ARCR, 'grandchild 1 arcr');

  // Grandchildren turn relative to the branch's angle, which is itself relative to the root's
  close(t, branch.arca, ROOT_ARCA - ANGLE_LEFT, 'branch arca');
  close(t, branch.children[1].arca, ROOT_ARCA - ANGLE_LEFT + ANGLE_RIGHT, 'Richer grandchild turns right');
  close(t, branch.children[0].arca, ROOT_ARCA - ANGLE_LEFT - ANGLE_LEFT, 'Poorer grandchild turns left');

  t.deepEqual(branch.nextr, [RATIO_LEFT, RATIO_RIGHT], 'branch nextr');
  check_next_point(t, branch, 1, RATIO_RIGHT, 1, 'Richer grandchild');
  check_next_point(t, branch, 0, RATIO_LEFT, -1, 'Poorer grandchild');

  t.end();
});

function child_separation(node) {
  return Math.sqrt(
    Math.pow(node.nextx[1] - node.nextx[0], 2) + Math.pow(node.nexty[1] - node.nexty[0], 2),
  );
}

test('spiral_pre_calc:existing_values_preserved', function (t) {
  // A subtree node, already positioned by its parent, with a wider branch than the default
  let node = mk_node(0.3, [mk_leaf(0.1), mk_leaf(0.2)]);
  let default_width_node = mk_node(0.3, [mk_leaf(0.1), mk_leaf(0.2)]);
  node.arca = 0;
  default_width_node.arca = 0;
  node.branch_cubic({
    sx: 0.1, sy: 0.2,
    cp1x: 0.5, cp1y: 0.6,
    cp2x: 0.7, cp2y: 0.8,
    ex: 0.3, ey: 0.4,
  });
  node.bezr = 1;

  spiral_pre_calc.pre_calc(node);
  spiral_pre_calc.pre_calc(default_width_node);

  t.deepEqual([
    node.branch_start.x, node.branch_start.y,
    node.branch_end.x, node.branch_end.y,
    node.branch_end.cp1x, node.branch_end.cp1y,
    node.branch_end.cp2x, node.branch_end.cp2y,
    node.bezr,
  ], [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], 'Bezier left as-is, not reset to the root defaults');
  t.deepEqual([
    default_width_node.branch_start.x, default_width_node.branch_start.y,
    default_width_node.branch_end.x, default_width_node.branch_end.y,
    default_width_node.bezr,
  ], [0, 0, 0, -1, DEFAULT_BEZR], 'Missing values filled in with the defaults');

  // ...and the wider branch feeds through into where the children are placed
  check_next_point(t, node, 1, RATIO_RIGHT, 1, 'Richer child');
  check_next_point(t, node, 0, RATIO_LEFT, -1, 'Poorer child');
  t.ok(
    child_separation(node) > child_separation(default_width_node),
    'A wider branch spaces its children further apart',
  );

  t.end();
});
