import { parse_window_location } from './utils';
import data_repo from '../factory/data_repo';
import api_manager from '../api/api_manager';
import get_controller from '../controller/controller';
import { UserInterruptError } from '../errors';
import tree_state from '../tree_state';
import { global_button_action, click_on_button_cb } from '../button_manager';
import config from '../global_config';
import tree_settings from '../tree_settings';
import { get_largest_visible_node } from './utils';

/**
 * This function is fired when user navigates the history.
 * State can be fetched either by event.state or parsing url.
 */
function popupstate(event) {
  let state = parse_window_location();
  setup_page_by_state(state);
}

/**
 * This function is fired when the page loads and the tree is built. This function would jump or fly the tree according to url.
 */
function setup_loading_page() {
  let state = parse_window_location();
  setup_page_by_state(state);
}

/**
 * State contains those informations which could help to find metacode of the pinpoint node:
 * -- ott
 * -- latin_name
 * This function first try to find metacode by looking at local storage. If the metacode is not found, then try to search the server.
 * @return {Promise} return a promise which would turn to resolve if the metacode is found, otherwise resolve as undefined (i.e. nowhere to go)
 */
function get_id_by_state(state) {
  if (!state) {
    return Promise.reject(new Error('Expect to get state, but pass in undefined'));
  } else if (state.node_id) {
    return Promise.resolve(state.node_id);
  } else if (state.ott && data_repo.ott_id_map[state.ott]) {
    return Promise.resolve(data_repo.ott_id_map[state.ott]);
  } else if (state.latin_name && data_repo.name_id_map[state.latin_name]) {
    return Promise.resolve(data_repo.name_id_map[state.latin_name]);
  } else if (state.ott || state.latin_name) {
    return get_ott_to_id_by_api(state.ott, state.latin_name)
  } else {
    // Neither ott or latin name is found in state, so nowhere to go
    return Promise.resolve(undefined);
  }
}

function get_ott_to_id_by_api(ott, latin_name) {
  return new Promise(function(resolve, reject) {
    let data = {}
    if (ott) data.ott = ott
    if (latin_name) data.name = latin_name
    let params = {
      data: data,
      success: function (res) {
        if (res.ids && res.ids.length) {
          if (ott) {
            data_repo.ott_id_map[ott] = res.ids[0]
            data_repo.id_ott_map[res.ids[0]] = ott
          }
          resolve(res.ids[0]);
        } else {
          reject();
        }
      },
      error: function (res) {
        reject(res);
      }
    };
    api_manager.search_init(params);
  })
}

function setup_page_by_state(state) {
  let controller = get_controller();
  if (state.vis_type) controller.change_view_type(state.vis_type, true);
  if (state.image_source) controller.set_image_source(state.image_source, true)
  if (state.lang) controller.set_language(state.lang, true)
  if (state.search_jump_mode) controller.set_search_jump_mode(state.search_jump_mode)
  if (state.title) document.title = unescape(state.title);
  if (state.home_ott_id) config.home_ott_id = state.home_ott_id
  if (state.ssaver_inactive_duration_seconds) tree_settings.ssaver_inactive_duration_seconds = state.ssaver_inactive_duration_seconds
  if (state.cols) controller.change_color_theme(state.cols, true)

  controller.close_all();

  // Perform initial marking if asked
  if (state.initmark) get_ott_to_id_by_api(state.initmark).then(id => controller.mark_area(id));

  let promise = state.home_ott_id ? get_ott_to_id_by_api(state.home_ott_id) : Promise.resolve()

  promise
  .then(() => {return get_id_by_state(state)})
  .then(function (id) {
    tree_state.url_parsed = true;
    if (id !== undefined) {
        // If there's somewhere to move to, do that.
        return controller.init_move_to(id, state.xp !== undefined ? state : state.init);
    }
  }).then(function () {
    // Start a tour if present
    if (state.tour_setting) controller.tour_start(state.tour_setting)

  }).then(function () {
    //open popup dialog if exists.
    if (state.tap_action && (state.tap_ott_or_id || state.ott)) {
      global_button_action.action = state.tap_action;
      if (state.tap_ott_or_id) {
        global_button_action.data = parseInt(state.tap_ott_or_id);
      } else {
        //try to fill in automatically from the ott - this allows e.g. ?osn_&init=jump
        if (state.tap_action.endsWith('node')) {
          //nodes must be referenced by OZid, not ott
          global_button_action.data = parseInt(data_repo.ott_id_map[state.ott]);
        } else {
          global_button_action.data = parseInt(state.ott);
        }
      }
      click_on_button_cb(controller);
    } else {
      controller.close_all();
    }
  })
  .catch(function (error) {
    tree_state.url_parsed = true;
    if (error instanceof UserInterruptError) {
        // The flight was cancelled by the user, not an actual issue
        if (window.is_testing) console.log("Flight cancelled", error)
        return true;
    }
    console.error("Failed to setup_page_by_state:", error);
    const ozId = data_repo.ott_id_map[config.home_ott_id]
    controller.init_move_to(ozId ? ozId : controller.root.metacode);  // NB: root is always a node, so ozID positive
    if (!ozId && state.ott) {
      if (typeof config.ui.badOTT !== 'function') {
        alert('Developer error: you need to define a UI function named badOTT that takes a bad OTT and pings up an error page')
      } else {
        config.ui.badOTT(state.ott);
      }
    }
    // throw error;
  });
}

/**
 * Return a "state" object representing the current tree view,
 * as parsed by setup_page_by_state()
 */
function tree_current_state_obj({record_popup = null}) {
  let controller = get_controller();
  var win_sp = new URLSearchParams(window.location.search);
  let state = {};

  //find the base path, without the /@Homo_sapiens bit, if it exists
  //note that window.location.pathname does not include ?a=b and #foobar parts
  let index = window.location.pathname.indexOf("@");
  if (index === -1) {
    state.url_base = window.location.origin + window.location.pathname.replace(/\/*$/, "/");
  } else {
    state.url_base = window.location.origin + window.location.pathname.substring(0, index).replace(/\/*$/, "/");
  }

  // Choose one with an OTT by preference
  let node = get_largest_visible_node(controller.root, (node) => !!node.ott) || get_largest_visible_node(controller.root);

  // ----- Pinpoint / path
  state.ott = node.ott
  state.latin_name = node.latin_name

  // ----- Position hash
  state.xp = node.xvar;
  state.yp = node.yvar;
  state.ws = node.rvar / 220;

  // ----- Query-string
  if (!tree_settings.is_default_vis()) state.vis_type = tree_settings.vis;
  // NB tree_settings.cols could be undefined if we since changed components of the colours
  if (!tree_settings.is_default_cols() && tree_settings.cols) state.cols = tree_settings.cols

  let tour_setting = controller.tour_active_setting();
  if (tour_setting && typeof tour_setting === 'string') state.tour_setting = tour_setting

  if (config.lang) state.lang = config.lang;
  if (data_repo.image_source !== 'best_any') state.image_source = data_repo.image_source;
  if (controller.get_search_jump_mode() !== 'flight') state.search_jump_mode = controller.get_search_jump_mode();
  if (config.home_ott_id) state.home_ott_id = config.home_ott_id
  if (record_popup) {
    state.tap_action = record_popup.action;
    state.tap_ott_or_id = record_popup.data;
  }
  if (!tree_settings.is_default_ssaver_inactive_duration_seconds()) state.ssaver_inactive_duration_seconds = tree_settings.ssaver_inactive_duration_seconds

  // init/initmark aren't stored anywhere, pull them out of existing URL
  if (win_sp.get('init')) state.init = win_sp.get('init');
  if (win_sp.get('initmark')) state.initmark = win_sp.get('initmark');

  // Preserve all custom parts of current querystring
  state.custom_querystring = {};
  (config.custom_querystring_params || []).forEach(function (part_name) {
    state.custom_querystring[part_name] = win_sp.getAll(part_name);
  });

  return state;
}


export { get_id_by_state, popupstate, setup_loading_page, tree_current_state_obj };

