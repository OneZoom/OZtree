import api_manager from '../api/api_manager';
import tree_state from '../tree_state';
import {parse_query} from '../navigation/utils';
import data_repo from '../factory/data_repo';
import * as position_helper from '../position_helper';

/**
 * This function would firstly collects nodes and leaves which are on or near the main branch in the fly animation.
 * Then it will fetch metadata of these nodes or leaves and return resolve when it's done.
 * @param {node} root controller.root
 * @return {Promise}
 * -- resolve when metadata is returned.
 * -- reject if there is any error.
 */
function get_details_of_nodes_in_view_during_fly(root) {
  /**
   * Push all nodes that are on the main branch or within 4 generations from the main branch from the root to the targeted node.
   */
  function get_target_nodes_arr(node, nodes_arr) {
    if (node.targeted) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        nodes_arr = get_target_nodes_arr(node.children[i], nodes_arr);
      }
      nodes_arr.push(node);
    } else {
      nodes_arr = nodes_arr.concat(get_subbranch_nodes_arr(node, 4));
    }
    return nodes_arr;
  }

  function get_subbranch_nodes_arr(node, depth) {
    let res = [node];
    if (depth > 1) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        res = res.concat(get_subbranch_nodes_arr(node.children[i], depth-1));
      }
    }
    return res;
  }

  return new Promise(function(resolve, reject) {
    let initial_target_arr = get_target_nodes_arr(root, []);
    let nodes_arr = [], leaves_arr = [], nttoids = [], lttoids = [];
    for (let i=0; i<initial_target_arr.length; i++) {
      if (initial_target_arr[i].detail_fetched) continue;
      if (initial_target_arr[i].is_leaf) {
        leaves_arr.push(initial_target_arr[i]);
        lttoids.push(initial_target_arr[i].metacode);
      } else {
        nodes_arr.push(initial_target_arr[i]);
        nttoids.push(initial_target_arr[i].metacode);
      }
    }

    let fetched_nodes = 0;
    let total_nodes = nttoids.length;
    let index;
    if (nttoids.length === 0 && lttoids.length === 0) {
      // Nothing to do
      resolve();
      return;
    }
    while (nttoids.length > 0 || lttoids.length > 0) {
      let temp_func = function() {
        //use function closure here to guarantee that temp_nodes_arr and temp_leaves_arr would not be replaced by next ajax call.
        let temp_nttoids = nttoids.splice(0,400);
        let temp_lttoids = lttoids.splice(0,400);
        let temp_nodes_arr = nodes_arr.splice(0,400);
        let temp_leaves_arr = leaves_arr.splice(0,400);
        let params = {
          method: 'post',
          data: {
            node_ids: temp_nttoids.join(","),
            leaf_ids: temp_lttoids.join(","),
            image_source: data_repo.image_source
          },
          success: function(res) {
            let length;
            length = temp_nodes_arr.length;
            for (let i=0; i<length; i++) {
              temp_nodes_arr[i].update_attribute();
            }
            length = temp_leaves_arr.length;
            for (let i=0; i<length; i++) {
              temp_leaves_arr[i].update_attribute();
            }
            fetched_nodes += temp_nodes_arr.length;
            data_repo.update_metadata(res);
            if (fetched_nodes >= total_nodes) {
              resolve();
            }
          },
          error: function(res) {
            if (nttoids.length == 0) {
              resolve();
            } else {
              reject();
            } 
          }
        }
        api_manager.node_detail(params);
      }();
    }
  });
}

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
            codeout_fly = data_repo.ott_id_map[state.ott] || 1;
        } else {
            // Move to start location
            p = p.then(function () {
                return new Promise(function (resolve) {
                    this.perform_leap_animation(codeout_fly);
                    resolve();
                }.bind(this));
            }.bind(this));
        }

        let flight_path = get_flight_path(
            this.develop_branch_to(codeout_fly),
            this.develop_branch_to(codein_fly)
        );

        flight_path.map(function (n) {
            // Fetch node_detail for all targets
            // NB: Ideally we'd parallelise this, but the interface doesn't allow it yet.
            p = p.then(function () {
                position_helper.clear_target(this.root);
                position_helper.target_by_code(this.root, n.children.length > 0 ? -1 : 1, n.metacode);
                return get_details_of_nodes_in_view_during_fly(this.root);
            }.bind(this));
        }.bind(this));

        flight_path.map(function (n, idx, arr) {
            // Fly to each node in our path
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
    };

  /**
   * init could be one of:
   * -- undefined or null(default as pzoom)
   * -- zoom
   * -- pzoom
   * -- jump (or any other string, since this is the last branch)
   * Pzoom would be reset to zoom if the targeted node is too close to the root. Since pzoom would zoom a fixed length,
   * pzoom from a close node would result the tree being zoomed from a very small view.
   */
  Controller.prototype.fly_to_node = function (OZIDin, init) {
    /**
     * @return {boolean} return true if the node is bigger than config.minimum_ratio_for_zoom compared with root.
     */
    function is_node_near_root(node) {
      let ratio = 1;
      while (node.upnode) {
        let node_found = false;
        let length = node.upnode.children.length;
        for (let i=0; i<length; i++) {
          let child = node.upnode.children[i];
          if (child === node) {
            node_found = true;
            ratio *= node.upnode.nextr[i];
          }
        }
        if (!node_found) throw "can't find node.";
        if (ratio < config.minimum_ratio_for_zoom) {
          return false;
        }
        node = node.upnode;
      }
      return true;
    }

    let node = this.develop_branch_to(OZIDin);
    get_details_of_nodes_in_view_during_fly(this.root).then(function() {
      if (!init) init = "pzoom";
      if (init === "pzoom" && is_node_near_root(node)) init = "zoom";
      if (init == "zoom") {
        this.reset();
        position_helper.setxyr3r(this.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
        position_helper.perform_actual_fly(this);
      } else if (init == "pzoom") {
        this.reset();
        position_helper.setxyr3r(this.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
        position_helper.deanchor(this.root);
        position_helper.move(this.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
        let zfact = 1;
        let wsover = Math.pow(10, zfact);
        tree_state.ws = tree_state.ws / wsover;
        tree_state.xp = tree_state.widthres/2 + (tree_state.xp - tree_state.widthres/2) / wsover;
        tree_state.yp = tree_state.heightres/2 + (tree_state.yp - tree_state.heightres/2) / wsover;
        position_helper.perform_actual_fly(this);
      } else {
        this.reset();
        position_helper.setxyr3r(this.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
        position_helper.deanchor(this.root);
        position_helper.move(this.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
      }
    }.bind(this));
  };
  
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
