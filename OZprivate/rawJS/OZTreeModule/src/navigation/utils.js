import tree_state from '../tree_state';

/**
 * Get largest visible node on the screen which meets the condition.
 * If part of the node is not on the screen and part of it is on, only the part that is on the screen counts.
 *
 * @param {Object} node Start point in search, probably controller.root
 * @param {Function} condition Function taking a node as an argument, and returning true,
 *  if the node would qualify as the sort that can be returned. If `null` find the
 *  largest of all the nodes on the screen
 * @param Largest node that matches condition, or null if none found
 */
function get_largest_visible_node(node, condition=null) {
  if (!node) return null;  // Trying to record_url() before the tree is setup
  let condition_satisfy = !condition || condition(node);

  function get_area_in_screen(node) {
    if (!node.gvar) {
      return 0;
    } else {
      let sx = node.xvar + (node.rvar * node.hxmin);
      let ex = node.xvar + (node.rvar * node.hxmax);
      let sy = node.yvar + (node.rvar * node.hymin);
      let ey = node.yvar + (node.rvar * node.hymax);
      let width_r = Math.max((Math.min(ex, tree_state.widthres) - Math.max(sx, 0)) / (ex - sx), 0);
      let height_r = Math.max((Math.min(ey, tree_state.heightres) - Math.max(sy, 0)) / (ey - sy), 0);
      return node.rvar * width_r * height_r;
    }
  }

  if (node.gvar && condition_satisfy) {
    return node;
  } else if (node.dvar) {
    //otherwise try to find node with ott in its children
    if (node.has_child) {
      let satisfied_children = [];
      satisfied_children = node.children.map(function (child) {
        return get_largest_visible_node(child, condition);
      });
      let largest_area = -1, largest_node = null;
      let length = satisfied_children.length;
      for (let i = 0; i < length; i++) {
        let child = satisfied_children[i];
        if (child) {
          let area = get_area_in_screen(child);
          if (area > largest_area) {
            largest_area = area;
            largest_node = child;
          }
        }
      }

      if (largest_node !== null) {
        return largest_node;
      } else if (!isNaN(node.xvar) && condition_satisfy) {
        return node;
      }
    }
  }
  return null;
}
export { get_largest_visible_node };
