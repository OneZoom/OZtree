function parse_query(loc, search, hash) {
  let state = {};
  parse_location(state, loc);
  parse_querystring(state, search);
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

//Object, String
//This function parses the search string, then stores the result in state object.
//The query string could be null or undefined or empty. 
//Otherwise the query string must start with '?'. Besides, the string may contain the following parts, and these parts are joined by '&'.
//Example:  ?part1&part2&part3.
//Here are possible parts:
//  -- 'pop=' + Number(ott) 
//  -- 'vis_type' + (one of 'spiral', 'fern', 'natural', 'balanced')
//  -- 'init'     + (one of 'jump', 'zoom', 'pzoom') 
//  -- 'lang'     + (a language code, e.g. 'en', 'fr', etc.) 
function parse_querystring(state, search) {
  if (!search || search.length === 0) return;
  search = search.substring(1).split("&");
  for (let i=0; i<search.length; i++) {
    if (/^pop=/.test(search[i])) {
      let tap_params = search[i].substring(search[i].indexOf("=")+1).split("_");
      let tap_ott, tap_action;
      if (tap_params.length == 2) {        
        //new params. pop=ol_id
        tap_ott = tap_params[1];
        tap_action = decode_popup_action(tap_params[0]);  
      } else {
        //old params. pop=id
        tap_ott = tap_params[0];
        tap_action = "ow_leaf";
      }
      state.tap_action = tap_action;
      state.tap_ott = parseInt(tap_ott);      
    } else if (/^vis=/.test(search[i])) {
      let vis_type = search[i].substring(search[i].indexOf("=")+1);
      state.vis_type = vis_type;
    } else if (/^init=/.test(search[i])) {
      let init = search[i].substring(search[i].indexOf("=")+1);
      state.init = init;
    } else if (/^lang=/.test(search[i])) {
      //if the user wants a specific language: not the one given by the browser
      let lang = search[i].substring(search[i].indexOf("=")+1);
      state.lang = lang;
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
      for (let i=0; i<parts.length; i++) {
        if (parts[i].match(/x/)) {
          state.xp = parseInt(parts[i].substring(parts[i].indexOf("x")+1));
        } else if (parts[i].match(/y/)) {
          state.yp = parseInt(parts[i].substring(parts[i].indexOf("y")+1));
        } else if (parts[i].match(/w/)) {
          state.ws = parseFloat(parts[i].substring(parts[i].indexOf("w")+1));
        } 
      }    
    } else {
      state.latin_name = hash;
    }
  }
}

function encode_popup_action(popup_action) {
  if (popup_action =="ow_leaf") {
    return 'ol';
  } else if (popup_action =="ow_node") {
    return 'on';
  } else if (popup_action =="ow_sponsor_leaf") {
    return 'osl';
  } else if (popup_action =="ow_sponsor_node"){
    return 'osn'
  } else if (popup_action == "ow_iucn_leaf") {
    return 'oil';
  } else {
    console.err("popup action unknown type " + popup_action);
  }
}

function decode_popup_action(popup_action) {
  if (popup_action =="ol") {
    return 'ow_leaf';
  } else if (popup_action =="on") {
    return 'ow_node';
  } else if (popup_action =="osl") {
    return 'ow_sponsor_leaf';
  } else if (popup_action =="osn"){
    return 'ow_sponsor_node'
  } else if (popup_action == 'oil') {
    return 'ow_iucn_leaf';
  } else {
    console.err('popup action unknown type ' + popup_action);
  }
}

export {parse_query, encode_popup_action, decode_popup_action};