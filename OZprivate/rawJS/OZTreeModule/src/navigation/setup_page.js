import {parse_query} from './utils';
import data_repo from '../factory/data_repo';
import api_manager from '../api/api_manager';
import get_controller from '../controller/controller';
import tree_state from '../tree_state';
import {global_button_action, click_on_button_cb} from '../button_manager';
import config from '../global_config';

/**
 * This function is fired when user navigates the history.
 * State can be fetched either by event.state or parsing url.
 */
function popupstate(event) {
  let state = event.state;
  if (!state) { //state == null - we have followed a hash link.
    let loc = (window.location.pathname.indexOf("@") === -1) ? null : window.location.pathname.slice(window.location.pathname.indexOf("@"));
    state = parse_query(loc, window.location.search, window.location.hash);
  }
  if (state) {
    setup_page_by_navigation(state);  
  }
}

/**
 * This function is fired when the page loads and the tree is built. This function would jump or fly the tree according to url.
 */
function setup_loading_page() {
  let loc = (window.location.pathname.indexOf("@") === -1) ? null : window.location.pathname.slice(window.location.pathname.indexOf("@"));
  let state = parse_query(loc, window.location.search, window.location.hash);
  setup_page_by_loading(state);
}

/**
 * State contains those informations which could help to find metacode of the pinpoint node:
 * -- ott
 * -- latin_name
 * This function first try to find metacode by looking at local storage. If the metacode is not found, then try to search the server.
 * @return {Promise} return a promise which would turn to resolve if the metacode is found, otherwise turn to reject.
 */
function get_id_by_state(state) {
  let promise = new Promise(function(resolve, reject) {
    if (!state) reject();
    else if (state.node_id) resolve(state.node_id);
    else if (state.ott && data_repo.ott_id_map[state.ott]) resolve(data_repo.ott_id_map[state.ott]);
    else if (state.latin_name && data_repo.name_id_map[state.latin_name]) resolve(data_repo.name_id_map[state.latin_name]);
    else if (state.ott || state.latin_name) {
      let data = {};
      if (state.ott) data.ott = state.ott;
      if (state.latin_name) data.name = state.latin_name;
      let params = {
        data: data,
        success: function(res) {
          if (res.id) {
            resolve(res.id);
          } else {
            reject();
          }
        },
        error: function(res) {
          reject();
        }
      };
      api_manager.search_init(params);
    } else {
      reject();
    }
  });
  return promise;
}

function setup_page_by_loading(state) {
  let controller = get_controller();
  if (state.vis_type) controller.change_view_type(state.vis_type);
  config.lang = state.lang || '';
  if (state.title) document.title = unescape(state.title);
  get_id_by_state(state)
  .then(function(id) {
    tree_state.url_parsed = true;
    if (state.xp !== undefined || (state.init && !['zoom','pzoom'].includes(state.init))) {
      jump_to_position(state, id);
    } else {
      controller.fly_to_node(id, state.init);
    }
  })
  .catch(function(error) {
    tree_state.url_parsed = true;
    //TODO: separate out promise reject and error handling.
    controller.reset();
    if (state.ott) {
        if (typeof config.ui.badOTT !== 'function') {
            alert('Developer error: you need to define a UI function named badOTT that takes a bad OTT and pings up an error page')
        } else {
            config.ui.badOTT(state.ott);
        }
    }
  });
}


function setup_page_by_navigation(state) {
  let controller = get_controller();
  if (state.vis_type) controller.set_view_type(state.vis_type);
  if (state.title) document.title = unescape(state.title);
  controller.close_all();
  //if (tour.tour_name) {
    //get the tour information by using an ajax call on 
  //  alert('Sorry, tours are not yet implemented')
  //}
  
  get_id_by_state(state)
  .then(function(id) {
    tree_state.url_parsed = true;
    if (state.xp  !== undefined || (state.init && !['zoom','pzoom'].includes(state.init))) {
      //jump if we have a hash position defined or if init exists and is not 'zoom' or 'pzoom'
      jump_to_position(state, id);
    } else {
      controller.perform_leap_animation(id);
    }
  })
  .catch(function() {
    controller.reset();
  })
}

function jump_to_position(state, codeIn) {
  let controller = get_controller();
  //jump to position pinpoint by reanchored node(codeIn) and position(state.xp, state.yp, state.ws)
  //TO DO - James says this needs to work even if the screen size etc has changed
  //we might not have x,y,w defined if e.g. init=jump
  tree_state.xp = parseInt(state.xp || 0);
  tree_state.yp = parseInt(state.yp || 0);
  tree_state.ws = parseFloat(state.ws || 1);
  controller.develop_and_reanchor_to(codeIn);
  controller.re_calc();
  
  //open popup dialog if exists.
  if (state.tap_action && state.tap_ott) {
    global_button_action.action = state.tap_action;
    global_button_action.data = parseInt(state.tap_ott);
    click_on_button_cb(controller);
  } else {
    controller.close_all();
  }
}


export {popupstate, setup_loading_page};

