import tree_state from '../tree_state'

//Tour Stop State classes
const tsstate = {
  INACTIVE: 'tsstate-inactive',  // Tourstop hidden
  TRANSITION_IN_WAIT: 'tsstate-transition_in_wait',  // Pre-transition wait
  TRANSITION_IN: 'tsstate-transition_in',  // Transitioning into tourstop
  TRANSITION_OUT_WAIT: 'tsstate-transition_out_wait',  // Pre-transition wait
  TRANSITION_OUT: 'tsstate-transition_out',  // Transitioning into *following* tourstop
  ACTIVE_WAIT: 'tsstate-active_wait',  // Arrived at tourstop, waiting for user input / timer
};

const delay = (delayTime) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delayTime)
  })
}

class TourStopClass {
  constructor(tour, container) {
    this.tour = tour
    this.controller = this.tour.onezoom.controller
    this.data_repo = this.tour.onezoom.data_repo
    this.container = container
    this.goto_next_timer = null
    this.state = tsstate.INACTIVE
    /* If we set tree_state.flying = false, we stop the flight and resolve the promise.
     * This normally causes arrival at a stop, but sometimes we don't want to (e.g.
     * if we are pausing or force-exiting the tourstop. Setting block_arrival solves this
     */ 
    this.block_arrival = false
    this.direction = 'forward'
    this.container_appended = true

    // Extract all settings from data attributes
    this.setting = { exec: {}, qs_opts: '' };
    [].forEach.call(this.container[0].attributes, (attr) => {
      if (!/^data-/.test(attr.name)) return;
      let name = attr.name.replace(/^data-/, ''), val = attr.value;

      // Convert parameter datatypes
      switch(name) {
        case "transition_in_wait":
        case "stop_wait":
          val = parseInt(val);
          break;
        case "fly_in_speed":
          val = parseFloat(val);
          break;
      }
      // Wire up exec functions
      this.setting.exec['on_start'] = this.container[0].exec_on_start;
      this.setting.exec['on_show'] = this.container[0].exec_on_show;
      this.setting.exec['on_exit'] = this.container[0].exec_on_exit;

      this.setting[name] = val;
    });
  }

  /**
   * Find the OZid for this stop from this.setting.ott, or use the rough_initial_loc if
   * ott is 0, return undefined if otherwise falsey
   */
  get OZid() {
    if (parseInt(this.setting.ott) === 0) {
      return this.tour.rough_initial_loc
    } else if (!this.setting.ott) { // i.e. null/undefined
      return undefined
    } else if (this.data_repo.ott_id_map.hasOwnProperty(this.setting.ott)) {
      return this.data_repo.ott_id_map[this.setting.ott]
    } else {
      console.error('OTT to OZid map for ott: ' + this.setting.ott + ' not fetched')
      return undefined
    }
  }

  get state() {
    return this._state || tsstate.INACTIVE;
  }
  set state(new_state) {
    this._state = new_state;

    // Update container state based on our state
    // NB: Do this atomically so we don't generate mutation noise
    this.container[0].className = this.container[0].className.replace(/ tsstate-(\w+)|$/, ' ' + this._state);

    return this._state;
  }

  /**
   * Exit current stop
   */
  exit() {
    this.tour.clear_callback_timers()
    // Remove any lingering wait for user interaction, since it would have happened now
    this.container[0].classList.remove('block-manual');
    this.container[0].classList.remove('block-tourpaused');
    this.block_arrival = true
    tree_state.flying = false
    if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.INACTIVE
    this.state = tsstate.INACTIVE
  }

  arrive_at_tourstop() {
    this.tour.clear_callback_timers()
    if (this.state === tsstate.INACTIVE) {
      return
    }
    // Show the tour stop *after* firing the function, in case we want the function do
    // do anything first (which could including showing the stop)
    if (window.is_testing) console.log("Arrived at tourstop: force hiding all other stops")
    if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.INACTIVE
    this.arm_wait_timer();
    this.state = tsstate.ACTIVE_WAIT
    this.direction = 'forward'
  }    

  /**
   * Called when user presses next, skip to either end of transition or next stop
   */
  skip() {
    if (this.state === tsstate.INACTIVE) {
      throw new Error("Tried to goto_next on an inactive stop")
    } else if (this.state === tsstate.ACTIVE_WAIT) {
      // Ready to go to next stop, so go
      this.tour.goto_next()  // NB: This will ignore any active blocks (plugins will need to clean up after themselves)
    } else {
      // In transition_in[_wait], skip transition
      tree_state.flying = false
      // leap (this should cancel any exiting flight)
      if (this.OZid) this.controller.leap_to(this.OZid, this.setting.pos)
      // We do not need to call arrive_at_tourstop as this should be called when the
      // transition promise is resolved
    }
  }

  /**
   * 1, Block any advancement from the current tourstop
   * 2. Stop fly animation, but ensure it doesn't cause tourstop arrival. Resuming
   *    will start the animation again, from the new location.
   */
  pause() {
    this.tour.clear_callback_timers() // don't bother pausing these, just cancel them
    // We would like to get the time elapsed if we at waiting to move on from ACTIVE_WAIT
    // but there is no obvious way to get it
    this.container[0].classList.add('block-tourpaused');

    this.block_arrival = true
    tree_state.flying = false
  }

  resume() {
    this.container[0].classList.remove('block-tourpaused');
    if ((this.state === tsstate.INACTIVE) || (this.state === tsstate.ACTIVE_WAIT)) {
      // Not in a transition, so jump back to the tourstop location (in case user has
      // moved the tree) and continue - it would be weird to fly on a path that wasn't 
      /// part of the tour - so jump back to the last place when you were on the tour
      if (this.OZid) this.controller.leap_to(this.OZid, this.setting.pos)
      // We should really only have to wait for the remaining time at this stop, but
      // that's tricky, so we wait again from the beginning. - the tour was already in
      // flight / transition an so it's appropriate to continue that to the destination.
      this.arm_wait_timer();
    } else {
      this.play('forward')
    }

  }

  throw_error_if_already_exited() {
      if (this.state === tsstate.INACTIVE) {
        throw new Error("Tourstop has already exited")
      }
  }

  /**
   * Play current tour stop from the start
   */
  play_from_start(direction) {
    if (window.is_testing) console.log(Date().toString() + ": playing tourstop " +
        this.tour.curr_step + " - " + direction)
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
      if (this.state !== tsstate.TRANSITION_IN) {
        this.state = tsstate.TRANSITION_IN_WAIT
        if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.TRANSITION_OUT_WAIT
        const transition_in_wait = this.setting.transition_in_wait
        if (typeof transition_in_wait === 'number' && this.direction !== 'backward') {
          promise = promise.then(() => delay(transition_in_wait)) // wait slightly before the transition
        }
      }
    
      /**
       * Perform flight or leap
       */
      if (!this.OZid) {
        /* No transition, just load tourstop */
      } else if (this.setting.transition_in === 'leap' || this.direction === 'backward') {
        /* Leap */
        promise = promise
          .then(() => {
              this.state = tsstate.TRANSITION_IN
              if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.TRANSITION_OUT
              this.throw_error_if_already_exited()
              return this.controller.leap_to(this.OZid, this.setting.pos)
           })
          .catch((e) => { console.error("Failed to Leap to tourstop", e) })
      } else {
          /* Flight */
          // NB: Temporarily munge out into_node until there's better support: https://github.com/OneZoom/OZtree/issues/541
          let into_node = this.setting.qs_opts.indexOf('into_node=max') > -1
          let speed = this.setting.fly_in_speed || 1
          
          if (this.setting.transition_in === 'fly_straight') {
            /* Fly-straight: this is an unusual thing to want to do */
            promise = promise
              .then(() => {
                this.state = tsstate.TRANSITION_IN
                if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.TRANSITION_OUT
                this.throw_error_if_already_exited()
                return this.controller.fly_straight_to(this.OZid, into_node, speed, 'linear')
              })
              .catch((e) => { console.error("Failed to Leap to tourstop", e) })
          } else {
            /* Fly normally - if interrupted we reject() and require clicking "skip" */
            promise = promise
              .then(() => {
                this.state = tsstate.TRANSITION_IN
                if (this.tour.prev_stop()) this.tour.prev_stop().state = tsstate.TRANSITION_OUT
                this.throw_error_if_already_exited()
                return this.controller.fly_on_tree_to(null, this.OZid, into_node, speed)
              })
              .catch((e) => { console.error("Failed to Leap to tourstop", e) })
          }
      }
      promise = promise
        .then(() => {
          this.transition_promise_active = null
          if (this.block_arrival) {
            this.block_arrival = false
          } else {
            this.arrive_at_tourstop()
          }
        })
    }
  }

  /** Arm this tourstop's wait timer, or wait for user interaction */
  arm_wait_timer() {
    const wait_time = this.get_wait_time()

    if (typeof wait_time !== 'number') {
      // No wait time, so blocking waiting for user instead.
      this.container[0].classList.add('block-manual');
      return
    }

    // Add a block that we'll then remove in (wait_time) ms
    this.container[0].classList.add('block-timer');
    clearTimeout(this.goto_next_timer)
    if (window.is_testing) console.log("Setting timer for " + wait_time + "milliseconds")
    this.goto_next_timer = setTimeout(() => {
      this.container[0].classList.remove('block-timer');
    }, wait_time);
  }

  get_wait_time() {
    if (
      this.direction === 'backward' &&
      this.setting.hasOwnProperty('stop_wait_after_backward')
    ) {
      return this.setting.stop_wait_after_backward
    } else {
      return this.setting.stop_wait //null means stay here until user interation
    }
  }
}

export default TourStopClass
