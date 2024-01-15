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
  // NB: global_button_actions are defined in src/projection/live_area_config.js
  if (global_button_action.action =="leap") {
    controller.leap_to(global_button_action.data);
  } else if (global_button_action.action =="fly_node") {
    controller.fly_straight_to(global_button_action.data, true);
  } else if (global_button_action.action =="tap2zoom") {
    controller.fly_straight_to(global_button_action.data);
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
    if (is_popup_state()) {
      const m = global_button_action.action.match(/^ow_(.*)_(?:leaf|node)$/);
      // callback_arg is either middle part of ow_iucn_leaf / ow_ozspons_leaf, or nothing
      const linkoutArg = m ? m[1] : undefined;
      const is_ozid = global_button_action.action.endsWith("_node");

      // most internal nodes don't have an OTT, so node actions pass in the OneZoom ID
      config.ui.openLinkouts(global_button_action.data, is_ozid ? 'OZid' : 'ott');
      $.ajax({
        'url': (is_ozid ? config.api.OZ_node_json_url_func : config.api.OZ_leaf_json_url_func)(global_button_action.data, config.lang),
        success: (result) => {
          config.ui.populateLinkouts(result, linkoutArg);
        },
      });
    }
  }
}

export function is_popup_state() {
  return global_button_action.action && global_button_action.action.startsWith("ow_");
}
