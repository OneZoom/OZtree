/**
 * @file contains controller functions which can be used to manipulate the canvas
 */
import tree_state from '../tree_state';
import config from '../global_config';
import * as tree_setting from '../tree_setting';
import data_repo from '../factory/data_repo';
/**
 * @class Controller
 */
export default function (Controller) {

  /**
   * Zoom in on the canvas, centered on the middle of the canvas.
   * @method button_zoom_in
   * @memberof Controller
   * @param {number} [zoom_sensitivity=config.anim.zoom_sensitivity] - how much to zoom in
   */
  Controller.prototype.button_zoom_in = function(zoom_sensitivity = config.anim.zoom_sensitivity) {
    this.zoomin_anim(tree_state.widthres/2, tree_state.heightres/2, zoom_sensitivity, 4);
  }
  
  /**
   * Zoom out on the canvas, centered on the middle of the canvas. 
   * @method button_zoom_out
   * @memberof Controller
   * @param {number} [zoom_sensitivity=config.anim.zoom_sensitivity] - how much to zoom out
   */  
  Controller.prototype.button_zoom_out = function(zoom_sensitivity = config.anim.zoom_sensitivity) {
    this.zoomout_anim(tree_state.widthres/2, tree_state.heightres/2, zoom_sensitivity, 4)
  }
  
  /**
   * Reset the canvas to the most zoomed-out view possible. 
   * @method button_reset
   * @memberof Controller
   */  
  Controller.prototype.button_reset = function() {
    this.reset();
  }
  
  /**
   * Fly 1 ancestor back on the tree. If the position in space is already such that going to the last ancestor doesn’t actually require any kind of move at all, then go up one node higher again so that some kind of move at least is observed by the user.
   * @method button_zoom_up
   * @memberof Controller
   */
  Controller.prototype.button_zoom_up = function() {
    let uploc_vect = get_location2(this.root);
    if (uploc_vect && uploc_vect.length > 0) {
      while (uploc_vect.length > 0) {
        if (!this.perform_flight_animation(uploc_vect[uploc_vect.length-1])) {
          // false is returned by the flight => it didn’t need to move anywhere to get to the destination
          uploc_vect.length -= 1;
        } else {
          break;
        }  
      }
    } else {
      this.perform_flight_animation(this.root.metacode);
    }
  }
  
  /**
   * Set the language used in the tree display. This should also change the 
   * language for results requested through the API.
   * @method set_language
   * @memberof Controller
   * @param {string} lang - the 2-letter ISO 639-1 language code (e.g. 'en', 'fr') 
   *   or the 2-letter code with a region appended (e.g. 'en-GB')
   */
  Controller.prototype.set_language = function(lang) {
    if (lang !== config.lang) {
      tree_setting.change_language(lang, this, data_repo);
    }
  }
  /**
   * Get the language code used in the tree display or API.
   * @method get_language
   * @memberof Controller
   */
  Controller.prototype.get_language = function() {
    return(config.lang);
  }


  Controller.prototype.set_view_type = function(viewtype) {
    if (viewtype !== tree_setting.viewtype) {
      tree_setting.change_view_type(viewtype, this);
    }
  }
  Controller.prototype.get_view_type = function() {
    return(tree_setting.viewtype);
  }
  
  Controller.prototype.set_color_theme = function(color_theme) {
    if (color_theme !== tree_setting.color_theme) {
      tree_setting.change_color_theme(color_theme, this);
    }
  }
  Controller.prototype.get_color_theme = function() {
    return(tree_setting.color_theme);
  }
  
  Controller.prototype.set_image_source = function(image_source) {
    if (data_repo.image_source !== image_source) {
      data_repo.image_source = image_source;
      clear_node_pics(this.root);
    }    
  }
  Controller.prototype.get_image_source = function() {
    return(data_repo.image_source)
  }
  
  Controller.prototype.close_all = function() {
    if (typeof config.ui.closeAll !== 'function') {
      //we should have defined it!
      alert("Developer error: you need to define a UI function called closeAll which close all popups etc");
    } else {
      config.ui.closeAll();
    }
  }
}

/**
 * @private
 * location2 collects all nodes on the main branch until the node who has more than one children visible.
 */
function get_location2(node) { 
  if (node.gvar && node.has_child) return [node.metacode];
  if (node.dvar && node.has_child) {
    return [node.metacode].concat(get_child_loc(node));
  }
  return [];
}

/**
 * @private
 * Firstly get_location2 of all children. Then if more than 1 child or no child contains location2, return empty array. If only one child has location2, return its location2.
 * NB: It's not clear whether this function is used anywhere, and confusingly there 
 * is an identically named get_child_loc function in controller_loc.js
 */
function get_child_loc(node) {
  let childlocs = [];
  
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    let child = node.children[i];
    let child_loc = get_location2(child);
    if (child_loc.length > 0) {
      childlocs.push(child_loc);
    }
  }
  
  if (childlocs.length === 0 || childlocs.length > 1) {
    return [];
  } else {
    return childlocs[0];
  }
}

function clear_node_pics(node) {
  node.clear_pics();
  for (let i=0; i<node.children.length; i++) {
    clear_node_pics(node.children[i]);
  }
}