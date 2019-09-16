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
    this.name = null
  }

  /**
   * Create tour stops based on setting. If setting is empty, the tour is inactive
   * Create several tour stop dom dialog(popups) based on template
   */
  setup_setting(tour_setting, name, start_callback, end_callback, exit_callback) {
    this.setting = tour_setting
    this.name = name
    if (!this.setting) {return}
    this.tour_stop_array = []
    this.curr_step = 0

    this.start_callback = start_callback
    this.end_callback = end_callback
    this.exit_callback = exit_callback  // if the tour is exited before the end is called

    tour_setting.dom_names = tour_setting.dom_names || {}
    this.wrapper_id = tour_setting.dom_names.wrapper_id || 'tour_wrapper'
    this.next_class = tour_setting.dom_names.next_class || 'tour_next'
    this.prev_class = tour_setting.dom_names.prev_class || 'tour_prev'
    this.exit_class = tour_setting.dom_names.exit_class || 'tour_exit'
    this.exit_confirm_class = tour_setting.dom_names.exit_confirm_class || 'exit_confirm'
    this.exit_cancel_class = tour_setting.dom_names.exit_cancel_class || 'exit_cancel'

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
    if (!this.setting) {return}
    this.exit(false)

    //Enable tour style
    $('#tour_style_' + this.tour_id).removeAttr('disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).removeAttr('disabled')

    this.started = true
    this.rough_initial_loc = this.onezoom.utils.largest_visible_node()
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

    if (typeof this.start_callback === 'function') {
      this.start_callback()
    }
  }

  /**
   * Pause tour
   */
  pause() {
    console.log("pausing")
    if (this.curr_stop()) {
      this.curr_stop().pause()
    }
    console.log("paused")
  }

  /**
   * Continue paused tour stop
   */
  continue() {
    console.log("continuing")
    if (this.curr_stop()) {
      this.curr_stop().continue()
    }
    console.log("continued")
  }

  /**
   * Exit tour
   */
  exit(invoke_callback = true) {
    console.log("exiting tour")
    if (!this.setting) {return}
    this.hide_other_stops()
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    //disable tour stylesheet
    $('#tour_style_' + this.tour_id).attr('disabled', 'disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).attr('disabled', 'disabled')

    //should have option to remove DOM objects here. See https://github.com/OneZoom/OZtree/issues/199

    //hide tour
    this.started = false
    this.curr_step = -1
    //set automatically start tour once it's exited
    this.set_auto_start()
    tree_state.disable_interaction = false

    if (invoke_callback && typeof this.exit_callback === 'function') {
      this.exit_callback()
    }
    console.log("exited tour")

  }

  /**
   * Activate next tour stop. If transition is running, go to end of the
   * current transition, otherwise go to next stop.
   */
  goto_next() {
    console.log("goto_next called")
    if (!this.started) {
      return
    }
    if (this.curr_stop() && this.curr_stop().state === 'TOURSTOP_IS_FLYING') {
      this.curr_stop().skip_transition()
      console.log("goto_next: transition_skipped")
    } else {
      if (this.curr_step === this.tour_stop_array.length - 1) {
        // end of tour, exit gracefully or loop if a screensaver
        if (this.setting.screensaver) {
            if (this.setting.screensaver.loop_back_forth) {
                this.curr_step = -this.tour_stop_array.length
            } else{
                this.curr_step = -1
            }
        } else {
            // Exit tour
            if (typeof this.end_callback === 'function') {
                this.end_callback()
            }
            this.exit(false)
            return
        }
      }
      this.curr_stop().exit()
      this.curr_step++
      this.curr_stop().play('forward')
      this.set_ui_content()
    }
    console.log("goto_next done")
  }

  /**
   * Go to previous tour stop
   */
  goto_prev() {
    if (!this.started) {
      return
    }
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    if (this.curr_step > 0) {
      this.curr_step--
    }

    this.curr_stop().play('backward')
    this.set_ui_content()
  }

  /*
   * Hide all the stops, but if one is given, and is hidden, show it
   */
  hide_other_stops(keep_shown = null) {
    if (keep_shown) {
        $(`#${this.wrapper_id}`).find(".tourstop").not(keep_shown).hide()
        if (keep_shown.is(":hidden")) {
            keep_shown.show()
        }
    } else {
       $(`#${this.wrapper_id}`).find(".tourstop").hide()
    }
  }

  /**
   * Automatically start tour if auto_activate_after is a number.
   * Start after 'auto_activate_after' length of inactivity
   */
  set_auto_start() {
    if (!this.setting) {return}
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
      if (typeof this.setting.screensaver.condition === 'function') {
        //user could use condition to conditionally auto start tour
        condition_pass = this.setting.screensaver.condition()
      }
      return condition_pass
    }

    /**
     * If auto_activate_after is a number
     */
    if (typeof this.setting.screensaver === 'object' && this.setting.screensaver !== null) {
      const auto_activate_after = parseInt(this.setting.screensaver.inactive_duration)

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
    tour_stop.container.find(`.${this.next_class}`).click(() => {
      this.goto_next()
    })

    tour_stop.container.find(`.${this.prev_class}`).click(() => {
      this.goto_prev()
    })

    tour_stop.container.find(`.${this.exit_class}`).click(() => {
      this.exit()
    })
  }

  /**
   * Bind exit or hide exit confirm events on the buttons of exit confirm popup
   */
  bind_exit_confirm_event() {
    this.exit_confirm_popup.find(`.${this.exit_confirm_class}`).click(() => {
      this.exit()
      this.exit_confirm_popup.hide()
    })
    this.exit_confirm_popup.find(`.${this.exit_cancel_class}`).click(() => {
      this.continue()
      this.exit_confirm_popup.hide()
    })
  }

  /**
   * Fetch images in tour in advance
   */
  prefetch_image(tour_stop) {
    const update_class = tour_stop.setting.update_class || {}
    const container = tour_stop.container
    for (let key in update_class) {
      if (typeof update_class[key] === 'object' && update_class[key].hasOwnProperty('src')) {
        container.find(`.${key}`).attr('src', update_class[key].src)
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
        }, but none found`
      )
    }

    this.load_exit_confirm_popup()

    this.tour_stop_array.forEach(tour_stop => {
      /**
       * Load template div
       */
      const template_url =
        location.protocol +
        '//' +
        location.host +
        '/' +
        tour_stop.setting.template

      const temp_div = document.createElement('div')
      temp_div.className = "tourstop"
      $(temp_div).load(`${template_url} .container`, () => {
        $(`#${this.wrapper_id}`).append($(temp_div))
        $(temp_div).hide()
        tour_stop.container = $(temp_div) /* this is the way to access this specific stop */
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
      if (tour_stop.setting.ott && !isNaN(tour_stop.setting.ott)) {
          ott_id_set.add(tour_stop.setting.ott)
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
    // Converting negative numbers to positive allows back & forth looping
    return this.tour_stop_array[Math.abs(this.curr_step)]
  }

  /**
   * Set UI Content
   */
  set_ui_content() {
    const container = this.curr_stop().container
    const update_class = this.curr_stop().setting.update_class || {}
    for (let key in update_class) {
      /* find match in children and also if this element matches */
      const selectedDom = container.find(`.${key}`).add(container.filter(`.${key}`))
      if (selectedDom.length === 0) {
        console.error(
          `Expected to set dom content with class: ${key}, but dom is not found`
        )
      } else {
        /**
         * Set as html (may want to disable this for publicly created tours)
         */
        if (typeof update_class[key] === 'string') {
          selectedDom.html(update_class[key])
        } else if (typeof update_class[key] === 'object') {

          /**
           * Set as html, allowing other styles etc to be set too
           */
          if (update_class[key].hasOwnProperty('html')) {
            selectedDom.html(update_class[key].html)
          }

          /**
           * Set as escaped text
           */
          if (update_class[key].hasOwnProperty('text')) {
            selectedDom.text(update_class[key].text)
          }

          /**
           * set style, e.g. to toggle show or hide
           */
          if (update_class[key].hasOwnProperty('style')) {
            selectedDom.css(update_class[key].style);
          }

          /**
           * add a class, e.g. to switch to another predefined class
           */
          if (update_class[key].hasOwnProperty('class')) {
            selectedDom.addClass(update_class[key].class);
          }

          /**
           * Set image src - warning: could be maliciously exploited
           */
          if (update_class[key].hasOwnProperty('src')) {
            selectedDom.attr('src', update_class[key].src)
          }
        } else if (typeof update_class[key] === 'function') {
          /**
           * Set by pure function
           */
          update_class[key](selectedDom)
        }
      }
    }
  }
}

export default Tour
