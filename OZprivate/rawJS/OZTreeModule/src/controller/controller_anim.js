import tree_state from '../tree_state';
import {parse_query} from '../navigation/utils';
import data_repo from '../factory/data_repo';
import * as position_helper from '../position_helper';

/**
 * Part of Controller class. It contains functions to perform animations.
 */
export default function (Controller) {
  /**
   * @param {integer} codein_fly 
   * codein_fly < 0, leaf(metacode == -codein_fly),
   * codein_fly > 0, interior_node(metacode == codein_fly)
   */   
  Controller.prototype.perform_leap_animation = function(codein_fly) {
    tree_state.flying = false;
    this.develop_branch_to(codein_fly);
    position_helper.perform_actual_leap(this);
  }
  
  /**
   * zooms you to a specified place in the tree from your current position
   * it doesn't change direction and so does a bad job for cousins (see perform_flight_transition for a solution)
   * @param {integer} codein_fly
   * codein_fly < 0, leaf(metacode == -codein_fly),
   * codein_fly > 0, interior_node(metacode == codein_fly)
   * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node fills the screen, rather than  
   * the wider-angle viewpoint that to show the entire tree structure descended from that node.
   * @param {func} finalize_func is optional, and gives a function to call at the end of the zoom
   * @return {boolean} returns false if the distance to codein_fly is too short so there is no animation performed.
   */
  Controller.prototype.perform_flight_animation = function(codein_fly, into_node, finalize_func) {
    tree_state.flying = false;
    this.develop_branch_to(codein_fly);
    return position_helper.perform_actual_fly(this, into_node, finalize_func);
  }
    
    
    /**
     * Zooms from current location to any new location via common ancestor and in a sensible way
     * this is a key function for making TreeTours work.
     * Later this will need to accept a transition speed and type input.
     * @param {integer} codeout_fly is the point used to calculate the point to fly out to
     * The flight transition will first fly from the current position to the MRCA between
     * codeout_fly and codein_fly. If null, we calculate the MRCA between the current position 
     * (the node whose descendants include all leaves on screen) and codein_fly. If an integer, the
     * codeout_fly value specifies a node as follows:
     * codeout_fly < 0, leaf(metacode == -codein_fly),
     * codeout_fly > 0, interior_node(metacode == codein_fly)
     * @param {integer} codein_fly is the place to fly into
     * codein_fly < 0, leaf(metacode == -codein_fly),
     * codein_fly > 0, interior_node(metacode == codein_fly)
     * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node fills the screen, rather than  
     * the wider-angle viewpoint that to show the entire tree structure descended from that node.
     * @param {func} finalize_func is optional, and gives a function to call at the end of the zoom
     * @return {boolean} returns false if the distance to codein_fly is too short so there is no animation performed.
     *
     *
     * e.g. try in the console
     * onezoom.controller.perform_flight_animation(782900)
     * onezoom.controller.perform_flight_transition(782900, 713573, true)
     */
    Controller.prototype.perform_flight_transition = function(codeout_fly, codein_fly, into_node, finalize_func) {
        var p = Promise.resolve();

        // Return flight path (common ancestor, then target)
        function get_flight_path(node_start, node_end) {
            var n, visited_nodes = {};

            // Mark each node in heirarchy as visited
            n = node_end;
            while (n) {
                visited_nodes[n.metacode] = true;
                n = n.upnode;
            }

            // Find first matching node from the first item
            n = node_start;
            if (visited_nodes[n.metacode]) {
                // We're just zooming in, don't bother with intermediate node
                return [node_end];
            }
            while (n) {
                if (visited_nodes[n.metacode]) {
                    if (node_end.metacode === n.metacode) {
                        // Zooming out;
                        return [node_end];
                    }
                    // Return one up from common ancestor, and end at target node
                    return [n, node_end];
                }
                n = n.upnode;
            }
            throw new Error("No common nodes for " + node_start + " and " + node_end);
        }

        if (codeout_fly == null) {
            // Get current OTT from the URL, convert to code
            let loc = (window.location.pathname.indexOf("@") === -1) ? null : window.location.pathname.slice(window.location.pathname.indexOf("@"));
            let state = parse_query(loc, window.location.search, window.location.hash);
            codeout_fly = data_repo.ott_id_map[state.ott];
        } else {
            // Move to start location
            p = p.then(function () {
                return new Promise(function (resolve) {
                    this.perform_leap_animation(codeout_fly);
                    resolve();
                }.bind(this));
            }.bind(this));
        }

        // Fly to each node in our path
        get_flight_path(
            this.develop_branch_to(codeout_fly),
            this.develop_branch_to(codein_fly)
        ).map(function (n, idx, arr) {
            var accel_func = idx === arr.length - 1 ? 'decel'
                           : idx === 0 ? 'accel'
                           : null;

            p = p.then(function () {
                return new Promise(function (resolve) {
                    position_helper.clear_target(this.root);
                    position_helper.target_by_code(this.root, n.children.length > 0 ? -1 : 1, n.metacode);
                    position_helper.perform_actual_fly(this, accel_func === 'final' ? into_node : false, resolve, accel_func);
                }.bind(this));
            }.bind(this));
        }.bind(this));

        // Finished!
        p = p.then(finalize_func);

        return p;
    }
  
  
  /**
   * Develops tree to codein_fly, then precalculates the tree, set target to help position helper to leap or fly.
   * @param {integer} codein_fly
   * codein_fly < 0, leaf(metacode == -codein_fly),
   * codein_fly > 0, interior_node(metacode == codein_fly)
   */
  Controller.prototype.develop_branch_to = function(codein_fly) {
    let to_leaf  = codein_fly > 0 ? -1 : 1;
    let to_index = codein_fly > 0 ? codein_fly : -codein_fly;  
    let root = this.root;
    let selected_node = this.factory.dynamic_loading_by_metacode(to_leaf, to_index);
    this.projection.pre_calc(root);
    this.projection.calc_horizon(root);
    position_helper.clear_target(root);
    position_helper.target_by_code(root, to_leaf, to_index);
    return selected_node;
  }
  
  /**
   * @param {float} x is zoomin center x coordinate
   * @param {float} y is zoomin center y coordinate
   * @param {float} scale is zoom sensitivity in one zoomin action.
   * @param {integer} num > 0, perform num times zoomin.
   */
  Controller.prototype.zoomin_anim = function(x, y, scale, num) {
    try {
      if (isNaN(num)) {
        tree_state.flying = false;
        throw new Error("In zoomin anim, num is nan");
      }
      let self = this;
      this.zoomin(x, y, scale);
      num--;
      if (num >= 0) {
        tree_state.flying = true;
        setTimeout(function() {
          self.zoomin_anim(x, y, scale, num);
        }, 33);
      } else {
        tree_state.flying = false;
      }  
    } catch (error) {
      console.error(error);
      tree_state.flying = false;
    }
  }
  
  /**
   * @param {float} x is zoomout center x coordinate
   * @param {float} y is zoomout center y coordinate
   * @param {float} scale is zoom sensitivity in one zoomout action.
   * @param {integer} num > 0, perform num times zoomout.
   */
  Controller.prototype.zoomout_anim = function(x, y, scale, num) {
    try {
      if (isNaN(num)) {
        tree_state.flying = false;
        throw new Error("In zoomout anim, num is nan");
      }
      let self = this;
      this.zoomout(x, y, scale);
      num--;
      if (num >= 0) {
        tree_state.flying = true;
        setTimeout(function() {
          self.zoomout_anim(x, y, scale, num);
        }, 33);
      } else {
        tree_state.flying = false;
      }  
    } catch(error) {
      console.error(error);
      tree_state.flying = false;
    }
  }
  
  /**
   * @param {integer} codein_fly
   * codein_fly < 0, leaf(metacode == -codein_fly),
   * codein_fly > 0, interior_node(metacode == codein_fly)
   * develop the tree to the node specified by codein_fly, then reanchor at this node.
   */
  Controller.prototype.develop_and_reanchor_to = function(codein_fly) {
    let to_leaf  = codein_fly > 0 ? -1 : 1;
    let to_index = codein_fly > 0 ? codein_fly : -codein_fly;  
    let root = this.root;
    let anchor_node = this.factory.dynamic_loading_by_metacode(to_leaf, to_index);
    this.projection.pre_calc(root, true)
    this.projection.calc_horizon(root);
    position_helper.deanchor(root);
    position_helper.reanchor_at_node(anchor_node);
  }
}
