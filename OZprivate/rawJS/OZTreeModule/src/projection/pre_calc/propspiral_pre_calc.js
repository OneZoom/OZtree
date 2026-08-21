import {set_horizon_calculator} from '../horizon_calc/horizon_calc';
import data_store_api from '../../data_store/api';

/**
 * Layout pre-calculation for the "propspiral" view.
 *
 * Each node is drawn as a bezier curve (its branch) with a circle at the end of it,
 * either a leaf blob, or a joint covering the gap where its children's branches begin.
 * A node's 2 children are drawn at an angle to their parent: the richer of the 2, the
 * trunk child, carries on around the spiral, while the poorer, the offshoot, branches
 * off more sharply.
 *
 * A branch leaves its parent's tip travelling the way its parent arrived and turns steadily
 * round to its own angle, so one runs into the next without a kink and the leaf on the end
 * faces the way its branch came in. How far it turns is the angle between the 2, so a branch
 * that turns further than one cubic can follow is drawn as several run end to end (see
 * _branch_path_points).
 *
 * Every value below is in the node's own co-ordinate space, i.e. the branch always
 * runs from (bezsx, bezsy) to (bezex, bezey), whatever the node's size or position on
 * screen. The layout code converts a point to screen co-ordinates with
 * (node.xvar + node.rvar * x), and a width or radius with (node.rvar * r), where
 * xvar/yvar/rvar are maintained by position_helper as the tree is zoomed.
 */
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
   * The branch, a bezier curve drawn by projection/layout/branch_layout_base:
   * * bezsx, bezsy: Start point of the curve
   * * path_points: The curve itself, as a list of cubic segments run end to end from
   *   (bezsx, bezsy), each {x, y, c1x, c1y, c2x, c2y}: 2 control points and the point the
   *   segment ends at, which is where the next one starts. A single cubic can only follow so
   *   much of a turn, so a branch turning further than max_segment_angle is split into
   *   however many equal segments it takes to stay within it. Each segment also holds the
   *   line_width the branch has where it ends, and (tx, ty), the unit tangent there
   * * bezc1x, bezc1y: First bezier control point
   * * bezc2x, bezc2y: Second bezier control point
   * * bezex, bezey: End point of the curve
   * * bezr: Width the curve is drawn at where it ends
   * * bezsr: Width where it starts, a share of the width its parent's branch ended at, wider
   *   for a trunk child than an offshoot, which the branch then tapers from down to its own
   *   bezr (see _branch_line_width)
   * * bezstx, bezsty: Unit tangent where the curve starts, the pair to a path_point's
   *
   * The circle at the end of the branch:
   * * arcx, arcy: Centre of the circle
   * * arcr: Radius of the circle. A node with children gets a small joint over the end
   *   of its branch (bezr/2); a node without gets a leaf blob, much wider than its branch
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
      Object.assign(node, root_branch);
      node.arca = root_arca;
    }
    _pre_calc(node);
  }
  setup() {
    set_horizon_calculator('bezier');
  }
}

/**
 * Leaf blob dimensions: a blob of radius (leafmult * partc), sitting posmult beyond the
 * end of the branch it hangs off. A branch always reaches exactly 1 in its own
 * co-ordinate space, so these are in effect fractions of a branch's length: a blob comes
 * out 1.28 in radius, sitting 0.9 past the tip of the branch it caps.
 */
const leafmult = 3.2;
const partc = 0.4;
const posmult = 0.9;

/**
 * How thick a branch is drawn where it ends, again as a fraction of the 1 it reaches. Every
 * node in the view ends the same partl1 wide (a node is only ever given a width by the
 * fallback in _pre_calc below), and starts at a share of the width its parent ended at,
 * tapering from the one to the other along its length (see _branch_line_width).
 */
const partl1 = 0.55;

/**
 * How far past the end of its branch a node's joint sits, as a fraction of the branch. Just
 * beyond it, so the circle covers the gap where the children's branches begin.
 */
const joint_overshoot = 1.01;

/**
 * What each kind of child is worth for a node of middling richness, i.e. the numbers
 * _child_kind works a particular child's own out of. The richer of a node's 2 children is the
 * trunk child, carrying on around the spiral: it turns by the smaller angle, to the right, and
 * is drawn at the larger scale. The poorer is the offshoot, branching off to the left more
 * sharply and drawn much smaller. Each kind gives:
 * * turn: How far the child's angle is turned from its parent's, positive being to the right,
 *   for a child whose weighted_mean is 1. Poorer nodes turn less than this and richer ones
 *   more, so it is the middle of a range rather than the angle any one child takes (see _turn)
 * * min_turn: The least it may turn however poor it is. It is the floor that keeps what leaves
 *   one tip clear of what leaves the next, the poorer children being the many, so it is held
 *   close under the nominal turn rather than far below it -- a trunk child sits at it exactly,
 *   i.e. anything but a rich one carries the spiral on by a nominal step
 * * max_turn: The most it may turn however rich it is. A branch worth several children reaches
 *   back to where that chain of them would have started, so the cap is on how much of a tree
 *   one node is allowed to swallow rather than on anything the curve itself objects to: a half
 *   turn of it, whichever way round the child goes
 * * ratio: How much smaller a nominal child of this kind is drawn than its parent, i.e. its
 *   nextr. With the turn it also fixes the shape of the branch, the 2 of them being a scaling
 *   and an angle and so a spiral, of pitch ln(ratio) / turn (see _child_kind)
 * * side: Which way the child is pushed off its parent's centre line (see nextx/nexty below)
 */
const trunk_child = {
  turn: Math.PI * 0.25,
  min_turn: Math.PI * 0.24,
  max_turn: Math.PI,
  ratio: 1 / 1.3,
  side: 1,
};
const offshoot_child = {
  turn: Math.PI * -0.46,
  min_turn: Math.PI * 0.43,
  max_turn: Math.PI * 2,
  ratio: 1 / 2.25,
  side: -1,
};

/**
 * The furthest a branch may turn in one cubic; a branch turning further than this is split
 * into equal segments that each stay within it.
 */
export const max_segment_angle = Math.PI / 6;

/**
 * The branch the root is drawn with: straight up the screen from the origin to (0, -1),
 * with the control points spaced along it so the curve comes out as good as straight.
 *
 * It doubles as the fallback for any part of a branch a node hasn't been given (see
 * _pre_calc). A child is given every part of its curve by its parent bar its end width, so in
 * practice bezr is the only one of these an ordinary node takes.
 *
 * There is no bezsr here, and so no taper: a branch tapers from a share of the width its
 * parent's branch ended at, and the root has no parent to take a share of. Its stem is drawn
 * at one width throughout, as every branch in the view was before, and the children leaving
 * its tip step in from that exactly as they would from any other tip.
 */
const root_arca = Math.PI * (3 / 2); // Straight up the screen
const root_branch = {
  bezsx: 0, bezsy: 0, // start position
  bezc1x: 0, bezc1y: -0.05, // control point 1 position
  bezc2x: 0, bezc2y: -0.95, // control point 2 position
  bezex: 0, bezey: -1, // end position
  bezr: partl1, // line width
};

/**
 * How far along a branch has got f of the way through it, as an offset from where it started,
 * in the frame the branch is worked out in: it leaves the origin along the polar axis, and
 * everything below is turned into the node's own co-ordinates by the caller.
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
 * How far back along its parent's angle a nominal branch starts, given that it turns `turn`
 * radians at `growth` and ends end_dist along its own angle. Negative, a branch reaching
 * forwards to its own tip having started behind the origin it is measured from.
 *
 * Only a nominal branch, i.e. one child's worth of turn: it is what pins the size the kind's
 * branches are drawn at, and nothing else asks (see _nominal_end_speed). A branch worth more
 * than one child cannot start along its parent's angle at all -- the chain of children it
 * stands in for doesn't -- so there is no distance along that line to ask for.
 */
function _branch_start_dist(growth, turn, end_dist) {
  if (turn === 0) {
    // A branch that doesn't turn has no gradient to match: its chord lies along the angle it
    // leaves at whichever way it is drawn, and the line below comes out 0/0. It still has a
    // limit as the turn shrinks to nothing, though, which is what the branch on either side
    // of it starts at, so give that rather than leaving a hole in the middle of the range
    const rate = Math.exp(growth);

    return end_dist * (1 - ((growth * (rate - 1)) / ((growth * rate) - rate + 1)));
  }
  const [x, y] = _branch_offset(growth, turn, 1);

  return end_dist * (Math.cos(turn) - (Math.sin(turn) * (x / y)));
}

/**
 * How fast a kind's branches are drawn where they end, per radian of turn.
 *
 * This is the one thing that fixes how big a branch comes out, and it is the same for every
 * branch of a kind however far round that branch goes. Which is what makes a long branch a
 * chain of short ones rather than a small copy of the shape of one: each child of a chain
 * hands the next the speed it arrived at, scaled into the smaller frame the next is drawn in,
 * so a branch standing in for a chain of them has to start out however much bigger the front
 * of that chain was -- exp(-growth) bigger, that being what the clade shrank by along the way.
 *
 * Its value is whatever a nominal child of the kind has always been drawn at, taken from the
 * one branch whose start the layout can place by itself (see _branch_start_dist), so pinning
 * it here leaves a middling child exactly where it was and lets everything else follow.
 */
function _nominal_end_speed(kind) {
  const growth = Math.log(kind.ratio);
  const start_dist = _branch_start_dist(growth, kind.turn, 1);
  const chord = Math.hypot(Math.cos(kind.turn) - start_dist, Math.sin(kind.turn));
  const [x, y] = _branch_offset(growth, kind.turn, 1);

  // Rearranged from the speed a branch is drawn at below: this is where it ends up, per radian
  return (chord / Math.hypot(x, y)) * kind.ratio / Math.abs(kind.turn);
}

/**
 * The share of the width its parent's branch ended at that a kind's branches start at, the
 * trunk child carrying on around the spiral with the bulk of it and the offshoot turning off
 * with rather less.
 *
 * Each is the ratio the shortest branch of its own kind is drawn at, since a branch always
 * ends at partl1 in its own co-ordinate space, i.e. at exp(growth) of the width its parent
 * ended at. The shortest turn is where that ratio is largest, so a share pinned to it is the
 * widest that kind of child can start without any branch of it ending wider than it began:
 * the shortest turn comes out a constant width throughout, and every longer one narrows, the
 * further round it reaches the more it thins. Since an offshoot is held to a longer minimum
 * turn than a trunk child, it also starts a good deal narrower.
 *
 * The 2 shares add up to more than 1, i.e. the children overlap where they leave their parent
 * rather than dividing its tip between them. Sharing it out instead would mean one or both
 * starting below the ratio they end at, which is a branch drawn as a wedge widening as it
 * goes; the overlap is hidden under the joint drawn over the end of the parent's branch (see
 * arcr below), and reads as 2 branches leaving a tip rather than as a step in the line.
 */
function _start_width_frac(kind) {
  return Math.exp(Math.log(kind.ratio) * (kind.min_turn / Math.abs(kind.turn)));
}

// Pinned here rather than written down with the rest of each kind, being their own
// numbers worked back out of the others
trunk_child.end_speed = _nominal_end_speed(trunk_child);
offshoot_child.end_speed = _nominal_end_speed(offshoot_child);
trunk_child.start_width_frac = _start_width_frac(trunk_child);
offshoot_child.start_width_frac = _start_width_frac(offshoot_child);

// Exported so that the tests can say what they expect of a layout in terms of them rather
// than repeating their values
export const trunk_start_width_frac = trunk_child.start_width_frac;
export const offshoot_start_width_frac = offshoot_child.start_width_frac;

/**
 * How wide a branch is drawn f of the way along it, given that it starts start_width wide and
 * ends end_width wide.
 *
 * A branch no longer picks up its parent's full width: each child takes a share of it, so both
 * start narrower than the tip they leave and the line steps in at every fork, as a real branch
 * does. Only the start is a share, though -- the end is always the branch's own partl1, so
 * that whatever a node inherited, what it hands on to its own children is decided by its own
 * size alone and the shares can't compound away to nothing down a deep clade.
 *
 * Between the 2 the share is closed geometrically, i.e. the width changes by a constant ratio
 * per radian turned, so it is spread evenly over the branch's length rather than being a kink
 * somewhere in it. Both ends are in the branch's own co-ordinate space, which is one uniform
 * scale throughout, so a branch given the same width at either end is one of constant width.
 */
function _branch_line_width(f, start_width, end_width) {
  return start_width * Math.pow(end_width / start_width, f);
}

/**
 * Everything about node's branch that follows from which of its parent's 2 children it is:
 * how far it turns off, the shape it turns with, and how it is placed and scaled.
 *
 * Half of that is the kind's to say and half the node's. Which way round a child goes and
 * which side of its parent it leaves are its kind's, the same for every child of that kind in
 * the tree. How far it turns is its own, out of its weighted_mean (see _turn), and the rest
 * follows from that turn rather than sitting still at what the kind said.
 *
 * Chain up nominal children of one kind and their branches trace a spiral: each turns the same
 * angle and is drawn the same amount smaller than the one before, which is a constant scaling
 * per radian turned, which is what a logarithmic spiral is. A child that has earned a sharper
 * turn should be drawn along more of that same spiral -- so its branch shrinks as much over
 * its turn as a chain of nominal ones would have over theirs, and its clade follows suit.
 *
 * That is what ties growth to the turn instead of leaving it free: growth per radian is the
 * pitch, the one number the shape of the curve comes down to, and it is the pitch of whichever
 * spiral the chain it stands in for would have wound round. Let it drift and a long branch is a
 * different curve rather than more of the same one -- one that gives up turning early and runs
 * out straight, where that chain would still be winding round.
 *
 * Which spiral that is is the one thing the 2 kinds part company over. A trunk child chains up
 * with more trunk children, so it is its own the whole way round. An offshoot only leaves the
 * trunk once, though, however rich it is -- so it turns away at its own steep pitch for as much
 * as its kind's turn, and whatever it has earned beyond that is worth trunk children on the
 * spiral it has landed in. That is what lets an offshoot turn as far as a trunk child while
 * keeping the path it always had: away from the trunk as sharply as ever, then winding round
 * onto its own origin at the rate the view winds round at everywhere else, rather than at the
 * far steeper rate its own turning-off implies, which by a half turn has shrunk its clade out
 * of all proportion to the angle it has come round by.
 */
function _child_kind(node, is_trunk) {
  const kind = is_trunk ? trunk_child : offshoot_child;

  // Try to fetch weighted_mean, if data slice isn't available yet throw error to be
  // caught by retry_when_data_ready() in rebuild_tree
  const weighted_mean = data_store_api.weighted_mean.get_or_fail(node);

  // How far node's branch turns from its parent's angle, i.e. the angle its whole clade is
  // swung round by, given that it is a child of the given kind.
  const size = Math.min(kind.max_turn, Math.max(
    kind.min_turn,
    Math.abs(kind.turn) * (weighted_mean ** 4),
  ));

  const turn = Math.sign(kind.turn) * size;

  // How far its clade shrinks over that turn, which is what keeps the tree's scale in step with
  // the angle it has wound round by: a chain of children's worth of shrinking, however many it
  // has earned. The first child's worth is of the kind the branch is, and anything past that a
  // trunk child's, there being no second turn away from the trunk for an offshoot to take
  const own_turn = Math.min(size, Math.abs(kind.turn));
  const growth = (Math.log(kind.ratio) * (own_turn / Math.abs(kind.turn)))
    + (Math.log(trunk_child.ratio) * ((size - own_turn) / trunk_child.turn));

  return {
    turn: turn,
    growth: growth,
    ratio: Math.exp(growth),
    side: kind.side,
    end_speed: kind.end_speed,
    start_width_frac: kind.start_width_frac,
  };
}

/** A point dist along the angle a, from the origin of whoever is asking */
function _along(a, dist) {
  return [dist * Math.cos(a), dist * Math.sin(a)];
}

/**
 * A branch as a list of cubic segments run end to end from where it starts, each
 * {x, y, c1x, c1y, c2x, c2y, line_width, tx, ty}: 2 control points and the point the segment
 * ends at, which is where the next one starts, so the whole list draws as a single unbroken
 * path, along with how wide the branch is where it ends and the direction it is travelling in
 * there, so that it can be drawn as a tapering line rather than one of a single width (see
 * _branch_line_width).
 *
 * The branch is the one that leaves along arca -- the angle its parent arrived at -- turning
 * `turn` radians at `growth` as it goes, and so arrives along (arca + turn), which is the
 * node's own arca: a branch runs into the next one without a kink at either end of it. It
 * reaches end_dist along its own angle, and is drawn at the size end_speed asks for, which is
 * what decides where it starts rather than the other way round (see _nominal_end_speed).
 *
 * Where a branch starts is therefore a point rather than a distance back along arca: a branch
 * worth several children reaches back where that chain of children would have come from,
 * which is not along that line. The caller gets it back, along with the direction the branch
 * leaves in there, for placing and drawing the node (see _pre_calc).
 *
 * Each segment is given the curve's own direction and speed at either end, so that it follows
 * the curve rather than cutting the corner: a cubic over a curve p(f) spanning a step of s
 * has control points p(f) + (s/3) * p'(f) and p(f + s) - (s/3) * p'(f + s). That is only a
 * 3rd-order approximation, hence the split into segments turning at most max_segment_angle.
 */
function _branch_path_points(arca, turn, growth, end_speed, end_dist, start_width, end_width) {
  // Equal segments, as many as it takes to bring each within max_segment_angle
  const count = Math.max(1, Math.ceil(Math.abs(turn) / max_segment_angle));
  const step = 1 / count;
  const cos_arca = Math.cos(arca), sin_arca = Math.sin(arca);
  // How fast the branch is drawn where it starts: the speed it is to end at, wound back over
  // the turn it takes to get there. exp(growth) is what it shrinks by on the way, so a branch
  // worth several children starts out however much bigger the front of that chain was
  const speed = end_speed * Math.abs(turn) * Math.exp(-growth);
  // ...and so where it starts is its own end, less everything it covers along the way
  const [offset_x, offset_y] = _branch_offset(growth, turn, 1);
  const end = _along(arca + turn, end_dist);
  const start = [
    end[0] - (speed * ((offset_x * cos_arca) - (offset_y * sin_arca))),
    end[1] - (speed * ((offset_x * sin_arca) + (offset_y * cos_arca))),
  ];
  // Where the branch has got to f of the way along, in the node's own co-ordinates
  const at = (f) => {
    const [x, y] = _branch_offset(growth, turn, f);

    return [
      start[0] + (speed * ((x * cos_arca) - (y * sin_arca))),
      start[1] + (speed * ((x * sin_arca) + (y * cos_arca))),
    ];
  };
  // The direction it is travelling in there, and how fast, i.e. the same curve's derivative
  const velocity = (f) => {
    const rate = speed * Math.exp(growth * f), angle = arca + (turn * f);

    return [rate * Math.cos(angle), rate * Math.sin(angle)];
  };
  // The same direction as a unit vector, which is what the branch is drawn from: the shape
  // code offsets the path sideways by it to find the edges of the tapering line it fills (see
  // projection/shapes/segmented_shape). A branch turns steadily, so this is simply the angle
  // it has reached; worked out here, once per layout, rather than there, where it could only
  // be estimated from the cubics and would have to be redone on every frame
  const unit_tangent = (f) => {
    const angle = arca + (turn * f);

    return [Math.cos(angle), Math.sin(angle)];
  };
  const path_points = [];

  for (let i = 0; i < count; i++) {
    const [sx, sy] = i === 0 ? start : at(i * step);
    // The last segment ends on the point the branch was asked to reach rather than on the one
    // the arithmetic wandered to, so a path lands exactly where its node expects it to
    const [ex, ey] = i === count - 1 ? end : at((i + 1) * step);
    const [svx, svy] = velocity(i * step);
    const [evx, evy] = velocity((i + 1) * step);
    const [tx, ty] = unit_tangent((i + 1) * step);

    path_points.push({
      c1x: sx + (step / 3 * svx),
      c1y: sy + (step / 3 * svy),
      c2x: ex - (step / 3 * evx),
      c2y: ey - (step / 3 * evy),
      x: ex,
      y: ey,
      line_width: _branch_line_width((i + 1) * step, start_width, end_width),
      tx: tx,
      ty: ty,
    });
  }
  return { start: start, start_tangent: unit_tangent(0), path_points: path_points };
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

  // Keep the branch our parent gave us, filling in anything it left unset from the root
  // branch: a node's width always comes from there, and a node we have been asked to lay a
  // subtree out from may have no branch at all yet
  for (const name in root_branch) {
    if (node[name] === undefined) node[name] = root_branch[name];
  }
  if (node.path_points === undefined) {
    // A node laid out by its parent was given the path its branch is drawn along with the
    // rest of it. Anything else -- the root, or a node handed a branch from somewhere else
    // -- has only the one cubic, which is a path of a single segment
    node.path_points = [{
      c1x: node.bezc1x, c1y: node.bezc1y,
      c2x: node.bezc2x, c2y: node.bezc2y,
      x: node.bezex, y: node.bezey,
    }];
  }

  if (node.has_child)
  {
    // The richer child carries on around the spiral as the trunk, the poorer offshoots
    const [offshootChildIndex, trunkChildIndex] = (node.children[0].richness_val) >= (node.children[1].richness_val) ? [1, 0] : [0, 1];

    for (const [childIndex, is_trunk] of [[trunkChildIndex, true], [offshootChildIndex, false]]) {
      const child = node.children[childIndex];
      // What this particular child is worth, which is partly its kind's to say and partly its
      // own: the sharper a turn its richness has earned it, the further round it goes and the
      // longer the sweep of spiral its branch is drawn along (see _child_kind)
      const kind = _child_kind(child, is_trunk);
      const child_arca = node.arca + kind.turn;
      // The child's branch ends the same partl1 wide every branch does in its own co-ordinate
      // space, and starts at its kind's share of the width ours ended at -- which is a length
      // in our space, so scale it into the child's as any other (see trunk_start_width_frac)
      const start_width = kind.start_width_frac * node.bezr / kind.ratio;
      // The child's branch leaves in the direction we arrived in and turns steadily round to
      // its own, reaching 1 along it: the same 1 every branch reaches in its own co-ordinate
      // space, ours included. Where it starts is then whatever the sweep reached back to
      const {start, start_tangent, path_points} = _branch_path_points(
        node.arca, kind.turn, kind.growth, kind.end_speed, 1, start_width, partl1);
      const first = path_points[0], last = path_points[path_points.length - 1];

      node.nextr[childIndex] = kind.ratio; // r (scale) reference for the child
      child.arca = child_arca;
      child.path_points = path_points;
      [child.bezsx, child.bezsy] = start;
      [child.bezstx, child.bezsty] = start_tangent;
      child.bezsr = start_width;
      // The same branch as a single cubic, for the layout and horizon code that still reads
      // it (bezier_horizon_calc, and branch_layout_base where path_points is absent): the
      // first segment's opening control point, and the last one's closing control point and
      // end. The 2 describe the same curve only while a branch fits in one segment, so past
      // max_segment_angle this is the coarse version of the path drawn, cutting the corner
      [child.bezc1x, child.bezc1y] = [first.c1x, first.c1y];
      [child.bezc2x, child.bezc2y] = [last.c2x, last.c2y];
      [child.bezex, child.bezey] = [last.x, last.y];

      // A child's origin sits wherever it takes to put the start of its branch on the end of
      // ours: back from our tip by where that branch begins, scaled into our space. It is a
      // reference point rather than anything drawn, and this is what makes it one -- however
      // either of us is angled or scaled, the child's curve begins exactly where ours ended.
      // Both co-ordinates of it matter, a branch worth several children reaching back to
      // where that chain of them would have started rather than back along our own angle.
      //
      // Neither child starts as wide as we are where they leave us (see bezsr), so a child
      // left on our centre line would start inside our tip on both sides. Instead each is
      // nudged sideways by half the width it is missing, which brings one of its edges flush
      // with one of ours: the trunk child to the right, the way the spiral winds, so the inner
      // edge of it carries on as one unbroken curve, and the offshoot the other way, so it
      // leaves along our outer edge. The fork then reads as our line splitting in 2 rather
      // than as a pair of narrower lines starting somewhere inside it
      const bias = kind.side * ((node.bezr - (kind.ratio * start_width)) / 2.0);
      node.nextx[childIndex] = node.bezex - (kind.ratio * start[0]) + (bias * perpx); // x reference point for the child
      node.nexty[childIndex] = node.bezey - (kind.ratio * start[1]) + (bias * perpy); // y reference point for the child
    }

    // Joint just beyond the end of our branch, covering the gap where the children start
    node.arcx = node.bezex * joint_overshoot;
    node.arcy = node.bezey * joint_overshoot;
    node.arcr = node.bezr / 2;

    _pre_calc(node.children[0]);
    _pre_calc(node.children[1]);
  } else {
    // Leaf blob, sitting posmult beyond the end of our branch, in the direction we point
    node.arcx = node.bezex + (posmult * dirx);
    node.arcy = node.bezey + (posmult * diry);
    node.arcr = leafmult * partc;
  }
}

let propspiral_pre_calc = new PropSpiralPreCalc();

export default propspiral_pre_calc;
