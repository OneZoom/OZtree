import Tour from './Tour'
import tree_state from '../tree_state';

class Screensaver extends Tour {
  /* A screesaver is identical to a Tour except that we force interaction = "exit"
   * (so that any screen interaction exits), and we autostart after a certain amount
   * of time (set by the 'ssaver URL parameter). There is no "end_callback" or
   * "interaction" parameter. Instead, the last parameter is "loop_back_forth", which 
   * determines whether we go 1->2->3->1->2->3 or 1->2->3->2->1->2->3
   
   * The "inactive_duration" param should be removed, see https://github.com/OneZoom/OZtree/issues/202
   */
  setup_setting(tour_setting, name, start_callback, exit_callback, loop_back_forth, inactive_duration_seconds) {
    this.auto_activate_timer = null
    this.loop_back_forth = loop_back_forth
    this.inactive_duration = inactive_duration_seconds * 1000 //REMOVE
    console.log("inactive_duration set to " + this.inactive_duration)
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
      if (last_active_at === null) {
        return 0
      } else {
        return now - last_active_at
      }
    }

    // CURRENTLY UNUSED
    const is_condition_pass = () => {
      let condition_pass = true
      if (typeof this.setting.screensaver.condition === 'function') {
        //user could use condition to conditionally auto start tour
        condition_pass = this.setting.screensaver.condition()
      }
      return condition_pass
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
      const wait_for = is_condition_pass() ? auto_activate_after - get_inactive_duration() : auto_activate_after
      console.log("Wait for = " + wait_for + " (" + auto_activate_after + " - " + get_inactive_duration() + ")")
      this.auto_activate_timer = setTimeout(() => {
        if (get_inactive_duration() >= auto_activate_after && is_condition_pass()) {
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
