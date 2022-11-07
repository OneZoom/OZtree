import api_manager from '../api/api_manager';
import tree_state from '../tree_state';
import {get_largest_visible_node} from '../navigation/utils';
import data_repo from '../factory/data_repo';
import * as position_helper from '../position_helper';
import config from '../global_config';
import { UserInterruptError } from '../errors';

/**
 * This function collects nodes and leaves which are on or near the main branch in the fly animation,
 * animation, then fetches metadata of these nodes or leaves, returning resolve when done.
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
   * Cancel any in-progress flight. The promise the flight returns will be
   * rejected with UserInterruptError
   */
  Controller.prototype.cancel_flight = function () {
    tree_state.flying = false;
  };

  /**
   * Leap directly to a new OneZoom node id in the tree. If a position is given, it
   * should be of the form [xp, yp, ws] or {'xp': xp, 'yp': yp, 'ws': ws}
   *
   * @param {integer} dest_OZid The OneZoom node ID (*not* the OTT). Caution: these IDs
   *    are not permanent, but change every time the tree is updated. These are read as
   *        dest_OZid < 0 means a leaf (metacode == -dest_OZid),
   *        dest_OZid > 0 means an interior_node (metacode == dest_OZid)
   * @param {object} position (optional) an object or array of the form [xp, yp, ws] or
   *    {'xp': xp, 'yp': yp, 'ws': ws} where xp, yp, ws are numeric
   * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node
   *     fills the screen, rather than the wider-angle viewpoint that
   *     shows the entire tree structure descended from that node.
   */   
  Controller.prototype.leap_to = function(dest_OZid, position=null, into_node=false) {
    tree_state.flying = false;

    if (position && (typeof(position) === 'object')) {
      return new Promise((resolve) => {
        tree_state.xp = position.xp || position[0] || 0
        tree_state.yp = position.yp || position[1] || 0
        tree_state.ws = position.ws || position[2] || 1
        this.develop_and_reanchor_to(dest_OZid);
        this.re_calc();
        this.trigger_refresh_loop();
        resolve()
      });
    }

    this.develop_branch_to(dest_OZid);
    return new Promise((resolve, reject) => {
      position_helper.perform_actual_fly(
        this, into_node, Infinity, 'linear', resolve, () => reject(new UserInterruptError('Fly is interrupted')));
    })
  }
  
  /**
   * Fly directly to a specified OneZoom node id in the tree from your current position.
   * As this doesn't involve a change in direction, it may not not display the
   * relationship between species around the current position and those at the target
   * location (i.e. it may do a bad job for cousins). For this you probably want to use
   * the function `fly_on_tree_to()`
   * @param {integer} dest_OZid The OneZoom node ID (not the OTT). Caution: these IDs are
   *     not permanent, but change every time the tree is updated. These are read as
   *        dest_OZid < 0 means a leaf (metacode == -dest_OZid),
   *        dest_OZid > 0 means an interior_node (metacode == dest_OZid)
   * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node
   *     fills the screen, rather than the wider-angle viewpoint that
   *     shows the entire tree structure descended from that node.
   * @param {float} speed The speed of this transition relative to the global animation
   *     speed. Values over 1 lead to faster animations (default = 1)
   * @param {string} accel_type The acceleration type, one of
   *    "linear" (default, also used if null), "accel", or "decel".
   * @param {func} finalize_func The function to call at the end of the zoom (optional)
   * @return {Promise} resolve when fly finishes. throws an exception when fly is interrupted
   */
  Controller.prototype.fly_straight_to = function(
        dest_OZid, into_node, speed=1, accel_type='linear') {
    tree_state.flying = false;
    this.develop_branch_to(dest_OZid);

    return new Promise((resolve, reject) => {
      position_helper.perform_actual_fly(
        this, into_node, speed, accel_type || 'linear', resolve, () => reject(new UserInterruptError('Fly is interrupted')));
    })
  }
    
    
    /**
     * Zooms from current location to any new location via common ancestor and in a
     * sensible way. This is a key function for making TreeTours work.
     * @param {integer} src_OZid is either a OneZoom id used to calculate the source for
     *     the flight, or `null`. If null, we calculate the MRCA between the current position 
     *     (the node whose descendants include all leaves on screen) and dest_OZid.
     *     If an integer, the src_OZid value specifies a node as follows:
     *         src_OZid < 0, means a leaf (metacode == -src_OZid),
     *         src_OZid > 0, means an interior_node (metacode == src_OZid)
     * @param {integer} dest_OZid is the place to fly in to:
     *     dest_OZid < 0 means a leaf (metacode == -dest_OZid),
     *     dest_OZid > 0 means an interior_node (metacode == dest_OZid)
     * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior
     *     node fills the screen, rather than the wider-angle viewpoint that
     *     shows the entire tree structure descended from that node.
     * @param {float} speed The speed of this transition relative to the global animation
     *     speed. Values over 1 lead to faster animations (default = 1)
     * @param {string} accel_type The acceleration type, one of "linear", "accel", 
     *    "decel", or "parabolic" (the default, also used if null). CURRENTLY IGNORED.
     * @param {func} finalize_func The function to call at the end of the zoom (optional)
     * @return {promise} returns a promise
     *
     *
     * e.g. try in the console
     * onezoom.controller.fly_straight_to(782900)
     * onezoom.controller.fly_on_tree_to(782900, 713573, true)
     */
    Controller.prototype.fly_on_tree_to = function(
            src_OZid, dest_OZid,
            into_node=false, speed=1, accel_type="parabolic", finalize_func=null) {
        var p = new Promise(function (resolve) {
            config.ui.loadingMessage(true);
            window.setTimeout(resolve, 200);
        }.bind(this));

        // Return flight path (common ancestor, then target)
        function get_flight_path(node_start, node_end) {
            var n, visited_nodes = {};

            // Leaf and interior metacodes aren't unique, treat leaves as negative;
            function to_id(n) {
                return n.is_leaf ? -n.metacode : n.metacode;
            }

            // Mark each node in heirarchy as visited
            n = node_end;
            while (n) {
                visited_nodes[to_id(n)] = true;
                n = n.upnode;
            }

            // Find first matching node from the first item
            n = node_start;
            if (visited_nodes[to_id(n)]) {
                // We're just zooming in, don't bother with intermediate node
                return [node_end];
            }
            while (n) {
                if (visited_nodes[to_id(n)]) {
                    if (to_id(node_end) === to_id(n)) {
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

        if (src_OZid == null) {
            // Find largest visible node: use this as our starting point
            let top_node = get_largest_visible_node(this.root, function(node) { return node.ott; }) || this.root;
            src_OZid = (top_node.is_leaf? -1 : 1) * top_node.metacode;
        } else {
            // Move to start location
            p = p.then(function () {
              return this.leap_to(src_OZid)
            }.bind(this));
        }

        p = p.then(function () {
            var flight_path = get_flight_path(
                this.develop_branch_to(src_OZid),
                this.develop_branch_to(dest_OZid)
            );
            config.ui.loadingMessage(false);
            return flight_path;
        }.bind(this));

        p = p.then(function (flight_path) {
            var flight_p = Promise.resolve();

            flight_path.map(function (n) {
                // Fetch node_detail for all targets
                // NB: Ideally we'd parallelise this, but the interface doesn't allow it yet.
                flight_p = flight_p.then(function () {
                    position_helper.clear_target(this.root);
                    position_helper.target_by_code(this.root, (n.is_leaf ? -1 : 1) * n.metacode);
                    return get_details_of_nodes_in_view_during_fly(this.root);
                }.bind(this));
            }.bind(this));

            return flight_p.then(function () { return flight_path; });
        }.bind(this));

        p = p.then(function (flight_path) {
            var flight_p = Promise.resolve();

            flight_path.map(function (n, idx, arr) {
                // Fly to each node in our path
                var accel_func = idx === arr.length - 1 ? 'decel'
                               : idx === 0 ? 'accel'
                               : null;
                flight_p = flight_p.then(function () {
                    return new Promise(function (resolve, reject) {
                        position_helper.clear_target(this.root);
                        position_helper.target_by_code(this.root, (n.is_leaf ? -1 : 1) * n.metacode);
                        position_helper.perform_actual_fly(
                          this, (accel_func === 'decel') ? into_node : false, speed, accel_func, resolve, () => reject(new UserInterruptError('Fly is interrupted')));
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            return flight_p.then(function () { return flight_path; });
        }.bind(this));

        // Finished!
        p = p.then(finalize_func);
        p = p.catch(function (e) {
            config.ui.loadingMessage(false);
            throw e;
        })

        return p;
    };

  /**
   * Does an initial move to a OneZoom destination, chosing to leap, fly, or fly from a
   * slightly zoomed-out location depending on the value of the `init` parameter.
   * @param {string} init One of:
   *    -- "pzoom", undefined, or null (the default)
   *    -- "zoom"
   *    -- "leap" (or any other non-empty string, since this is the last branch)
   *    -- { xp: .., yp: .., ws: ..} (if so, leap straight to this position)
   *    Strings can be postfixed with "_into", in which case we zoom into that node
   * Note that "pzoom" is treated as "zoom" if the targeted node is too close to the root.
   * This is because "pzoom" zooms by a fixed amount, meaning that from a close node it 
   * would results in the tree being zoomed from a very small view.
   *
   * Return a promise for when the animation is finished
   */
  Controller.prototype.init_move_to = function (dest_OZid, init) {
    var n, into_node;

    if (init && !isNaN(init.xp)) {
      // Leap to position
      return this.leap_to(dest_OZid, init);
    }

    // Break up init into init/into_node
    init = (init || "pzoom").split("_");
    into_node = init[1] === 'into';
    init = init[0];

    if (init == "zoom") {
      return this.fly_on_tree_to(this.root.metacode, dest_OZid, into_node=into_node);
    }

    if (init == "pzoom") {
      // Leap to node
      return this.leap_to(dest_OZid, into_node=into_node)
        .then(() => {
          // Zoom out marginally
          // TODO: This will refuse to go back further than a given point, but that's much futher back than before
          this.zoomout(tree_state.widthres / 2, tree_state.heightres / 2, 0.1, true);
          // Fly back in again
          return this.fly_on_tree_to(null, dest_OZid, into_node=into_node);
        })
    }

    // init == "leap"
    // NB: leap_to won't fetch details, we do it ourselves
    position_helper.clear_target(this.root);
    n = this.develop_branch_to(dest_OZid);
    position_helper.target_by_code(this.root, (n.is_leaf ? -1 : 1) * n.metacode);
    return get_details_of_nodes_in_view_during_fly(this.root).then(function () {
        return this.leap_to(dest_OZid, init, into_node=into_node);
    }.bind(this));
  };
  
  /**
   * Develops tree to OZid, then precalculates the tree, set target to help position helper to leap or fly.
   * @param {integer} OZid
   *    OZid < 0, leaf(metacode == -OZid),
   *    OZid > 0, interior_node(metacode == OZid)
   */
  Controller.prototype.develop_branch_to = function(OZid) {
    let root = this.root;
    let selected_node = this.factory.dynamic_loading_by_metacode(OZid);
    this.projection.pre_calc(root);
    this.projection.calc_horizon(root);
    position_helper.clear_target(root);
    position_helper.target_by_code(root, OZid);
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
        throw new Error("In zoomin_anim, num is nan");
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
   * develop the tree to the node specified by OZid, then reanchor at this node.
   * @param {integer} OZid
   *    OZid < 0, leaf(metacode == -OZid),
   *    OZid > 0, interior_node(metacode == OZid)
   */
  Controller.prototype.develop_and_reanchor_to = function(OZid) {
    let root = this.root;
    let anchor_node = this.factory.dynamic_loading_by_metacode(OZid);
    this.projection.pre_calc(root, true)
    this.projection.calc_horizon(root);
    position_helper.deanchor(root);
    position_helper.reanchor_at_node(anchor_node);
  }
}
