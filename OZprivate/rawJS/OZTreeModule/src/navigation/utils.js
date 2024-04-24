/**
 * Get largest visible node on the screen which meets the condition.
 * If part of the node is not on the screen and part of it is on, only the part that is on the screen counts.
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

  // Node itself is visible and matches condition, return
  if (node.gvar && condition_satisfy) return node;
  // No children are visible, so no nodes here
  if (!node.dvar) return null;

  //otherwise try to find node with ott in its children
  let largest_node = null, largest_area = -1;
  node.children.forEach((child) => {
    const child_largest = get_largest_visible_node(child, width, height, condition);
    if (!child_largest) return;

    const area = get_area_in_screen(child_largest);
    if (area > largest_area) {
      largest_node = child_largest;
      largest_area = area;
    }
  });
  if (largest_node) return largest_node;

  if (!isNaN(node.xvar) && condition_satisfy) return node;
  return null;
}

export { get_largest_visible_node };
