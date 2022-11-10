import { UserInterruptError } from '../errors';

//Tour Stop State classes
const tsstate = {
  INACTIVE: 'tsstate-inactive',  // Tourstop hidden
  TRANSITION_IN: 'tsstate-transition_in',  // Transitioning into tourstop
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
    this.blocks = new Set()
    this.tour = tour
    this.controller = this.tour.onezoom.controller
    this.data_repo = this.tour.onezoom.data_repo
    this.container = container
    container[0].tourstop = this  // Add a link back from the DOM element to the class
    this.goto_next_timer = null
    this.state = tsstate.INACTIVE
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

      this.setting[name] = val;
    });
  }

  /**
   * If transitioning, find the stop that we're transitioning from/to
   * otherwise (or if it doesn't exist return null
   */
  transition_pair_stop() {
    const curr_stop = this.tour.curr_stop();
    if (!curr_stop) return null;

    return curr_stop !== this ? curr_stop : this.tour.prev_stop();
  }

  block_toggle(block_name, condition) {
    if (condition === undefined) {
      this.block_toggle(block_name, !this.blocks.has(block_name))
    } else if (condition){
      this.block_add(block_name)
    } else {
      this.block_remove(block_name)
    }
  }

  /**
   * Add a new block to this tourstop, to prevent the current state being
   * left automatically. Your block can be overriden by the user with advance(),
   * in which case it will be removed automatically.
   */
  block_add(block_name, recursing) {
    if (window.tour_trace) console.log("[BLOCK " + this.setting.ott + " " + this.state + " (" + Array.from(this.blocks) +")] Adding " + block_name)
    this.container[0].classList.add('block-' + block_name);
    this.blocks.add(block_name)

    if (!recursing && (this.state === tsstate.TRANSITION_IN || this.state === tsstate.TRANSITION_OUT)) {
      // Also block the other half of the transition
      const other_stop = this.transition_pair_stop();
      if (other_stop) other_stop.block_add('trans-' + block_name, true)
    }
  }

  /**
   * Remove an existing block from tourstop progression. If none left,
   * advance to the next stage
   */
  block_remove(block_name, recursing) {
    if (window.tour_trace) console.log("[BLOCK " + this.setting.ott + " " + this.state + " (" + Array.from(this.blocks) +")] Removing " + block_name)
    if (this.blocks.size === 0) {
      // Nothing to do, don't re-trigger final block removal
      return;
    }
    this.container[0].classList.remove('block-' + block_name);
    this.blocks.delete(block_name)

    if (!recursing) {
      // Also unblock the other half of the transition
      // NB: Do this first before advancing ours, since otherwise
      //     this.transition_pair_stop() will be null
      const other_stop = this.transition_pair_stop();
      if (other_stop) other_stop.block_remove('trans-' + block_name, true)
    }

    // If we've removed the last block, move on
    if (this.blocks.size === 0) {
      this.advance();
    }
  }

  /**
   * Clear all blocks on a tourstop, e.g. when a new state is reached
   */
  block_clear() {
    this.blocks.forEach((x) => this.container[0].classList.remove('block-' + x));
    this.blocks.clear();
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
    if (window.tour_trace) console.log("[STATE " + (this.setting || {}).ott + "] " + this.state + " -> " + new_state);
    this._state = new_state;

    // Update container state based on our state
    // NB: Do this atomically so we don't generate mutation noise
    this.container[0].className = this.container[0].className.replace(/ tsstate-(\w+)|$/, ' ' + this._state);

    // Any lingering blocks from previous state don't apply to this state
    this.block_clear();

    return this._state;
  }

  /**
   * Exit current stop
   */
  exit() {
    // TODO: Ideally we sent cancel events for flights & timers on state change
    // but for now at least cancel any flights.
    this.controller.cancel_flight();
    this.state = tsstate.INACTIVE
  }

  /**
   * Either all blocks on the current state have expired, or the user has pressed
   * "skip". Move to next state.
   */
  advance() {
    if (this.state === tsstate.INACTIVE) {
      // Do nothing. An explicit play() should trigger this
    } else if (this.state === tsstate.TRANSITION_IN) {
      // Transition-in has finished, made it to tourstop
      this.arrive_at_tourstop();
    } else if (this.state === tsstate.ACTIVE_WAIT) {
      // Ask tour to move to next stop
      // NB: goto_next will then call leave() for this stop
      this.tour.goto_next();
    } else if (this.state === tsstate.TRANSITION_OUT) {
      this.exit();
    }
  }

  /**
   * Leave the current stop
   */
  leave() {
    // If already leaving, don't try and leave again
    if (this.state !== tsstate.TRANSITION_OUT) {
      this.state = tsstate.TRANSITION_OUT;
    }
  }

  arrive_at_tourstop() {
    const other_stop = this.transition_pair_stop();

    // Tour (probably) exited mid-transition, consider any lingering flight promise-chains
    // cancelled.
    if (this.state === tsstate.INACTIVE) {
      return
    }
    // leap if not already at our tourstop (e.g. if user skipped over flight)
    // NB: This will break the flight promise chain with UserInterruptError
    if (this.OZid) this.controller.leap_to(this.OZid, this.setting.pos)

    this.state = tsstate.ACTIVE_WAIT
    this.arm_wait_timer();
    this.direction = 'forward'

    // Make sure other half to transition has left
    // Ideally it will of it's own accord, but user_forward() may have left blocks behind
    if (other_stop) other_stop.state = tsstate.INACTIVE;
  }    

  /**
   * 1, Block any advancement from the current tourstop
   * 2. Stop fly animation, but ensure it doesn't cause tourstop arrival. Resuming
   *    will start the animation again, from the new location.
   */
  pause() {
    // We would like to get the time elapsed if we at waiting to move on from ACTIVE_WAIT
    // but there is no obvious way to get it
    this.block_add('tourpaused');

    this.controller.cancel_flight();
  }

  resume() {
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
    this.block_remove('tourpaused');

  }

  /**
   * Play current tour stop from the start
   */
  play_from_start(direction) {
    if (window.is_testing) console.log(Date().toString() + ": playing tourstop " +
        this.tour.curr_step + " - " + direction)
    // NB: Switch to inactive to remove any dregs of a previous transition
    //     cancelled by goto_prev() calling exit. Maybe it should be happening there?
    this.exit()
    this.play(direction)
  }
  
  /**
   * Play the main body of the tourstop including the transition into the stop if needed.
   * If wait time is present, then wait for that time, then goto next stop
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.direction = direction

    // NB: Set block regardless, so a pause/resume gets caught before the flight ends
    if (window.tour_trace) console.log("[FLIGHT " + this.setting.ott + "] Preflight")
    this.block_add('preflight')

    // Wait for any previous flight to be cancelled and it's promise settled
    return this.controller.cancel_flight().then(() => {
      /* Wait before the transition animation, but only in certain circumstances.
       * Don't wait if tourstop is entered by going backwards (otherwise user might feel the app is stuck)
       * Don't wait if we are already in a transition animation (e.g. if we paused halfway through)
       */
      if (this.state !== tsstate.TRANSITION_IN) {
        this.state = tsstate.TRANSITION_IN
        this.block_add('flight')  // NB: Changing state will remove the flight block, re-add it

        const transition_in_wait = this.setting.transition_in_wait
        if (typeof transition_in_wait === 'number' && this.direction !== 'backward') {
          return delay(transition_in_wait);
        }
      } else {
        // Flight now refers to "our" flight
        this.block_add('flight')
        this.block_remove('preflight')
      }
    }).then(() => {
      if (window.tour_trace) console.log("[FLIGHT " + this.setting.ott + "] Start")
      if (!this.OZid) {
        /* No transition, just load tourstop */
        return;
      }

      if (this.setting.transition_in === 'leap' || this.direction === 'backward') {
        /* Leap */
        return this.controller.leap_to(this.OZid, this.setting.pos)
      }

      /* Flight */
      // NB: Temporarily munge out into_node until there's better support: https://github.com/OneZoom/OZtree/issues/541
      let into_node = this.setting.qs_opts.indexOf('into_node=max') > -1
      let speed = this.setting.fly_in_speed || 1
          
      if (this.setting.transition_in === 'fly_straight') {
        /* Fly-straight: this is an unusual thing to want to do */
        return this.controller.fly_straight_to(this.OZid, into_node, speed, 'linear')
      }
      /* Fly normally - if interrupted we reject() and require clicking "skip" */
      return this.controller.fly_on_tree_to(null, this.OZid, into_node, speed)

    }).catch((e) => {
      if (this.state === tsstate.TRANSITION_IN && this.tour.state !== 'tstate-paused') {
        // We shouldn't get here, as any interactions should have paused the tour
        // then stopped the flight. But just in case we do pause, to put tour in
        // a recoverable state.
        console.warn("Flight stopped unexpectedly, pausing tour", e)
        this.tour.user_pause()
      } else if (e instanceof UserInterruptError) {
        // Flight interrupted (e.g. by pause).
        if (window.is_testing) console.log("Flight to " + this.OZid + " interrupted", e)
      } else {
        throw e;
      }

    }).finally(() => {
      // Remove block now flight is finished, one way or another
      this.block_remove('flight')
      this.block_remove('preflight')
      if (window.tour_trace) console.log("[FLIGHT " + this.setting.ott + "] End")
    })
  }

  /** Arm this tourstop's wait timer, or wait for user interaction */
  arm_wait_timer() {
    const wait_time = this.get_wait_time()

    if (typeof wait_time !== 'number') {
      // No wait time, so blocking waiting for user instead.
      this.block_add('manual');
      return
    }

    // Add a block that we'll then remove in (wait_time) ms
    this.block_add('timer');
    clearTimeout(this.goto_next_timer)
    if (window.is_testing) console.log("Setting timer for " + wait_time + "milliseconds")
    this.goto_next_timer = setTimeout(() => {
      this.block_remove('timer');
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
