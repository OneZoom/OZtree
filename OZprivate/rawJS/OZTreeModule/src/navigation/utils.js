import tree_state from '../tree_state';
import data_repo from '../factory/data_repo';

/**
 * Get largest visible node on the screen which meets the condition.
 * If part of the node is not on the screen and part of it is on, only the part that is on the screen counts.
 *
 * @param {Object} node Start point in search, probably controller.root
 * @param {Function} condition Function taking a node as an argument, and returning true,
 *  if the node would qualify as the sort that can be returned. If `null` find the
 *  largest of all the nodes on the screen
 * @param Largest node that matches condition, or null if none found
 */
function get_largest_visible_node(node, condition=null) {
  let condition_satisfy = !condition || condition(node);

  function get_area_in_screen(node) {
    if (!node.gvar) {
      return 0;
    } else {
      let sx = node.xvar + (node.rvar * node.hxmin);
      let ex = node.xvar + (node.rvar * node.hxmax);
      let sy = node.yvar + (node.rvar * node.hymin);
      let ey = node.yvar + (node.rvar * node.hymax);
      let width_r = Math.max((Math.min(ex, tree_state.widthres) - Math.max(sx, 0)) / (ex - sx), 0);
      let height_r = Math.max((Math.min(ey, tree_state.heightres) - Math.max(sy, 0)) / (ey - sy), 0);
      return node.rvar * width_r * height_r;
    }
  }

  if (node.gvar && condition_satisfy) {
    return node;
  } else if (node.dvar) {
    //otherwise try to find node with ott in its children
    if (node.has_child) {
      let satisfied_children = [];
      satisfied_children = node.children.map(function (child) {
        return get_largest_visible_node(child, condition);
      });
      let largest_area = -1, largest_node = null;
      let length = satisfied_children.length;
      for (let i = 0; i < length; i++) {
        let child = satisfied_children[i];
        if (child) {
          let area = get_area_in_screen(child);
          if (area > largest_area) {
            largest_area = area;
            largest_node = child;
          }
        }
      }

      if (largest_node !== null) {
        return largest_node;
      } else if (!isNaN(node.xvar) && condition_satisfy) {
        return node;
      }
    }
  }
  return null;
}

/**
 * Parse a DOM location object, defaulting to window.location, and return a state object.
 */
function parse_window_location(location = window.location) {
  let pathinfo = (location.pathname.indexOf("@") === -1) ? null : location.pathname.slice(location.pathname.indexOf("@"));
  return parse_query(pathinfo, location.search, location.hash);
}

function parse_query(loc, querystring, hash) {
  let state = {};
  parse_location(state, loc);
  parse_querystring(state, querystring);
  parse_hash(state, hash);
  return state;
}

//Object, String
//This function parses the location string, then store the result in state object.
//The string could be null or undefined or empty. 
//Otherwise it starts with "@". Followed by a name or '=ott' or both. If name is present, the '=' can remain even without ott.
//Examples:
//  "@name=1234", "@name", "@name=", "@=1234"
//can also allow "@5678" which refers to a specific node_id (NOT ott)
function parse_location(state, loc) {
  if (!loc || loc.length === 0) return;
  loc = loc.substring(1);
  let parts = loc.split("=");
  if (parts.length === 1) {
    if (isNaN(parseInt(parts[0]))) {
      state.latin_name = parts[0];
    } else {
      state.node_id = parseInt(parts[0]);
    }
  } else if (parts[0].length > 0) {
    state.latin_name = parts[0];
  }
  if (parts.length > 1 && !isNaN(parseInt(parts[1]))) state.ott = parseInt(parts[1]);
}

/**
 * Parse the query string, then store the result in state object.
 * @param {Object} state - the state that will be changed
 * @param {String} querystring - the query string. Could be null or undefined or empty, otherwise must start with '?'
    and continues until the end or a '#' is reached
 *   The string may contain the following parts, joined by '&'
 *    -- 'pop=' + prefix_Number (where prefix is ol (open leaf), osl (open sponsor_leaf), oil (open iucn leaf) and  
 *    -- 'vis=' + (one of 'spiral', 'fern', 'natural', 'balanced')
 *    -- 'init='     + (one of 'leap', 'zoom', 'pzoom') 
 *    -- 'lang='     + (a language code, e.g. 'en', 'fr', etc.) 
 *   Example:  ?part1&part2&part3.
 */
function parse_querystring(state, querystring) {
  if ((typeof querystring !== 'string') || !querystring.startsWith('?')) return;
  querystring = querystring.substring(1).split("&"); //knock off initial '?'
  for (let i = 0; i < querystring.length; i++) {
    if (/^pop=/.test(querystring[i])) {
      let tap_params = querystring[i].substring(querystring[i].indexOf("=") + 1).split("_");
      let tap_ott_or_id, tap_action;
      if (tap_params.length == 2) {
        //new param specification style, e.g. "pop=ol_id"
        tap_action = decode_popup_action(tap_params[0]);
        tap_ott_or_id = tap_params[1];
      } else {
        //old params specification style. pop=id
        tap_ott_or_id = tap_params[0];
        tap_action = "ow_leaf";
      }
      state.tap_action = tap_action;
      state.tap_ott_or_id = parseInt(tap_ott_or_id);
    } else if (/^vis=/.test(querystring[i])) {
      let vis_type = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.vis_type = vis_type;
    } else if (/^init=/.test(querystring[i])) {
      let init = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.init = init;
    } else if (/^lang=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let lang = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.lang = lang;
    } else if (/^img=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let image_source = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.image_source = image_source;
    } else if (/^anim=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let search_jump_mode = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.search_jump_mode = search_jump_mode;
    } else if (/^otthome=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let home_ott_id = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.home_ott_id = home_ott_id;
    } else if (/^ssaver=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let screen_saver_inactive_duration = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.screen_saver_inactive_duration = screen_saver_inactive_duration;
    } else if (/^cols=/.test(querystring[i])) {
      // User wants a given colour scheme
      state.cols = querystring[i].substring(querystring[i].indexOf("=") + 1);
    } else if (/^initmark=/.test(querystring[i])) {
      // User wants an initial marking
      state.initmark = parseInt(querystring[i].substring(querystring[i].indexOf("=") + 1));
    }
  }
}

//Object, String
//This function parse the hash string, then store the result in state object.
//String is one of --
//  null or undefined or empty
//  '#ott' + Number
//  '#' +    String(name of species)
//  '#x' +   Number  +  ',y'  +  Number  +  ',w'  +  Number
//Parse result is one of --
//  null (no change)
//  ott:    Number
//  name:   String
//  xp: Number, yp: Number, ws: Float
function parse_hash(state, hash) {
  if (!hash || hash.length === 0) return;
  hash = hash.substring(1);    //remove '#'
  if (hash.indexOf("ott") === 0) {
    let ott = parseInt(hash.substring(3));
    if (!isNaN(ott)) state.ott = ott;
  } else {
    let parts = hash.split(",");
    if (parts.length === 3 && hash.indexOf("x") !== -1 && hash.indexOf(",y") !== -1 && hash.indexOf(",w") !== -1) {
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].match(/x/)) {
          state.xp = parseInt(parts[i].substring(parts[i].indexOf("x") + 1));
        } else if (parts[i].match(/y/)) {
          state.yp = parseInt(parts[i].substring(parts[i].indexOf("y") + 1));
        } else if (parts[i].match(/w/)) {
          state.ws = parseFloat(parts[i].substring(parts[i].indexOf("w") + 1));
        }
      }
    } else {
      state.latin_name = hash;
    }
  }
}

function encode_popup_action(popup_action) {
  if (popup_action == "ow_leaf") {
    return 'ol';
  } else if (popup_action == "ow_node") {
    return 'on';
  } else if (popup_action == "ow_sponsor_leaf") {
    return 'osl';
  } else if (popup_action == "ow_sponsor_node") {
    return 'osn'
  } else if (popup_action == "ow_iucn_leaf") {
    return 'oil';
  } else {
    console.err("popup action unknown type " + popup_action);
  }
}

function decode_popup_action(popup_action) {
  if (popup_action == "ol") {
    return 'ow_leaf';
  } else if (popup_action == "on") {
    return 'ow_node';
  } else if (popup_action == "osl") {
    return 'ow_sponsor_leaf';
  } else if (popup_action == "osn") {
    return 'ow_sponsor_node'
  } else if (popup_action == 'oil') {
    return 'ow_iucn_leaf';
  } else {
    console.err('popup action unknown type ' + popup_action);
  }
}

export { get_largest_visible_node, parse_query, parse_window_location, encode_popup_action, decode_popup_action };
