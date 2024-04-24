import data_repo from '../factory/data_repo';
import api_wrapper from './api_wrapper';
import tree_state from '../tree_state';
import config from '../global_config';


class ImageDetailsAPI {
  constructor() {
    this.size_threshold = 350;
    this.interval = 1000;
  }
  start(controller) {
    this.api = config.api.image_details_api;
    start_fetch_loop(this, controller);
  }
}

function prepare_image_api_data(image_data) {
  var i, data = {};

  for (i = 0; i < image_data.length; i++) {
      if (!data.hasOwnProperty(image_data[i].src)) {
          data[image_data[i].src] = "" + image_data[i].src_id;
      } else {
          data[image_data[i].src] = "," + image_data[i].src_id;
      }
  }

  return data;
}

function prepare_picid_metacode_map(image_data) {
  let picid_metacode_map = {};
  let length = image_data.length;
  for (let i=0; i<length; i++) {
    picid_metacode_map[image_data[i].src_id] = image_data[i].metacode;
  }
  return picid_metacode_map;
}

function fetch_image_detail(root, image_api, controller) {
  if (!tree_state.flying) {
    let image_data = [];
    collect_nodes_need_image_details(root, image_data, image_api);
    let form_data = prepare_image_api_data(image_data);
    let picid_metacode_map = prepare_picid_metacode_map(image_data);
    
    if (Object.keys(form_data).length > 0) {
      let params = {
        url: image_api.api,
        method: 'get',
        data: form_data,
        success: function(res) {
          if (res.image_details) {
            for (let src_id of Object.keys(res.image_details)) {
                for (let picid of Object.keys(res.image_details[src_id])) {
                    data_repo.update_image_metadata(
                        picid_metacode_map[picid],
                        res.image_details[src_id][picid][res.headers["rights"]],
                        res.image_details[src_id][picid][res.headers["licence"]]);
                }
            }
            if (controller) controller.trigger_refresh_loop();
          }
        },
        error: function() {
          console.error("error when fetching image details " + data);
        }
      }  
      api_wrapper(params);
    }    
  }
}

/**
 * Fetching image details every image_api.interval milliseconds.
 */
function start_fetch_loop(image_api, controller) {
  if (controller && controller.root) {
    fetch_image_detail(controller.root, image_api, controller);
  } 
  setTimeout(function() {
    start_fetch_loop(image_api, controller);
  }, image_api.interval);
}


/**
 * This percolates down the tree and collects image details from nodes that are 
 * sufficiently large.
 * The problem is that this then doesn't fetch the copyright details for 
 * internal node pictures. This needs fixing somehow.
 *
 * Yan has mentioned maybe collect nodes which need image details while refreshing the canvas. 
 * Kai thinks that it is not critical as the cost for collecting nodes are very small, averaging less than 0.1 milliseconds.
 * Besides, if collect these nodes while refreshing, then the test in this function would run in each frame, which would makes each frame
 * more costly.
 */
function collect_nodes_need_image_details(node, arr, image_api) {
  if (node.dvar) {
    let visible_and_big = node.gvar && node.rvar > image_api.size_threshold;
    let detail_fetched_except_pic_credit = node.is_leaf && node.detail_fetched && node.pic_filename && !node.pic_credit;
    
    if (visible_and_big && detail_fetched_except_pic_credit) {
      arr.push({
        src_id: node.pic_filename,
        src: node.pic_src,
        metacode: node.metacode
      });
    }
    if (node.has_child && node.rvar && node.rvar > image_api.size_threshold) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        collect_nodes_need_image_details(node.children[i], arr, image_api);
      }
    }      
  }
}



let image_details_api = new ImageDetailsAPI();
export default image_details_api;
