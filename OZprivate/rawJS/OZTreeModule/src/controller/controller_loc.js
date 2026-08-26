/** @class Controller */
import tree_state from '../tree_state';

export default function (Controller) {
  /**
  * Get locations to be used to construct evolutionary path toolbar.
  * @method get_my_location
  * @memberof Controller
  * @return [Array, Midnode] returns location array and root of the tree.
  * Where Array is [NameArray, IdArray, bool, RichnessArray], and RichnessArray is
  * 1 unit longer than NameArray & IdArray
  */
  Controller.prototype.get_my_location = function () {
    return [
      get_location3(this.root, tree_state.widthres, tree_state.heightres),
      this.root,
    ];
  }
}

/**
* Get metadata for the nodes on the path from the root down to where the view currently sits,
* i.e. the common ancestor of everything on screen (see views/treeviewer/layout.html's
* update_location_menu, which draws each one as a step in the "current location" menu).
*
* We walk down from the root for as long as a single child still holds the whole view,
* stopping when either:
* * The view has forked, more than one of a node's children having something of it on screen,
*   so that node is as deep as the whole view goes
* * The node itself is in the view. That means its own circle rather than any part of its
*   graphics (see factory/midnode:anchor_area_on_screen): a branch can sweep a long way from
*   the node it belongs to, and one merely passing through the view shouldn't end the path
*   early at a node drawn nowhere near it
*
* Only nodes with a common name make it into the path, but the node the walk ends at gives
* the last richness whether it is named or not, so every name has the richness of what lies
* below it to be drawn against -- hence one more richness than there are names.
*
* @param {Object} node Root of the tree
* @param width Width of treeviewer, tree_state.widthres
* @param height Height of treeviewer, tree_state.heightres
* @return [
*  [node1.cname, node2.cname, node3.cname, ....],
*  [node1.metacode, node2.metacode, node3.metacode, ....],
*  true if any of the tree is on screen,
*  [node1.richness_val, node2.richness_val, node3.richness_val, ...., end_node.richness_val],
* ]
*/
function get_location3(node, width, height) {
  const names = [], metacodes = [], richness = [];

  // Nothing of the tree is drawn, so there is no path to give
  if (!node.dvar) return [[], [], false, []];

  let cur = node;
  while (true) {
    if (cur.cname) {
      names.push(cur.cname);
      metacodes.push(cur.metacode);
      richness.push(cur.richness_val);
    }

    // We can see the node itself, so the path has got as deep as the view has
    if (cur.anchor_area_on_screen(width, height) > 0) break;

    // Carry on down only while one child has the view to itself, and is a node we could carry
    // on from: anything else and this is where the whole view still fits
    const drawn = cur.children.filter((child) => child.dvar);
    if (drawn.length !== 1 || !drawn[0].has_child) break;
    cur = drawn[0];
  }

  // The richness of where we ended up, which is what the last name gets drawn against. Named
  // or not, the walk stopped here because this is as much as the view has in common
  richness.push(cur.richness_val);

  return [names, metacodes, true, richness];
}

export { get_location3 };
