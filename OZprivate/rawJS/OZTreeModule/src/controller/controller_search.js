/* add features to the OZ controller so that search can interact with the OZ vizualization */
import tree_state from '../tree_state';
import * as position_helper from '../position_helper';
import api_manager from '../api/api_manager'; //for pop species - can eventually be deleted
import {record_url} from '../navigation/record';
import {color_theme} from '../themes/color_theme';
import config from '../global_config';

export default function (Controller) {
  
  /**
   * Add marked area by OZid
   * @param OZid_to_mark is the OneZoom id of the node / leaf that should be marked
   * @param area_code is the code that we want to associate with this marked area, if nothing is enterd we identify the area with the ID as given by OZid_to_mark
   * @param mark_color should give the color to use for marking. If null the system will select a new color from the theme color pallette
   */
    Controller.prototype.mark_area = function(OZid_to_mark,area_code,mark_color) {
        if (! area_code)
        {
            area_code = OZid_to_mark;
            // use the OneZoom id as the area_code if one has not been entered
        }
        this.develop_branch_to(OZid_to_mark);
        // this marks a target down the tree to the new node and clears all previous targets.
        // the idea of this is to enable easy flight or marking of what was just targeted.
        // now we will need to convert the target marks to marked area
        // first check of the area_code is already in use
        if (!(this.root.marked_areas.has(area_code)))
        {
            // it is not so we need to choose a color
            if (mark_color)
            {
                // color was defined by the user
                config.marked_area_color_map.push([area_code,mark_color]);
            }
            else
            {
                // color needs to be automatically defined
                let existing_color_use_tally = [];
                // how many times have colours been used (want to minimise repeats)
                let existing_color_min_distance = [];
                // how far (as a minimum) from the end of the map was this colour last used
                // we want to use colours that weren't just used
                let length = config.marked_area_color_map.length;
                // calculate how many elements in color map?
                let num_colors_in_pallette = Object.keys(color_theme.theme.branch.marked_area_pallette).length
                // calculate how many colors available in pallette?
                for (let i=0; i<num_colors_in_pallette; i++) {
                    existing_color_use_tally.push(0);
                    existing_color_min_distance.push(length+1);
                    // setup the arrays with zeros
                }
                // double loop to populate the arrays
                for (let i=0; i<length; i++) {
                    for (let j=0; j<(num_colors_in_pallette); j++) {
                        // looping over all possible colors and all used colors
                        let color =  color_theme.get_color('branch.marked_area_pallette.' + j , this.root);
                        // find out what color was used in the colour pallette
                        if (color == config.marked_area_color_map[i][1]) {
                            // the color is a match
                            existing_color_use_tally[j] = existing_color_use_tally[j] + 1;
                            // measure distance from end and put that in the array
                            let distance_from_end = (length-i-1);
                            if (existing_color_min_distance[j] > distance_from_end)
                            {
                                existing_color_min_distance[j] = distance_from_end;
                            }
                        }
                    }
                }
                // look to see if any colors are unused
                let color_done = false;
                for (let i=0; i<existing_color_use_tally.length; i++) {
                    if (existing_color_use_tally[i] == 0)
                    {
                        // color is unused so use it
                        mark_color = color_theme.get_color('branch.marked_area_pallette.' + i , this.root);
                        config.marked_area_color_map.push([area_code, mark_color]);
                        color_done = true;
                        break;
                    }
                }
                if (color_done == false)
                {
                    // we need to choose the color furthest from the end
                    let max_min_distance = 0 ;
                    // maximum of the min distance tally
                    let max_min_distance_index = length -1;
                    for (let i=0; i<existing_color_min_distance.length; i++) {
                        // loop through all to select choice
                        if (existing_color_min_distance[i] > max_min_distance)
                        {
                            max_min_distance_index = i;
                            max_min_distance = existing_color_min_distance[i];
                        }
                    }
                    mark_color = color_theme.get_color('branch.marked_area_pallette.' + max_min_distance_index , this.root);
                    config.marked_area_color_map.push([area_code, mark_color]);
                }
            }
        }
        
        mark_area_from_targeted_node(this.root,area_code);
        // this will ripple down adding the area target
        return(mark_color)
    }
    
    /**
     * Remove marked area by area codes
     * @param area_code is the code that we want to associate with this marked area (as given before to mark area function)
     */
    Controller.prototype.unmark_area = function(area_code) {
        unmark_area_from_code(this.root,area_code);
        // this will ripple down adding the area target
        // now need to cut from the color_map
        let length = config.marked_area_color_map.length; // how many elements?
        for (let i=0; i<length; i++) {
            if (config.marked_area_color_map[i][0] == area_code)
            {
                config.marked_area_color_map.splice(i,1)
                break;
            }
        }
    }
    
    /**
     * Remove all marked areas
     */
    Controller.prototype.clear_all_marked_areas = function() {
        unmark_all_areas(this.root); // call the iterative function to do the clearing
        // now reset all the color pallette parts
        config.marked_area_color_map = [];
    }
    
    /**
     * Find common ancestor of all marked areasn as an OZid
     */
    Controller.prototype.get_ancestor_of_marked = function() {
        return return_ancestor_of_all_marked_area(this.root); // call the iterative function to do the clearing
    }
    
    /**
     * Returns a list of all marked areas in the tree
     */
    Controller.prototype.list_all_marked = function() {
        return config.marked_area_color_map;
        
    }
    
    /**
     * Jump to OZid and record URL of the new location
     * @param src the OZid of the place we want to jump to
     */
    Controller.prototype.jump_to_OZid = function(OZid) {
        this.perform_leap_animation(OZid);
        record_url();
    }
    
    // legacy functions that are no longer needed (I think so leave commented out for now)
    
    /*

    //This function clears highlights on the bezier curve to the search result.
    Controller.prototype.clear_route_to_search = function() {
        _clear_route_to_search(this.root);
    }
     
     Controller.prototype.get_shared_ancestor = function(ancestors1, ancestors2) {
     let index = get_index_of_shared_ancestor(ancestors1, ancestors2);
     return(ancestors1[index].metacode);
     }
     
     Controller.prototype.get_common_ancestor = function(hit1_id, hit2_id) {
     return(this.get_shared_ancestor(this.get_ancestors(hit1_id),this.get_ancestors(hit2_id)));
     }
     
     Controller.prototype.turn_off_search_highlight = function() {
     tree_state.search_highlight = false;
     this.clear_route_to_search();
     }
     
     Controller.prototype.turn_on_search_highlight = function(src, dest) {
     tree_state.search_highlight = true;
     if ((src != null && dest == null) || (src == null && dest != null)) {
     let ancestors = get_targeted_nodes(this.root, []);
     mark_route_to_search_res(ancestors);
     } else if (src != null && dest != null) {
     let to_leaf  = src > 0 ? -1 : 1;
     let to_index = src > 0 ? src : -src;
     position_helper.target_by_code(this.root, to_leaf, to_index);
     let ancestorsOfNode1 = get_targeted_nodes(this.root, []);
     mark_route_to_search_res(ancestorsOfNode1, 'search_hit1');
     
     to_leaf  = dest > 0 ? -1 : 1;
     to_index = dest > 0 ? dest : -dest;
     position_helper.target_by_code(this.root, to_leaf, to_index);
     let ancestorsOfNode2 = get_targeted_nodes(this.root, []);
     mark_route_to_search_res(ancestorsOfNode2, 'search_hit2');
     }
     }
     
     //Mark search route from common ancestor to the hits, then jump to common ancestor.
     Controller.prototype.show_common_ancestor = function(hit1_id, hit2_id) {
     let ancestorsOfNode1=this.get_ancestors(hit1_id)
     let ancestorsOfNode2=this.get_ancestors(hit2_id)
     let common_ancestor =this.get_shared_ancestor(ancestorsOfNode1,ancestorsOfNode2);
     
     this.clear_route_to_search();
     if (tree_state.search_highlight) {
     mark_route_to_search_res(ancestorsOfNode1, 'search_hit1');
     mark_route_to_search_res(ancestorsOfNode2, 'search_hit2');
     }
     
     position_helper.clear_target(this.root);
     position_helper.target_by_code(this.root, -1, common_ancestor);
     position_helper.perform_actual_leap(this);
     record_url();
     }
     
    */

} // end of controller exported

/**
 * @private
 * Mark area based on the targeted node
 * @param node is the node we're rippling down from - normally root, but it calls itself with child nodes
 * @param area_code is the code we want to mark the area with
 */
function mark_area_from_targeted_node(node, area_code) {
    if (node.targeted)
    {
        node.marked_areas.add(area_code); // add marked area to marked_areas set
        let length = node.children.length; // how many children?
        for (let i=0; i<length; i++) {
            // loop over all children
            let child = node.children[i];
            mark_area_from_targeted_node(child, area_code); // iterate
        }
    }
}

/**
 * @private
 * Unmark area based on an area_code
 * @param node is the node we're rippling down from - normally root, but it calls itself with child nodes
 * @param area_code is the code we want to unmark, it's assumed that area ia a path down from root
 */
function unmark_area_from_code(node, area_code) {
    if (node.marked_areas.has(area_code))
    {
        node.marked_areas.delete(area_code); // delete the marked area from marked_areas set
        let length = node.children.length; // how many children?
        for (let i=0; i<length; i++) {
            // loop over all children
            let child = node.children[i];
            unmark_area_from_code(child, area_code); // iterate
        }
    }
}

/**
 * @private
 * Unmark all areas in marked_areas
 * @param node is the node we're rippling down from - normally root, but it calls itself with child nodes
 */
function unmark_all_areas(node) {
    if (node.marked_areas.size > 0)
    {
        node.marked_areas.clear(); // clear all marked areas
        let length = node.children.length; // how many children?
        for (let i=0; i<length; i++) {
            // loop over all children
            let child = node.children[i];
            unmark_all_areas(child); // iterate
        }
    }
}

/**
 * @private
 * Get ancestor of all marked areas
 * @param node is the node we're rippling down from - normally root, but it calls itself with child nodes
 */
function return_ancestor_of_all_marked_area(node) {
    if (node.marked_areas.size > 0)
    {
        let length = node.children.length; // how many children in total?
        let num_children_with_marked = 0; // this will store number of children with at least one marked area (if this is > 1 then this is the MRCA)
        let max_marked_areas_in_children = 0; // this will store maximum number of marked areas expressed in any child (if this is != number marked here then this is the MRCA)
        let child_index; // this will store the index of the last child with marked areas
        if (length == 0)
        {
            return (-node.metacode); // this is a leaf so return self but with a - flag
        }
        else
        {
            for (let i=0; i<length; i++) {
                // loop over all children
                let child = node.children[i];
                if (child.marked_areas.size > 0)
                {
                    num_children_with_marked ++;
                    if (child.marked_areas.size > max_marked_areas_in_children)
                    {
                        max_marked_areas_in_children = child.marked_areas.size;
                    }
                    child_index = i;
                }
            }
            // the test is whether more than 1 child has any entries in its marked areas set
            // if it does then this is the common ancestor, otherwise find the one child that has entries and ripple down to that.
            if ((num_children_with_marked != 1)||(max_marked_areas_in_children != node.marked_areas.size))
            {
                return (node.metacode); // this is the common ancestor (or at least the best choice) and metacode is the OZid
            }
            else
            {
                // only one child has marked areas hence ripple down - since there was only one, this will be stored in child index
                let child = node.children[child_index];
                return return_ancestor_of_all_marked_area(child);
            }
        }
    }
    else
    {
        return null; // there are no marked areas
    }
}

/*

 //Push nodes on the branch from root to the targeted node.
 function get_targeted_nodes(node, array) {
 if (node.targeted) array.push(node);
 let length = node.children.length;
 for (let i=0; i<length; i++) {
 let child = node.children[i];
 if (child.targeted) {
 get_targeted_nodes(child, array);
 break;
 }
 }
 return array;
 }
 
 //Find index of the closest common ancestor of two routes.(closest here means close to the targeted node)
 function get_index_of_shared_ancestor(array1, array2) {
 for (let i=0; i<array1.length && i<array2.length; i++) {
 if (array1[i].metacode !== array2[i].metacode) {
 return i-1;
 }
 }
 throw new Error("Can't find common ancestor...");
 }
 
 //Push nodes on the branch from root to the targeted node.
 function get_targeted_nodes(node, array) {
 if (node.targeted) array.push(node);
 let length = node.children.length;
 for (let i=0; i<length; i++) {
 let child = node.children[i];
 if (child.targeted) {
 get_targeted_nodes(child, array);
 break;
 }
 }
 return array;
 }
 
//Mark path to search result
function mark_route_to_search_res(array, search_hit) {
  if (search_hit === "search_hit1") {
    for (let i=0; i<array.length; i++) {
      array[i].route_to_search1 = true;
    }  
  } else if (search_hit === "search_hit2") {
    for (let i=0; i<array.length; i++) {
      array[i].route_to_search2 = true;
    }  
  } else {
    for (let i=0; i<array.length; i++) {
      array[i].route_to_search = true;
    }  
  }
}
 
 //Clear path to search result
 function _clear_route_to_search(node) {
 node.route_to_search = false;
 node.route_to_search1 = false;
 node.route_to_search2 = false;
 let length = node.children.length;
 for (let i=0; i<length; i++) {
 _clear_route_to_search(node.children[i]);
 }
 }
 
 */





