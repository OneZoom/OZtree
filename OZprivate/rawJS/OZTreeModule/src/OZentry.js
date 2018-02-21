/**  
 * @class OZentry */
import 'babel-polyfill';
import './libs/requestAnimationFrame';
import get_controller from './controller/controller';
import api_manager from './api/api_manager';
import search_manager from './api/search_manager';
import process_taxon_list from './api/process_taxon_list';
import {init as garbage_collection_start} from './factory/garbage_collection';
import {spec_num_full, number_convert, view_richness} from './factory/utils'
import {setup_loading_page} from './navigation/setup_page';
import config from './global_config';
import tree_state from './tree_state';
import data_repo from './factory/data_repo';
import tree_settings from './tree_settings';
/**
 * Creates the main object that is exported to the browser. 
 * @todo This should possibly be separated so that 
we have a small ECMAscript JS file that does not include all the canvas stuff (e.g. for use on the index.html
page, and another that can be used in conjunction with the first and which provides all the extra canvas 
functionality. At the moment, a single file is created, called OZentry.js
 * @function default
 * @memberof OZentry
 * @param {string} condensed_newick - A 'condensed Newick' string, e.g. as defined in completetree_XXXXX.js 
 * (condensed Newick is a ladderized-ascending binary newick tree with all characters except braces removed, 
 * and curly braces substituted where a bifurcation only exists order to randomly resolve polytomies.
 * @param {Object} metadata - A list of 
 * @param {Object} server_urls - A named key:value dict of urls that the api manager etc needs to fire 
 *     off AJAX requests. See global_config.js for the list of necessary names
 * @param {Object} UI_functions A named key:value dict of UI functions that the OZ js might want to call
 * @param {String} canvasID The DOM ID of the canvas element, used e.g. in getElementById(canvasID)
 * @param {Object} default_viz_settings - Specifications for the default colour, layout, tree shape, etc. 
 *  These can be specified as key:values to override the defaults, or given as an object of the correct sort.
 *  That means, for example, that there are 4 ways to change the colour scheme:
 *  1. Chose one of the default themes here, e.g. use default_viz_settings = {colours:'popularity'}
 *  2. Write your own "theme" object and save it as e.g. src/themes/my_theme.js (see instructions insrc/themes/index.js),
 *      then recompile OneZoom, and specify it here e.g. use default_viz_settings =  {colours:'my_theme'}
 *  3. Write your own "theme" object and pass it here e.g. use default_viz_settings = {colours:my_theme_object}
 *  4. Use an existing theme and modify it by passing additional parameters here, as described in tree_settings.set_default()
 *     e.g. use default_viz_settings = {colours:'natural', 'colours.branch.stroke':'rgb(190,0,0)'}
 * @param {Object} pagetitle_function - A function that takes a single string (could be null) and returns a title 
 *     to use in the &lt;title&gt; section of the page. E.g. <code>function(t) {return (t)?'OneZoom: '+t:'OneZoom Tree of Life Explorer'}</code>
 * @return {Object} a OneZoom object which exposes OneZoom objects and functions to the user. In particular, .data_repo contains a DataRepo object, and .controller contains a Controller object.
 */
function setup(
    server_urls, 
    UI_functions, 
    pagetitle_function,
    canvasID, 
    default_viz_settings, 
    condensed_newick, 
    metadata,
    dichotomy_cut_position_map_json_string, 
    polytomy_cut_position_map_json_string,
    cut_thresholds,
    tree_dates) {
  // Set the server-specific URLs for API calls
  api_manager.set_urls(server_urls);
  // Set the URL for images
  config.pic.data_path_pics = server_urls.data_path_pics;
  // Set the base prefix for the <title> attribute
  if (typeof pagetitle_function === 'function') config.title_func = pagetitle_function;
  // Set the UI functions that the OZ javascript can call
  for (let name in UI_functions) {
    if (UI_functions.hasOwnProperty(name) && config.ui.hasOwnProperty(name)) {
      config.ui[name] = UI_functions[name];
    }
  }
  
  let return_value = {};
  if (canvasID) {
    tree_settings.set_default(default_viz_settings); // implements the config for that tree.
  
    //start fetching metadata for the tree, using global variables that have been defined in files like 
    //10000 is cut threshold for cut_position_map_json_str
    //TODO: It shouldn't be hard coded.
    // the cut map file should eventually contain the information of what it's for. cut_map_json is a 
    // stringified json object which maps node position in rawData to its cut position of its children in rawData

    //10000 should be replaced with the threshold used to generate cut_position_map.js. If the string of a node in ]
    //rawData is shorter than cut_threshold, then there is no need to find its cut position and add it in cut_map_json.
    let cut_threshold = window.cut_threshold || 10000;
    let tree_date = window.tree_date || "{}";
    
    
    let data_obj = {
        raw_data: condensed_newick, 
        cut_map: JSON.parse(dichotomy_cut_position_map_json_string || "{}"),
        poly_cut_map: JSON.parse(polytomy_cut_position_map_json_string || "{}"), 
        metadata:metadata, 
        cut_threshold:cut_thresholds || 10000, 
        tree_date:tree_dates || "{}"
    }
    
    api_manager.start(); // this is called on both the if and the else branch. Would be neater to put it right at the top: would that break anything?
    
    let controller = get_controller();
    controller.setup_canvas(document.getElementById(canvasID));
    controller.draw_loading();
    
    //setTimeout so that draw loading would be displayed before build tree starts.
    setTimeout(function() {
      controller.build_tree(data_obj);
      //Jump or fly to a place in the tree marked by the url when the page loads.
      setup_loading_page();
      controller.find_proper_initial_threshold();
      controller.start_refresh_loop();
      
      //listen to user mouse, touch, icon click, window resize and user navigation events.
      controller.bind_listener();
      //start garbage collection of tree to keep the size of the tree in memory reasonable
      garbage_collection_start();
    }, 50);

    return_value.controller = controller;
    return_value.tree_settings = tree_settings;
    return_value.tree_state = tree_state;
    return_value.data_repo = data_repo;
  } else {
    //on a page with no canvas, there is no point having either a controller or a data_repo
    api_manager.start();
    return_value.tree_settings = null;
    return_value.controller = null;
    return_value.tree_state = null;
    return_value.data_repo = null;
  }
  
  return_value.config = config;
  return_value.search_manager = search_manager;
  // TO DO - use data_repo passed in to the entry function, so we don't need to include it in the initial JS
  return_value.search_manager.add_data_repo(return_value.data_repo);
  return_value.tours = {};
  //next function should be spun off into a tours.js module
  return_value.tours.page = function(tourname, next_stop_number, success_func) {
    let params = {
        data: {tourname:tourname, stopnum:next_stop_number},
        success: success_func,
        error: function(res) {
          reject();
        }
      };
    api_manager.tour_detail(params);
  }
  return_value.utils = {};
  return_value.utils.spec_num_full = spec_num_full;
  return_value.utils.number_convert = number_convert;
  return_value.utils.view_richness = view_richness;
  return_value.utils.process_taxon_list = process_taxon_list;

  return return_value;
}

export default setup;