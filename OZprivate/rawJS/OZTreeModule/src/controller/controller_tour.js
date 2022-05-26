import config from '../global_config';
import tree_settings from '../tree_settings';
import Tour from '../tour/Tour'
import Screensaver from '../tour/Screensaver'

/** @class Controller */
export default function (Controller) {

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
          },
          null,
          () => {  // On shutdown, restart any screensaver
              if (this._screensaver) this._screensaver.set_auto_start()
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
