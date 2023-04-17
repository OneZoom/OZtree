/* add features to the OZ controller so that search can interact with the OZ vizualization */
import tree_state from '../tree_state';
import api_manager from '../api/api_manager'; //for pop species - can eventually be deleted
import {record_url} from '../navigation/record';
import { resolve_pinpoints } from '../navigation/pinpoint.js';
import {color_theme} from '../themes/color_theme';
import config from '../global_config';

export default function (Controller) {
      
  /**
   * Add marked area by OZid
   * @param OZid_to_mark is the OneZoom id of the node / leaf that should be marked
   * @param area_code is the code that we want to associate with this marked area, if 
   *    nothing is entered we identify the area with the ID as given by OZid_to_mark
   * @param mark_color should give the color to use for marking. If null the system will
   *    select a new color from the theme colour palette
   */
    Controller.prototype.mark_area = function(OZid_to_mark,area_code,mark_color) {
        if (! area_code)
        {
            area_code = parseInt(OZid_to_mark);
            // use the OneZoom id as the area_code if one has not been entered
        } else {
            if (typeof area_code !== 'number') throw new Error("area_code should be numeric");
        }

        // Remove any previous map and add a new one
        config.marked_area_color_map = config.marked_area_color_map.filter((m) => m.area_code !== area_code);
        config.marked_area_color_map.push({
          area_code: area_code,
          color: mark_color || color_theme.pick_marked_area_color(config.marked_area_color_map.map((x) => x.color), this.root),
          ozid: OZid_to_mark,
        });
        
        // Re-calc all nodes so changes are reflected
        this.dynamic_load_and_calc(this.root.ozid)
        this.trigger_refresh_loop();
        return(config.marked_area_color_map[config.marked_area_color_map.length - 1].color)
    }
    
    /**
     * Remove marked area by area codes
     * @param area_code is the code that we want to associate with this marked area (as given before to mark area function)
     */
    Controller.prototype.unmark_area = function(area_code) {
        if (typeof area_code !== 'number') throw new Error("area_code should be numeric");
        config.marked_area_color_map = config.marked_area_color_map.filter((m) => m.area_code !== area_code);

        // Re-calc all nodes so changes are reflected
        this.dynamic_load_and_calc(this.root.ozid)
        this.trigger_refresh_loop();
    }
    
    /**
     * Remove all marked areas
     */
    Controller.prototype.clear_all_marked_areas = function() {
        config.marked_area_color_map = [];

        // Re-calc all nodes so changes are reflected
        this.dynamic_load_and_calc(this.root.ozid)
        this.trigger_refresh_loop();
    }
    
    /**
     * Returns a list of all marked areas in the tree
     */
    Controller.prototype.list_all_marked = function() {
        return config.marked_area_color_map;
    }
    
    /**
     * A higher level function, which moves to the given location using
     * whatever move method is defined as the default (in config.search_jump_mode).
     * @param dest Where we want to go to
     * @param input_type How is (dest) defined? 'ozid', 'pinpoint', 'ancestor' (dest is a list of pinpoints) or 'ott'
     */
    Controller.prototype.default_move_to = function(dest, input_type) {
        var p;

        if (input_type === 'ozid') {
          p = Promise.resolve({ozid: dest});
        } else if (input_type === 'pinpoint' || input_type === 'ott') {
          p = resolve_pinpoints(dest);
        } else if (input_type === 'ancestor') {
          p = resolve_pinpoints(dest).then((pinpoints) => {
            // After resolving pinpoints, find the common ancestor and use that
            // NB: This returns a node, not a pinpoint object. But has an ozid property just the same
            return this.factory.dynamic_load_to_common_ancestor(pinpoints.map((x) => x.ozid));
          });
        } else {
          throw new Error("Unknown input_type: " + input_type)
        }

        if (config.search_jump_mode === 'flight') {
            return p.then((pp) => this.fly_on_tree_to(null, pp.ozid));
        } else {
            return p.then((pp) => this.leap_to(null, pp.ozid));
        }
    }

    /**
     * Move to the node identified by config.home_ott_id, or all life
     */
    Controller.prototype.return_to_otthome = function() {
        return resolve_pinpoints(config.home_ott_id).then((pp) => {
            return this.leap_to(pp.ozid);
        });
    }

} // end of controller exported
