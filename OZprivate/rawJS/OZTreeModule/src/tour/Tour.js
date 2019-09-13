import TourStop from './TourStop'
import tree_state from '../tree_state';
import { add_hook } from '../util';

const Interaction_Action_Arr = ['mouse_down', 'mouse_wheel', 'touch_start', 'touch_move', 'touch_end']

let tour_id = 1

class Tour {
  constructor(onezoom) {
    this.tour_id = tour_id++
    this.onezoom = onezoom
    this.curr_step = 0
    this.tour_stop_array = []
    this.started = false
    this.auto_activate_timer = null
  }

  /**
   * Create tour stops based on setting
   * Create several tour stop dom dialog(popup) based on template
   */
  setup_setting(tour_setting) {
    this.setting = tour_setting
    this.tour_stop_array = []
    this.curr_step = 0

    this.start_cb = tour_setting.start_cb
    this.exit_cb = tour_setting.exit_cb

    tour_setting.dom_id = tour_setting.dom_id || {}
    this.wrapper_id = tour_setting.dom_id.wrapper_id || 'tour_wrapper'
    this.next_id = tour_setting.dom_id.next_id || 'tour_next'
    this.prev_id = tour_setting.dom_id.prev_id || 'tour_prev'
    this.exit_id = tour_setting.dom_id.exit_id || 'tour_exit'
    this.exit_confirm_id = tour_setting.dom_id.exit_confirm_id || 'exit_confirm'
    this.exit_cancel_id = tour_setting.dom_id.exit_cancel_id || 'exit_cancel'

    let shared_setting = tour_setting['tour_stop_shared'] || {}

    /**
     * Merge shared settings with stop setting in tour stop
     */
    tour_setting['tour_stop'].forEach(tour_stop_setting => {
      let merged_setting = {}
      $.extend(true, merged_setting, shared_setting, tour_stop_setting)
      this.tour_stop_array.push(new TourStop(this, merged_setting))
    })

    /**
     * Exit tour after interaction if setting.interaction.effect equals 'exit'
     */
    if (this.setting.interaction &&
      (
        this.setting.interaction.effect === 'exit' ||
        this.setting.interaction.effect === 'exit_after_confirmation'
      )) {
      Interaction_Action_Arr.forEach(action_name => {
        add_hook(action_name, () => {
          if (this.started) {
            /**
             * Only call exit if tour is running
             */
            if (this.setting.interaction.effect === 'exit') {
              this.exit()
            } else if (this.exit_confirm_popup) {
              this.pause()
              this.exit_confirm_popup.show()
            }
          }
        })
      })
    }

    this.load_template()
    this.load_ott_id_conversion_map()
    this.set_auto_start()
  }

  /**
   * Start tour
   */
  start() {
    this.exit(false)

    //Enable tour style
    $('#tour_style_' + this.tour_id).removeAttr('disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).removeAttr('disabled')

    this.started = true
    this.curr_step = -1
    this.goto_next()
    //disable automatically start tour once it's started
    clearTimeout(this.auto_activate_timer)

    /**
     * disable interaction if interaction.effect equals to 
     * 'block', 'exit', or 'exit_after_confirmation'
     */
    if (this.setting.interaction && (
      this.setting.interaction.effect === 'block' ||
      this.setting.interaction.effect === 'exit' ||
      this.setting.interaction.effect === 'exit_after_confirmation'
    )) {
      tree_state.disable_interaction = true
    }

    if (typeof this.start_cb === 'function') {
      this.start_cb()
    }
  }

  /**
   * Pause tour
   */
  pause() {
    if (this.curr_stop()) {
      this.curr_stop().pause()
    }
  }

  /**
   * Continue paused tour stop
   */
  continue() {
    if (this.curr_stop()) {
      this.curr_stop().continue()
    }
  }

  /**
   * Exit tour
   */
  exit(invoke_cb = true) {
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    //disable tour style
    $('#tour_style_' + this.tour_id).attr('disabled', 'disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).attr('disabled', 'disabled')

    //hide tour
    this.started = false
    this.curr_step = -1
    //set automatically start tour once it's exited
    this.set_auto_start()
    tree_state.disable_interaction = false

    if (invoke_cb && typeof this.exit_cb === 'function') {
      this.exit_cb()
    }
  }

  /**
   * Activate next tour stop
   * If current stop a transitional stop, then goto the end of current stop,
   * otherwise go to next stop
   */
  goto_next() {
    if (!this.started) {
      return
    }
    if (this.curr_stop() && this.curr_stop().is_transition_stop() && this.curr_stop().state === 'TOUR_STOP_FLYING') {
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
   * Automatically start tour if auto_activate_after is a number.
   * Start after 'auto_activate_after' length of inactivity
   */
  set_auto_start() {
    const get_inactive_duration = () => {
      const now = new Date()
      const last_active_at = tree_state.last_active_at
      if (last_active_at === null) {
        return 0
      } else {
        return now - last_active_at
      }
    }

    const is_condition_pass = () => {
      let condition_pass = true
      if (typeof this.setting.auto_activate.condition === 'function') {
        //user could use condition to conditionally auto start tour
        condition_pass = this.setting.auto_activate.condition()
      }
      return condition_pass
    }

    /**
     * If auto_activate_after is a number
     */
    if (typeof this.setting.auto_activate === 'object' && this.setting.auto_activate !== null) {
      const auto_activate_after = parseInt(this.setting.auto_activate.inactive_duration)

      if (isNaN(auto_activate_after) || auto_activate_after === 0) {
        return
      }
      /**
       * Time left before start the tour
       * If condition test failed, then reset wait time to full length.
       */
      const wait_for = is_condition_pass() ? auto_activate_after - get_inactive_duration() : auto_activate_after

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
   * Bind exit or hide exit confirm events on the buttons of exit confirm popup
   */
  bind_exit_confirm_event() {
    this.exit_confirm_popup.find(`#${this.exit_confirm_id}`).click(() => {
      this.exit()
      this.exit_confirm_popup.hide()
    })
    this.exit_confirm_popup.find(`#${this.exit_cancel_id}`).click(() => {
      this.continue()
      this.exit_confirm_popup.hide()
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

    this.load_exit_confirm_popup()

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
          $('<link rel="stylesheet" type="text/css" disabled id=tour_style_' + this.tour_id + ' />').attr(
            'href',
            style_url
          )
        )
      }
    })
  }


  /**
    * Append exit confirmation popup into tour wrapper
    */
  load_exit_confirm_popup() {
    if (this.setting.interaction && this.setting.interaction.effect === 'exit_after_confirmation') {
      if (!this.setting.interaction.hasOwnProperty('confirm_template')) {
        console.error('You choose to popup confirmation popup when user interacts, but no popup template is provided')
      } else {
        const template_url = location.protocol +
          '//' +
          location.host +
          '/' +
          this.setting.interaction.confirm_template

        const temp_div = document.createElement('div')
        $(temp_div).load(`${template_url} .container`, () => {
          $(`#${this.wrapper_id}`).append($(temp_div))
          $(temp_div).hide()
          this.exit_confirm_popup = $(temp_div)
          this.bind_exit_confirm_event()
        })

        const style_url =
          location.protocol +
          '//' +
          location.host +
          '/' +
          this.setting.interaction.confirm_template_style
        $('head').append(
          $('<link rel="stylesheet" type="text/css" disabled id=tour_exit_confirm_style_' + this.tour_id + ' />').attr(
            'href',
            style_url
          )
        )
      }
    }
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
