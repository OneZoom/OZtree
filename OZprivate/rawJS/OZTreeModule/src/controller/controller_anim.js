import api_manager from '../api/api_manager';
import tree_state from '../tree_state';
import data_repo from '../factory/data_repo';
import * as position_helper from '../position_helper';
import config from '../global_config';
import { UserInterruptError } from '../errors';

/**
 * This function collects nodes and leaves which are on or near the main branch in the fly animation,
 * animation, then fetches metadata of these nodes or leaves, returning resolve when done.
 * @param {node} root controller.root
 * @param subbranch_depth How far off main branch to develop
 * @return {Promise}
 * -- resolve when metadata is returned.
 * -- reject if there is any error.
 */
function get_details_of_nodes_in_view_during_fly(root, subbranch_depth) {
  /**
   * Push all nodes that are on the main branch or within (subbranch_depth) generations from the main branch from the root to the targeted node.
   */
  function get_target_nodes_arr(node, nodes_arr) {
    if (node.targeted) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        nodes_arr = get_target_nodes_arr(node.children[i], nodes_arr);
      }
      nodes_arr.push(node);
    } else {
      nodes_arr = nodes_arr.concat(get_subbranch_nodes_arr(node, subbranch_depth));
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
            // NB: Do the work of update_nodes_details()
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

/** Cancel any previous flights, call do_flight_fn & save do_skip_fn if user wants to skip flight */
function flight_promise(do_flight_fn, do_skip_fn) {
  // Cancel any active flights first by turning off tree_state.flying
  // NB: The flight will *not* be cancelled immediately. perform_fly_b2()
  //     will notice on next setTimeout() and shut itself down, after
  //     which it's safe to start new flights.
  tree_state.flying = false;
  const flight_promise = tree_state.flight_promise = (tree_state.flight_promise || Promise.resolve()).then(() => {
    tree_state.flight_skip = do_skip_fn || undefined;
    tree_state.flying = true;
    return do_flight_fn();
  }).finally(() => {
    // NB: Only remove flight promise if it was ours. If we've been cancelled (and already replaced) leave alone
    if (tree_state.flight_promise === flight_promise) tree_state.flight_promise = undefined;
    tree_state.flight_skip = undefined;
    tree_state.flying = false;
  }).catch((e) => {
    // Eat any errors. We don't care at this point, this branch of the promise
    // chain is just to make sure we've finished, but without we get unhandled
    // rejection warnings
    if (!(e instanceof UserInterruptError)) {
      console.warn("Cancelled flight failed", e)
    }
  });
  return flight_promise;
}

/**
 * Part of Controller class. It contains functions to perform animations.
 */
export default function (Controller) {
  /**
   * Cancel any in-progress flight. The promise the flight returns will be
   * rejected with UserInterruptError. A flight cannot be immediately re-scheduled,
   * as we will not fully cancel until after the next frame.
   *
   * Returns promise which will resolve once flights are ready to happen again
   */
  Controller.prototype.cancel_flight = function () {
    // Trigger a do-nothing flight, which will cancel any ongoing flights first
    return flight_promise(() => { });
  };

  /**
   * If a skippable flight is in progress, return a function to skip it
   * otherwise, return undefined
   */
  Controller.prototype.get_flight_skip_fn = function () {
    return tree_state.flight_skip || undefined;
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
    if (position && (typeof(position) === 'object')) {
      return new Promise((resolve) => {
        tree_state.xp = position.xp || position[0] || 0
        tree_state.yp = position.yp || position[1] || 0
        tree_state.ws = position.ws || position[2] || 1

        let anchor_node = this.dynamic_load_and_calc(dest_OZid, {
          generation_at_searched_node: config.generation_at_searched_node
        });
        position_helper.deanchor(this.root);
        position_helper.reanchor_at_node(anchor_node);
        this.re_calc();
        this.trigger_refresh_loop();
        resolve()
      });
    }

    return flight_promise(() => {
      this.develop_branch_to_and_target(dest_OZid);
      return get_details_of_nodes_in_view_during_fly(this.root, 0).then(new Promise((resolve, reject) => {
        position_helper.perform_actual_fly(this, into_node, Infinity, 'linear', resolve, () => reject(new UserInterruptError('Fly is interrupted')));
      }));
    });
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
   * @param {boolean} allow_skip If true, the skip button will be available during the flight.
   * @return {Promise} resolve when fly finishes. throws an exception when fly is interrupted
   */
  Controller.prototype.fly_straight_to = function(
        dest_OZid, into_node, speed=1, accel_type='linear', allow_skip=false) {
    return flight_promise(() => new Promise((resolve, reject) => {
      this.develop_branch_to_and_target(dest_OZid);
      position_helper.perform_actual_fly(
        this, into_node, speed, accel_type || 'linear', resolve, () => reject(new UserInterruptError('Fly is interrupted')));
    }), allow_skip ? () => {
        this.leap_to(dest_OZid, null, into_node);
    } : undefined);
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
     * @param {boolean} allow_skip If true, the skip button will be available during the flight.
     * @return {promise} returns a promise
     *
     *
     * e.g. try in the console
     * onezoom.controller.fly_straight_to(782900)
     * onezoom.controller.fly_on_tree_to(782900, 713573, true)
     */
    Controller.prototype.fly_on_tree_to = function(
            src_OZid, dest_OZid,
            into_node=false, speed=1, accel_type="parabolic", finalize_func=null, allow_skip=false) {
        // Return flight path (common ancestor, then target)
        function get_flight_path(node_start, node_end) {
            var n, visited_nodes = {};

            // Mark each node in heirarchy as visited
            n = node_end;
            while (n) {
                visited_nodes[n.ozid] = true;
                n = n.upnode;
            }

            // Find first matching node from the first item
            n = node_start;
            if (visited_nodes[n.ozid]) {
                // We're just zooming in, don't bother with intermediate node
                return [node_end];
            }
            while (n) {
                if (visited_nodes[n.ozid]) {
                    if (node_end.ozid === n.ozid) {
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

        return flight_promise(() => new Promise((resolve) => {
            config.ui.loadingMessage(true);
            window.setTimeout(resolve, 200);
        }).then(() => {
            if (src_OZid !== null) {
                // Move to start location
                // NB: Not using leap_to helper here, we want this to be part of the same flight
                this.develop_branch_to_and_target(src_OZid);
                return get_details_of_nodes_in_view_during_fly(this.root, 0).then(new Promise((resolve, reject) => {
                    position_helper.perform_actual_fly(this, into_node, Infinity, 'linear', resolve, () => reject(new UserInterruptError('Fly is interrupted')));
                }));
            }
        }).then(() => {
            if (src_OZid === null) {
                // Find largest visible node: use this as our starting point
                let top_node = this.largest_visible_node(function(node) { return node.ott; }) || this.root;
                src_OZid = top_node.ozid;
            }
            var flight_path = get_flight_path(
                this.develop_branch_to_and_target(src_OZid),
                this.develop_branch_to_and_target(dest_OZid)
            );
            config.ui.loadingMessage(false);
            return flight_path;
        }).then((flight_path) => {
            var flight_p = Promise.resolve();

            flight_path.map(function (n) {
                // Fetch node_detail for all targets
                // NB: Ideally we'd parallelise this, but the interface doesn't allow it yet.
                flight_p = flight_p.then(function () {
                    position_helper.clear_target(this.root);
                    position_helper.target_by_code(this.root, n.ozid);
                    return get_details_of_nodes_in_view_during_fly(this.root, 4);
                }.bind(this));
            }.bind(this));

            return flight_p.then(function () { return flight_path; });
        }).then((flight_path) => {
            var flight_p = Promise.resolve();

            flight_path.map(function (n, idx, arr) {
                // Fly to each node in our path
                var accel_func = idx === arr.length - 1 ? 'decel'
                               : idx === 0 ? 'accel'
                               : null;
                flight_p = flight_p.then(function () {
                    return new Promise(function (resolve, reject) {
                        position_helper.clear_target(this.root);
                        position_helper.target_by_code(this.root, n.ozid);
                        position_helper.perform_actual_fly(
                          this, (accel_func === 'decel') ? into_node : false, speed, accel_func, resolve, () => reject(new UserInterruptError('Fly is interrupted')));
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            return flight_p.then(function () { return flight_path; });
        }).then(finalize_func).catch((e) => {
            config.ui.loadingMessage(false);
            throw e;
        }), allow_skip ? () => {
            this.leap_to(dest_OZid, null, into_node);
            if (finalize_func != null) {
                finalize_func();
            }
        } : undefined);
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
          if (dest_OZid === 1) {
            // Tree root, so zoom *in* marginally & zoom back out
            this.zoomin(tree_state.widthres / 2, tree_state.heightres / 2, 0.4, true);
          } else {
            // Zoom out marginally
            this.zoomout(tree_state.widthres / 2, tree_state.heightres / 2, 0.1, true);
          }
          // Fly back in again
          return this.fly_on_tree_to(null, dest_OZid, into_node=into_node);
        })
    }

    // init == "leap"
    return this.leap_to(dest_OZid, init, into_node=into_node);
  };
  
  /**
   * Develops tree to OZid, then precalculates the tree, set target to help position helper to leap or fly.
   * @param {integer} OZid
   *    OZid < 0, leaf(metacode == -OZid),
   *    OZid > 0, interior_node(metacode == OZid)
   */
  Controller.prototype.develop_branch_to_and_target = function(OZid) {
    let root = this.root;
    let selected_node = this.dynamic_load_and_calc(OZid, {
      generation_at_searched_node: config.generation_at_searched_node,
      generation_on_subbranch: config.generation_on_subbranch_during_fly,
    });
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
}
