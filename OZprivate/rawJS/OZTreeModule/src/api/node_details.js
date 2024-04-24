import {col_headers} from '../data/col_headers';
import data_repo from '../factory/data_repo';
import api_manager from './api_manager';
import tree_state from '../tree_state';
import config from '../global_config';

class NodeDetailsAPI {
  constructor() {
    this.leaves_in_cache = [];
    this.nodes_in_cache = [];
    this.update_metadata_header(col_headers);
  }
  
  start(controller) {
    //fill these in on start as they may not be defined in config until then
    //it is possible that we shouldn't store these in the class anyway, but always refer back to config.api.XXX
    //as the current setup will not allow us to change the config options after the OZ code has started.
    this.nodes_num = config.api.node_details_node_num;
    this.timer = null;
    this.interval_when_busy = config.api.node_details_interval_when_busy;
    this.interval_when_idle = config.api.node_details_interval_when_idle;
    this.fill_in_api_structure();
    fetch_node_start(this, controller);
  }
  /**
   * For brevity, the OneZoom remote API returns data for each node or leaf as a
   * flat array, such as [706124, 641136, 17314.1, "Codosiga gracilis", null, 500]
   * along with a 'header list' which states that the first item is the OneZoom id,
   * the second is the OTT id, the 4th is the name, etc.
   * An example header list for leaves might be something like:
   * {"id":0,"ott":1,"popularity":2,"name":3,"extinction_date":4,"price":5}
   * This function saves the mapping of column names to indices for a set of headers
   * so that sensible names can be used in the <code>update_metadata()</code> function
   * rather than having to reply on numerical indices.
   * @param {{colnames_nodes: {Object.<string, number>}, colnames_nodes: {Object.<string, number>}, colnames_images: {Object.<string, number>}, colnames_reservations: {Object.<string, number>}}} res - the result from an blank API call to node_details.json
   */
  update_metadata_header(res) {
    this.node_cols = res.colnames_nodes;
    this.leaf_cols = res.colnames_leaves;
    this.pic_cols = res.colnames_images;
    this.res_cols = res.colnames_reservations;
  }
  /**
 * Fetch lastest node api data structure from the server.
 * Pay attention that Kai also stores a local file in data/col_headers that does the 
 * same job. Kai added that file because when the tree loads to fly, Kai does not want
 * the node details fetching before fly depends on the success of this function.
 * 
 * Possibly better to delete this function and maintain an auto-build of data/col_headers.js
 */
  fill_in_api_structure() {
    let params = {
      method: 'get',
      dont_resend: true,
      data: {
        node_ids: "",
        leaf_ids: ""
      },
      self: this,
      success: function(res) {
        if (res.colnames_nodes) {
          params.self.update_metadata_header(res);
        } else {
          setTimeout(this.fill_in_api_structure, 1000);  
        }
      },
      error: function(res) {
        setTimeout(params.self.fill_in_api_structure, 1000);
      }
    }
    api_manager.node_detail(params);
  }
}


/**
 * The general principle is to fetch more frequently if there are nodes waiting
 * to be fetched.
 */
function fetch_node_start(node_details_api, controller) {
  if (controller && controller.root) {
    let nodes_to_fetch = fetch_node_detail(node_details_api, controller);
    if (nodes_to_fetch && nodes_to_fetch > 0) {
      node_details_api.timer = node_details_api.interval_when_busy;
    } else {
      node_details_api.timer = node_details_api.interval_when_idle;
    }
  } else {
    node_details_api.timer = node_details_api.interval_when_idle;
  }
  setTimeout(function() {
    fetch_node_start(node_details_api, controller);
  }, node_details_api.timer);
}

function fetch_node_detail(node_details_api, controller) {
  if (tree_state.flying) {
    return 0;
  } else {
    let nodes_need_detail = [];
    collect_nodes_need_details(controller.root, nodes_need_detail);
    reorder_nodes_by_visibility(nodes_need_detail);
    if (nodes_need_detail.length > 0) {
      node_detail_ajax_call(node_details_api, controller, nodes_need_detail);
    }
    return nodes_need_detail.length;    
  }
}

/**
 * Collect nodes that need detail, or are 3 generations from a node that needs detail
 *
 * @param node starting node
 * @param nodes_need_detail Array to put results in
 * @param force_fetch Recursion variable, do not set.
 */
function collect_nodes_need_details(node, nodes_need_detail, force_fetch) {
  if (!node.dvar) {
    return;
  }

  if (!node.detail_fetched || force_fetch > 0) {
    // Either this node has no detail, or one of it's recent parents doesn't
    nodes_need_detail.push(node);
  }

  for (let i=0; i < node.children.length; i++) {
    // If this node needs detail, get all details for nodes 3 levels below us
    // NB: I don't think this is actually required, and probably masked previous bugs
    collect_nodes_need_details(
      node.children[i],
      nodes_need_detail,
      node.detail_fetched ? force_fetch - 1 : 3
    );
  }
}

/**
 * Reorder node by its size and visibility.
 * General principle:
 * -- Visible first
 * -- Bigger size first (interior node size * 4 when compared with leaf (I don't remember why....Sorry))
 * -- Main branch first
 */ 
function reorder_nodes_by_visibility(nodes_need_detail) {
  let nodes_arr = [];
  for (let i=0; i<nodes_need_detail.length; i++) {
    let node = nodes_need_detail[i];
    let rating = 0;
    //visible & biggest node first.
    if (node.gvar && node.is_interior_node) rating += 4*node.rvar;
    if (node.gvar && node.is_leaf) rating += node.rvar;
    //invisible & cloest to view(rvar smallest) second
    if (node.rvar && !node.gvar) rating -= Math.log(node.rvar);
    //invisible & not on main branch(rvar is nan) last
    if (isNaN(node.rvar)) rating -= 10000;
    nodes_arr.push({
      node: node,
      rating: rating
    });
  }
  nodes_arr.sort(function(a,b) {
    if (a.rating < b.rating) return 1;
    else if (a.rating > b.rating) return -1;
    else return 0;
  });
  nodes_need_detail = [];
  for (let i=0; i<nodes_arr.length; i++) {
    nodes_need_detail.push(nodes_arr[i].node);
  }
}

/**
 * nodes_in_cache and leaves_in_cache includes metacodes that are still waiting for ajax respond. 
 * So do not add such nodes into nodes_to_fetch or leaves into leaves_to_fetch,
 * otherwise the next ajax call would contains repetitive nodes/leaves.
 */
function node_detail_ajax_call(node_details_api, controller, nodes) {
  if (nodes.length == 0) return;
  let nodes_to_fetch = [];
  let leaves_to_fetch = [];
  for (let i=0; i<nodes.length; i++) {
    if (nodes[i].is_leaf && !nodes[i].detail_fetched && node_details_api.leaves_in_cache.indexOf(nodes[i].metacode) === -1) {
      leaves_to_fetch.push(nodes[i]);
    } else if (nodes[i].is_interior_node && !nodes[i].detail_fetched && node_details_api.nodes_in_cache.indexOf(nodes[i].metacode) === -1) {
      nodes_to_fetch.push(nodes[i]);
    }
  }

  if (nodes_to_fetch.length + leaves_to_fetch.length > 0) {
    node_detail_ajax_call_2(node_details_api, controller, nodes_to_fetch, leaves_to_fetch);
  }
}


/**
 * Only allow maximum node_details_api.nodes_num nodes and leaves to be fetched in 
 * one time to avoid from 502 (parameter too long error)
 * 
 */
function node_detail_ajax_call_2(node_details_api, controller, nodes_to_fetch, leaves_to_fetch) {
  let nodes_arr = nodes_to_fetch.splice(0, node_details_api.nodes_num);
  let leaves_arr = leaves_to_fetch.splice(0, node_details_api.nodes_num);
  let nttoids = [];
  let lttoids = [];
  for (let i=0; i<nodes_arr.length; i++) {
    if (!nodes_arr[i].detail_fetched) {
      nttoids.push(nodes_arr[i].metacode);  
      node_details_api.nodes_in_cache.push(nodes_arr[i].metacode);
    }
  }
  
  for (let i=0; i<leaves_arr.length; i++) {
    if (!leaves_arr[i].detail_fetched) {
      lttoids.push(leaves_arr[i].metacode);
      node_details_api.leaves_in_cache.push(leaves_arr[i].metacode);  
    }
  }
  
  if (nttoids.length + lttoids.length === 0) return;
  
  let clear_nodes_in_cache = function() {
    for (let i=0; i<nodes_arr.length; i++) {
      let index = node_details_api.nodes_in_cache.indexOf(nodes_arr[i].metacode);
      node_details_api.nodes_in_cache.splice(index, 1);
    }
    for (let i=0; i<leaves_arr.length; i++) {
      let index = node_details_api.leaves_in_cache.indexOf(leaves_arr[i].metacode);
      node_details_api.leaves_in_cache.splice(index, 1);
    }
  };
  
  //abort this request when api_manager is busy. If user are doing intensive interaction, it would generate a lot of node_api ajax call and former ajax calls are likely to become less important than the latter ajax calls. Hence, it is better to abort current ajax call(if busy) and let fetch_node_detail to re-prioritise which nodes to fetch.
  let params = {
    method: 'post',
    dont_resend: true,
    abort_when_busy: true,
    abort_callback: clear_nodes_in_cache,
    data: {
      node_ids: nttoids.join(","),
      leaf_ids: lttoids.join(","),
      image_source: data_repo.image_source
    },
    success: function(res) {
      try {
        data_repo.update_metadata(res);
        update_nodes_details(nodes_arr);
        update_nodes_details(leaves_arr);
        if (controller) controller.trigger_refresh_loop();
      } catch(e) {
        console.error(e);
      } finally {
        clear_nodes_in_cache();
      }
    },
    error: function(res) {
      clear_nodes_in_cache();
    }
  }
  api_manager.node_detail(params);
}

function update_nodes_details(nodes) {
  let length = nodes.length;
  for (let i=0; i<length; i++) {
    let node = nodes[i];
    //if node has already fetched metadata or if node metadata is not returned, then go to next node.
    if (!node.detail_fetched) {
      node.update_attribute();
    }
  }
}

let node_details_api = new NodeDetailsAPI();
export default node_details_api;