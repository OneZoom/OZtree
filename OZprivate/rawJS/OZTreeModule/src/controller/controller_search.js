/* add features to the OZ controller so that search can interact with the OZ vizualization */
import tree_state from '../tree_state';
import api_manager from '../api/api_manager'; //for pop species - can eventually be deleted
import {record_url} from '../navigation/record';
import { resolve_pinpoints } from '../navigation/pinpoint.js';
import config from '../global_config';

export default function (Controller) {
      
    /**
     * A higher level function, which moves to the given location using
     * whatever move method is defined as the default (in config.search_jump_mode).
     * @param dest Where we want to go to
     * @param input_type How is (dest) defined? 'pinpoint' or 'ancestor' (dest is a list of pinpoints). Defaults to 'pinpoint'
     */
    Controller.prototype.default_move_to = function(dest, input_type) {
        var p;

        if (input_type === 'ancestor') {
          p = resolve_pinpoints(dest).then((pinpoints) => {
            // After resolving pinpoints, find the common ancestor and use that
            // NB: This returns a node, not a pinpoint object. But has an ozid property just the same
            return this.factory.dynamic_load_to_common_ancestor(pinpoints.map((x) => x.ozid));
          });
        } else {
          p = resolve_pinpoints(dest);
        }

        if (config.search_jump_mode.startsWith('flight')) {
            // "anim=flight-0.5" means half-speed flights
            let flight_speed = parseFloat(config.search_jump_mode.split('-')[1]) || 1
            return p.then((pp) => this.fly_on_tree_to(null, pp.ozid, false, flight_speed));
        } else if (config.search_jump_mode.startsWith('straight')) {
            // "anim=straight-0.5" means half-speed flights
            let flight_speed = parseFloat(config.search_jump_mode.split('-')[1]) || 1
            return p.then((pp) => this.fly_straight_to(pp.ozid, false, flight_speed, 'linear'));
        } else {
            return p.then((pp) => this.fetch_details_and_leap_to(pp.ozid));
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
