import {color_theme} from '../../themes/color_theme';
import {set_horizon_calculator} from '../horizon_calc/horizon_calc';
import data_store_api from '../../data_store/api';

class PropSpiralPreCalc {
  constructor() {
    this._viewtype = "propspiral";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in PropSpiralPreCalc.");
    else return this._viewtype;
  }
  /**
   * Calculate the spiral layout for node and all its descendants, setting on each:
   *
   * The branch, a path of cubic segments drawn by projection/layout/branch_layout_base:
   * * branch_points: The path, filled in with node.branch_restart() / node.branch_point()
   *   (see factory/midnode). The first point is where the branch starts, and each one
   *   after it a segment run on from the one before, {cp1x, cp1y, cp2x, cp2y, x, y}: 2
   *   control points and the point the segment ends at. Every point also carries the
   *   line_width the branch has there and (tx, ty), the unit tangent, so the branch is
   *   drawn as a tapering line rather than one of a single width. The start point carries
   *   the same 2, being the one point of the branch no segment ends on
   * * bezr: The width the branch ends at, which is what the layout falls back to for any
   *   point that doesn't give one of its own
   *
   * The circle at the end of the branch:
   * * arcx, arcy: Centre of the circle
   * * arcr: Radius of the circle. A node with children gets a small joint over the end
   *   of its branch; a node without gets a leaf blob, much wider than its branch
   * * arca: Angle in radians the branch points in, used to orient the leaf drawn there
   *   (see projection/layout/leaf_layout_base) as well as to place the node's children
   *
   * How to get from this node's co-ordinate space to each child's, used by
   * position_helper to position children, and by the horizon calculator to combine
   * their bounding boxes into this node's:
   * * nextr[i]: Scale of child i relative to this node
   * * nextx[i], nexty[i]: Position of child i's origin in this node's co-ordinates
   *
   * Note that a node's own branch is decided by its parent, so only nextr/nextx/nexty,
   * arcx/arcy/arcr are set for node itself here. The exception is the root, which has no
   * parent to do this for it, and so gets a fixed branch pointing straight up the screen.
   *
   * @param {Object} node The (sub)tree root to lay out. If node.is_root, generate the
   *                      fixed root branch first, otherwise the branch values already on
   *                      node are kept, and only its descendants' are (re)calculated.
   */
  pre_calc(node) {
    if (node.is_root) {
      node.branch_cubic(root_branch);
      node.bezr = root_bezr;
      node.arca = root_arca;
    }
    _pre_calc(node);
  }
  setup() {
    set_horizon_calculator('bezier');
  }
}

// ==== Helper functions ===================================================================

/**
 * How far back along its parent's angle a nominal branch starts, given that it turns `turn`
 * radians at `growth` and ends end_dist along its own angle. Negative, a branch reaching
 * forwards to its own tip having started behind the origin it is measured from.
 *
 * Only meaningful for a nominal branch, i.e. one child's worth of turn (see
 * _nominal_end_speed): a branch worth more than one child doesn't start along its parent's
 * angle at all, so there is no distance along that line to ask for.
 */
function _branch_start_dist(growth, turn, end_dist) {
  if (turn === 0) {
    // A branch that doesn't turn has no gradient to match, and the line below comes out 0/0.
    // Give the limit as the turn shrinks to nothing rather than leave a hole in the range
    const rate = Math.exp(growth);

    return end_dist * (1 - ((growth * (rate - 1)) / ((growth * rate) - rate + 1)));
  }
  const [x, y] = _branch_offset(growth, turn, 1);

  return end_dist * (Math.cos(turn) - (Math.sin(turn) * (x / y)));
}

/**
 * How far along a branch has got f of the way through it, as an offset from where it started,
 * in the frame the branch is worked out in: it leaves the origin along the polar axis, and the
 * caller turns the result into the node's own co-ordinates.
 *
 * A branch turns steadily, i.e. its direction is (turn * f) radians round from the one it
 * left in, while its speed changes by a constant ratio per radian turned, exp(growth) over
 * the branch as a whole.
 */
function _branch_offset(growth, turn, f) {
  const rate = Math.exp(growth * f);
  const x = rate * Math.cos(turn * f), y = rate * Math.sin(turn * f);
  const divisor = (growth * growth) + (turn * turn);

  return [
    ((growth * (x - 1)) + (turn * y)) / divisor,
    ((growth * y) - (turn * (x - 1))) / divisor,
  ];
}

/**
 * How wide a branch is drawn f of the way along it, given that it starts start_width wide and
 * ends end_width wide.
 *
 * A branch starts at a share of the width its parent ended at, so the line steps in at every
 * fork as a real branch does, but always ends at its own partl1, so that the shares can't
 * compound away to nothing down a deep clade. The share is closed geometrically between the 2,
 * spreading it evenly along the branch rather than leaving a kink somewhere in it.
 */
function _branch_line_width(f, start_width, end_width) {
  return start_width * Math.pow(end_width / start_width, f);
}

/**
 * How fast a role's branches are drawn where they end, per radian of turn, i.e. how big a
 * branch is at its far end
 */
function _nominal_end_speed(role) {
  const growth = Math.log(role.ratio);
  const start_dist = _branch_start_dist(growth, role.turn, 1);
  const chord = Math.hypot(Math.cos(role.turn) - start_dist, Math.sin(role.turn));
  const [x, y] = _branch_offset(growth, role.turn, 1);

  return (chord / Math.hypot(x, y)) * role.ratio / Math.abs(role.turn);
}

/**
 * The share of the parent's branch width that a child in this role starts at
 * NB: The end result is > 1, i.e there is overlap between the 2
 */
function _start_width_frac(role) {
  return Math.exp(Math.log(role.ratio) * (role.min_turn / Math.abs(role.turn)));
}

// ==== Constants ==========================================================================

/**
 * Leaf blob dimensions: a blob of radius (leafmult * partc), sitting posmult beyond the
 * end of the branch it hangs off. A branch always reaches exactly 1 in its own
 * co-ordinate space, so these are in effect fractions of a branch's length.
 */
export const leafmult = 2.8;
export const partc = 0.4;
export const posmult = 0.9;

/**
 * How thick a branch is drawn where it ends, again as a fraction of the 1 it reaches. Every
 * node in the view ends the same partl1 wide, and starts at a share of the width its parent
 * ended at, tapering from the one to the other (see _branch_line_width).
 */
export const partl1 = 0.55;

/**
 * How far past the end of its branch a node's joint sits, as a fraction of the branch. Just
 * beyond it, so the circle covers the gap where the children's branches begin.
 */
export const joint_overshoot = 1.01;

/**
 * The furthest a branch may turn in one cubic; a branch turning further than this is split
 * into equal segments that each stay within it.
 */
export const max_segment_angle = Math.PI / 6;

/**
 * The branch the root is drawn with: straight up the screen from the origin to (0, -1),
 * with the control points spaced along it so the curve comes out as good as straight.
 *
 * It doubles as the fallback for a branch a node hasn't been given (see _pre_calc). A child
 * is given its whole path by its parent along with the widths to draw it at, so in practice
 * an ordinary node only ever falls back to this when it is the one a subtree is laid out
 * from, and even then only until its own parent lays it out again.
 */
export const root_arca = Math.PI * (3 / 2); // Straight up the screen
export const root_branch = {
  sx: 0, sy: 0, // start position
  cp1x: 0, cp1y: -0.05, // control point 1 position
  cp2x: 0, cp2y: -0.95, // control point 2 position
  ex: 0, ey: -1, // end position
};
export const root_bezr = partl1; // line width, the same at either end: the root doesn't taper

// ==== Child Sweep ========================================================================

/**
 * Defines the sweep (i.e. spiral segment) parameters for the richer child that stays on the "trunk" spiral
 */
export const trunk_role = {
  // How far the child's angle is turned from its parent's, for turn_scale 1 (magnitude, "side" gives direction)
  turn: Math.PI * 0.33,
  // Resultant turn value is clamped between min / max
  min_turn: Math.PI * 0.25,
  max_turn: Math.PI,
  // How much smaller a nominal child in this role is drawn than its parent (read: nextr)
  // NB: The resultant spiral is of pitch ln(ratio) / turn
  ratio: 1 / 1.6,
  // Which way round the spiral goes (clockwise / anti-clockwise)
  side: 1,
};
trunk_role.end_speed = _nominal_end_speed(trunk_role);
trunk_role.start_width_frac = _start_width_frac(trunk_role);

/**
 * Defines the sweep (i.e. spiral segment) parameters for the less-rich child that forms it's own spiral
 *
 * NB: The full path in this case is a combination of offshoot_role then trunk_role, the offshoot_role
 *     defining the "kink". See own_turn / final_turn.
 */
export const offshoot_role = {
  // How far the child's angle is turned from its parent's, for turn_scale 1 (magnitude, "side" gives direction)
  turn: Math.PI * 0.46,
  // Resultant turn value is clamped between min / max
  min_turn: Math.PI * 0.43,
  max_turn: Math.PI * 1.2,
  // How much smaller a nominal child in this role is drawn than its parent (read: nextr)
  ratio: 1 / 1.9,
  // Which way round the spiral goes (clockwise / anti-clockwise)
  side: -1,
};
offshoot_role.end_speed = _nominal_end_speed(offshoot_role);
offshoot_role.start_width_frac = _start_width_frac(offshoot_role);

/**
 * Given a node and whether it's a trunk or offshoot node, calculate it's sweep (i.e. the
 * spiral path) parameters which will be broken down into bezier segments later.
 */
export function _child_sweep(node, is_trunk) {
  const role = is_trunk ? trunk_role : offshoot_role;

  // Try to fetch turn_scale, if data slice isn't available yet throw error to be
  // caught by retry_when_data_ready() in rebuild_tree
  const turn_scale = data_store_api.geological.branch_periods_count(node);

  // The angle the node's whole clade is swung round by, which is its own to earn out of its
  // turn_scale. Which way it turns is the role's alone, the same for every child in it
  const size = Math.min(role.max_turn, Math.max(
    role.min_turn,
    role.turn * Math.log(turn_scale),
  ));

  // How many nominal children's worth of turn that is, and so how far the clade shrinks over
  // it: what keeps the tree's scale in step with the angle it has wound round by
  const steps = size / role.turn;
  const growth = Math.log(role.ratio) * steps;

  // A branch stands in for a chain of children, which turns away from the trunk once and once
  // only, so the angle is a leg of the role's own turn and then a leg of the trunk's. For a
  // trunk child both legs go the same way and the branch is the single sweep it looks like; an
  // offshoot turns out of the spiral and then winds back round with it, rather than spiralling
  // the wrong way for the whole of a long turn
  const own_turn = Math.min(size, role.turn);
  const initial_turn = role.side * own_turn;
  const final_turn = trunk_role.side * (size - own_turn);

  return {
    initial_turn: initial_turn,
    final_turn: final_turn,
    growth: growth,
    ratio: Math.exp(growth),
    side: role.side,
    end_speed: role.end_speed,
    start_width_frac: role.start_width_frac,
  };
}

// ==== Path Calculation ===================================================================

/**
 * Fill in node's branch: a path of cubic segments run end to end from where it starts, each
 * {x, y, cp1x, cp1y, cp2x, cp2y, line_width, tx, ty}: 2 control points and the point the
 * segment ends at, which is where the next one starts, so the whole path draws as a single
 * unbroken line, along with the width and direction the branch has there, so that it can be
 * drawn as a tapering line rather than one of a single width (see _branch_line_width).
 *
 * The path's own start is branch_points[0], the one point of the branch no segment ends on,
 * and carries the direction the branch leaves in for the same reason (see
 * projection/shapes/segmented_shape). Where that start falls is worked out here rather than
 * given, so the caller reads it back off node.branch_start.
 *
 * The branch leaves along arca -- the angle its parent arrived at -- and turns steadily to
 * arrive along arca plus initial_turn plus final_turn: a branch runs into the next one without a
 * kink at either end of it. That arrival angle is the node's own arca, so it is set here rather
 * than left to the caller to add up again. It reaches end_dist along its own angle, and is drawn
 * at the size end_speed asks for, which is what decides where it starts rather than the other
 * way round (see _nominal_end_speed).
 *
 * initial_turn and final_turn are that turn as 2 legs, each turning its own way, run end to end
 * (see _child_sweep for why an offshoot's angle arrives in 2 pieces). A leg turns and shrinks at
 * one steady rate, so each is a sweep of logarithmic spiral; legs meet without a kink, taking
 * over at the angle and speed the one before ran out at, and `growth` is spread over the
 * branch's turn as a whole rather than per leg.
 *
 * Where a branch starts is therefore a point rather than a distance back along arca: a branch
 * worth several children reaches back where that chain of children would have come from,
 * which is not along that line. The caller reads it back off the path to place the node (see
 * _pre_calc).
 *
 * Segments are cubics fitted to the curve's own direction and speed at either end, so that they
 * follow the curve rather than cutting the corner. The fit is only approximate, hence the split
 * into segments turning at most max_segment_angle, and no segment straddles the join between
 * legs: a cubic can follow a curve that turns one way throughout, and nothing more.
 */
export function _branch_path(node, arca, initial_turn, final_turn, growth, end_speed, end_dist, start_width, end_width) {
  // A point dist along the angle a, from the origin of whoever is asking
  function _along(a, dist) {
    return [dist * Math.cos(a), dist * Math.sin(a)];
  }

  // How far round the branch goes all told, and where it ends up, which are only the same
  // where both legs turn the same way
  const total_turn = Math.abs(initial_turn) + Math.abs(final_turn);
  const net_turn = initial_turn + final_turn;
  // How fast the branch is drawn where it starts: the speed it is to end at, wound back over
  // the turn it takes to get there
  const speed = end_speed * total_turn * Math.exp(-growth);
  const end = _along(arca + net_turn, end_dist);
  // How far a leg has got u of the way through it, as an offset from where it started, turned
  // to face the way the leg leaves and scaled to the share of the branch the leg covers
  const _leg_offset = (leg, u) => {
    const [x, y] = _branch_offset(growth * leg.span, leg.turn, u);
    const cos_arca = Math.cos(leg.arca), sin_arca = Math.sin(leg.arca);
    const scale = leg.speed * leg.span;

    return [
      scale * ((x * cos_arca) - (y * sin_arca)),
      scale * ((x * sin_arca) + (y * cos_arca)),
    ];
  };
  // Where it has got to there, in the node's own co-ordinates
  const _leg_at = (leg, u) => {
    const [x, y] = _leg_offset(leg, u);

    return [leg.start[0] + x, leg.start[1] + y];
  };
  // The direction it is travelling in there, and how fast, in the branch's own f rather than
  // the leg's u -- what the cubics below are spaced by -- so the speed picks up where the leg
  // before left off
  const _leg_velocity = (leg, u) => {
    const rate = leg.speed * Math.exp(growth * leg.span * u);
    const angle = leg.arca + (leg.turn * u);

    return [rate * Math.cos(angle), rate * Math.sin(angle)];
  };
  // The same direction as a unit vector, which is what the branch is drawn from: the shape
  // code offsets the path sideways by it to find the edges of the tapering line it fills (see
  // projection/shapes/segmented_shape). Worked out here, once per layout, rather than there,
  // where it could only be estimated from the cubics and would have to be redone every frame
  const _leg_tangent = (leg, u) => {
    const angle = leg.arca + (leg.turn * u);

    return [Math.cos(angle), Math.sin(angle)];
  };
  // We should at least have enough segments for the color scheme to do it's thing
  const min_segments = Math.max(1, color_theme.get_color('branch.stroke', node, undefined, false, true).length);
  // Each leg in turn: the share of the branch it covers and where in it that share falls, the
  // angle and speed it takes over at, and how many segments it needs to stay within
  // max_segment_angle. A leg with no turn to it is no leg at all -- a branch worth a single
  // child has nothing to wind back round -- so leave it out rather than keep a zero-length
  // sweep in the path
  const branch = [];
  let leg_arca = arca, leg_speed = speed, leg_f = 0;
  const _add_leg = (turn) => {
    if (turn === 0) return;
    const leg = {
      turn: turn,
      span: Math.abs(turn) / total_turn,
      arca: leg_arca,
      speed: leg_speed,
      f: leg_f,
      count: Math.max(min_segments, Math.ceil(Math.abs(turn) / max_segment_angle)),
    };

    leg_arca += leg.turn;
    leg_speed *= Math.exp(growth * leg.span);
    leg_f += leg.span;

    branch.push(leg);
  };
  _add_leg(initial_turn);
  _add_leg(final_turn);

  // Where each leg begins and ends, walked back from the end of the branch: the whole thing is
  // worked out from where it ends up rather than from where it sets off (see
  // _nominal_end_speed), and walking back leaves the legs sharing their points exactly, the
  // last ending on the point the branch was asked to reach rather than where arithmetic wandered
  for (let i = branch.length - 1, leg_end = end; i >= 0; i--) {
    const [x, y] = _leg_offset(branch[i], 1);

    branch[i].end = leg_end;
    branch[i].start = [leg_end[0] - x, leg_end[1] - y];
    leg_end = branch[i].start;
  }

  // The angle the branch arrives at is the node's own, the one its children leave along and its
  // leaf or joint is oriented by: whatever the legs come to between them, which for an offshoot
  // is the 2 of them pulling opposite ways (see _child_sweep)
  node.arca = arca + net_turn;

  // Throw away whatever the node was drawn with last time and start the path where the first
  // leg reached back to, as wide as we were asked to start and travelling the way our parent
  // arrived: the start carries its own width and tangent like any other point of the branch,
  // being the one point of it no segment ends on
  const start_point = node.branch_restart();
  [start_point.x, start_point.y] = branch[0].start;
  start_point.line_width = start_width;
  start_point.tx = Math.cos(arca);
  start_point.ty = Math.sin(arca);

  for (const leg of branch) {
    const step = 1 / leg.count;
    // The leg's segments in the branch's own f, which is what a cubic's control points and the
    // taper along it are spaced by
    const leg_step = leg.span * step;

    for (let i = 0; i < leg.count; i++) {
      const [sx, sy] = _leg_at(leg, i * step);
      const [ex, ey] = i === leg.count - 1 ? leg.end : _leg_at(leg, (i + 1) * step);
      const [svx, svy] = _leg_velocity(leg, i * step);
      const [evx, evy] = _leg_velocity(leg, (i + 1) * step);
      const [tx, ty] = _leg_tangent(leg, (i + 1) * step);
      const p = node.branch_point();

      p.cp1x = sx + (leg_step / 3 * svx);
      p.cp1y = sy + (leg_step / 3 * svy);
      p.cp2x = ex - (leg_step / 3 * evx);
      p.cp2y = ey - (leg_step / 3 * evy);
      p.x = ex;
      p.y = ey;
      p.line_width = _branch_line_width(leg.f + ((i + 1) * leg_step), start_width, end_width);
      p.tx = tx;
      p.ty = ty;
    }
  }
}

/**
 * Recursively lay out node and its descendants.
 * @see PropSpiralPreCalc.pre_calc for the values this sets on each node
 */
function _pre_calc(node) {
  // The direction our own branch points in, and the same turned a quarter-turn to the
  // right, which is the direction our children are pushed apart along
  const dirx = Math.cos(node.arca), diry = Math.sin(node.arca);
  const perpx = Math.cos(node.arca + Math.PI / 2.0), perpy = Math.sin(node.arca + Math.PI / 2.0);

  // Keep the branch our parent gave us, falling back to the root's: a node we have been asked
  // to lay a subtree out from may have no branch at all yet
  if (node.branch_points === undefined) node.branch_cubic(root_branch);
  if (node.bezr === undefined) node.bezr = root_bezr;

  // Where our branch ends, which is where our children's branches and our own joint or leaf
  // blob go. Read out rather than held on to, the point being reused (see factory/midnode)
  const end_x = node.branch_end.x, end_y = node.branch_end.y;

  if (node.has_child)
  {
    // The richer child carries on around the spiral as the trunk, the poorer offshoots
    const [offshootChildIndex, trunkChildIndex] = (node.children[0].richness_val) >= (node.children[1].richness_val) ? [1, 0] : [0, 1];

    for (const [childIndex, is_trunk] of [[trunkChildIndex, true], [offshootChildIndex, false]]) {
      const child = node.children[childIndex];
      // What this particular child is worth: the sharper a turn its richness has earned it,
      // the longer the sweep of spiral its branch is drawn along (see _child_sweep)
      const sweep = _child_sweep(child, is_trunk);
      // The child's branch ends the same partl1 wide every branch does in its own co-ordinate
      // space, and starts at its role's share of the width ours ended at -- which is a length
      // in our space, so scale it into the child's as any other (see _start_width_frac)
      const start_width = sweep.start_width_frac * node.bezr / sweep.ratio;

      // The child's branch leaves in the direction we arrived in and turns round to its own,
      // reaching 1 along it as every branch does in its own co-ordinate space. Where it starts
      // is then whatever the sweep reached back to, and the angle it ends up at the child's arca
      _branch_path(
        child, node.arca, sweep.initial_turn, sweep.final_turn,
        sweep.growth, sweep.end_speed, 1, start_width, partl1);
      const start_x = child.branch_start.x, start_y = child.branch_start.y;

      node.nextr[childIndex] = sweep.ratio; // r (scale) reference for the child
      child.bezr = partl1;

      // A child's origin sits wherever it takes to put the start of its branch on the end of
      // ours, however either of us is angled or scaled. Both co-ordinates of it matter, a
      // branch worth several children reaching back to where that chain of them would have
      // started rather than back along our own angle.
      //
      // Neither child starts as wide as we are where they leave us (see start_width), so each is
      // nudged sideways by half the width it is missing, bringing one of its edges flush with
      // one of ours: the trunk child to the right, the way the spiral winds, and the offshoot
      // the other way. The fork then reads as our line splitting in 2 rather than as a pair of
      // narrower lines starting somewhere inside it
      const bias = sweep.side * ((node.bezr - (sweep.ratio * start_width)) / 2.0);
      node.nextx[childIndex] = end_x - (sweep.ratio * start_x) + (bias * perpx); // x reference point for the child
      node.nexty[childIndex] = end_y - (sweep.ratio * start_y) + (bias * perpy); // y reference point for the child
    }

    // Joint just beyond the end of our branch, covering the gap where the children start
    node.arcx = end_x * joint_overshoot;
    node.arcy = end_y * joint_overshoot;
    node.arcr = node.bezr / 2;

    _pre_calc(node.children[0]);
    _pre_calc(node.children[1]);
  } else {
    // Leaf blob, sitting posmult beyond the end of our branch, in the direction we point
    node.arcx = end_x + (posmult * dirx);
    node.arcy = end_y + (posmult * diry);
    node.arcr = leafmult * partc;
  }
}

let propspiral_pre_calc = new PropSpiralPreCalc();

export default propspiral_pre_calc;
