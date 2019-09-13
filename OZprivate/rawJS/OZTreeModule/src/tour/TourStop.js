import data_repo from '../factory/data_repo'
import tree_state from '../tree_state'

//Tour Stop States
const TOUR_STOP_INIT = 'TOUR_STOP_INIT'
const TOUR_STOP_END = 'TOUR_STOP_END'  //in the end of tour stop, waiting for X seconds or user press next to continue
const TOUR_STOP_FLYING = 'TOUR_STOP_FLYING'
const TOUR_STOP_EXIT = 'TOUR_STOP_EXIT'

class TourStop {
  constructor(tour, setting) {
    this.tour = tour
    this.onezoom = this.tour.onezoom
    this.setting = setting
    this.goto_next_timer = null
    this.state = TOUR_STOP_INIT
    this.direction = 'forward'

    //Container would be set when tour.setup_setting is called
    this.container = null
    if (!setting.hasOwnProperty('ott')) {
      throw new Error('Tour stop setting must contain ott id')
    }
  }

  get_OZId(ott) {
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
    this.state = TOUR_STOP_EXIT
    this.container.hide()
  }

  /**
   * Called when user press next during a tour animation
   */
  goto_end() {
    if (!this.is_transition_stop()) {
      throw new Error('Goto end is only valid in transition stop.')
    } else {
      this.state = TOUR_STOP_END

      this.onezoom.controller.perform_leap_animation(
        this.get_OZId(this.setting.ott_end_id)
      )

      /**
       * If has wait_time, then execute next after wait_time,
       * otherwise wait for user click next/prev
       */
      this.direction = 'forward'
      this.wait_and_goto_next()
    }
  }

  /**
   * 1. Pause fly animation
   * 2. Reset timeout which when triggered would jump to next tour stop
   */
  pause() {
    tree_state.flying = false
    clearTimeout(this.goto_next_timer)
  }

  continue() {
    if (this.state === TOUR_STOP_INIT) {
      this.play('forward')
    } else if (this.state === TOUR_STOP_FLYING) {
      let promise = this.onezoom.controller.perform_flight_transition(
        null,
        this.get_OZId(this.setting.ott_end_id)
      )
      promise.then(() => {
        this.state = TOUR_STOP_END
        this.wait_and_goto_next()
      })
    } else if (this.state === TOUR_STOP_END) {
      this.wait_and_goto_next()
    }
  }

  /**
   * Play current tour stop
   * If there is ott_end_id, then jump or fly to that node
   * If wait time is present, then wait for a fixed amount of time start next slide
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.direction = direction
    this.state = TOUR_STOP_INIT
    this.container.show()
    /**
     * Set button, window, title, style
     */

    /**
     * Perform flight or jump
     */
    let promise = null
    if (this.is_transition_stop()) {
      this.state = TOUR_STOP_FLYING

      this.conditional_perform_leap_to_ozId(this.setting.ott)
      promise = this.onezoom.controller.perform_flight_transition(
        null,
        this.get_OZId(this.setting.ott_end_id)
      )
    } else {
      this.conditional_perform_leap_to_ozId(this.setting.ott)
      promise = Promise.resolve(true)
    }

    promise.then(() => {
      this.state = TOUR_STOP_END
      this.wait_and_goto_next()
    })
  }

  /*
   * If current view is close to ott, skip leap
   */
  conditional_perform_leap_to_ozId(ott) {
    const ozId = this.get_OZId(ott)
    /**
     * visible: boolean
     * node_size: the size of node with ozId
     * dist_to_screen_center: the distance from node center to screen center
     */
    const dist_info = this.onezoom.controller.distance_from_view_to_OZId(ozId)
    if (!dist_info.visible || dist_info.node_size < 100 || dist_info.dist_to_screen_center > 350) {
      this.onezoom.controller.perform_leap_animation(ozId)
    }
  }

  /**
   * If has wait_time, then execute next after wait_time,
   * otherwise wait for user click next/prev
   */
  wait_and_goto_next() {
    const wait_time = this.get_wait_time()
    if (typeof wait_time === 'number' && wait_time >= 0) {
      this.goto_next_timer = setTimeout(() => {
        this.tour.goto_next()
      }, wait_time)
    }
  }

  get_wait_time() {
    let forward_wait_time = this.is_transition_stop() ? 0 : null

    if (this.setting.hasOwnProperty('wait')) {
      forward_wait_time = this.setting.wait
    }

    if (this.direction === 'forward') {
      return forward_wait_time
    }

    if (
      this.direction === 'backward' &&
      this.setting.hasOwnProperty('wait_after_prev')
    ) {
      return this.setting.wait_after_prev
    } else {
      return forward_wait_time
    }
  }

  is_transition_stop() {
    return this.setting.hasOwnProperty('ott_end_id')
  }
}

export default TourStop
