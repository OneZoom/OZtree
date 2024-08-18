/**
 * @file Controller functions to update page state on navigation / UI changes
 */
import config from '../global_config';
import data_repo from '../factory/data_repo';
import { record_url } from '../navigation/record';
import { parse_state } from '../navigation/state';
import { get_largest_visible_node } from '../navigation/utils';
import { setup_page_by_state } from '../navigation/setup_page';
import tree_settings from '../tree_settings';
import tree_state from '../tree_state';

export default function (Controller) {
  /**
   * Return the current largest visible node, that optionally meets condition
   *
   * Debug helper: You can set a watch in the javascript console:
   *   n = onezoom.controller.largest_visible_node() ; n.cname + " - " + n.latin_name
   *
   * @param {function} Function returning true iff a node should be considered, e.g. "(node) => node.ott" for only nodes with an OTT
   * @return A midnode object, if available.
   */
  Controller.prototype.largest_visible_node = function (condition=null) {
    if (!this.root) return null;  // Trying to record_url() before the tree is setup

    return get_largest_visible_node(this.root, tree_state.widthres, tree_state.heightres, condition);
  }

  /**
   * Configure the treeviewer based on either:
   * * The current page URL (by default)
   * * A Location/URL object
   * * A URL string
   * * A URL relative to current page (starting with @)
   * * A querystring (starting with '?')
   * * A state object as accepted by setup_page_by_state()
   * @return Promise for when work is finished
   */
  Controller.prototype.set_treestate = function (location) {
    return setup_page_by_state(this, parse_state(location || window.location));
  }

  /**
   * Set the language used in the tree display. This should also change the 
   * language for results requested through the API.
   * @method set_language
   * @memberof Controller
   * @param {string} lang - the 2-letter ISO 639-1 language code (e.g. 'en', 'fr') 
   *   or the 2-letter code with a region appended (e.g. 'en-GB')
   */
  Controller.prototype.set_language = function (lang, init = false) {
    if (!lang) lang = '';
    if (lang !== config.lang) {
      try {
        tree_settings.change_language(lang, this, data_repo);
      } finally {
        if (!init) {
          record_url(this, {
            replaceURL: true
          }, true);
        }
      }
    }
  }
  /**
   * Get the language code used in the tree display or API.
   * @method get_language
   * @memberof Controller
   */
  Controller.prototype.get_language = function () {
    return (config.lang);
  }

  /**
   * Change the view type from the current setting to a new one.
   * @method change_view_type
   * @param {String} - One of the keys listed in tree_settings.options.vis
   * @memberof Controller
   */
  Controller.prototype.change_view_type = function (vis, init = false) {
    // If nothing to do, return now
    if (!init && (!vis || vis === tree_settings.vis)) {
      return Promise.resolve();
    }

    if (!vis) vis = tree_settings.default.vis;

    // Change tree-state, noting previous
    let prev = tree_settings.vis
    tree_settings.vis = vis;

    // On init, just build the tree, the rest of setup_page_by_state will set location
    if (init) {
        return tree_settings.rebuild_tree(vis, prev, this);
    }

    // Get pre-rebuild state, so we can restore the rough position by ID
    // Get largest node, use this to restore position
    let n = this.largest_visible_node();

    return tree_settings.rebuild_tree(vis, prev, this).then(() => {
      return this.init_move_to(n.ozid, "leap");
    });
  }
  Controller.prototype.get_view_type = function () {
    return (tree_settings.vis);
  }

  /**
   * Change the colour theme
   * @method change_color_theme
   * @param {String} - One of the theme names listed as keys in tree_settings.options.cols
   * @memberof Controller
   */
  Controller.prototype.change_color_theme = function (color_theme, init = false) {
      tree_settings.cols = color_theme || tree_settings.default.cols;
      if (!init) {
          record_url(this, { replaceURL: true }, true);
          this.trigger_refresh_loop();
      }
  }
  /**
   * Get the name of the current colour theme (one of the property name in tree_settings.options.cols)
   * or undefined if the current theme does not match any of those (i.e. is a bespoke theme)
   * @method get_color_theme
   * @memberof Controller
   */
  Controller.prototype.get_color_theme = function () {
      return (tree_settings.cols);
  }

  Controller.prototype.set_image_source = function (image_source, init = false) {
    function clear_node_pics(node) {
      node.clear_pics();
      for (let i = 0; i < node.children.length; i++) {
        clear_node_pics(node.children[i]);
      }
    }

    // NB: Hard code default from data_repo, since after first call it's lost.
    if (!image_source) image_source = "best_any";
    if (data_repo.image_source !== image_source) {
      data_repo.image_source = image_source;
      if (this.root) clear_node_pics(this.root);
      this.trigger_refresh_loop()
      if (!init) {
        record_url(this, {
          replaceURL: true
        }, true)
      }
    }
  }
  Controller.prototype.get_image_source = function () {
    return (data_repo.image_source)
  }

  Controller.prototype.set_search_jump_mode = function (search_jump_mode, init = false) {
    // NB: Hard code default from config, since after first call it's lost.
    if (!search_jump_mode) search_jump_mode = "flight";
    if (config.search_jump_mode !== search_jump_mode) {
      config.search_jump_mode = search_jump_mode;
      if (!init) {
        record_url(this, {
          replaceURL: true
        }, true)
      }
    }
  }
  Controller.prototype.get_search_jump_mode = function () {
    return config.search_jump_mode || 'flight'
  }
}
