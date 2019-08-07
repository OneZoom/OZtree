/* this document is the master controller of all the different tree views and which components of the code they use */


import { set_layout } from './projection/layout/layout_manager';
import { set_factory_midnode } from './factory/factory';
import { set_theme } from './themes/color_theme';
import { set_pre_calculator } from './projection/pre_calc/pre_calc';
import { set_horizon_calculator } from './projection/horizon_calc/horizon_calc';

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

import OtopNodeLayout from './projection/layout/otop/node_layout';
import OtopLeafLayout from './projection/layout/otop/leaf_layout';
import OtopSignpostLayout from './projection/layout/otop/signpost_layout';
import OtopBranchLayout from './projection/layout/otop/branch_layout';

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
import get_controller from './controller/controller';
import config from './global_config';

export let pic_src_order;

//get & set params using dot notation
const getPath = (object, path, defaultValue) => path
  .split('.')
  .reduce((o, p) => o ? o[p] : defaultValue, object)
const setPath = (object, path, value) => path
  .split('.')
  .reduce((o, p) => o[p] = path.split('.').pop() === p ? value : o[p] || {}, object)

//we should probably store lang in here too, as it can be changed
class TreeSettings {
  constructor() {
    this.options = {
      cols: Object.assign({}, ...Object.keys(themes).map(k => ({ [k]: themes[k] }))), //assign each theme to an object by name,
      layout: {
        branch: {
          tree: LifeBranchLayout,
          AT: ATBranchLayout,
          otop: OtopBranchLayout,
          polytomy: PolytomyBranchLayout
        },
        node: {
          tree: LifeNodeLayout,
          AT: ATNodeLayout,
          otop: OtopNodeLayout,
          polytomy: PolytomyNodeLayout
        },
        leaf: {
          tree: LifeLeafLayout,
          AT: ATLeafLayout,
          otop: OtopLeafLayout,
          polytomy: PolytomyLeafLayout
        },
        sign: {
          tree: LifeSignpostLayout,
          AT: ATSignpostLayout,
          otop: OtopSignpostLayout,
          polytomy: PolytomySignpostLayout
        }
      },
      // James note - there should be some kind of table which defines which kind of underlying data/ midnode structure use each view requires - this will be neater if we start building other polytomy views and views that incorporate branch lengths.
      midnode: {
        tree: LifeMidnode,
        AT: ATMidnode,
        polytomy: PolytomyMidnode
      },
      vis: {
        spiral: 'spiral',
        balanced: 'balanced',
        fern: 'fern',
        natural: 'natural',
        polytomy: 'polytomy'
      }
    }

    this.default = {
      cols: this.options.cols.natural,
      layout: {
        branch: this.options.layout.branch.tree,
        node: this.options.layout.node.tree,
        leaf: this.options.layout.leaf.tree,
        sign: this.options.layout.sign.tree
      },
      midnode: LifeMidnode,
      vis: this.options.vis.spiral,
    }
  }

  //private method used internally
  _overwrite_default(user_set, path) {
    //if path = 'branch.leaf', user_set could be e.g. {'branch.leaf':'tree'} or {branch:{leaf:'tree'}} or even an object, e.g. {'branch.leaf':{foo:'bar'}}
    let val = user_set[path] || getPath(user_set, path); //e.g. 'tree'
    if (val) {
      if (typeof val === 'string') {
        let o = getPath(this.options, path)
        if (o && o.hasOwnProperty(val)) {
          //string passed by user is a NAME from the options selection, e.g. {midnode:'AT'}
          setPath(this.default, path, o[val]);
        } else {
          //string passed by user does not correspond to a name => inject it directly, e.g. cols.branch.stroke':'rgb(0,100,100)'
          setPath(this.default, path, val);
        }
      } else {
        setPath(this.default, path, val); //assume the object specified in the user-passed in settings is fine
      }
    }
  }

  get vis() {
    for (let k of Object.keys(this.options.vis)) {
      if (this.options.vis[k] == this.current.vis) {
        return k;
      }
    }
    return undefined;
  }

  set vis(value) {
    set_pre_calculator(value);
    this.current.vis = value;
    if (is_binary_viewtype(value)) {
      set_horizon_calculator('bezier');
    } else {
      //polytomy
      set_horizon_calculator('polytomy');
    }
  }

  is_default_vis() {
    return this.current.vis === this.default.vis;
  }

  get cols() {
    for (let k of Object.keys(this.options.cols)) {
      if (this.options.cols[k] == this.current.cols) {
        return k;
      }
    }
    return undefined;
  }

  set cols(val) {
    if (typeof val === 'string') {
      if (this.options.cols.hasOwnProperty(val)) {
        if (this.current.cols !== this.options.cols[val]) {
          set_theme(this.current.cols = this.options.cols[val]);
        } else {
          //changing to the same theme as current - do nothing
        }
      } else {
        throw new Error("No such theme: " + val);
      }
    } else {
      set_theme(this.current.cols = val);
    }
  }

  is_default_cols() {
    return this.current.cols === this.default.cols;
  }

  /**
   * Set the default viewing parameters using a settings object, and set current viewing to the default.
   * There are 4 independent things to set - colours (cols), visual depiction of leaves, nodes etc (layout),
   * information content of nodes (midnode), and projection visualisation (vis). Note that switching between 
   * these after creating the OneZoom object (e.g. switching projections) should usually be done via the get and set methods 
   * since these can the URL used and also e.g. change the midnode data structure to support other views - such as polytomy view.
   * @function set_default
   * @param {Object} settings - An object containing some or all of the possible settings. 
   *  If some or all are missing, use the defaults specified in tree_settings.default. 
   *  Options are given in the tree_settings.options object, and can also be given by their name in that object
   *  An option containing a dot (e.g. colours.branch) will replace *part* of the pre-specified option, which allows
   *  e.g. some colours in a scheme to be replaced. (see examples)
   * @param {Object} settings.cols - An object that defines a set of colours to use: select from names or types available at
   * @param {Object} settings.layout - Contains 4 parts that describe the layout of the tree (branch, node, leaf, and sign)
   * @param {Object} settings.layout.branch -
   * @param {Object} settings.layout.node -
   * @param {Object} settings.layout.leaf -
   * @param {Object} settings.layout.sign -
   * @param {Object} settings.vis is the way in which branches (if any) leaves and nodes are placed on the canvas (but not the layout of each)
   * @param {Object} settings.midnode - A 'midnode' object that describes the data structure.  E.g. LifeMidnode, ATMidnode, or PolytomyMidnode
   * @example set_default({cols: tree_settings.options.cols.popularity})
   * @example set_default({cols: "popularity"})
   * @example set_default({cols:'AT', layout:{branch:'AT', node:'AT', leaf:'AT', sign:'AT'}, midnode:'AT'})
   * @example set_default({cols:'natural', 'cols.branch.stroke':'rgb(0,0,0)'}) #make branches black!
   **/
  set_default(settings) {
    if (settings) {
      this._overwrite_default(settings, 'cols');
      this._overwrite_default(settings, 'vis');
      this._overwrite_default(settings, 'midnode');
      this._overwrite_default(settings, 'layout');
      if (settings) {
        //make any subsequent changes to specific sub-settings e.g. to change specific colours
        for (let k of Object.keys(settings)) {
          if (k.indexOf('.') > -1) {
            this._overwrite_default(settings, k)
          }
        }
      }
    }
    this.current = Object.assign({}, this.default); //shallow copy
    this.cols = this.current.cols; //force theme to be loaded using getter
    set_layout(this.current.layout.branch, this.current.layout.node, this.current.layout.leaf, this.current.layout.sign);
    set_factory_midnode(this.current.midnode);
    this.vis = this.default.vis; //force vis to be set properly using getter
  }

  /**
   * If switch between binary and polytomy, then set factory root if the tree has been built before, or rebuild the tree if 
   * the tree has not been built before.
   * If the tree needs to be rebuilt, firstly draw loading on screen, then set timeout to refresh loading on screen.
   */
  rebuild_tree(curr, prev, controller) {
    return new Promise(function (resolve, reject) {
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
          setTimeout(function () {
            controller.rebuild_tree();
            controller.trigger_refresh_loop();
            resolve();
          }, 10);
        }
      } else if (is_binary_viewtype(curr) && prev === "polytomy") {
        set_layout(this.current.layout.branch, this.current.layout.node, this.current.layout.leaf, this.current.layout.sign);
        set_factory_midnode(this.current.midnode);
        controller.polytomy_tree = controller.factory.root;
        if (controller.binary_tree) {
          controller.factory.root = controller.binary_tree;
          resolve();
        } else {
          controller.stop_refresh_loop();
          controller.draw_loading();
          setTimeout(function () {
            controller.rebuild_tree();
            controller.trigger_refresh_loop();
            resolve();
          }, 10);
        }
      } else {
        resolve();
      }
    });
  }
  //this should be coded into tree_settings properly
  change_language(lang, controller, data_repo) {
    config.lang = lang;
    if (data_repo) {
      data_repo.clear_cached_vernaculars();
    }
    if (controller) {
      refetch_node_details(controller.root); //empty caches to replace language-specific info (e.g. vernacular names)
    }
  }
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
  for (let i = 0; i < node.children.length; i++) {
    refetch_node_details(node.children[i]);
  }
}


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

let tree_settings = new TreeSettings();
export default tree_settings;
