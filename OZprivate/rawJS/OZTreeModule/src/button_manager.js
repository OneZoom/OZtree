import config from './global_config';
import tree_state from './tree_state';
import {color_theme} from './themes/color_theme';

export let global_button_action = {
  "action": null,
  "data": null
}

export function reset_global_button_action() {
  global_button_action.action = null;
  global_button_action.data = null;
}

export function click_on_button_cb(controller) {
  /* requires the global function open_linkouts to have been defined */
  if (global_button_action.action =="jump") {
    controller.perform_leap_animation(global_button_action.data);
  } else if (global_button_action.action =="fly") {
    controller.perform_flight_animation(global_button_action.data);
  } else if (global_button_action.action =="fly_node") {
    controller.perform_flight_animation(global_button_action.data, true);
  } else if (global_button_action.action =="tap2zoom") {
    controller.perform_flight_animation(global_button_action.data);
  } else if (global_button_action.action =="link") {
    if (typeof config.ui.openCopyright !== 'function') {
      alert("Developer error: you need to define a UI function named openCopyright");
      return;
    } else {
      config.ui.openCopyright.apply(undefined, global_button_action.data);
    }
  } else {
    if (typeof config.ui.openLinkouts !== 'function') {
      //we should have defined it!
      alert("Developer error: you need to define a UI function used by callAjax named openLinkouts");
      return;
    }
    if (typeof config.ui.populateLinkouts !== 'function') {
      //we should have defined it!
      alert("Developer error: you need to define a UI function used by callAjax named populateLinkouts");
      return;
    }
    if (typeof config.api.OZ_leaf_json_url_func !== 'function') {
      //we should have defined it!
      alert("Developer error: you need to define a function named OZ_leaf_json_url_func that takes an OTT and returns a URL to get a json list of tabs for this ott");
      return;
    } 
    if (typeof config.api.OZ_node_json_url_func !== 'function') {
      //we should have defined it!
      alert("Developer error: you need to define a function named OZ_node_json_url_func that takes a OneZoom node ID and returns a URL to get a json list of tabs");
      return;
    }
    if (global_button_action.action =="ow_leaf") {
      config.ui.openLinkouts(global_button_action.data, 'ott');
      callAjax(config.api.OZ_leaf_json_url_func(global_button_action.data, config.lang), config.ui.populateLinkouts);
    } else if (global_button_action.action =="ow_iucn_leaf") {
      config.ui.openLinkouts(global_button_action.data, 'ott');
      callAjax(config.api.OZ_leaf_json_url_func(global_button_action.data, config.lang), config.ui.populateLinkouts, 'iucn');
    } else if (global_button_action.action =="ow_sponsor_leaf") {
      config.ui.openLinkouts(global_button_action.data, 'ott');
      callAjax(config.api.OZ_leaf_json_url_func(global_button_action.data, config.lang), config.ui.populateLinkouts, 'ozspons');
    } else if (global_button_action.action =="ow_node") {
      config.ui.openLinkouts(global_button_action.data, 'OZid'); /* most internal nodes don't have an OTT, so node actions pass in the OneZoom ID */
      callAjax(config.api.OZ_node_json_url_func(global_button_action.data, config.lang), config.ui.populateLinkouts);
    } else if (global_button_action.action =="ow_sponsor_node") {
      config.ui.openLinkouts(global_button_action.data, 'OZid'); /* most internal nodes don't have an OTT, so node actions pass in the OneZoom ID */
      callAjax(config.api.OZ_node_json_url_func(global_button_action.data, config.lang), config.ui.populateLinkouts, 'ozspons');
    }
  }
}


export function is_popup_state() {
  return global_button_action.action === "ow_leaf" || global_button_action.action === "ow_node" || global_button_action.action === "ow_sponsor_node" || global_button_action.action === "ow_sponsor_leaf" || global_button_action.action === "ow_iucn_leaf";
}

// call yan's API to get info for tree internal window
function callAjax(url, callback, arg){
    $.ajax({'url': url, success: function(result){
        callback(result,arg);
    }})
}