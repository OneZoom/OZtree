import Tour from './Tour'
import tree_state from '../tree_state';
import tree_settings from '../tree_settings';

class Screensaver extends Tour {
  /* A screensaver is identical to a Tour except that we autostart after a
   * user-determined amount of time (if null, this is taken from
   * 'ssaver_inactive_duration_seconds' which is derived from the ssaver URL parameter).
   * The "end_callback" parameter is replaced with "loop_back_forth", and the default
   * interaction mode is "exit". An additional final parameter specifies the time
   * after which the screen saver is autostarted
   */

  get inactive_duration() {
    if (this.autostart_after_ms == null) {
        return tree_settings.ssaver_inactive_duration_seconds
    } else {
        return this.autostart_after_ms * 1000
    }
  }

  /**
   * Create screensaver stops based on a settings object.
   * All arguments are optional, although if tour_setting is empty, the tour is treated
   * as inactive.
   * The primary parameters that structure the tour are in the settings_object, including
   * details of the stops, paths to html templates, etc.
   *
   * @param {String} tour_setting A string specifying where to fetch the tour document from
   *    or TextContent node containing a tour HTML string
   * @param {function} start_callback A function to run before the tour starts
   * @param {boolean} loop_back_forth we go 1->2->3->1->2->3 or 1->2->3->2->1->2->3
   * @param {function} exit_callback A function to run at if the tour is exited prematurely
   * @param {String} interaction what to do when the user interacts with the onezoom
   *    instance, e.g. by moving the mouse on screen.
   *    - "block": disable interaction
   *    - "exit": interaction causes tour exit (default)
   *    - "exit_after_confirmation": interaction causes tour exit, but user must confirm first
   *    - null: interaction permitted, tour pauses but can be resumed
   * @param {function} interaction_callback function to call when the user interacts with
   *    the onezoom instance, e.g. by moving the mouse on screen, e.g. to activate a resume 
   *    button if the tour is set to pause on interaction
   * @param {int} autostart_after_ms The number of milliseconds after which to activate.
   *    If undefined or null, use the 'ssaver' value from the URL
   */
  setup_setting(tour_setting, start_callback, loop_back_forth, exit_callback,
                interaction, interaction_callback, autostart_after_ms) {
    this.auto_activate_timer = null
    this.loop_back_forth = loop_back_forth
    this.autostart_after_ms = autostart_after_ms
    if (typeof(interaction) === "undefined") {
        // Default for a screensaver is to exit on interaction
        interaction = "exit"
    }
    super.setup_setting(tour_setting, start_callback, null, exit_callback,
                        interaction, interaction_callback, () => {this.set_auto_start()})
  }
  
  start() {
    //clear any residual timers before starting
    clearTimeout(this.auto_activate_timer)
    super.start()
  }
  
  clear() {
    clearTimeout(this.auto_activate_timer)
    super.clear()
  }
  
  exit() {
    clearTimeout(this.auto_activate_timer)
    super.exit()
    // automatically start screensaver timing again after exit
    this.set_auto_start()
  }
  
  /**
   * Activate next stop but never exit
   */
  goto_next() {
    if (!this.started) {
      return
    }
    this.curr_stop().exit()
    if (this.curr_step === this.tourstop_array.length - 1) {
      // end of tour: loop
      if (this.loop_back_forth) {
          this.curr_step = -(this.tourstop_array.length - 1)
      } else {
          this.curr_step = -1
      }
    }
    this.curr_step++
    this.curr_stop().play_from_start('forward')
  }

  /**
   * Automatically start tour if auto_activate_after is a number.
   * Start after 'auto_activate_after' length of inactivity
   */
  set_auto_start() {
    if (this.tourstop_array.length === 0 || (this.inactive_duration === null)) {
        return
    }
    if (this.inactive_duration == 0) {
        this.start()
        return
    }
    const get_inactive_duration = () => {
      const now = new Date()
      const last_active_at = tree_state.last_active_at
      const last_render_at = tree_state.last_render_at

      const duration_after_last_render = now - last_render_at
      const duration_after_last_activate = now - last_active_at

      //either mouse movement or render would be considered as activate the tree.
      return Math.min(duration_after_last_activate, duration_after_last_render)
    }

    if (typeof this.inactive_duration === "number") {
      const auto_activate_after = parseInt(this.inactive_duration)

      if (isNaN(auto_activate_after) || auto_activate_after === 0) {
        return
      }
      /**
       * Time left before start the tour
       * If condition test failed, then reset wait time to full length.
       */

      /**
       * If the app is inactive for a long period, wait for would be less than 0
       * To prevent setTimeout being activated frequently, 
       * set a minimum waiting time to be 3 seconds when wait_for is less than 0
       */
      let wait_for = auto_activate_after - get_inactive_duration()
      wait_for = wait_for < 0 ? 3000 : wait_for

      console.log("Wait for = " + wait_for + " (" + auto_activate_after + " - " + get_inactive_duration() + ")")
      this.auto_activate_timer = setTimeout(() => {
        if (get_inactive_duration() >= auto_activate_after && !this.started) {
          /**
           * If the tree is inactive for at least 'auto_activate_after' ms, then start the tour
           */
          this.start()
        } else {
          /**
           * Otherwise, reset auto start
           */
          this.set_auto_start()
        }
      }, wait_for)
    }
  }
}

export default Screensaver
