import Tour from './Tour'
import tree_state from '../tree_state';

class Screensaver extends Tour {
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
   * @param {int} autostart_after_seconds The number of seconds after which to activate.
   *    If undefined or null, don't configure a screensaver
   */
  setup_setting(tour_setting, start_callback, loop_back_forth, exit_callback,
                interaction, interaction_callback, autostart_after_seconds) {
    this.is_screensaver = true;
    this.auto_activate_timer = null
    this.loop_back_forth = loop_back_forth
    this.autostart_after_seconds = autostart_after_seconds
    if (typeof this.autostart_after_seconds !== 'number') return;
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
    return super.start()
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
   * Go around all tourstops in a loop, never exit
   */
  next_tourstop() {
    if (this.curr_step === this.tourstop_array.length - 1) {
      // For loop_back_forth, set curr_step negative so "+ 1" goes backwards
      return this.loop_back_forth ? -(this.tourstop_array.length - 2) : 0;
    }
    return this.curr_step + 1;
  }

  /**
   * Automatically start tour if auto_activate_after is a number.
   * Start after 'auto_activate_after' length of inactivity
   */
  set_auto_start() {
    const get_tree_inactive_duration = () => {
      const now = new Date()
      const last_active_at = tree_state.last_active_at
      const last_render_at = tree_state.last_render_at

      const duration_after_last_render = now - last_render_at
      const duration_after_last_activate = now - last_active_at

      //either mouse movement or render would be considered as activate the tree.
      return Math.min(duration_after_last_activate, duration_after_last_render)
    }

    if (this.tourstop_array.length === 0) {
        return
    }
    const auto_activate_after_ms = this.autostart_after_seconds * 1000;
    
    if (auto_activate_after_ms === 0) {
        this.start()
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
    let wait_for = auto_activate_after_ms - get_tree_inactive_duration()
    wait_for = wait_for < 0 ? 3000 : wait_for

    console.log("Wait for = " + wait_for + " (" + auto_activate_after_ms + " - " + get_tree_inactive_duration() + ")")
    this.auto_activate_timer = setTimeout(() => {
      if (get_tree_inactive_duration() >= auto_activate_after_ms && !this.started) {
        /**
         * If the tree is inactive for at least 'auto_activate_after_ms', then start the tour
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

export default Screensaver
