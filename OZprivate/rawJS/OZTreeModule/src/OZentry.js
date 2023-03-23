/**  
 * @class OZentry */
import 'babel-polyfill';
import './libs/requestAnimationFrame';
import get_controller from './controller/controller';
import api_manager from './api/api_manager';
import search_manager from './api/search_manager';
import process_taxon_list from './api/process_taxon_list';
import { init as garbage_collection_start } from './factory/garbage_collection';
import { spec_num_full, number_convert, view_richness } from './factory/utils'
import { add_hook, call_hook } from './util/index';
import { setup_loading_page } from './navigation/setup_page';
import { get_largest_visible_node } from './navigation/utils';
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
 * @param {Object} server_urls - A named key:value dict of urls that the api manager etc needs to fire 
 *     off AJAX requests. See global_config.js for the list of necessary names
 * @param {Object} UI_functions A named key:value dict of UI functions that the OZ js might want to call
 * @param {Object} pagetitle_function - A function that takes a single string (could be null) and returns a title 
 *     to use in the &lt;title&gt; section of the page. E.g. <code>function(t) {return (t)?'OneZoom: '+t:'OneZoom Tree of Life Explorer'}</code>
 * @param {String} canvasID The DOM ID of the canvas element, used e.g. in getElementById(canvasID)
 * @param {Object} default_viz_settings - Specifications for the default colour, layout, tree shape, etc. 
 *  These can be specified as key:values to override the defaults, or given as an object of the correct sort.
 *  That means, for example, that there are 4 ways to change the colour scheme:
 *  1. Chose one of the default themes here, e.g. use default_viz_settings = {colours:'popularity'}
 *  2. Write your own "theme" object and save it as e.g. src/themes/my_theme.js (see instructions insrc/themes/index.js),
 *      then recompile OneZoom, and specify it here e.g. use default_viz_settings =  {colours:'my_theme'}
 *  3. Write your own "theme" object and pass it here e.g. use default_viz_settings = {colours:my_theme_object}
 *  4. Use an existing theme and modify it by passing additional parameters here, as described in tree_settings.set_default()
 *     e.g. use default_viz_settings = {cols:'natural', 'cols.branch.stroke':'rgb(190,0,0)'}
 * @param {string} condensed_newick - A 'condensed Newick' string, e.g. as defined in completetree_XXXXX.js 
 * (condensed Newick is a ladderized-ascending binary newick tree with all characters except braces removed, 
 * and curly braces substituted where a bifurcation only exists order to randomly resolve polytomies.
 * @param {Object} metadata - *** To document ...
 * @param {Object} dichotomy_cut_position_map_json_string - *** To document ...
 * @param {Object} polytomy_cut_position_map_json_string - *** To document ...
 * @param {Object} cut_thresholds - *** To document ... 
 * @param {Object} tree_dates - *** To document ...
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

  if (!document.body.classList.contains('tree-viewer')) {
      // Don't record tree changes on embedded uses
      config.disable_record_url = true;
  }

  let oz = { // the onezoom object that will be returned
    'utils': { // Some useful utility functions to expose
      'spec_num_full': spec_num_full,
      'number_convert': number_convert,
      'view_richness': view_richness,
      'process_taxon_list': process_taxon_list,
    }};

  if (canvasID) {
    tree_settings.set_default(default_viz_settings); // implements the config for that tree.
    api_manager.start();

    let controller = get_controller();
    controller.setup_canvas(document.getElementById(canvasID));
    controller.draw_loading();

    oz.controller = controller;
    oz.tree_settings = tree_settings;
    oz.tree_state = tree_state;
    oz.data_repo = data_repo;
    oz.utils.largest_visible_node = () => {
      let node = get_largest_visible_node(oz.controller.root)
      if (node.is_leaf) {
          return -node.metacode
      } else {
          return node.metacode
      }
    }
  } else {
    // Page with no canvas: no point having either a controller or a data_repo
    api_manager.start();
    oz.tree_settings = null;
    oz.controller = null;
    oz.tree_state = null;
    oz.data_repo = null;
  }

  oz.controller.public_oz = oz;  // Let the controller get at the public interface
  oz.config = config;
  oz.search_manager = search_manager;
  // TO DO - use data_repo passed in to the entry function, so we don't need to include it in the initial JS
  oz.search_manager.add_data_repo(oz.data_repo);
  oz.add_hook = add_hook;

  // use setTimeout so that loading screen is displayed before build tree starts.
  // TO DO - we should probably use promises here rather than rely on timeouts completing
  setTimeout(() => {
    if (oz.controller) {
        //start fetching metadata for the tree, using global variables that have been defined in files 
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
          metadata: metadata,
          cut_threshold: cut_thresholds || 10000,
          tree_date: tree_dates || "{}"
        }

        oz.controller.build_tree(data_obj)
        //Jump or fly to a place in the tree marked by the url when the page loads.
        setup_loading_page()
        oz.controller.find_proper_initial_threshold()
        //listen to user mouse, touch, icon click, window resize and user navigation events.
        oz.controller.bind_listener()
        //start garbage collection of tree to keep the size of the tree in memory reasonable
        call_hook("on_tree_loaded")
    }
    garbage_collection_start()
  }, 50);

  return oz;
}

/**
 * This function returns an object containing API helpers
 * User can use this object to call API helpers without creating a OneZoom instance.
 * 
 * @param {Object} server_urls - A named key:value dict of urls that the api manager etc needs to fire
 *     off AJAX requests. See global_config.js for the list of necessary names
 */
function api_utils_setup(server_urls) {
  api_manager.set_urls(server_urls)
  return {
    search_manager: search_manager,
    process_taxon_list: process_taxon_list
  }
}

export {setup as default, api_utils_setup};
