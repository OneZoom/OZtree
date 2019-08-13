import TourStop from './TourStop'

class Tour {
  constructor(onezoom) {
    this.onezoom = onezoom
    this.curr_step = 0
    this.tour_stop_array = []
  }

  /**
   * Start tour
   */
  start() {
    this.exit()
    this.curr_step = -1
    this.goto_next()
  }

  /**
   * Exit tour
   */
  exit() {
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }
    //hide tour
    this.curr_step = -1
  }

  /**
   * Activate next tour stop
   * If current stop a transitional stop, then goto the end of current stop,
   * otherwise go to next stop
   */
  goto_next() {
    if (this.curr_stop() && this.curr_stop().is_transition_stop() && this.curr_stop().is_playing) {
      this.curr_stop().goto_end()
    } else {
      if (this.curr_stop()) {
        this.curr_stop().exit()
      }

      if (this.curr_step === this.tour_stop_array.length - 1) {
        this.exit()
      } else {
        this.curr_step++
        this.curr_stop().play('forward')
        this.set_ui_content()
      }
    }
  }

  /**
   * Go to previous tour stop
   */
  goto_prev() {
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    if (this.curr_step > 0) {
      this.curr_step--

      //find first non-transition stop
      while (this.curr_step > 0 && this.curr_stop().is_transition_stop()) {
        this.curr_step--
      }
    }

    this.curr_stop().play('backward')
    this.set_ui_content()
  }

  /**
   * Create tour stops based on setting
   * Create several tour stop dom dialog(popup) based on template
   */
  setup_setting(tour_setting) {
    this.setting = tour_setting
    this.tour_stop_array = []
    this.curr_step = 0

    tour_setting.dom_id = tour_setting.dom_id || {}
    this.wrapper_id = tour_setting.dom_id.wrapper_id || 'tour_wrapper'
    this.next_id = tour_setting.dom_id.next_id || 'tour_next'
    this.prev_id = tour_setting.dom_id.prev_id || 'tour_prev'
    this.exit_id = tour_setting.dom_id.exit_id || 'tour_exit'

    let shared_setting = tour_setting['tour_stop_shared'] || {}

    /**
     * Merge shared settings with stop setting in tour stop
     */
    tour_setting['tour_stop'].forEach(tour_stop_setting => {
      let merged_setting = {}
      $.extend(true, merged_setting, shared_setting, tour_stop_setting)
      this.tour_stop_array.push(new TourStop(this, merged_setting))
    })

    this.load_template()
    this.load_ott_id_conversion_map()
  }

  /**
   * Bind previous, next, exit button event
   */
  bind_template_ui_event(tour_stop) {
    tour_stop.container.find(`#${this.next_id}`).click(() => {
      this.goto_next()
    })

    tour_stop.container.find(`#${this.prev_id}`).click(() => {
      this.goto_prev()
    })

    tour_stop.container.find(`#${this.exit_id}`).click(() => {
      this.exit()
    })
  }

  /**
   * Fetch images in tour in advance
   */
  prefetch_image(tour_stop) {
    const dom_update = tour_stop.setting.dom_update || {}
    const container = tour_stop.container
    for (let key in dom_update) {
      if (typeof dom_update[key] === 'object' && dom_update[key].hasOwnProperty('src')) {
        container.find(`#${key}`).attr('src', dom_update[key].src)
      }
    }
  }

  /**
   * Load template into $(#wrapper_id).
   * Then set tour_stop.container = $(temp_div)
   */
  load_template() {
    let style_url_cache = new Set()

    if ($(`#${this.wrapper_id}`).length === 0) {
      console.error(
        `Expected to have a tour container with id: ${
        this.wrapper_id
        }, but none exist`
      )
    }

    this.tour_stop_array.forEach(tour_stop => {
      /**
       * Load template div
       */
      const tempate_url =
        location.protocol +
        '//' +
        location.host +
        '/' +
        tour_stop.setting.template

      const temp_div = document.createElement('div')
      $(temp_div).load(`${tempate_url} .container`, () => {
        $(`#${this.wrapper_id}`).append($(temp_div))
        $(temp_div).hide()
        tour_stop.container = $(temp_div)
        this.bind_template_ui_event(tour_stop)
        this.prefetch_image(tour_stop)
      })

      /**
       * Load template style if not loaded
       */
      if (
        tour_stop.setting.template_style &&
        !style_url_cache.has(tour_stop.setting.template_style)
      ) {
        style_url_cache.add(tour_stop.setting.template_style)

        const style_url =
          location.protocol +
          '//' +
          location.host +
          '/' +
          tour_stop.setting.template_style
        $('head').append(
          $('<link rel="stylesheet" type="text/css" />').attr(
            'href',
            style_url
          )
        )
      }
    })
  }

  /**
   * Fetch ott -> id conversion map
   */
  load_ott_id_conversion_map() {
    const ott_id_set = new Set()
    this.tour_stop_array.forEach(tour_stop => {
      ott_id_set.add(tour_stop.setting.ott)
      if (tour_stop.setting.hasOwnProperty('ott_end_id')) {
        ott_id_set.add(tour_stop.setting.ott_end_id)
      }
    })
    const ott_id_array = []
    for (let ott_id of ott_id_set.values()) {
      ott_id_array.push({ OTT: ott_id })
    }

    this.onezoom.utils.process_taxon_list(
      JSON.stringify(ott_id_array),
      function () { },
      function () { }
    )
  }

  curr_stop() {
    return this.tour_stop_array[this.curr_step]
  }

  /**
   * Set UI Content
   */
  set_ui_content() {
    const container = this.curr_stop().container
    const dom_update = this.curr_stop().setting.dom_update || {}
    for (let key in dom_update) {
      const selectedDom = container.find(`#${key}`)
      if (selectedDom.length === 0) {
        console.error(
          `Expected to set dom content with id: ${key}, but dom is not found`
        )
      } else {
        /**
         * Set as pure text
         */
        if (typeof dom_update[key] === 'string') {
          selectedDom.html(dom_update[key])
        } else if (typeof dom_update[key] === 'object') {
          /**
           * Set as pure text
           */
          if (dom_update[key].hasOwnProperty('text')) {
            selectedDom.html(dom_update[key].text)
          }

          /**
           * toggle show or hide
           */
          if (dom_update[key].visible === false || dom_update[key].visible === "false") {
            selectedDom.hide()
          } else {
            selectedDom.show()
          }

          /**
           * Set image src
           */
          if (dom_update[key].hasOwnProperty('src')) {
            selectedDom.attr('src', dom_update[key].src)
          }
        } else if (typeof dom_update[key] === 'function') {
          /**
           * Set by pure function
           */
          dom_update[key](selectedDom)
        }
      }
    }

    const style_update = this.curr_stop().setting.style_update || {}
    for (let key in style_update) {
      const selectedDom = container.find(`#${key}`)
      if (selectedDom.length === 0) {
        console.error(
          `Expected to set dom style with id: ${key}, but dom is not found`
        )
      } else {
        selectedDom.attr('class', style_update[key])
      }
    }
  }
}

export default Tour
