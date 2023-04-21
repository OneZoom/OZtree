/**
 * OneZoom URL Parsing
 *
 * Functions to parse a *URL string* to/from a *state object*
 *
 * A OneZoom *URL string* is of the form:
 *
 *     /life/@biota=93302?cols=AT&...#x123...
 *
 * Where:
 * * ``/life/`` is the treeviewer page used
 * * ``@biota=93302`` is the pinpoint the treeviewer is focusing on,
 *   see {@link navigation/pinpoint#resolve_pinpoints} for more detail on the format.
 * * ``?cols=AT&..`` is the querystring *treestate*, see below
 * * ``#x123`` is fine-grained adjustment of where the focal node should be on-screen.
 *
 * The treestate querystring can contain any of the following parts, joined by ``&``:
 * * ``pop``: Trigger a UI popup, a string of the form "(tab)-(OTT)" e.g. ``pop=ol_417950``
 * * ``vis``: The tree visualisation style, e.g. ``vis=polytomy``
 * * ``init``: The manner in which to head to the initial node, see {@link controller/controller_anim#init_move_to}, e.g. ``init=pzoom``
 * * ``lang``: A 2-letter ISO 639-1 language code, e.g. ``lang=en``
 * * ``img``: Image source, 'best_verified', 'best_pd', or 'best_any', e.g. ``img=best_pd``
 * * ``anim``: How to navigate to search results, ``anim=jump`` or ``anim=flight``
 * * ``otthome``: The "home" pinpoint, i.e. where you go on clicking reset, e.g. ``otthome=@aves``
 * * ``ssaver``: Screensaver inactive duration in seconds, e.g. ``ssaver=60``
 * * ``highlight``: Highlight strings to apply to a tree, can be used multiple times. See {@link projection/highlight/highlight}, e.g. ``highlight=path:@aves&highlight=path:@mammalia``
 * * ``tour``: A tour URL to play, e.g. ``tour=/tour/data.html/superpowers``
 *
 * The following parameters are deprecated:
 * * ``initmark``: Equivalent to ``highlight=path:_ozid=(x)``
 *
 * @module navigation/state
 */

/**
 * Parse location into a state object. Location can be one of:
 * * A (window.)location or URL object
 * * A querystring beginning with ?
 * * A string parsable as URL
 * * A state object already
 * @return state object ready for setup_page_by_state()
 */
function parse_state(location) {
  if (typeof location === 'string' && location.startsWith('?')) {
    // If location is stringy and starts with ?, it's a query-string
    return parse_window_location({ search: location });
  }
  if (typeof location === 'string') {
    // Otherwise parse as URL before setting it up
    return parse_window_location(new URL(location));
  }
  if (typeof location !== 'object') {
    throw new Error("Cannot parse objects of type " + typeof location)
  }
  if ((global.Location && location instanceof Location) || location instanceof URL) {
    // Parse Location/URL objects
    return parse_window_location(location);
  }
  // All else fails, assume it's a state object already
  return location
}

/**
 * Parse a DOM location object and return a state object.
 */
function parse_window_location(location) {
  let state = {};
  if (location.pathname) state.url_base = parse_url_base(location);
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
    if (!pathname) return;
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
 */
function parse_querystring(state, querystring) {
  if (typeof querystring !== 'string') return;
  querystring = querystring.replace(/^\?/, '').split("&"); //knock off initial '?'
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
      // The location that "reset view" will head to
      state.home_ott_id = decodeURIComponent(querystring[i].substring(querystring[i].indexOf("=") + 1));
    } else if (/^ssaver=/.test(querystring[i])) {
      //if the user wants a specific language: not the one given by the browser
      let ssaver_inactive_duration_seconds = querystring[i].substring(querystring[i].indexOf("=") + 1);
      state.ssaver_inactive_duration_seconds = ssaver_inactive_duration_seconds;
    } else if (/^cols=/.test(querystring[i])) {
      // User wants a given colour scheme
      state.cols = querystring[i].substring(querystring[i].indexOf("=") + 1);
    } else if (/^initmark=/.test(querystring[i])) {
      // Decode initmark parameter for backward compatibility
      if (!state.highlights) state.highlights = [];
      state.highlights.push('path:@_ozid=' + decodeURIComponent(querystring[i].substring(querystring[i].indexOf("=") + 1)));
    } else if (/^highlight=/.test(querystring[i])) {
      // User wants a highlight marking
      if (!state.highlights) state.highlights = [];
      state.highlights.push(decodeURIComponent(querystring[i].substring(querystring[i].indexOf("=") + 1)));
      // Remove empty highlights, so we can use "?highlights=" to trigger clearing of highlights
      if (!state.highlights[state.highlights.length - 1]) state.highlights.pop();
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
  (state.highlights || []).forEach((x) => sp.append('highlight', x));
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

export { parse_state, deparse_state, parse_url_base };
