import data_repo from '../factory/data_repo'

class TourStop {
  constructor(tour, setting) {
    this.tour = tour
    this.onezoom = this.tour.onezoom
    this.setting = setting

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
    this.is_playing = false
    this.container.hide()
  }

  /**
   * Called when user press next during a tour animation
   */
  goto_end() {
    if (!this.is_transition_stop()) {
      throw new Error('Goto end is only valid in transition stop.')
    } else {
      this.is_playing = false

      this.onezoom.controller.perform_leap_animation(
        this.get_OZId(this.setting.ott_end_id)
      )

      /**
       * If has wait_time, then execute next after wait_time,
       * otherwise wait for user click next/prev
       */
      const wait_time = this.get_wait_time('forward')
      if (typeof wait_time === 'number' && wait_time >= 0) {
        setTimeout(() => {
          this.tour.goto_next()
        }, wait_time)
      }
    }
  }

  /**
   * Play current tour stop
   * If there is ott_end_id, then jump or fly to that node
   * If wait time is present, then wait for a fixed amount of time start next slide
   * If wait time is not present, then listen to UI event for next action
   */
  play(direction) {
    this.container.show()
    /**
     * Set button, window, title, style
     */

    /**
     * Perform flight or jump
     */
    let promise = null
    if (this.is_transition_stop()) {
      this.is_playing = true
      this.onezoom.controller.perform_leap_animation(
        this.get_OZId(this.setting.ott)
      )
      promise = this.onezoom.controller.perform_flight_transition(
        null,
        this.get_OZId(this.setting.ott_end_id)
      )
    } else {
      this.is_playing = false
      this.onezoom.controller.perform_leap_animation(
        this.get_OZId(this.setting.ott)
      )
      promise = Promise.resolve(null)
    }

    /**
     * If has wait_time, then execute next after wait_time,
     * otherwise wait for user click next/prev
     */
    const wait_time = this.get_wait_time(direction)
    if (typeof wait_time === 'number' && wait_time >= 0) {
      promise.then(() => {
        setTimeout(() => {
          this.tour.goto_next()
        }, wait_time)
      })
    }
  }

  get_wait_time(direction) {
    let forward_wait_time = this.is_transition_stop() ? 0 : null

    if (this.setting.hasOwnProperty('wait')) {
      forward_wait_time = this.setting.wait
    }

    if (direction === 'forward') {
      return forward_wait_time
    }

    if (
      direction === 'backward' &&
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
