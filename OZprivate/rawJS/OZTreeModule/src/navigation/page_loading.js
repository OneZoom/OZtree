import get_controller from '../controller/controller';
import data_repo from '../factory/data_repo';
import api_manager from '../api/api_manager';
import * as position_helper from '../position_helper';
import tree_state from '../tree_state';
import config from '../global_config';
/*
 * Collect nodes and leaves which are on or near the main branch in the fly animation. Fetch details of 
 * these nodes before fly animation.
*/
function page_loading_anim(OZIDin, init) {    
  let selected_node = get_controller().develop_branch_to(OZIDin);
  get_details_of_nodes_in_view_during_fly()
  .then(function() {
    fly_to_node(selected_node, init);
  });
}

/**
 * This function would firstly collects nodes and leaves which are on or near the main branch in the fly animation.
 * Then it will fetch metadata of these nodes or leaves and return resolve when it's done.
 * @return {Promise}
 * -- resolve when metadata is returned.
 * -- reject if there is any error.
 */
function get_details_of_nodes_in_view_during_fly() {
  return new Promise(function(resolve, reject) {
    let initial_target_arr = get_target_nodes_arr(get_controller().root, []);
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
 * init could be one of:
 * -- undefined or null(default as pzoom)
 * -- zoom
 * -- pzoom
 * -- jump(last branch)
 * Pzoom would be reset to zoom if the targeted node is too close to the root. Since pzoom would zoom a fixed length,
 * pzoom from a close node would result the tree being zoomed from a very small view.
 */
function fly_to_node(node, init) {
  let controller = get_controller();
  if (!init) init = "pzoom";
  if (init === "pzoom" && is_node_near_root(node)) init = "zoom";
  if (init == "zoom") {
    controller.reset();
    position_helper.setxyr3r(controller.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
    position_helper.perform_actual_fly(controller);
  } else if (init == "pzoom") {
    controller.reset();
    position_helper.setxyr3r(controller.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
    position_helper.deanchor(controller.root);
    position_helper.move(controller.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
    let zfact = 1;
    let wsover = Math.pow(10, zfact);
    tree_state.ws = tree_state.ws / wsover;
    tree_state.xp = tree_state.widthres/2 + (tree_state.xp - tree_state.widthres/2) / wsover;
    tree_state.yp = tree_state.heightres/2 + (tree_state.yp - tree_state.heightres/2) / wsover;
    position_helper.perform_actual_fly(controller);
  } else {
    controller.reset();
    position_helper.setxyr3r(controller.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
    position_helper.deanchor(controller.root);
    position_helper.move(controller.root, 40, tree_state.widthres-40, 40, tree_state.heightres-40);
  }
}

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


export {page_loading_anim};