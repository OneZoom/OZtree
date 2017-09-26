import config from '../global_config';
import {global_button_action} from '../button_manager';

/**
 * This file configs button action when click on live area.
 * For example, if you want to define a new live area on branch.
 * Then you need to assign a new callback on live_area_config, like:
 * live_area_config.branch = {
 *  register_button_event: function(node) {
 *    global_button_action.action = "xxxx"
 *    global_button_action.data = XXXXX
 *  }
 * }
 * 
 * global_button_action.action onlys stores name of the callback. The actual
 * callback is defined in button_manager and would be fired when user click
 * on live area. Keep in mind, registeration of the global_button_action 
 * happens in each frame when shapes are collected.
 */

let live_area_config = {};

live_area_config.interior_low_res_circle = {
  register_button_event: function(node) {
    global_button_action.action = "fly_node";
    global_button_action.data = node.metacode;
  }
}

live_area_config.interior_high_res_text = {
  register_button_event: function(node) {
    global_button_action.action = "ow_node";
    global_button_action.data = node.metacode;
  }
}

live_area_config.interior_sponsor_text = {
  register_button_event: function(node) {
    global_button_action.action = "ow_sponsor_node";
    global_button_action.data = node.metacode;  
  }
}

live_area_config.interior_image = {
  register_button_event: function(data) {
    global_button_action.action = "jump";
    global_button_action.data = data;
  }  
}

live_area_config.signpost = {
  register_button_event: function(node) {
    global_button_action.action = "tap2zoom";
    global_button_action.data = node.is_leaf ? -node.metacode : node.metacode;
  }
}

live_area_config.leaf_low_res_leafbase = {
  register_button_event: function(node) {
    global_button_action.action = "tap2zoom";
    global_button_action.data = node.is_leaf ? -node.metacode : node.metacode;
  }
}

live_area_config.leaf_sponsor_text = {
  register_button_event: function(node) {
    global_button_action.action = "ow_sponsor_leaf";
    global_button_action.data = node.ott;
  }
}

live_area_config.leaf_high_res_text = {
  register_button_event: function(node) {
    global_button_action.action = "ow_leaf";
    global_button_action.data = node.ott;
  }
}

live_area_config.leaf_conservation_text = {
  register_button_event: function(node) {
    global_button_action.action = "ow_iucn_leaf";
    global_button_action.data = node.ott;
  }
}

live_area_config.leaf_copyright = {
  register_button_event: function(node) {
    global_button_action.action = "link";
    global_button_action.data = [node.pic_src, node.pic_filename];
  }
}

export {live_area_config};