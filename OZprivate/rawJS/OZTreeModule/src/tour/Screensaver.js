import Tour from './Tour'
import tree_state from '../tree_state';
import tree_settings from '../tree_settings';

class Screensaver extends Tour {
  /* A screesaver is identical to a Tour except that we force interaction = "exit"
   * (so that any screen interaction exits), and we autostart after a certain amount
   * of time (set by the 'ssaver URL parameter). There is no "end_callback" or
   * "interaction" parameter. Instead, the last parameter is "loop_back_forth", which 
   * determines whether we go 1->2->3->1->2->3 or 1->2->3->2->1->2->3
   
   * The "inactive_duration" param should be removed, see https://github.com/OneZoom/OZtree/issues/202
   */

  get inactive_duration() {
    return tree_settings.ssaver_inactive_duration_seconds
  }

  setup_setting(tour_setting, name, start_callback, exit_callback, loop_back_forth) {
    this.auto_activate_timer = null
    this.loop_back_forth = loop_back_forth
    super.setup_setting(tour_setting, name, start_callback, null, exit_callback, "exit")
    this.set_auto_start()
  }
  
  start() {
    //disable automatically start tour once it's started
    clearTimeout(this.auto_activate_timer)
    super.start()
  }
    
  exit() {
    // automatically start screensaver timing again after exit
    clearTimeout(this.auto_activate_timer)
    super.exit()
    this.set_auto_start()
  }
  
  /**
   * Activate next stop but never exit
   */
  goto_next() {
    //console.log("goto_next called")
    if (!this.started) {
      return
    }
    if (this.curr_step === this.tourstop_array.length - 1) {
      // end of tour: loop
      if (this.loop_back_forth) {
          this.curr_step = -this.tourstop_array.length
      } else{
          this.curr_step = -1
      }
    }
    this.curr_stop().exit()
    this.curr_step++
    this.curr_stop().play('forward')
    this.set_ui_content()
  }

  /**
   * Automatically start tour if auto_activate_after is a number.
   * Start after 'auto_activate_after' length of inactivity
   */
  set_auto_start() {
    if (!this.setting || (this.inactive_duration === null)) {return}
    const get_inactive_duration = () => {
      const now = new Date()
      const last_active_at = tree_state.last_active_at
      const last_render_at = tree_state.last_render_at

      const duration_after_last_render = now - last_render_at
      const duration_after_last_activate = now - last_active_at

      //either mouse movement or render would be considered as activate the tree.
      return Math.min(duration_after_last_activate, duration_after_last_render)
    }

    /**
     * inactive_duration should probably be obtained from the internal URL parser
     */
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
