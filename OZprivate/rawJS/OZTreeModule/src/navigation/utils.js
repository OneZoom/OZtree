/**
 * Get largest visible node on the screen which meets the condition.
 *
 * A node counts as visible when its own node circle/leaf is in the view (see
 * factory/midnode:anchor_area_on_screen), rather than when any part of its graphics is: a
 * branch can sweep a long way from the node it belongs to, so a node whose branch merely
 * passes through the view can be drawn nowhere near it. Such a node is still returned, but
 * only as a fallback, once nothing in the view itself has turned out to match.
 *
 * @param {Object} node Start point in search, probably controller.root
 * @param width Width of treeviewer, tree_state.widthres
 * @param height Height of treeviewer, tree_state.heightres
 * @param {Function} condition Function taking a node as an argument, and returning true,
 *  if the node would qualify as the sort that can be returned. If `null` find the
 *  largest of all the nodes on the screen
 * @param Largest node that matches condition, or null if none found
 */
function get_largest_visible_node(node, width, height, condition=null) {
  let condition_satisfy = !condition || condition(node);

  function get_area_in_screen(node) {
    if (!node.gvar) return 0;

    // Node-and-descendant bounding box
    let sx = node.xvar + (node.rvar * node.hxmin);
    let ex = node.xvar + (node.rvar * node.hxmax);
    let sy = node.yvar + (node.rvar * node.hymin);
    let ey = node.yvar + (node.rvar * node.hymax);

    // Proportion of bounding box on-screen
    let width_r = Math.max((Math.min(ex, width) - Math.max(sx, 0)) / (ex - sx), 0);
    let height_r = Math.max((Math.min(ey, height) - Math.max(sy, 0)) / (ey - sy), 0);

    return node.rvar * width_r * height_r;
  }

  // Node itself is in the view and matches condition, no better answer than that
  if (condition_satisfy && node.anchor_area_on_screen(width, height) > 0) return node;
  // Nothing below is drawn, so this node's own branch is all there is to go on: fall back to
  // it, however far outside the view the node it leads to sits
  if (!node.dvar) return node.gvar && condition_satisfy ? node : null;

  // How good an answer a candidate is: one that is itself in the view beats one that only got
  // there as a fallback, whatever either covers, and the largest wins within each of the 2
  function candidate_rank(node) {
    return [node.anchor_area_on_screen(width, height) > 0 ? 1 : 0, get_area_in_screen(node)];
  }

  //otherwise try to find node with ott in its children
  let largest_node = null, largest_rank = [-1, -1];
  node.children.forEach((child) => {
    const child_largest = get_largest_visible_node(child, width, height, condition);
    if (!child_largest) return;

    const rank = candidate_rank(child_largest);
    if (rank[0] > largest_rank[0] || (rank[0] === largest_rank[0] && rank[1] > largest_rank[1])) {
      largest_node = child_largest;
      largest_rank = rank;
    }
  });
  if (largest_node) return largest_node;

  if (!isNaN(node.xvar) && condition_satisfy) return node;
  return null;
}

export { get_largest_visible_node };
