import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

/**
 * Layout pre-calculation for the "spiral" view.
 *
 * Each node is drawn as a bezier curve (its branch) with a circle at the end of it,
 * either a leaf blob, or a joint covering the gap where its children's branches begin.
 * A node's 2 children are drawn at an angle to their parent: the richer of the 2, the
 * trunk child, carries on around the spiral, while the poorer, the offshoot, branches
 * off more sharply.
 *
 * Every value below is in the node's own co-ordinate space, i.e. the branch always
 * runs from the first of its branch_points to the last, whatever the node's size or
 * position on screen. The layout code converts a point to screen co-ordinates with
 * (node.xvar + node.rvar * x), and a width or radius with (node.rvar * r), where
 * xvar/yvar/rvar are maintained by position_helper as the tree is zoomed.
 */
class SpiralPreCalc {
  constructor() {
    this._viewtype = "spiral";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in SpiralPreCalc.");
    else return this._viewtype;
  }
  /**
   * Calculate the spiral layout for node and all its descendants, setting on each:
   *
   * The branch, a bezier curve drawn by projection/layout/branch_layout_base:
   * * branch_points: The curve, set with node.branch_cubic() (see factory/midnode)
   * * bezr: Width the curve is stroked at
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
 * How thick a branch is drawn, again as a fraction of the 1 it reaches. Every node in the
 * view is the same partl1 wide (a node is only ever given a width by the fallback in
 * _pre_calc below), so a branch is a line of constant width rather than a tapering one;
 * what makes the tree narrow towards the leaves is each child being drawn smaller than its
 * parent, not the width changing along a branch.
 */
const partl1 = 0.55;

/**
 * How far along its own angle a node places its children's origins. Each child's branch
 * then starts child_start back along that same angle, i.e. child_origin_dist +
 * child_start = 1 along it, which is exactly where the node's own branch ends: the child's
 * curve begins on its parent's tip however the 2 are scaled or angled.
 */
const child_origin_dist = 1.3;
const child_start = -0.3;

/**
 * How far past the end of its branch a node's joint sits, as a fraction of the branch. Just
 * beyond it, so the circle covers the gap where the children's branches begin.
 */
const joint_overshoot = 1.01;

/**
 * The 2 kinds of child. The richer of a node's 2 children is the trunk child, carrying on
 * around the spiral: it turns by the smaller angle, to the right, and is drawn at the
 * larger scale. The poorer is the offshoot, branching off to the left more sharply and
 * drawn much smaller. Each kind gives:
 * * turn: How far the child's angle is turned from its parent's, positive being to the right
 * * ratio: How much smaller the child is drawn than its parent, i.e. its nextr
 * * side: Which way the child is pushed off its parent's centre line (see nextx/nexty below)
 * * control_points: The child's 2 bezier control points, each measured either along its
 *   parent's angle or along its own (see _pre_calc)
 */
const trunk_child = {
  turn: Math.PI * 0.22,
  ratio: 1 / 1.3,
  side: 1,
  // Both control points lie along the parent's angle, the first sitting exactly on the
  // start point, so the curve leaves the tip travelling just the way the parent was
  control_points: (along_parent, along_self) => [along_parent(child_start), along_parent(0.15)],
};
const offshoot_child = {
  turn: Math.PI * -0.46,
  ratio: 1 / 2.25,
  side: -1,
  // Only the first control point follows the parent's angle, and only just: the second sits
  // back along the child's own angle, pulling the curve straight into its end point, so the
  // sharper turn is made close to the parent's tip rather than spread over the branch
  control_points: (along_parent, along_self) => [along_parent(0.1), along_self(0.9)],
};

/**
 * The branch the root is drawn with: straight up the screen from the origin to (0, -1),
 * with the control points spaced along it so the curve comes out as good as straight.
 *
 * It doubles as the fallback for a branch a node hasn't been given (see _pre_calc). A
 * child is given its whole curve by its parent bar its width, so in practice root_bezr is
 * the only fallback an ordinary node takes.
 */
const root_arca = Math.PI * (3 / 2); // Straight up the screen
const root_branch = {
  sx: 0, sy: 0, // start position
  cp1x: 0, cp1y: -0.05, // control point 1 position
  cp2x: 0, cp2y: -0.95, // control point 2 position
  ex: 0, ey: -1, // end position
};
const root_bezr = partl1; // line width

/**
 * Recursively lay out node and its descendants.
 * @see SpiralPreCalc.pre_calc for the values this sets on each node
 */
function _pre_calc(node) {
  // The direction our own branch points in, and the same turned a quarter-turn to the
  // right, which is the direction our children are pushed apart along
  const dirx = Math.cos(node.arca), diry = Math.sin(node.arca);
  const perpx = Math.cos(node.arca + Math.PI / 2.0), perpy = Math.sin(node.arca + Math.PI / 2.0);

  // Keep the branch our parent gave us, filling in anything it left unset from the root
  // branch: a node's width always comes from there, and a node we have been asked to lay a
  // subtree out from may have no branch at all yet
  if (node.branch_points === undefined) node.branch_cubic(root_branch);
  if (node.bezr === undefined) node.bezr = root_bezr;

  if (node.has_child)
  {
    // The richer child carries on around the spiral as the trunk, the poorer offshoots
    const [offshootChildIndex, trunkChildIndex] = (node.children[0].richness_val) >= (node.children[1].richness_val) ? [1, 0] : [0, 1];

    for (const [childIndex, kind] of [[trunkChildIndex, trunk_child], [offshootChildIndex, offshoot_child]]) {
      const child = node.children[childIndex];
      const child_arca = node.arca + kind.turn;
      const child_dirx = Math.cos(child_arca), child_diry = Math.sin(child_arca);
      // The 2 ways a point on the child's branch is measured, both in the child's own
      // co-ordinate space: a distance along the child's angle, or one back along ours --
      // which, the child being drawn ratio times smaller than us, is that much longer there
      const along_self = (dist) => [dist * child_dirx, dist * child_diry];
      const along_parent = (dist) => [dist * dirx / kind.ratio, dist * diry / kind.ratio];
      const [c1, c2] = kind.control_points(along_parent, along_self);

      node.nextr[childIndex] = kind.ratio; // r (scale) reference for the child
      child.arca = child_arca;
      // The branch runs from our own tip (see child_start) to 1 along the child's angle
      const [sx, sy] = along_parent(child_start);
      const [ex, ey] = along_self(1);
      child.branch_cubic({
        sx: sx, sy: sy,
        cp1x: c1[0], cp1y: c1[1],
        cp2x: c2[0], cp2y: c2[1],
        ex: ex, ey: ey,
      });

      // Both children start child_origin_dist along our own angle, then are pushed apart at
      // right-angles to it, by half the difference between our branch width and theirs
      const bias = kind.side * ((node.bezr - (partl1 * kind.ratio)) / 2.0);
      node.nextx[childIndex] = (child_origin_dist * dirx) + (bias * perpx); // x reference point for the child
      node.nexty[childIndex] = (child_origin_dist * diry) + (bias * perpy); // y reference point for the child
    }

    // Joint just beyond the end of our branch, covering the gap where the children start
    node.arcx = node.branch_end.x * joint_overshoot;
    node.arcy = node.branch_end.y * joint_overshoot;
    node.arcr = node.bezr / 2;

    _pre_calc(node.children[0]);
    _pre_calc(node.children[1]);
  } else {
    // Leaf blob, sitting posmult beyond the end of our branch, in the direction we point
    node.arcx = node.branch_end.x + (posmult * dirx);
    node.arcy = node.branch_end.y + (posmult * diry);
    node.arcr = leafmult * partc;
  }
}

let spiral_pre_calc = new SpiralPreCalc();

export default spiral_pre_calc;
