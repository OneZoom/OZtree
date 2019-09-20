import tree_state from '../tree_state'

//Tour Stop States
const TOURSTOP_INIT = 'TOURSTOP_INIT'
const TOURSTOP_END = 'TOURSTOP_END'  //at the end of tour stop, wait for X seconds or until user presses next to continue
const TOURSTOP_IS_FLYING = 'TOURSTOP_IS_FLYING'
const TOURSTOP_EXIT = 'TOURSTOP_EXIT'

class TourStop {
  constructor(tour, setting) {
    this.tour = tour
    this.controller = this.tour.onezoom.controller
    this.data_repo = this.tour.onezoom.data_repo
    this.setting = setting
    this.goto_next_timer = null
    this.state = TOURSTOP_INIT
    this.direction = 'forward'
    this.container_appended = false

    //Container is set when tour.setup_setting is called
    this.container = null
  }

  /**
   * Find the OZid for this stop from this.setting.ott, or use the rough_initial_loc if
   * ott is falsey
   */
  get OZid() {
    if (this.setting.ott) {
      if (this.data_repo.ott_id_map.hasOwnProperty(this.setting.ott)) {
        return this.data_repo.ott_id_map[this.setting.ott]
      } else {
        console.error('OTT to OZid map for ott: ' + this.setting.ott + ' not fetched')
        return undefined
      }
    } else {
      return this.tour.rough_initial_loc
    }
  }

  /**
   * Exit current stop
   */
  exit() {
    this.pause()
    this.state = TOURSTOP_EXIT
    // Don't need to hide this stop: it might carry on being shown during next transition
  }

  complete_tourstop() {
    if (this.setting.exec) {
        if (typeof(this.setting.exec) === "function") {
        // This can only happen when the settings are passed as a javascript object,
        // not as JSON. This (deliberately) restricts scriptability to hard-coded
        // functions, not anything stored in the tours database. It allows non-user
        // tours like the tutorial to interact programmatically with the OneZoom viewer
            this.setting.exec(this)
        } else {
            console.log(
                "Cannot run whatever is defined in `exec`." +
                " This may be because your settings are in JSON not javascript format")
        }
    }
    // Show the tour stop *after* firing the function, in case we want the function do
    // do anything first (which could including showing the stop)
    console.log("force hiding other stops during complete_tourstop")
    this.tour.hide_other_stops(this.container)
    this.state = TOURSTOP_END
    this.direction = 'forward'
    this.wait_and_goto_next()
  }    

  /**
   * Called when user presses next during a transition 
   */
  skip_transition() {
    // leap (this should cancel any exiting flight)
    this.controller.leap_to(this.OZid, this.setting.pos)
    console.log("force hiding other stops during skip")
    this.tour.hide_other_stops(this.container)
    this.complete_tourstop()
  }

  /**
   * 1. Pause fly animation
   * 2. Reset timeout, which when triggered would otherwise leap to next tour stop
   */
  pause() {
    tree_state.flying = false
    // We would like to get the time elapsed if we at waiting to move on from TOURSTOP_END
    // but there is no obvious way to get it
    clearTimeout(this.goto_next_timer)
  }

  continue() {
    if ((this.state === TOURSTOP_EXIT) || (this.state === TOURSTOP_END)) {
      // Not in a transition, so jump back to the tourstop location (in case user has
      // moved the tree) and continue
      this.controller.leap_to(this.OZid, this.setting.pos)
      // We should really only have to wait for the remaining time at this stop, but
      // that's tricky, so we wait again from the beginning.
      this.wait_and_goto_next()
    } else {
      this.play('forward')
    }

  }

  /**
   * Play current tour stop, including the transition into the stop
   * If wait time is present, then wait for that time, then goto next stop
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.direction = direction
    this.state = TOURSTOP_INIT
    console.log("playing tourstop: " + this.setting.update_class.title + " - " + direction)
    /**
     * Perform flight or leap
     */
    let promise = Promise.resolve()
    if (this.setting.transition_in == 'leap' || this.direction == 'backward') {
        promise
            .then(this.controller.leap_to(this.OZid, this.setting.pos))
            .catch(() => {})
    } else {
        // Flight
        let into_node = this.setting.pos === 'max'
        let speed = this.setting.fly_in_speed || 1
        this.state = TOURSTOP_IS_FLYING
        if (this.setting.fly_in_visibility === "force_hide") {
            console.log("force hiding previous stop")
            this.block_user_interaction_when_normally_allowed()
            this.tour.hide_other_stops()
        } else if (this.setting.fly_in_visibility === "show_self") {
            console.log("force hiding other stops 1")
            this.tour.hide_other_stops(this.container)
        }
        if (this.setting.transition_in === 'fly_straight') {
            // This is unusual.
            promise
              .then(this.controller.fly_straight_to(this.OZid, into_node, speed, 'linear'))
              .catch(() => {})
        } else {
            // This is the norm
            console.log("Flying on tree to: " + this.OZid + " (" + this.setting.ott + ")")
            promise
              .then(this.controller.fly_on_tree_to(null, this.OZid, into_node, speed))
              .catch(() => {})
        }
    }
    promise
      .then(() => {this.complete_tourstop()})
      .catch(() => {})
      .finally(() => {
        this.restore_user_interaction_when_normally_allowed()
      })
  }

  /**
   * If has numeric wait_time, then execute next after wait_time,
   * otherwise wait for user click next/prev
   */
  wait_and_goto_next() {
    const wait_time = this.get_wait_time()
    if (typeof wait_time === 'number') {
      //console.log("Setting timer for " + wait_time + "milliseconds")
      this.goto_next_timer = setTimeout(() => {
        //console.log("Firing timer")
        this.tour.goto_next()
      }, wait_time)
    }
  }

  get_wait_time() {
    if (
      this.direction === 'backward' &&
      this.setting.hasOwnProperty('wait_after_prev')
    ) {
      return this.setting.wait_after_prev
    } else {
      return this.setting.wait //null means stay here until user interation
    }
  }

  /**
   * Block any user interaction in cases where it would normally be allowed: i.e. when
   * tour.interaction equals 'null' or default. In other cases, user interaction during a
   * tour is trapped and handled sen
   */
  block_user_interaction_when_normally_allowed() {
    const tour = this.tour
    if (tour.interaction && 
      (tour.interaction === 'block' || 
      tour.interaction === 'exit' || 
      tour.interaction === 'exit_after_confirmation')) {
        //Do nothing
    } else {
      console.log('set block user interation')
      tree_state.disable_interaction = true
    }
  }

  /**
   * Recover user interaction after block_user_interaction_when_normally_allowed()
   */
  restore_user_interaction_when_normally_allowed() {
    const tour = this.tour
    if (tour.interaction &&
      (tour.interaction === 'block' ||
        tour.interaction === 'exit' ||
        tour.interaction === 'exit_after_confirmation')) {
      //Do nothing
    } else {
      console.log('unset block user interation')
      tree_state.disable_interaction = false
    }
  }
}

export default TourStop
