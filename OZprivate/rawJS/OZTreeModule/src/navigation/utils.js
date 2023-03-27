import tree_state from '../tree_state';

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
  let state = {};
  state.url_base = parse_url_base(location);
  parse_pathname(state, location.pathname);
  parse_querystring(state, location.search);
  parse_hash(state, location.hash);
  return state;
}

/**
 * Turn a state object back into a location
 */
function deparse_state(state) {
  return new URL(deparse_pathname(state) + deparse_querystring(state) + deparse_hash(state));
}

/**
 * Parse the URL base from a location object
 */
function parse_url_base(location) {
  //find the base path, without the /@Homo_sapiens bit, if it exists
  //note that location.pathname does not include ?a=b and #foobar parts
  let index = location.pathname.indexOf("@");
  if (index === -1) {
    return location.origin + location.pathname.replace(/\/*$/, "/");
  } else {
    return location.origin + location.pathname.substring(0, index).replace(/\/*$/, "/");
  }
}

// Pull pinpoint out of pathname, e.g. @Eukaryota=304358
function parse_pathname(state, pathname) {
    state.pinpoint = pathname.indexOf("@") === -1 ? null : pathname.slice(pathname.indexOf("@"));
}

/// pathname should equal pinpoint
function deparse_pathname(state) {
    return state.url_base + state.pinpoint;
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
      let ssaver_inactive_duration_seconds = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.ssaver_inactive_duration_seconds = ssaver_inactive_duration_seconds;
    } else if (/^cols=/.test(querystring[i])) {
      // User wants a given colour scheme
      state.cols = querystring[i].substring(querystring[i].indexOf("=") + 1);
    } else if (/^initmark=/.test(querystring[i])) {
      // User wants an initial marking
      state.initmark = parseInt(querystring[i].substring(querystring[i].indexOf("=") + 1));
    } else if (/^tour=/.test(querystring[i])) {
      // User wants a tour
      state.tour_setting = decodeURIComponent(querystring[i].substring(querystring[i].indexOf("=") + 1));
    }
  }
}

function deparse_querystring(state) {
  var sp = new URLSearchParams("");

  if (state.tap_action) sp.set('pop', encode_popup_action(state.tap_action) + "_" + state.tap_ott_or_id);
  if (state.vis_type) sp.set('vis', state.vis_type);
  if (state.init) sp.set('init', state.init);
  if (state.lang) sp.set('lang', state.lang);
  if (state.image_source) sp.set('img', state.image_source);
  if (state.search_jump_mode) sp.set('anim', state.search_jump_mode);
  if (state.home_ott_id) sp.set('otthome', state.home_ott_id);
  if (state.ssaver_inactive_duration_seconds) sp.set('ssaver', state.ssaver_inactive_duration_seconds);
  if (state.cols) sp.set('cols', state.cols);
  if (state.initmark) sp.set('initmark', state.initmark);
  if (state.tour_setting) sp.set('tour', state.tour_setting);

  if (state.custom_querystring) {
    for (let k in state.custom_querystring) sp.set(k, state.custom_querystring[k]);
  }

  let out = sp.toString();
  return out ? '?' + out : out;
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

function deparse_hash(state) {
  if (!state.xp || !state.yp || !state.ws) return "";
  return "#x" + state.xp.toFixed(0) + ",y" + state.yp.toFixed(0) + ",w" + state.ws.toFixed(4);
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

export { get_largest_visible_node, parse_window_location, deparse_state, parse_url_base };
