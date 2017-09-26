/* this document is the master controller of all the different tree views and which components of the code they use */


import {set_layout} from './projection/layout/layout_manager';
import {set_factory_midnode} from './factory/factory';
import {set_theme} from './themes/color_theme';
import {set_pre_calculator} from './projection/pre_calc/pre_calc';
import {set_horizon_calculator} from './projection/horizon_calc/horizon_calc';

import ATNodeLayout from './projection/layout/AT/node_layout';
import ATLeafLayout from './projection/layout/AT/leaf_layout';
import ATSignpostLayout from './projection/layout/AT/signpost_layout';
import ATBranchLayout from './projection/layout/AT/branch_layout'; 
import ATMidnode from './factory/at_midnode';
import at_theme from './themes/at_theme';

import LifeNodeLayout from './projection/layout/life/node_layout';
import LifeLeafLayout from './projection/layout/life/leaf_layout';
import LifeSignpostLayout from './projection/layout/life/signpost_layout';
import LifeBranchLayout from './projection/layout/life/branch_layout';
import LifeMidnode from './factory/life_midnode';
import life_theme from './themes/life_theme';

import PolytomyNodeLayout from './projection/layout/polytomy/node_layout';
import PolytomyLeafLayout from './projection/layout/polytomy/leaf_layout';
import PolytomySignpostLayout from './projection/layout/polytomy/signpost_layout';
import PolytomyBranchLayout from './projection/layout/polytomy/branch_layout'; 
import PolytomyMidnode from './factory/polytomy_midnode';

// creating a second different kind of polytomy view
import Polytomy2NodeLayout from './projection/layout/polytomy2/node_layout';
import Polytomy2LeafLayout from './projection/layout/polytomy2/leaf_layout';
import Polytomy2SignpostLayout from './projection/layout/polytomy2/signpost_layout';
import Polytomy2BranchLayout from './projection/layout/polytomy2/branch_layout';

import {record_url} from './navigation/record';
import get_controller from './controller/controller';
import popularity_theme from './themes/popularity_theme';
import config from './global_config';

export let viewtype;
export let color_theme;
export let pic_src_order;
export let page_settings;

// we might later want default colour for one projection to be different from default colour for another projection and so on.  The same is true for data_structure
let default_page_settings = {
    colours: 'natural',
    layout: {
        branch: LifeBranchLayout,
        node: LifeNodeLayout,
        leaf: LifeLeafLayout,
        sign: LifeSignpostLayout
    },
    projection: 'spiral',
    data_structure: LifeMidnode
}

export function change_language(lang, controller, data_repo) {
    config.lang=lang;
    if (data_repo) {
        data_repo.clear_cached_vernaculars();
    }
    if (controller) {
        refetch_node_details(controller.root); //empty caches to replace language-specific info (e.g. vernacular names)
    }
    record_url();
}

export function change_color_theme(val) {
  color_theme = val;
  if (color_theme == 'natural') {
    set_theme(life_theme);
  } else if (color_theme == 'at') {
    set_theme(at_theme);
  } else if (color_theme == 'popularity') {
    set_theme(popularity_theme);
  }
}

// settings is a JSON input for page configuration
// settings.colours is a string that defines the colour theme e.g. 'at' or 'natural'
// settings.layout contains 4 parts that describe the layout of the tree (branch, node, leaf, and sign)
// settings.projection is the way in which branches (if any) leaves and nodes are placed on the canvas (but not the layout of each)
// settings.data_structure shoud be a 'midnode' object that describes the data structure.  E.g. LifeMidnode, ATMidnode, or PolytomyMidnode
// note that there is a view switcher from within each page that can be called and which might change the data structure to support other views - such as polytomy view.
export function config_page(settings) {
    // keep a copy of the settings object
    page_settings = settings;
    if (!page_settings) {page_settings = default_page_settings};
    if (!page_settings.colours) {page_settings.colours = default_page_settings.colours};
    if (!page_settings.projection) {page_settings.projection = default_page_settings.projection};
    if (!page_settings.data_structure) {page_settings.datas_tructure = default_page_settings.data_structure};
    if (!page_settings.layout) {page_settings.layout = default_page_settings.layout};
    if (!page_settings.layout.branch) {page_settings.layout.branch = default_page_settings.layout.branch};
    if (!page_settings.layout.node) {page_settings.layout.node = default_page_settings.layout.node};
    if (!page_settings.layout.leaf) {page_settings.layout.leaf = default_page_settings.layout.leaf};
    if (!page_settings.layout.sign) {page_settings.layout.sign = default_page_settings.layout.sign};
    get_controller().set_color_theme(page_settings.colours);
    set_layout(page_settings.layout.branch, page_settings.layout.node, page_settings.layout.leaf, page_settings.layout.sign);
    set_factory_midnode(page_settings.data_structure);
    set_viewtype(page_settings.projection);
    if (page_settings.projection == 'polytomy')
    {
        set_horizon_calculator('polytomy');
    }
    else
    {
        set_horizon_calculator('bezier');
    }
}

//export function config_at_page() {
  //page_origin = "AT";
  //get_controller().set_color_theme('at');
  //set_layout(ATBranchLayout, ATNodeLayout, ATLeafLayout, ATSignpostLayout);
  //set_factory_midnode(ATMidnode);
  //set_viewtype('spiral');
  //set_horizon_calculator('bezier');
//}

//export function config_life_page() {
  //page_origin = "life";
  //get_controller().set_color_theme('natural');
  //set_layout(LifeBranchLayout, LifeNodeLayout, LifeLeafLayout, LifeSignpostLayout);
  //set_factory_midnode(LifeMidnode);
  //set_viewtype('spiral');
  //set_horizon_calculator('bezier');
//}

// this is only called from within polytomy.js
//export function config_polytomy_page() {
  //page_origin = "life";
  //get_controller().set_color_theme('natural');
  //set_layout(PolytomyBranchLayout, PolytomyNodeLayout, PolytomyLeafLayout, PolytomySignpostLayout);
  //set_factory_midnode(PolytomyMidnode);
  //set_viewtype('polytomy');
  //set_horizon_calculator('polytomy');
//}

function set_viewtype(value) {
  viewtype = value;
  set_pre_calculator(value);  
}

export function change_view_type(curr, controller) {
  let prev = viewtype;
  set_viewtype(curr);
  if (curr === "polytomy") {
    set_horizon_calculator('polytomy');
  } else if (is_binary_viewtype(curr)) {
    set_horizon_calculator('bezier');
  }
  rebuild_tree(curr, prev, controller).then(function() {    
    controller.update_form();
    controller.reset();
    record_url();
  });
}

// James note - there should be some kind of table which defines which kind of underlying data use each view requires - this will be neater if we start building other polytomy views and views that incorporate branch lengths.

/**
 * If switch between binary and polytomy, then set factory root if the tree has been built before, or rebuild the tree if 
 * the tree has not been built before.
 * If the tree needs to be rebuilt, firstly draw loading on screen, then set timeout to refresh loading on screen.
 */
function rebuild_tree(curr, prev, controller) {
  return new Promise(function(resolve, reject) {
    if (curr === "polytomy" && is_binary_viewtype(prev)) {
      set_layout(PolytomyBranchLayout, PolytomyNodeLayout, PolytomyLeafLayout, PolytomySignpostLayout);
      set_factory_midnode(PolytomyMidnode);
      controller.binary_tree = controller.factory.root;
      if (controller.polytomy_tree) {
        controller.factory.root = controller.polytomy_tree;
        resolve();    
      } else {
        controller.stop_refresh_loop();
        controller.draw_loading();
        setTimeout(function() {
          controller.rebuild_tree();
          controller.start_refresh_loop();
          resolve();
        }, 10);
      }
    } else if (is_binary_viewtype(curr) && prev === "polytomy") {
      set_layout(page_settings.layout.branch, page_settings.layout.node, page_settings.layout.leaf, page_settings.layout.sign);
      set_factory_midnode(page_settings.data_structure);
      controller.polytomy_tree = controller.factory.root;
      if (controller.binary_tree) {
        controller.factory.root = controller.binary_tree;
        resolve();
      } else {
        controller.stop_refresh_loop();
        controller.draw_loading();
        setTimeout(function() {
          controller.rebuild_tree();
          controller.start_refresh_loop();
          resolve();
        }, 10);
      }
    } else {
      resolve();
    }
  });
}

function is_binary_viewtype(value) {
  return value === "spiral" || value === "balanced" || value === "fern" || value === "natural";
}

function refetch_node_details(node) {
  /**
   recurse through the tree and set details_fetched to false, and wipe the vernacular name store
   */
  node.detail_fetched = false;
  node._cname = null;         //delete the cached vernacular
  node._spec_num_full = null; //delete the cached "xxx,xxx species"
  for (let i=0; i<node.children.length; i++) {
    refetch_node_details(node.children[i]);
  }
}


// function set_at_midnode


/**
 * 1. Set AT.html, life.html(color theme, layout, midnode, precalc, horizon calc)
 * 2. Change viewtype 
 *    Change viewtype between spiral, fern, natural, balanced and polytomy viewtypes.
 *    Must be changed: precalc, horizon calc(may stay same if two viewtype share same horizon calc)
 *    callback: update_form, reset
 *
 *    May be changed: midnode, layout(midnode and layout might be changed if change from life <-> polytomy)
 *    callback: midnode being changed, hence re build the tree is needed.
 * 3. Change color theme:
 *    Change color theme don't need to re precalc or re build the tree. Just set color in color theme.
 * 4. No other setting types.
 */
