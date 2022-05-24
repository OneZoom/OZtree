import tree_state from '../tree_state'

//Tour Stop States
const INACTIVE = 'TOURSTOP_INACTIVE'
const TRANSITION_WAIT = 'TOURSTOP_T_WAIT'
const TRANSITION_MOVE = 'TOURSTOP_T_MOVE'
const ARRIVED = 'TOURSTOP_ARRIVED'

const delay = (delayTime) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delayTime)
  })
}

class TourStopClass {
  // Export the constants
  static get INACTIVE() {return INACTIVE}
  static get TRANSITION_WAIT() {return TRANSITION_WAIT}
  static get TRANSITION_MOVE() {return TRANSITION_MOVE}
  static get ARRIVED() {return ARRIVED}

  constructor(tour, container) {
    this.tour = tour
    this.controller = this.tour.onezoom.controller
    this.data_repo = this.tour.onezoom.data_repo
    this.goto_next_timer = null
    this.state = INACTIVE
    /* If we set tree_state.flying = false, we stop the flight and resolve the promise.
     * This normally causes arrival at a stop, but sometimes we don't want to (e.g.
     * if we are pausing or force-exiting the tourstop. Setting block_arrival solves this
     */ 
    this.block_arrival = false
    this.direction = 'forward'
    this.container_appended = true
    this.container = container

    // Extract all settings from data attributes
    this.setting = { exec: {} };
    [].forEach.call(this.container[0].attributes, (attr) => {
      if (!/^data-/.test(attr.name)) return;
      let name = attr.name.replace(/^data-/, ''), val = attr.value;

      // Convert parameter datatypes
      switch(name) {
        case "transition_in_wait":
        case "wait":
          val = parseInt(val);
          break;
        case "fly_in_speed":
          val = parseFloat(val);
          break;
        case "show_tourstop_style":
        case "hide_tourstop_style":
          val = JSON.parse(val);
          break;
      }
      // Wire up exec functions
      this.setting.exec['on_start'] = this.container[0].exec_on_start;
      this.setting.exec['on_show'] = this.container[0].exec_on_show;
      this.setting.exec['on_exit'] = this.container[0].exec_on_exit;

      this.setting[name] = val;
    });
    this.hide()
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
    this.tour.clear_callback_timers()
    clearTimeout(this.goto_next_timer)
    this.block_arrival = true
    tree_state.flying = false
    this.state = INACTIVE
    this.execute("on_exit")
    // Don't need to hide this stop: it might carry on being shown during next transition
  }

  hide() {
    let style = this.setting.hide_tourstop_style || this.tour.hide_tourstop_style;

    if (!this.container) {
      return
    }

    if (style.add_class) {
      this.container.addClass(style.add_class)
    } else if (style.remove_class) {
      this.container.removeClass(style.remove_class)
    } else {
      this.container.css(style)
    }
  }

  show() {
    let style = this.setting.show_tourstop_style || this.tour.show_tourstop_style;

    if (!this.container) {
      return
    }

    if (style.add_class) {
      this.container.addClass(style.add_class)
    } else if (style.remove_class) {
      this.container.removeClass(style.remove_class)
    } else {
      this.container.css(style)
    }
  }

  shown() {
    if (this.container) {
      let requirements = this.setting.show_tourstop_style || this.tour.show_tourstop_style
      return Object.entries(requirements).every((k, v) => {return this.container.css(k) === v})
    }
    return false
  }

  arrive_at_tourstop() {
    this.tour.clear_callback_timers()
    if (this.state === INACTIVE) {
      return
    }
    // Show the tour stop *after* firing the function, in case we want the function do
    // do anything first (which could including showing the stop)
    if (window.is_testing) console.log("Arrived at tourstop: force hiding all other stops")
    var stop_just_shown = this.tour.hide_and_show_stops(this.container)
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
    // We do not need to call arrive_at_tourstop as this should be called when the
    // transition promise is resolved
  }

  /**
   * 1. Reset timeout, which when triggered would otherwise leap to next tour stop
   * 2. Stop fly animation, but ensure it doesn't cause tourstop arrival. Resuming
   *    will start the animation again, from the new location.
   */
  pause() {
    this.tour.clear_callback_timers() // don't bother pausing these, just cancel them
    // We would like to get the time elapsed if we at waiting to move on from ARRIVED
    // but there is no obvious way to get it
    clearTimeout(this.goto_next_timer)

    this.block_arrival = true
    tree_state.flying = false
  }

  resume() {
    if ((this.state === INACTIVE) || (this.state === ARRIVED)) {
      // Not in a transition, so jump back to the tourstop location (in case user has
      // moved the tree) and continue - it would be weird to fly on a path that wasn't 
      /// part of the tour - so jump back to the last place when you were on the tour
      this.controller.leap_to(this.OZid, this.setting.pos)
      // We should really only have to wait for the remaining time at this stop, but
      // that's tricky, so we wait again from the beginning. - the tour was already in
      // flight / transition an so it's appropriate to continue that to the destination.
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
          if (window.is_testing) console.log("Executing a function prior to transition")
          var timers = this.setting.exec[exec_when](this)
          if (timers) {
            if (timers.length) {
                this.tour.callback_timers.push(...timers)
            } else {
                this.tour.callback_timers.push(timers)
            }
          }
      }
    }
  }

  /**
   * Play current tour stop from the start
   */
  play_from_start(direction) {
    if (window.is_testing) console.log(Date().toString() + ": playing tourstop " +
        this.tour.curr_step + " - " + direction)
    this.execute("on_start")
    if (this.setting.transition_in_visibility === "force_hide") {
      this.tour.hide_and_show_stops(null, true) // block interaction from stopping tour
    } else if (this.setting.transition_in_visibility === "show_self") {
      this.tour.hide_and_show_stops(this.container)
      this.execute("on_show")
    }
    this.play(direction)
  }
  
  /**
   * Play the main body of the tourstop including the transition into the stop if needed.
   * If wait time is present, then wait for that time, then goto next stop
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.block_arrival = false // Make sure we can arrive at the stop
    this.direction = direction
    if (!this.transition_promise_active) { // when first called transition_promise_active will be undefined and hence this statement will evaluate as true
      this.transition_promise_active = true
      let promise = Promise.resolve()
      
      /* Wait before the transition animation, but only in certain circumstances.
       * Don't wait if tourstop is entered by going backwards (otherwise user might feel the app is stuck)
       * Don't wait if we are already in a transition animation (e.g. if we paused halfway through)
       */
      if (this.state !== TRANSITION_MOVE) {
        this.state = TRANSITION_WAIT
        const transition_in_wait = this.setting.transition_in_wait
        if (typeof transition_in_wait === 'number' && this.direction !== 'backward') {
          promise = promise.then(() => delay(transition_in_wait)) // wait slightly before the transition
        }
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
        .then(() => {
          if (this.block_arrival) {
            this.block_arrival = false
          } else {
            this.arrive_at_tourstop()
          }
          this.transition_promise_active = null
        })
        .catch(() => {this.transition_promise_active = null})
    }
  }

  /**
   * If has numeric wait_time, then execute next after wait_time,
   * otherwise wait for user click next/prev
   */
  wait_and_goto_next() {
    const wait_time = this.get_wait_time()

    const timer_tick = () => {
      if (this.controller.is_tree_visible()) {
        // Tree is ready to go, so go there
        this.tour.goto_next();
      } else {
        // Tree not visible, so wait some more
        this.goto_next_timer = setTimeout(timer_tick, wait_time);
      }
    };

    if (typeof wait_time === 'number') {
      clearTimeout(this.goto_next_timer)
      if (window.is_testing) console.log("Setting timer for " + wait_time + "milliseconds")
      this.goto_next_timer = setTimeout(timer_tick, wait_time);
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
