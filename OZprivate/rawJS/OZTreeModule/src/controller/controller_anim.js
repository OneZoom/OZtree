import tree_state from '../tree_state';
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
        // find current position
        if (codeout_fly == null) {
            let location_array = this.get_my_location()[0][1]; //there should be a better way to do this, since get_my_location() only returns named nodes
            codeout_fly = location_array[location_array.length-1];
        }
        
        let common_ancestor = this.get_common_ancestor(codeout_fly, codein_fly)
        //should probably implement this using promises
        let self = this
        this.perform_flight_animation(common_ancestor, false,            //fly to MRCA
            function() {self.perform_flight_animation(codein_fly, false, //fly to final loc
                function() {
                    if (into_node==true) {
                        self.perform_flight_animation(codein_fly, true, finalize_func)
                    } else {
                        finalize_func()
                    }
                })
            })
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
