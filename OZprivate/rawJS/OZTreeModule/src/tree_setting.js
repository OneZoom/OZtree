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

import LifeNodeLayout from './projection/layout/life/node_layout';
import LifeLeafLayout from './projection/layout/life/leaf_layout';
import LifeSignpostLayout from './projection/layout/life/signpost_layout';
import LifeBranchLayout from './projection/layout/life/branch_layout';
import LifeMidnode from './factory/life_midnode';

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

import * as themes from './themes'
import {record_url} from './navigation/record';
import get_controller from './controller/controller';
import config from './global_config';

export let viewtype; //NB we should probably delete this and simply access the matching key in page_settings.current.projection, as we do for colours (see Controller.prototype.get_color_theme). We will have to work out how to store the previous values for the rebuild_tree stuff, though.
export let pic_src_order;
export let page_settings;

//get & set params using dot notation
const getPath = (object, path, defaultValue) => path
   .split('.')
   .reduce((o, p) => o ? o[p] : defaultValue, object)
const setPath = (object, path, value) => path
   .split('.')
   .reduce((o,p) => o[p] = path.split('.').pop() === p ? value : o[p] || {}, object)

page_settings = {
  options: {
    colours:  Object.assign({}, ...Object.keys(themes).map(k => ({[k]: themes[k]}))), //assign each theme to an object by name,
    layout:{
        branch:{tree:     LifeBranchLayout,
                AT:       ATBranchLayout,
                polytomy: PolytomyBranchLayout},
        node:  {tree:     LifeNodeLayout,
                AT:       ATNodeLayout,
                polytomy: PolytomyNodeLayout},
        leaf:  {tree:     LifeLeafLayout,
                AT:       ATLeafLayout,
                polytomy: PolytomyLeafLayout},
        sign:  {tree:     LifeSignpostLayout,
                AT:       ATSignpostLayout,
                polytomy: PolytomySignpostLayout}              
    },
    data_structure: {tree:     LifeMidnode,
                     AT:       ATMidnode,
                     polytomy: PolytomyMidnode},
    projection: {spiral:  'spiral',
                 balanced:'balanced',
                 fern:    'fern',
                 natural: 'natural',
                 polytomy:'polytomy'}
  },
  current: {},
  save_to_current: function(user_set, path) {
    //user_set could be e.g. {'branch.leaf':'tree'} or {branch:{leaf:'tree'}}
    let curr = user_set[path] || getPath(user_set, path);
    if (curr) {
        if (typeof curr === 'string') {
            //user has passed in the name in the options object, e.g. {projection:'spiral'}
            if (getPath(this.options, path).hasOwnProperty(curr)) {
                setPath(this.current, path, getPath(this.options, path)[curr])
            } else {
                throw new Error("Setting " + curr + " is not one of the options in page_settings.options." + path);
            }
        } else {
            //assume the object specified in the user-passed in settings is fine
        }
    } else {
        setPath(this.current, path, getPath(this.default, path));
    }
  }
}

page_settings.default = {
    colours: page_settings.options.colours.natural,
    layout: {
        branch: page_settings.options.layout.branch.tree,
        node:   page_settings.options.layout.node.tree,
        leaf:   page_settings.options.layout.leaf.tree,
        sign:   page_settings.options.layout.sign.tree
    },
    data_structure: LifeMidnode,
    projection: page_settings.options.projection.spiral
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
  if (typeof val === 'string') {
    if (page_settings.options.colours.hasOwnProperty(val)) {
        set_theme(page_settings.current.colours=page_settings.options.colours[val])
    }
  } else {
    set_theme(page_settings.current.colours=val);
  }
}

/**
 * Configure the viewing parameters using a settings object.
 * Note that there is a view switcher from within each page that can be called and which might change the data structure to support other views - such as polytomy view.
 * @function config_page
 * @param {Object} settings - An object containing some or all of the possible settings. 
 *  If some or all are missing, use the defaults specified in default_page_settings. 
 *  Options are given in the page_settings.options object, and can also be given by their name in that object
 *  An option containing a dot (e.g. colours.branch) will replace *part* of the pre-specified option, which allows
 *  e.g. some colours in a scheme to be replaced. (see examples)
 * @param {Object} settings.colours - An object that defines a set of colours to use: select from names or types available at
 * @param {Object} settings.layout - Contains 4 parts that describe the layout of the tree (branch, node, leaf, and sign)
 * @param {Object} settings.layout.branch -
 * @param {Object} settings.layout.node -
 * @param {Object} settings.layout.leaf -
 * @param {Object} settings.layout.sign -
 * @param {Object} settings.projection is the way in which branches (if any) leaves and nodes are placed on the canvas (but not the layout of each)
 * @param {Object} settings.data_structure - A 'midnode' object that describes the data structure.  E.g. LifeMidnode, ATMidnode, or PolytomyMidnode
 * @example config_page({colours: page_settings.options.colours.popularity})
 * @example config_page({colours: "popularity"})
 * @example config_page({colours:'AT', layout:{branch:'AT', node:'AT', leaf:'AT', sign:'AT'}, data_structure:'AT'})
 * @example config_page({colours:'natural', 'colours.branch.stroke':'rgb(0,0,0)'}) #make branches black!
 **/
export function config_page(settings) {

    page_settings.save_to_current(settings, 'colours');
    page_settings.save_to_current(settings, 'projection');
    page_settings.save_to_current(settings, 'data_structure');
    page_settings.save_to_current(settings, 'layout');
    if (settings) {
        //make any subsequent changes to specific sub-settings e.g. to change specific colours
        for (let k of Object.keys(settings)) {
            if (k.indexOf('.') > -1) {
                page_settings.save_to_current(settings, k)
            }
        }
    }
    change_color_theme(page_settings.current.colours);
    set_layout(page_settings.current.layout.branch, page_settings.current.layout.node, page_settings.current.layout.leaf, page_settings.current.layout.sign);
    set_factory_midnode(page_settings.current.data_structure);
    set_viewtype(page_settings.current.projection);
    if (page_settings.current.projection == 'polytomy')
    {
        set_horizon_calculator('polytomy');
    }
    else
    {
        set_horizon_calculator('bezier');
    }
}

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
      set_layout(page_settings.current.layout.branch, page_settings.current.layout.node, page_settings.current.layout.leaf, page_settings.current.layout.sign);
      set_factory_midnode(page_settings.current.data_structure);
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
