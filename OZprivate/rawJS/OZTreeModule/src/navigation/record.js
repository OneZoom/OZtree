import get_controller from '../controller/controller';
import tree_settings from '../tree_settings';
import { global_button_action } from '../button_manager';
import { get_largest_visible_node, parse_window_location, parse_query, encode_popup_action } from './utils';
import { add_hook } from '../util/index';
import config from '../global_config';
import data_repo from '../factory/data_repo';

let timer = null;

add_hook("flying_finish", record_url_delayed);

function record_url_delayed() {
  clearTimeout(timer);
  timer = setTimeout(record_url, 300);
}

/**
 * Record current position into url. 
 * Record the following information into url:
 * 1. current pin node: find the largest visble node with ott, then store in following format: @latin_name(if exist)=ott
 * 2. querystring arguments: [default settings] + vis, cols, lang, popup type and popup ott: ?vis=spiral&popup=ott
 * 3. exact position: #x=1,y=2,w=2.333
 * Besides record url, also change document title if find a node with name.
 * Only record url if current pin node is the different from previous pin node or popup dialog close or open.
 * Also do not record file:/// links (not allowed for security reasons)
 * @param {Object} options It could contain the following properties:
 * record_popup: Contents of global_button_action, if a popup window should be open
 */
function record_url(options, force) {
  let controller = get_controller();

  clearTimeout(timer);

  if (config.disable_record_url) {
    // In an embedded view, e.g. Don't modify the page URL
    return;
  }

  options = options || {};
  let node_with_ott = get_largest_visible_node_with_ott(controller.root);
  if (!node_with_ott) return;
  let node_with_name = get_largest_visible_node_with_name(controller.root);

  let title = get_title(node_with_name, node_with_ott);
  let hash = get_position_hash(node_with_ott);
  let loc = get_pinpoint(node_with_ott);
  let querystring = get_params(options);
  if (current_view_near_previous_view(loc, querystring, hash) && !(force)) {
    return;
  } else if (window.location.protocol != "file:") {
    let state = get_current_state(node_with_ott, title, options);
    let url = loc + querystring + hash;
    if (options.replaceURL) {
      window.history.replaceState(null, title, window.location.origin + pathname_exclude_append() + "/" + url);
    } else {
      window.history.pushState(null, title, window.location.origin + pathname_exclude_append() + "/" + url);
    }
    document.title = unescape(title);
  }
}

/**
 * @return {boolean} return true if all of the following condition meet:
 * -- current view pinpoint node has same ott as previous view's pinpoint node.
 * -- both view has no popup window or both view have the same popup window (same means its context are based on same ott)
 */
function current_view_near_previous_view(loc, querystring, hash) {
  let previous_state = parse_window_location();
  let current_state = parse_query(loc, querystring, hash);
  if (current_state === null && previous_state !== null) return false;
  else if (current_state !== null && previous_state === null) return false;
  else if (current_state === null && previous_state === null) return true;
  else if (current_state.vis_type !== previous_state.vis_type) return false;
  else if (current_state.ott === previous_state.ott) {
    //If no tap window open and position not changed a lot, do not record current position into history.
    if (!current_state.tap_ott_or_id && !previous_state.tap_ott_or_id) return true;
    //If opened tap is same as previous, do not record current position into history.
    if (current_state.tap_ott_or_id && previous_state.tap_ott_or_id && (current_state.tap_ott_or_id === previous_state.tap_ott)) return true;
  }
  return false;
}

function get_largest_visible_node_with_ott(node) {
  return get_largest_visible_node(node, function (node) {
    return node.ott;
  });
}

function get_largest_visible_node_with_name(node) {
  return get_largest_visible_node(node, function (node) {
    return node.cname || node.latin_name;
  });
}

/**
 * Get new xp, yp and ws if the view reanchors on node.
 * Note xp, yp and ws won't change and the view won't actually reanchor after this function.
 */
function get_pos_if_reanchor(node) {
  let xp = node.xvar;
  let yp = node.yvar;
  let ws = node.rvar / 220;
  return [xp, yp, ws];
}

function get_title(node_with_name, node_with_ott) {
  /* TO DO - account for other views, e.g. linn soc, that should have different <title> attributes */
  if (node_with_name) {
    return config.title_func(node_with_name.cname ? node_with_name.cname : node_with_name.latin_name);
  } else if (node_with_ott.cname) {
    return config.title_func(node_with_ott.cname);
  } else if (node_with_ott.latin_name) {
    return config.title_func(node_with_ott.latin_name);
  } else {
    return config.title_func();
  }
}

function get_position_hash(node) {
  let pos = get_pos_if_reanchor(node);
  return "#x" + pos[0].toFixed(0) + ",y" + pos[1].toFixed(0) + ",w" + pos[2].toFixed(4);
}

function get_pinpoint(node) {
  let latin = node.latin_name ? transform_latin(node.latin_name) : "";
  return "@" + latin + "=" + node.ott;
}

function get_params(options) {
  let querystring = [];

  if (!tree_settings.is_default_vis()) {
    let vis_string = tree_settings.vis;
    if (vis_string) {
      querystring.push("vis=" + encodeURIComponent(vis_string));
    } //else could be undefined if some random string was used
  }

  if (!tree_settings.is_default_cols()) {
    let cols_string = tree_settings.cols;
    if (cols_string) {
      querystring.push("cols=" + encodeURIComponent(cols_string));
    } //else could be undefined if we since changed components of the colours
  }

  if (config.lang) {
    querystring.push("lang=" + encodeURIComponent(config.lang));
  }

  if (data_repo.image_source) {
    querystring.push("img=" + encodeURIComponent(data_repo.image_source))
  }

  if (config.search_jump_mode) {
    querystring.push("anim=" + encodeURIComponent(config.search_jump_mode))
  }

  if (config.home_ott_id) {
    querystring.push('otthome=' + encodeURIComponent(config.home_ott_id))
  }

  if (options.record_popup) {
    querystring.push("pop=" + encode_popup_action(options.record_popup.action) + "_" + options.record_popup.data);
  }
  // Preserve all custom parts of current querystring
  (config.custom_querystring_params || []).concat(['ssaver', 'init', 'initmark']).map(function (part_name) {
    var m = window.location.search.match(new RegExp('(^|&|\\?)' + part_name + '=[^&]+', 'g'));
    (m || []).map(function (part) {
      querystring.push(part.replace(/^[&?]/, ''));
    });
  });
  querystring = querystring.join('&')
  if (querystring !== '') {
    querystring = "?" + querystring;
  }
  return querystring;
}

function get_current_state(node, title, options) {
  let state = {};
  let pos = get_pos_if_reanchor(node);
  state.xp = pos[0].toFixed(0);
  state.yp = pos[1].toFixed(0);
  state.ws = pos[2].toFixed(4);
  state.ott = node.ott;
  state.vis_type = tree_settings.vis;
  if (title) state.title = title;
  if (options.record_popup) {
    state.tap_action = options.record_popup.action;
    state.tap_ott_or_id = options.record_popup.data;
  }
  return state;
}

/**
 * Replace space with underscore
 */
function transform_latin(latin) {
  return latin.split(" ").join("_");
}

function pathname_exclude_append() {
  //find the base path, without the /@Homo_sapiens bit, if it exists
  //note that window.location.pathname does not include ?a=b and #foobar parts
  let index = window.location.pathname.indexOf("@");
  if (index === -1) {
    return window.location.pathname.replace(/\/$/, "");
  } else {
    return window.location.pathname.substring(0, index).replace(/\/$/, "");
  }
}


export { record_url_delayed, record_url };