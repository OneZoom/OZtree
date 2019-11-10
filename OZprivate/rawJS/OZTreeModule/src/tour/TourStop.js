import tree_state from '../tree_state'

//Tour Stop States
const INACTIVE = 'TOURSTOP_INACTIVE'
const TRANSITION_WAIT = 'TOURSTOP_T_WAIT'
const TRANSITION_MOVE = 'TOURSTOP_T_MOVE'
const ARRIVED = 'TOURSTOP_ARRIVED'  //at the end of tour stop, wait for X seconds or until user presses next to continue

const delay = (delayTime) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delayTime)
  })
}

class TourStopClass {
  constructor(tour, setting) {
    this.tour = tour
    this.controller = this.tour.onezoom.controller
    this.data_repo = this.tour.onezoom.data_repo
    this.setting = setting
    this.goto_next_timer = null
    this.state = INACTIVE
    this.direction = 'forward'
    this.template_loaded = $.Deferred() // Allows us to fire off something once all templates have loaded
    this.container_appended = false

    //Container is set when tour.setup_setting is called
    this.container = null
  }

  // Export the constants
  static get INACTIVE() {return INACTIVE}
  static get TRANSITION_WAIT() {return TRANSITION_WAIT}
  static get TRANSITION_MOVE() {return TRANSITION_MOVE}
  static get ARRIVED() {return ARRIVED}


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
    tree_state.flying = false
    this.tour.clear_callback_timers()
    clearTimeout(this.goto_next_timer)
    this.state = INACTIVE
    this.execute("on_exit")
    // Don't need to hide this stop: it might carry on being shown during next transition
  }

  arrive_at_tourstop() {
    this.tour.clear_callback_timers()
    if (this.state === INACTIVE) {
      return
    }
    // Show the tour stop *after* firing the function, in case we want the function do
    // do anything first (which could including showing the stop)
    console.log("Arrived at tourstop: force hiding all other stops")
    var stop_just_shown = this.tour.hide_other_stops(this.container)
    if (stop_just_shown) {
       this.execute("on_show")
    }
    this.state = ARRIVED
    this.direction = 'forward'
    this.wait_and_goto_next()
  }    

  /**
   * Called when user presses next during a transition 
   */
  skip_transition() {
    tree_state.flying = false
    // leap (this should cancel any exiting flight)
    this.controller.leap_to(this.OZid, this.setting.pos)
    //this.tour.hide_other_stops(this.container)
    // We may not need to call arrive_at_tourstop as this should be called when the
    // transition promise is resolved
    // this.arrive_at_tourstop()
  }

  /**
   * 1. Pause fly animation
   * 2. Reset timeout, which when triggered would otherwise leap to next tour stop
   */
  pause() {
    this.tour.clear_callback_timers() // don't bother pausing these, just cancel them
    tree_state.flying = false
    // We would like to get the time elapsed if we at waiting to move on from ARRIVED
    // but there is no obvious way to get it
    clearTimeout(this.goto_next_timer)
  }

  resume() {
    if ((this.state === INACTIVE) || (this.state === ARRIVED)) {
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

  throw_error_if_already_exited() {
      if (this.state === INACTIVE) {
        throw new Error("Tourstop has already exited")
      }
  }

  execute(exec_when) {
    if (typeof this.setting.exec === "object") {
      if (typeof this.setting.exec[exec_when] === "function") {
      /* This can only happen when the settings are passed as a javascript object,
       * not as JSON. This (deliberately) restricts scriptability to hard-coded
       * functions, not anything stored in the tours database. It allows non-user
       * tours like the tutorial to interact programmatically with the OneZoom viewer
       */
          console.log("Executing a function prior to transition")
          var timers = this.setting.exec[exec_when](this)
          if (timers) {
            if (timers.length) {
                this.tour.callback_timers.push(...timers)
            } else {
                this.tour.callback_timers.push(timers)
            }
          }
      } else {
          console.log(
              "Cannot run whatever is defined in `exec." + exec_when + "`" +
              " This may be because your settings are in JSON not javascript format")
      }
    }
  }

  /**
   * Play current tour stop, including the transition into the stop
   * If wait time is present, then wait for that time, then goto next stop
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.direction = direction
    const transition_in_wait = this.setting.transition_in_wait
    this.execute("on_start")
    if (this.setting.transition_in_visibility === "force_hide") {
      this.tour.hide_other_stops(null, true) // block interaction from stopping tour
    } else if (this.setting.transition_in_visibility === "show_self") {
      this.tour.hide_other_stops(this.container)
      this.execute("on_show")
    }
    this.state = TRANSITION_WAIT
    console.log("playing tourstop: " + this.setting.update_class.title + " - " + direction)
    
    /* If tourstop is entered by going backwards previous, we should not wait to leap.
     * Otherwise user might feel that the app gets stuck
     */
    let promise = Promise.resolve()
    if (typeof transition_in_wait === 'number' && this.direction !== 'backward') {
      promise = promise.then(() => delay(transition_in_wait)) // wait slightly before the transition
    }

    /**
     * Perform flight or leap
     */
    if (this.setting.transition_in === 'leap' || this.direction === 'backward') {
      /* Leap */
      promise = promise
        .then(() => {
            this.state = TRANSITION_MOVE
            this.throw_error_if_already_exited()
            return this.controller.leap_to(this.OZid, this.setting.pos)
         })
        .catch(() => {})
    } else {
        /* Flight */
        let into_node = this.setting.pos === 'max'
        let speed = this.setting.fly_in_speed || 1
        
        if (this.setting.transition_in === 'fly_straight') {
          /* Fly-straight: this is an unusual thing to want to do */
          promise = promise
            .then(() => {
              this.state = TRANSITION_MOVE
              this.throw_error_if_already_exited()
              return this.controller.fly_straight_to(this.OZid, into_node, speed, 'linear')
            })
            .catch(() => {})
        } else {
          /* Fly normally - if interrupted we reject() and require clicking "skip" */
          promise = promise
            .then(() => {
              this.state = TRANSITION_MOVE
              this.throw_error_if_already_exited()
              return this.controller.fly_on_tree_to(null, this.OZid, into_node, speed)
            })
            .catch(() => {})
        }
    }
    promise
      .then(() => {this.arrive_at_tourstop()})
      .catch(() => {})
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
      this.setting.hasOwnProperty('wait_after_backward')
    ) {
      return this.setting.wait_after_backward
    } else {
      return this.setting.wait //null means stay here until user interation
    }
  }
}

export default TourStopClass
