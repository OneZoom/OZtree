import data_repo from '../factory/data_repo'
import tree_state from '../tree_state'

//Tour Stop States
const TOURSTOP_INIT = 'TOURSTOP_INIT'
const TOURSTOP_END = 'TOURSTOP_END'  //at the end of tour stop, wait for X seconds or until user presses next to continue
const TOURSTOP_IS_FLYING = 'TOURSTOP_IS_FLYING'
const TOURSTOP_EXIT = 'TOURSTOP_EXIT'

class TourStop {
  constructor(tour, setting) {
    this.tour = tour
    this.onezoom = this.tour.onezoom
    this.setting = setting
    this.goto_next_timer = null
    this.state = TOURSTOP_INIT
    this.direction = 'forward'

    //Container is set when tour.setup_setting is called
    this.container = null
    if (!setting.hasOwnProperty('ott')) {
      throw new Error('Tour stop setting must contain ott id')
    }
  }

  get_OZid(ott) {
    if (data_repo.ott_id_map.hasOwnProperty(ott)) {
      return data_repo.ott_id_map[ott]
    } else {
      console.error(`Ott to OZId conversion map for ott: ${ott} is not fetched`)
    }
  }

  /**
   * Exit current stop
   */
  exit() {
    this.pause()
    this.state = TOURSTOP_EXIT
    this.container.hide()
  }

  /**
   * Called when user presses next during a transition 
   */
  skip_transition() {
    // leap (this should cancel any exiting flight)
    this.onezoom.controller.leap_to(this.get_OZid(this.setting.ott), this.setting.pos)
    this.tour.hide_other_stops(this.container)
    this.state = TOURSTOP_END
    /**
     * If has wait_time, then execute next after wait_time,
     * otherwise wait for user click next/prev
     */
    this.direction = 'forward'
    this.wait_and_goto_next()
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
      this.onezoom.controller.leap_to(this.get_OZid(this.setting.ott), this.setting.pos)
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
    console.log("playing tourstop: " + this.setting.update_class.title + direction)
    /**
     * Perform flight or leap
     */
    let promise = null
    if (this.setting.transition_in == 'leap' || this.direction == 'backward') {
        // Leap. For the moment, wrap in a promise (until 
        // https://github.com/OneZoom/OZtree/issues/203 is fixed)
        let self = this // allow the tourstop to be accessed inside the promise 
        promise = new Promise(function(resolve, reject) {
            self.onezoom.controller.leap_to(self.get_OZid(self.setting.ott), self.setting.pos)
            resolve() // Might instead need to add 200ms wait here
        })
    } else {
        // Flight
        this.state = TOURSTOP_IS_FLYING
        if (this.setting.fly_in_visibility == "force_hide") {
            this.tour.hide_other_stops()
        } else if (this.setting.fly_in_visibility == "show_self") {
            this.tour.hide_other_stops(this.container)
        }
        if (this.setting.transition_in == 'fly_straight') {
            // This is unusual. For the moment, wrap in a promise (until 
            // https://github.com/OneZoom/OZtree/issues/203 is fixed)
            let self = this // allow the tourstop to be accessed inside the promise 
            promise = new Promise(function(resolve, reject) {
                self.onezoom.controller.fly_straight_to(
                    self.get_OZid(self.setting.ott),
                    self.setting.pos == 'max',
                    self.setting.fly_in_speed || 1,
                    'linear',
                    resolve)
            })
        } else {
            // This is the norm
            promise = this.onezoom.controller.fly_on_tree_to(
                null,
                this.get_OZid(this.setting.ott),
                this.setting.pos == 'max',
                this.setting.fly_in_speed || 1)
        }
    }
    promise.then(() => {
        this.tour.hide_other_stops(this.container)
        this.state = TOURSTOP_END
        this.wait_and_goto_next()
    })
  }

  /*
   * If current view is close to ott, skip leap
   */
  conditional_leap_to_OTT(ott) {
    const dest_OZid = this.get_OZid(ott)
    /**
     * visible: boolean
     * node_size: the size of node with ozId
     * dist_to_screen_center: the distance from node center to screen center
     */
    const dist_info = this.onezoom.controller.distance_from_view_to_OZId(dest_OZid)
    if (!dist_info.visible || dist_info.node_size < 100 || dist_info.dist_to_screen_center > 350) {
      this.onezoom.controller.leap_to(dest_OZid)
    }
  }

  /**
   * If has wait_time, then execute next after wait_time,
   * otherwise wait for user click next/prev
   */
  wait_and_goto_next() {
    const wait_time = this.get_wait_time()
    if (typeof wait_time === 'number') {
      
      this.goto_next_timer = setTimeout(() => {
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
}

export default TourStop
