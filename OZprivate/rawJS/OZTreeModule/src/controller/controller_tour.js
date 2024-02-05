import config from '../global_config';
import tree_settings from '../tree_settings';
import {record_url, record_url_delayed} from '../navigation/record';
import Tour from '../tour/Tour'
import Screensaver from '../tour/Screensaver'

/** @class Controller */
export default function (Controller) {
  Controller.prototype.tours_nearby = function (cutoff=1) {
    var out = {};

    // Walk node tree finding visible nodes, run fn(node)
    function foreach_visible_node(fn, node) {
      if (node.rvar < cutoff) return [];

      const local_out = node.gvar ? fn(node) : undefined;
      return [].concat.apply(
          (local_out === undefined ? [] : [local_out]),
          (node.dvar ? node.children : []).map(foreach_visible_node.bind(null, fn)) );
    }

    // Get an array of {rvar, tours} for each visible node with tours
    const node_tours = foreach_visible_node(
        (n) => n.tours.length > 0 ? {rvar: n.rvar, tours: n.tours} : undefined,
        this.root,
        cutoff,
    );

    // Convert to dict of tour => maximum rvar
    node_tours.forEach((nt) => nt.tours.forEach((t) => {
      if (!out[t] || out[t] < nt.rvar) out[t] = nt.rvar
    }));

    // Convert back into an array, sorted by rvar
    out = Object.entries(out).sort((a, b) => a[1] - b[1]);

    // Return just tours
    return out.map((x) => x[0]);
  }

  /** Return the tour_setting for the currently active tour setting, or null */
  Controller.prototype.tour_active_setting = function () {
    return this._tour ? this._tour.get_active_setting() : null
  }

  Controller.prototype.tour_start = function (tour_setting) {
    if (!this._tour || this._tour.tour_setting !== tour_setting) {
      if (this._tour) {
        this._tour.remove()
      }
      this._tour = new Tour(this.public_oz)
      this._tour.setup_setting(
          tour_setting,
          () => {  // On startup, stop screensaver and close pop-ups
              if (this._screensaver) this._screensaver.clear()
              config.ui.closeAll()
              record_url_delayed(this, { replaceURL: true }, true)
          },
          null,
          () => {  // On shutdown, restart any screensaver
              if (this._screensaver) this._screensaver.set_auto_start()
              record_url(this, { replaceURL: true }, true)
          },
      )
    }
    this._tour.start()
  }

  Controller.prototype.set_screensaver = function (tour_setting, timeout, interaction) {
    if (this._screensaver) {
      this._screensaver.remove()
    }
    this._screensaver = new Screensaver(this.public_oz)
    this._screensaver.setup_setting(
        tour_setting,
        config.ui.closeAll,
        true, // loop back and forth
        null, // nothing on exit
        interaction,
        null,
        (typeof timeout === 'number' ? timeout : tree_settings.ssaver_inactive_duration_seconds),
    )
  }
}
