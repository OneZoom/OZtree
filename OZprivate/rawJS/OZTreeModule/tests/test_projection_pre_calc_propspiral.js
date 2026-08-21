/**
  * Usage: node OZprivate/rawJS/run_tape.js OZprivate/rawJS/OZTreeModule/tests/test_projection_pre_calc_propspiral.js
  */
import test from 'tape';
import almostEqual from 'almost-equal';

import propspiral_pre_calc, {
  _branch_path, _child_sweep,
  leafmult, partc, posmult, partl1, joint_overshoot, max_segment_angle,
  root_arca, root_branch, root_bezr,
  trunk_role, offshoot_role,
} from '../src/projection/pre_calc/propspiral_pre_calc';
import {calc_horizon} from '../src/projection/horizon_calc/horizon_calc';
import {set_theme} from '../src/themes/color_theme';
import {DataStoreNotReadyError} from '../src/errors';
import data_store_api from '../src/data_store/api';
import {mk_node as mk_mock_node} from './util_midnode_mock';

// Take the period count each mock node carries instead of counting one out of a downloaded data
// slice, so a test can say how long a node's branch is without any of the fetching machinery. A
// mock given none is a node whose slice hasn't arrived yet, which the real store throws for.
// Anything that isn't one of our mocks is left to the real store: the API is a singleton, shared
// with every other test file in the run
const real_branch_periods_count = data_store_api.geological.branch_periods_count;
data_store_api.geological.branch_periods_count = function (node) {
  if (!node.mock_node) return real_branch_periods_count.call(this, node);
  if (node.periods === undefined) {
    throw new DataStoreNotReadyError('geological not yet available for mock node');
  }
  return node.periods;
};

/** A mock node the patched data store above will answer for */
const mk_mock = (props) => mk_mock_node(Object.assign({ mock_node: true }, props));

/**
 * Point the colour theme at a branch.stroke giving each node as many colours as its stroke_count
 * asks for, one being what a node that hasn't asked for any gets. How many a node's branch is to
 * be drawn in is what decides how finely _branch_path splits the path, a segment being the
 * smallest piece of branch that can be given a colour of its own (see
 * projection/layout/branch_layout_base).
 *
 * Like the data store above, the theme is a singleton shared with every other test file in the
 * run, so set it inside each test rather than once at import
 */
function set_stroke_theme() {
  set_theme({ branch: { stroke: (node) => (
    Array.from({ length: node.stroke_count || 1 }, (_, i) => 'color-' + i)
  ) } });
}

const LEAF_ARCR = leafmult * partc;

/**
 * A branch crossing this few periods earns less than one nominal child's worth of turn, so both
 * roles hold it at their min_turn and draw it as a single leg
 */
const PERIODS_SHORT = 2;

/**
 * ...and this many earns more than one child's worth for either role, without either of them
 * hitting max_turn: a branch that turns out of the spiral and then winds back round with it
 */
const PERIODS_LONG = 8;

function close(t, actual, expected, msg) {
  t.ok(
    almostEqual(actual, expected, almostEqual.FLT_EPSILON, almostEqual.FLT_EPSILON),
    msg + ' (' + actual + ' ~= ' + expected + ')',
  );
}

const dot = (ax, ay, bx, by) => (ax * bx) + (ay * by);
const cross = (ax, ay, bx, by) => (ax * by) - (ay * bx);

/** The turn a child in (role) earns for a branch crossing (periods) periods, before it is clamped */
const role_size = (role, periods) => Math.min(role.max_turn, Math.max(
  role.min_turn,
  role.turn * Math.log(periods),
));

function mk_leaf(richness_val, periods) {
  return mk_mock({ richness_val: richness_val, periods: periods });
}

function mk_node(richness_val, periods, children) {
  return mk_mock({
    richness_val: richness_val,
    periods: periods,
    has_child: true,
    children: children,
    nextr: [],
    nextx: [],
    nexty: [],
  });
}

function mk_root(children) {
  let node = mk_node(1, 1, children);
  node.is_root = true;
  return node;
}

// ==== Branch path invariants =============================================================

/**
 * Every promise _branch_path makes about the path it fills in, checked against the arguments it
 * was handed rather than against numbers worked out in advance: see its docstring for each.
 * How finely the path is split is the one thing not passed in, being asked of the colour theme
 * (see set_stroke_theme), so that is read back off the node's stroke_count
 */
function check_branch_path(t, node, arca, initial_turn, final_turn, end_dist, start_width, end_width, msg) {
  const points = node.branch_points;

  // Arrives along everything the legs come to between them, which is the node's own angle...
  close(t, node.arca, arca + initial_turn + final_turn, msg + ': arca is arca plus both legs');
  // ...and reaches end_dist along it, wherever the turn wandered to get there
  close(t, node.branch_end.x, end_dist * Math.cos(node.arca), msg + ': ends end_dist along its own angle (x)');
  close(t, node.branch_end.y, end_dist * Math.sin(node.arca), msg + ': ends end_dist along its own angle (y)');

  // A segment per max_segment_angle of turn in each leg, or one per colour the theme wants to draw
  // the branch in if that asks for more, and no segments at all for a leg with no turn to it, plus
  // the one point the path starts at that no segment ends on
  const seg_count = [initial_turn, final_turn].reduce((acc, turn) => (
    acc + (turn === 0 ? 0 : Math.max(node.stroke_count || 1, Math.ceil(Math.abs(turn) / max_segment_angle)))
  ), 0);
  t.equal(points.length, seg_count + 1, msg + ': ' + seg_count + ' segments and the point it starts at');

  // Leaves the way its parent arrived and arrives along its own angle, so a branch runs into the
  // next one without a kink at either end of it
  close(t, points[0].tx, Math.cos(arca), msg + ': leaves along the angle its parent arrived at (tx)');
  close(t, points[0].ty, Math.sin(arca), msg + ': leaves along the angle its parent arrived at (ty)');
  close(t, node.branch_end.tx, Math.cos(node.arca), msg + ': arrives along its own angle (tx)');
  close(t, node.branch_end.ty, Math.sin(node.arca), msg + ': arrives along its own angle (ty)');

  // Tapers from the width we asked it to start at to the one we asked it to end at
  close(t, points[0].line_width, start_width, msg + ': starts start_width wide');
  close(t, node.branch_end.line_width, end_width, msg + ': ends end_width wide');

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], p = points[i], seg = msg + ': segment ' + i;
    // Where the cubic sets off from and where it comes in, as offsets from either end of it
    const [ox, oy] = [p.cp1x - prev.x, p.cp1y - prev.y];
    const [ix, iy] = [p.x - p.cp2x, p.y - p.cp2y];

    close(t, Math.hypot(p.tx, p.ty), 1, seg + ': tangent is a unit vector');
    // Each cubic sets off and comes in along the curve's own direction at either end of it, so
    // the segments run into one another without a kink just as whole branches do
    close(t, cross(ox, oy, prev.tx, prev.ty), 0, seg + ': sets off along the tangent it starts at');
    t.ok(dot(ox, oy, prev.tx, prev.ty) > 0, seg + ': sets off forwards, not back down the branch');
    close(t, cross(ix, iy, p.tx, p.ty), 0, seg + ': comes in along the tangent it ends at');
    t.ok(dot(ix, iy, p.tx, p.ty) > 0, seg + ': comes in forwards, not back down the branch');
    // ...and turns no further doing it than a cubic can follow a curve for
    const turned = Math.acos(Math.min(1, dot(prev.tx, prev.ty, p.tx, p.ty)));
    t.ok(turned <= max_segment_angle + 1e-9, seg + ': turns at most max_segment_angle (' + turned + ')');
    // The taper closes steadily rather than kinking somewhere along the branch
    t.ok(
      (p.line_width - prev.line_width) * (end_width - start_width) >= 0,
      seg + ': width moves towards end_width, never away from it',
    );
  }
}

test('propspiral_pre_calc:_branch_path:single_leg', function (t) {
  set_stroke_theme();

  // A turn small enough to draw in one cubic, and one that has to be split into several
  for (const turn of [max_segment_angle / 2, Math.PI * 0.46, -Math.PI * 0.9]) {
    const node = mk_mock({});

    _branch_path(node, root_arca, turn, 0, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);
    check_branch_path(t, node, root_arca, turn, 0, 1, 0.9, partl1, 'turn ' + turn);
  }

  t.end();
});

test('propspiral_pre_calc:_branch_path:two_legs', function (t) {
  set_stroke_theme();

  // Both legs the same way, as a trunk child's are, and the 2 pulling opposite ways, as an
  // offshoot's do once it has turned out of the spiral and started winding back round with it
  for (const [initial_turn, final_turn] of [
    [Math.PI * 0.33, Math.PI * 0.4],
    [-Math.PI * 0.46, Math.PI * 0.54],
  ]) {
    const node = mk_mock({});
    const msg = 'legs ' + initial_turn + ', ' + final_turn;

    _branch_path(node, root_arca, initial_turn, final_turn, Math.log(1 / 1.6), 1.2, 1, 0.9, partl1);
    check_branch_path(t, node, root_arca, initial_turn, final_turn, 1, 0.9, partl1, msg);

    // No segment straddles the join: there is a point of the path exactly where the first leg
    // hands over, i.e. one turned initial_turn from where the branch set off
    const join = node.branch_points.filter((p) => (
      almostEqual(p.tx, Math.cos(root_arca + initial_turn), almostEqual.FLT_EPSILON, almostEqual.FLT_EPSILON) &&
      almostEqual(p.ty, Math.sin(root_arca + initial_turn), almostEqual.FLT_EPSILON, almostEqual.FLT_EPSILON)
    ));
    t.equal(join.length, 1, msg + ': a segment ends exactly where the legs meet');
  }

  t.end();
});

test('propspiral_pre_calc:_branch_path:empty_leg', function (t) {
  set_stroke_theme();

  // A leg with no turn to it is left out rather than kept as a zero-length sweep, so it makes no
  // difference which of the 2 the branch's whole turn arrives in
  const initial = mk_mock({}), final = mk_mock({});

  _branch_path(initial, root_arca, Math.PI * 0.46, 0, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);
  _branch_path(final, root_arca, 0, Math.PI * 0.46, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);

  t.deepEqual(final.branch_points, initial.branch_points, 'The same path either way round');
  close(t, final.arca, initial.arca, 'The same arca either way round');

  t.end();
});

test('propspiral_pre_calc:_branch_path:color_segments', function (t) {
  set_stroke_theme();

  // However little a branch turns, it is drawn in at least a segment per colour the theme wants to
  // draw it in -- one per geological period it passes through, for the theme this view was built
  // for -- so that every colour has a piece of the path of its own to be drawn along
  const turn = max_segment_angle / 2; // Little enough to draw in a single cubic on its own

  for (const stroke_count of [1, 3, 12]) {
    const node = mk_mock({ stroke_count: stroke_count });
    const msg = stroke_count + ' colours';

    _branch_path(node, root_arca, turn, 0, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);
    t.equal(node.branch_points.length, stroke_count + 1, msg + ': a segment each, and the point it starts at');
    check_branch_path(t, node, root_arca, turn, 0, 1, 0.9, partl1, msg);
  }

  // Each leg is split finely enough in its own right, rather than the 2 sharing the colours out
  const node = mk_mock({ stroke_count: 4 });
  _branch_path(node, root_arca, turn, -turn, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);
  t.equal(node.branch_points.length, (2 * 4) + 1, 'Both legs: a segment per colour each');

  // A theme that gives the whole branch one flat colour asks nothing of the path, which is then
  // split by the angle it turns through alone
  set_theme({ branch: { stroke: 'the-only' } });
  const flat = mk_mock({ stroke_count: 12 });
  _branch_path(flat, root_arca, turn, 0, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1);
  t.equal(flat.branch_points.length, 2, 'A single colour: one cubic, and the point it starts at');

  t.end();
});

test('propspiral_pre_calc:_branch_path:theme_not_ready', function (t) {
  // A theme colouring a branch by the geological periods it crossed can't say how many colours it
  // wants until the node's data slice lands (see themes/IUCN_explicit_theme): rebuild_tree catches
  // this and retries rather than drawing a branch that can't be coloured
  set_theme({ branch: { stroke: () => {
    throw new DataStoreNotReadyError('geological not yet available for mock node');
  } } });

  t.throws(
    () => _branch_path(mk_mock({}), root_arca, Math.PI * 0.46, 0, Math.log(1 / 1.9), 1.2, 1, 0.9, partl1),
    DataStoreNotReadyError,
    'Throws for rebuild_tree to retry rather than laying out with a missing value',
  );

  t.end();
});

// ==== Child sweep ========================================================================

/**
 * A sweep is the role's own turn and ratio worked up by how many periods the node's branch crosses:
 * `size` radians of turn all told, and the shrink that goes with however many nominal children's
 * worth that is
 */
function check_sweep(t, sweep, role, size, msg) {
  close(t, sweep.initial_turn + sweep.final_turn, role.side * Math.min(size, role.turn) + (trunk_role.side * Math.max(0, size - role.turn)), msg + ': turns as far as its legs take it');
  close(t, Math.abs(sweep.initial_turn) + Math.abs(sweep.final_turn), size, msg + ': the legs cover size between them');
  close(t, sweep.initial_turn, role.side * Math.min(size, role.turn), msg + ': first leg is a leg of the role\'s own turn');
  close(t, sweep.final_turn, trunk_role.side * Math.max(0, size - role.turn), msg + ': second leg winds back round with the trunk');

  // The clade shrinks by however many nominal children's worth of turn it has wound round by
  close(t, sweep.ratio, Math.pow(role.ratio, size / role.turn), msg + ': shrinks in step with the angle');
  close(t, sweep.growth, Math.log(sweep.ratio), msg + ': growth is the log of the ratio');

  // The rest is the role's alone, the same for every child in it
  t.equal(sweep.side, role.side, msg + ': side');
  t.equal(sweep.end_speed, role.end_speed, msg + ': end_speed');
  t.equal(sweep.start_width_frac, role.start_width_frac, msg + ': start_width_frac');
}

test('propspiral_pre_calc:_child_sweep:roles', function (t) {
  // A branch that stays inside a single geological period has earned no turn of its own, so it is
  // held at the role's min_turn: less than one nominal child's worth, and so a single leg
  for (const [is_trunk, role] of [[true, trunk_role], [false, offshoot_role]]) {
    const sweep = _child_sweep(mk_leaf(0.5, 1), is_trunk);
    const msg = (is_trunk ? 'trunk' : 'offshoot') + ' inside one period';

    check_sweep(t, sweep, role, role.min_turn, msg);
    close(t, sweep.final_turn, 0, msg + ': nothing to wind back round');
  }

  // The trunk turns the way the spiral winds, the offshoot out of it
  t.equal(trunk_role.side, 1, 'Trunk winds one way');
  t.equal(offshoot_role.side, -1, 'Offshoot turns the other');
  t.ok(
    Math.sign(_child_sweep(mk_leaf(0.5, 1), true).initial_turn) !==
    Math.sign(_child_sweep(mk_leaf(0.5, 1), false).initial_turn),
    'The 2 roles leave in opposite directions',
  );

  t.end();
});

test('propspiral_pre_calc:_child_sweep:periods', function (t) {
  // The longer a branch lasts the further its clade swings round, but by the log of the periods
  // it crosses rather than in step with them: the angle keeps growing without ever running away
  for (const [is_trunk, role] of [[true, trunk_role], [false, offshoot_role]]) {
    const name = is_trunk ? 'trunk' : 'offshoot';
    let prev = 0;

    for (const periods of [3, 5, 8, 13]) {
      const sweep = _child_sweep(mk_leaf(0.5, periods), is_trunk);
      const size = role.turn * Math.log(periods);

      t.ok(size > role.min_turn && size < role.max_turn, name + ': ' + periods + ' periods is inside the clamp');
      check_sweep(t, sweep, role, size, name + ' over ' + periods + ' periods');
      t.ok(size > prev, name + ': ' + periods + ' periods turns further than the count before it');
      t.ok(sweep.ratio < Math.pow(role.ratio, prev / role.turn), name + ': ...and shrinks the clade further doing it');
      prev = size;
    }
  }

  t.end();
});

test('propspiral_pre_calc:_child_sweep:clamped', function (t) {
  for (const [is_trunk, role] of [[true, trunk_role], [false, offshoot_role]]) {
    const name = is_trunk ? 'trunk' : 'offshoot';

    // Too short-lived to earn its own turn: held at min_turn rather than dwindling to nothing
    check_sweep(t, _child_sweep(mk_leaf(0.5, 1), is_trunk), role, role.min_turn, name + ' at the bottom of the clamp');
    check_sweep(t, _child_sweep(mk_leaf(0.5, PERIODS_SHORT), is_trunk), role, role.min_turn, name + ' still at the bottom of the clamp');

    // ...and too long-lived to be let past max_turn, where the branch would wind back over itself
    const long = _child_sweep(mk_leaf(0.5, 1000), is_trunk);
    check_sweep(t, long, role, role.max_turn, name + ' at the top of the clamp');

    // A branch worth more than one child turns out of the spiral once and once only, then winds
    // back round with it: the legs go the same way for a trunk child, opposite ways for an
    // offshoot, which is what stops it spiralling the wrong way for the whole of a long turn
    t.ok(Math.abs(long.final_turn) > 0, name + ': more than one child\'s worth, so there is a second leg');
    t.equal(
      Math.sign(long.initial_turn) === Math.sign(long.final_turn), is_trunk,
      name + ': legs pull the same way only for a trunk child',
    );
    t.ok(
      Math.abs(long.initial_turn + long.final_turn) <= role.max_turn,
      name + ': ends up no further round than max_turn',
    );
  }

  t.end();
});

test('propspiral_pre_calc:_child_sweep:data_not_ready', function (t) {
  // No period count for this node yet: rebuild_tree catches this and retries once it lands
  t.throws(
    () => _child_sweep(mk_leaf(0.5, undefined), true),
    DataStoreNotReadyError,
    'Throws for rebuild_tree to retry rather than laying out with a missing value',
  );

  t.end();
});

// ==== Whole-tree layout ==================================================================

test('propspiral_pre_calc:viewtype', function (t) {
  t.equal(propspiral_pre_calc.viewtype, 'propspiral');

  t.end();
});

test('propspiral_pre_calc:root', function (t) {
  set_stroke_theme();

  // A root with no children at all: gets the fixed root branch, drawn as a leaf
  let root = mk_root(undefined);
  delete root.has_child;

  propspiral_pre_calc.pre_calc(root);
  close(t, root.arca, root_arca, 'arca points straight up the screen');
  t.equal(root.branch_points.length, 2, 'Branch is a single cubic');
  t.deepEqual([root.branch_start.x, root.branch_start.y], [root_branch.sx, root_branch.sy], 'Curve starts at the origin');
  t.deepEqual([root.branch_end.x, root.branch_end.y], [root_branch.ex, root_branch.ey], 'Curve ends one unit up');
  t.deepEqual([root.branch_end.cp1x, root.branch_end.cp1y], [root_branch.cp1x, root_branch.cp1y], 'Control point 1');
  t.deepEqual([root.branch_end.cp2x, root.branch_end.cp2y], [root_branch.cp2x, root_branch.cp2y], 'Control point 2');
  t.equal(root.bezr, root_bezr, 'Branch width');

  // Leaf blob sits posmult beyond the end of the branch, in the direction of arca
  close(t, root.arcx, root.branch_end.x + (posmult * Math.cos(root_arca)), 'arcx');
  close(t, root.arcy, root.branch_end.y + (posmult * Math.sin(root_arca)), 'arcy');
  close(t, root.arcr, LEAF_ARCR, 'arcr');

  t.end();
});

/**
 * A child's origin sits wherever it takes to put the start of its branch on the end of ours,
 * nudged sideways so one of its edges comes flush with one of ours (see _pre_calc)
 */
function check_child_placement(t, node, childIndex, role, msg) {
  const child = node.children[childIndex];
  const ratio = node.nextr[childIndex];
  // Where the child's branch starts, in our co-ordinates rather than its own, as an offset from
  // the end of our own branch
  const dx = node.nextx[childIndex] + (ratio * child.branch_start.x) - node.branch_end.x;
  const dy = node.nexty[childIndex] + (ratio * child.branch_start.y) - node.branch_end.y;
  // Half the width the child is missing where it leaves us, which is the same share of our width
  // however big the sweep turned out to be (see _start_width_frac)
  const bias = role.side * node.bezr * (1 - role.start_width_frac) / 2;

  close(t, dot(dx, dy, Math.cos(node.arca), Math.sin(node.arca)), 0,
    msg + ': starts on the end of our branch, give or take a sideways nudge');
  close(t, dot(dx, dy, Math.cos(node.arca + (Math.PI / 2)), Math.sin(node.arca + (Math.PI / 2))), bias,
    msg + ': nudged sideways by half the width it is missing');
  close(t, ratio * child.branch_start.line_width, role.start_width_frac * node.bezr,
    msg + ': starts at its role\'s share of the width we ended at');
  t.equal(child.bezr, partl1, msg + ': ends the same width every branch does');
}

test('propspiral_pre_calc:children', function (t) {
  set_stroke_theme();

  let root = mk_root([mk_leaf(0.7, PERIODS_SHORT), mk_leaf(0.3, PERIODS_SHORT)]);
  propspiral_pre_calc.pre_calc(root);

  // children[0] is the richer, so it's the one that carries on around the spiral
  let trunk = root.children[0], offshoot = root.children[1];

  // An internal node's arc is a joint just beyond the end of its branch, covering the gap where
  // the children's branches begin, rather than a leaf blob
  close(t, root.arcx, root.branch_end.x * joint_overshoot, 'root arcx');
  close(t, root.arcy, root.branch_end.y * joint_overshoot, 'root arcy');
  close(t, root.arcr, root.bezr / 2, 'root arcr');

  // Neither is long-lived enough to earn a turn of its own, so each is held at its role's min_turn
  // and turns the way its role turns: a single leg apiece
  close(t, trunk.arca, root_arca + trunk_role.min_turn, 'Richer child carries on round the spiral');
  close(t, offshoot.arca, root_arca - offshoot_role.min_turn, 'Poorer child turns out of it');
  close(t, root.nextr[0], Math.pow(trunk_role.ratio, trunk_role.min_turn / trunk_role.turn), 'Richer child drawn at the trunk ratio');
  close(t, root.nextr[1], Math.pow(offshoot_role.ratio, offshoot_role.min_turn / offshoot_role.turn), 'Poorer child drawn at the offshoot ratio');
  t.ok(root.nextr[0] > root.nextr[1], 'Richer child drawn at the larger scale');

  check_branch_path(t, trunk, root_arca, trunk_role.min_turn, 0, 1,
    trunk_role.start_width_frac * root.bezr / root.nextr[0], partl1, 'Richer child');
  check_branch_path(t, offshoot, root_arca, -offshoot_role.min_turn, 0, 1,
    offshoot_role.start_width_frac * root.bezr / root.nextr[1], partl1, 'Poorer child');

  check_child_placement(t, root, 0, trunk_role, 'Richer child');
  check_child_placement(t, root, 1, offshoot_role, 'Poorer child');

  // Both children are leaves, their blobs posmult beyond the end of their own branches
  for (const [child, name] of [[trunk, 'Richer'], [offshoot, 'Poorer']]) {
    close(t, child.arcr, LEAF_ARCR, name + ' child arcr');
    close(t, child.arcx, child.branch_end.x + (posmult * Math.cos(child.arca)), name + ' child arcx');
    close(t, child.arcy, child.branch_end.y + (posmult * Math.sin(child.arca)), name + ' child arcy');
  }

  t.end();
});

test('propspiral_pre_calc:children_colors', function (t) {
  set_stroke_theme();

  // Each child is asked about in its own right, so one the theme wants to draw in many colours is
  // split finely while its sibling is left as the angle alone asks for
  let many = mk_leaf(0.7, PERIODS_SHORT), one = mk_leaf(0.3, PERIODS_SHORT);
  many.stroke_count = 9;
  let root = mk_root([many, one]);
  propspiral_pre_calc.pre_calc(root);

  t.equal(many.branch_points.length, 9 + 1, 'The many-coloured child gets a segment per colour');
  check_branch_path(t, many, root_arca, trunk_role.min_turn, 0, 1,
    trunk_role.start_width_frac * root.bezr / root.nextr[0], partl1, 'Many-coloured child');
  check_branch_path(t, one, root_arca, -offshoot_role.min_turn, 0, 1,
    offshoot_role.start_width_frac * root.bezr / root.nextr[1], partl1, 'Single-coloured child');
  t.ok(one.branch_points.length < many.branch_points.length, 'Its sibling is left as the angle asks for');

  // ...and how finely a branch is split is no part of where it goes: the extra segments follow the
  // same curve, ending in the same place, at the same angle
  let plain = mk_root([mk_leaf(0.7, PERIODS_SHORT), mk_leaf(0.3, PERIODS_SHORT)]);
  propspiral_pre_calc.pre_calc(plain);
  close(t, many.arca, plain.children[0].arca, 'Same arca however many segments it took');
  close(t, many.branch_end.x, plain.children[0].branch_end.x, 'Same branch end (x)');
  close(t, many.branch_end.y, plain.children[0].branch_end.y, 'Same branch end (y)');
  close(t, root.nextx[0], plain.nextx[0], 'Same place in its parent (x)');
  close(t, root.nexty[0], plain.nexty[0], 'Same place in its parent (y)');
  close(t, root.nextr[0], plain.nextr[0], 'Same scale');

  t.end();
});

test('propspiral_pre_calc:children_order', function (t) {
  set_stroke_theme();

  // The same 2 children, in either order
  let root_a = mk_root([mk_leaf(0.3, PERIODS_SHORT), mk_leaf(0.7, PERIODS_SHORT)]);
  let root_b = mk_root([mk_leaf(0.7, PERIODS_SHORT), mk_leaf(0.3, PERIODS_SHORT)]);

  propspiral_pre_calc.pre_calc(root_a);
  propspiral_pre_calc.pre_calc(root_b);

  // Layout follows richness, not the order the children happen to be in
  t.deepEqual(root_a.nextr, root_b.nextr.slice().reverse(), 'nextr mirrored');
  t.deepEqual(root_a.nextx, root_b.nextx.slice().reverse(), 'nextx mirrored');
  t.deepEqual(root_a.nexty, root_b.nexty.slice().reverse(), 'nexty mirrored');
  t.deepEqual(
    root_a.children[1].branch_points, root_b.children[0].branch_points,
    'Richer child drawn the same either way round',
  );
  t.deepEqual(
    root_a.children[0].branch_points, root_b.children[1].branch_points,
    'Poorer child drawn the same either way round',
  );

  // A tie goes to the first child, which becomes the trunk
  let tied = mk_root([mk_leaf(0.5, PERIODS_SHORT), mk_leaf(0.5, PERIODS_SHORT)]);
  propspiral_pre_calc.pre_calc(tied);
  t.deepEqual(tied.nextr, root_b.nextr, 'First child treated as the richer one');

  t.end();
});

test('propspiral_pre_calc:recursion', function (t) {
  set_stroke_theme();

  // Poorer child of the root is itself a node with 2 children
  let branch = mk_node(0.3, PERIODS_SHORT, [mk_leaf(0.1, PERIODS_SHORT), mk_leaf(0.2, PERIODS_SHORT)]);
  let root = mk_root([mk_leaf(0.7, PERIODS_SHORT), branch]);
  propspiral_pre_calc.pre_calc(root);

  // The branch is drawn as a joint, its own children as leaves
  close(t, branch.arcr, branch.bezr / 2, 'branch arcr');
  close(t, branch.children[0].arcr, LEAF_ARCR, 'grandchild 0 arcr');
  close(t, branch.children[1].arcr, LEAF_ARCR, 'grandchild 1 arcr');

  // Grandchildren turn relative to the branch's angle, which is itself relative to the root's
  close(t, branch.arca, root_arca - offshoot_role.min_turn, 'branch arca');
  close(t, branch.children[1].arca, branch.arca + trunk_role.min_turn, 'Richer grandchild carries on round');
  close(t, branch.children[0].arca, branch.arca - offshoot_role.min_turn, 'Poorer grandchild turns out');

  // ...and are laid out against the branch just as it was against the root
  t.deepEqual(branch.nextr, [root.nextr[1], root.nextr[0]], 'branch nextr');
  check_child_placement(t, branch, 1, trunk_role, 'Richer grandchild');
  check_child_placement(t, branch, 0, offshoot_role, 'Poorer grandchild');

  t.end();
});

test('propspiral_pre_calc:long_sweep', function (t) {
  set_stroke_theme();

  // A child whose branch crosses enough periods to be worth more than one nominal child turns out
  // of the spiral and then winds back round with it, and reaches back past where its parent's
  // branch ended to do it
  let child = mk_leaf(0.3, PERIODS_LONG);
  let root = mk_root([mk_leaf(0.7, PERIODS_SHORT), child]);
  propspiral_pre_calc.pre_calc(root);

  const sweep = _child_sweep(child, false);
  t.ok(sweep.final_turn !== 0, 'Worth more than one child, so there is a second leg to wind back round');
  check_branch_path(t, child, root_arca, sweep.initial_turn, sweep.final_turn, 1,
    offshoot_role.start_width_frac * root.bezr / sweep.ratio, partl1, 'Long offshoot');
  t.ok(child.branch_points.length > 2, 'Split into several segments');

  // Where it starts is a point rather than a distance back along the parent's angle: a branch
  // worth a chain of children reaches back to where that chain would have come from
  const along = dot(child.branch_start.x, child.branch_start.y, Math.cos(root_arca), Math.sin(root_arca));
  const across = cross(child.branch_start.x, child.branch_start.y, Math.cos(root_arca), Math.sin(root_arca));
  t.ok(along < 0, 'Reaches back behind the origin it is measured from');
  t.ok(Math.abs(across) > 1e-6, 'Not simply back along the parent\'s angle');

  check_child_placement(t, root, 1, offshoot_role, 'Long offshoot');

  // The longer-lived child swings further round and shrinks further doing it than its short-lived
  // sibling, which is the whole point of laying the tree out by how long its branches lasted
  close(t, role_size(offshoot_role, PERIODS_LONG), Math.abs(sweep.initial_turn) + Math.abs(sweep.final_turn), 'Turns as far as its periods earned it');
  t.ok(root.nextr[1] < root.nextr[0], 'Drawn smaller than the sibling that turned less');

  t.end();
});

test('propspiral_pre_calc:existing_values_preserved', function (t) {
  set_stroke_theme();

  // A subtree node, already laid out by its parent, with a wider branch than the default
  let node = mk_node(0.3, PERIODS_SHORT, [mk_leaf(0.1, PERIODS_SHORT), mk_leaf(0.2, PERIODS_SHORT)]);
  let bare = mk_node(0.3, PERIODS_SHORT, [mk_leaf(0.1, PERIODS_SHORT), mk_leaf(0.2, PERIODS_SHORT)]);
  node.arca = 0;
  bare.arca = 0;
  node.branch_cubic({
    sx: 0.1, sy: 0.2,
    cp1x: 0.5, cp1y: 0.6,
    cp2x: 0.7, cp2y: 0.8,
    ex: 0.3, ey: 0.4,
  });
  node.bezr = 1;

  propspiral_pre_calc.pre_calc(node);
  propspiral_pre_calc.pre_calc(bare);

  t.deepEqual([
    node.branch_start.x, node.branch_start.y,
    node.branch_end.x, node.branch_end.y,
    node.branch_end.cp1x, node.branch_end.cp1y,
    node.branch_end.cp2x, node.branch_end.cp2y,
    node.bezr,
  ], [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], 'Branch left as-is, not reset to the root defaults');
  t.deepEqual([
    bare.branch_start.x, bare.branch_start.y,
    bare.branch_end.x, bare.branch_end.y,
    bare.bezr,
  ], [root_branch.sx, root_branch.sy, root_branch.ex, root_branch.ey, root_bezr], 'Missing values filled in with the defaults');

  // ...and the wider branch feeds through into how wide the children start and where they sit
  // (children[1] is the richer of the 2, so it's the one that carries on round the spiral)
  check_child_placement(t, node, 1, trunk_role, 'Richer child of the wider branch');
  check_child_placement(t, node, 0, offshoot_role, 'Poorer child of the wider branch');
  check_child_placement(t, bare, 1, trunk_role, 'Richer child of the default branch');
  check_child_placement(t, bare, 0, offshoot_role, 'Poorer child of the default branch');
  t.ok(
    node.children[1].branch_start.line_width > bare.children[1].branch_start.line_width,
    'A wider branch starts its children wider',
  );

  t.end();
});

test('propspiral_pre_calc:setup', function (t) {
  set_stroke_theme();

  let root = mk_root([mk_leaf(0.7, PERIODS_SHORT), mk_leaf(0.3, PERIODS_SHORT)]);

  // setup() selects the bezier horizon calculator, so horizons can be calculated for the paths
  // pre_calc() generates
  propspiral_pre_calc.setup();
  propspiral_pre_calc.pre_calc(root);
  calc_horizon(root);

  // Root's own box covers its branch (padded by half the widest it gets, which for the root's
  // untapered branch is its bezr) and its joint
  let xs = [root.branch_start.x], ys = [root.branch_start.y];
  for (const p of root.branch_points.slice(1)) {
    xs.push(p.cp1x, p.cp2x, p.x);
    ys.push(p.cp1y, p.cp2y, p.y);
  }
  close(t, root.gxmin, Math.min(Math.min(...xs) - (root.bezr / 2), root.arcx - (root.arcr * 1.305)), 'gxmin');
  close(t, root.gxmax, Math.max(Math.max(...xs) + (root.bezr / 2), root.arcx + (root.arcr * 1.305)), 'gxmax');
  close(t, root.gymin, Math.min(Math.min(...ys) - (root.bezr / 2), root.arcy - (root.arcr * 1.305)), 'gymin');
  close(t, root.gymax, Math.max(Math.max(...ys) + (root.bezr / 2), root.arcy + (root.arcr * 1.305)), 'gymax');

  // ...and the horizon grows to contain the children too
  t.ok(root.hxmin <= root.gxmin, 'hxmin at least as wide as gxmin');
  t.ok(root.hxmax >= root.gxmax, 'hxmax at least as wide as gxmax');
  t.ok(root.hymin <= root.gymin, 'hymin at least as tall as gymin');
  t.ok(root.hymax >= root.gymax, 'hymax at least as tall as gymax');

  t.end();
});
