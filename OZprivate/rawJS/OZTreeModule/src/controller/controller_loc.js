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
  Controller.prototype.get_my_location = function() {
    return [get_location3(this.root), this.root];
  }
    
  Controller.prototype.get_my_location_code = function() {
    return [get_location_code(this.root)];
  }
}

// this function will find our location properly for transitions on tours
function get_location_code(node) {
    /*
    if(node.dvar) {
        if(node.gvar && node.has_child) {
            // stop
            return node.metacode;
        } else if (node.gvar && !node.has_child) {
            return get_empty_loc(false);
        } else if (!node.gvar && node.has_child) {
            return concat_node_loc_with_loc(node, get_child_loc(node));
        } else if(!node.gvar && !node.has_child) {
            return get_empty_loc(false);
        }
    } else {
        return null;
    }
     */
    return null;
}

/** 
* Get metadatas of nodes on the branch from the root to the common ancestor of all nodes in current view. 
* Only nodes with a common name are returned, (TO DO: apart from the last element of the richness_array).
* Recurses down because it calls get_child_loc() which in turn calls get_location3()
* Question: should we not use "get_largest_visible_node" from record.js?
* The returned results are in the following format:
* [
*  [node1.cname, node2.cname, node3.cname, ....]
*  [node1.metacode, node2.metacode, node3.metacode, ....]
*  boolean of some kind
*  [node1.richness_val, node2.richness_val, node3.richness_val, .... (TO DO: curr_view_ancestral_node.richness_val)]
* ]
*/
function get_location3(node) {
  if(node.dvar) {
    if(node.gvar && node.has_child) {
      // stop 
      return concat_node_loc_with_loc(node, get_empty_loc(true));
    } else if (node.gvar && !node.has_child) {
      return get_empty_loc(false);
    } else if (!node.gvar && node.has_child) {
      return concat_node_loc_with_loc(node, get_child_loc(node));
    } else if(!node.gvar && !node.has_child) {
      return get_empty_loc(false);
    }
  } else {
    // stop: node not on screen
    return get_empty_loc(false);
  }
}

function get_child_loc(node) {
  let children_locs = [];
  
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    let child = node.children[i];
    let child_loc = get_location3(child);
    if (child_loc[2] === true) {
      children_locs.push(child_loc);
    }
  }
  
  if (children_locs.length === 0 || children_locs.length > 1) {
    return get_empty_loc(true);
  } else {
    return children_locs[0];
  }
}

function get_empty_loc(bool) {
  return [[], [], bool, []];
}

function concat_node_loc_with_loc(node, loc) {
  if (node.cname) {
    return [([node.cname]).concat(loc[0]), [node.metacode].concat(loc[1]), true, [node.richness_val].concat(loc[3])];
  } else {
    return [loc[0], loc[1], true, loc[3]];
  }
}
