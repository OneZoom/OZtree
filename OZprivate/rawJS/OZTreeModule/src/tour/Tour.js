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
    this.tourstop_array = []
    this.started = false
    this.name = null
  }

  /**
   * Give an example of a tour_settings object
   * @param {boolean} as_json return a JSON string rather than a javascript object /**
   * @return {(Object|String)} An example of the 
   */
  example(as_json = false) {
    let setting_example = { 
        /* Settings general to the tour, rather that specific to each tour stop */
        "general": {
            confirm_template: 'static/tour/exit_confirm.html', // Must be defined if the interaction parameter  
            confirm_template_style: 'static/tour/exit_confirm.css', // ditto
            "dom_names": {
                /* The following values are actually the defaults, but we specify them
                 * here anyway for illustration purposes
                 */
                "wrapper_id": "tour_wrapper", /* the DOM id of the wrapper in which to
                * place the tour stops */
                "next_class": "tour_next",
                "prev_class": "tour_prev",
                "exit_class": "tour_exit",
                "exit_confirm_class": "exit_confirm",
                "exit_cancel_class": "exit_cancel"
            }
        },
        "tourstop_shared": { /* These set the "default" values for any tourstop on this
             * tour. They are overridden by any identically named values defined in each
             * element of the "tourstop" array.
             */
            "template": "static/tour/tutorial_template.html",
            "template_style": "static/tour/tutorial_template.css",
            "update_class": {
                "title": "OneZoom Demo Tour",
                "tour_next": {
                    "style": {"visibility": "hidden"}
                },
            },
            "wait": 3000 /* For this tour, by default wait 3 seconds between each stop.
            * (if not specified, the default is null, meaning wait until the "next"
            * button is pressed.
            */
        },
        "tourstops": [
            {
                "ott": "991547",
                "update_class": {
                    "window_text": "Slide 1",
                    "img": {
                        "src": "http://images.onezoom.org/99/098/31338098.jpg"
                    },
                    "tour_prev": {
                        "style": {"visibility": "hidden"} /* Hide the previous button on
                        * the first stop. Any class can be hidden like this, even the
                        * whole window (class = .container)
                        */
                    },
                },
                "wait": 6000 /* Wait a bit longer here: 6 seconds */
            },
            {
                "ott": "991547",
                "transition_in": "leap", /* can be "fly" (default), "leap", or 
                * "fly_straight" (rare)
                */
                "update_class": {
                    "window_text": {
                        "html": "Slide 2 with style change",
                        "style": {"window_text": "gray_background"}},
                    "img": {
                        "src": "http://images.onezoom.org/99/727/26848727.jpg"
                    }
                },
                // set 'wait" to null to require pressing "next" to continue
                "wait": null
            },
            {
                "ott": "81461",
                "fly_in_speed": 2, /* speed relative to the global_anim_speed, as
                * accessed via controller.set_anim_speed() & controller.get_anim_speed()
                */
                "fly_in_visibility": "show_self", /* Should we show the tourstop on
                arrival (default), during transition-in ("show_self"), or force no
                tourstops to be shown during transition in ("force_hide"). If the default
                then the previous stop is likely to carry on being shown during
                transition, unless it has chosen to hide itself
                */ 
                "transition_in_wait": 1000, /* how long to wait (e.g. after showing self)
                before entering into the transition, in milliseconds.
                */
                "update_class": {
                    "container": {"style": {"visibility": "hidden"}} /* hide everything
                    */
                },
                "wait": 3000
            },
            {
                "ott": "81461",
                "pos": "max", /*  "pos" alters the final position. For a transition_in of
                * "fly" or "fly_straight" to an internal node (not leaf) of the tree, it
                * can be set to the string "max" which makes the transition end up with
                * the internal node filling the screen (i.e. children are not visible).
                * For a transition of "leap", it can be set to an object 
                * {'xp': xp, 'yp': yp, 'ws': ws} where xp, yp, ws are numbers giving the 
                * position relative to the node
                */
                "update_class": {
                    "window_text": "Slide 4",
                    "img": {
                        "style": {"visibility": "hidden"}
                    }
                },
                "wait": 1000
            },
            {
                "ott": null, /* "ott":null means return to the (rough) starting position
                */
                "update_class": {
                    "window_text": "The End",
                    "tour_next": {
                        "style": {"visibility": "hidden"}
                    },
                },
            },
        ]
    }
    
    if (as_json) {
        return JSON.stringify(setting_example)
    } else {
        return setting_example
    }
  }


  /**
   * Create tour stops based on a settings object (which could be parsed from JSON)
   * All arguments are optional, although if tour_setting is empty, the tour is treated
   * as inactive.
   * The primary parameters that structure the tour are in the settings_object, including
   * details of the stops, paths to html templates, etc.
   *
   * @param {Object} tour_setting An object containing pre-specified elements giving 
   *    parameters of the tour and details of the tour stops. The object properties may
   *    include "general", "tourstop" and "tourstop_shared". "tourstop" should be an
   *    array describing each tour stop, with an ott and other properties specified.
   *    For an example, run the .example() method of this object.
   * @param {String} name A unique name for this tour for help in indentification. This
   *    name is added as a class to each tourstop. If null, the name is automatically set
   *    to tour_1, tour_2, etc.
   * @param {function} start_callback A function to run before the tour starts
   * @param {function} end_callback A function to run at the natural end of the tour 
   * @param {function} exit_callback A function to run at if the tour is exited prematurely
   * @param {String} interaction what to do when the user interacts with the onezoom
   *    instance, e.g. by moving the mouse on screen.
   *    - "block": disable interaction
   *    - "exit": interaction causes tour exit
   *    - "exit_after_confirmation": interaction causes tour exit, but user must confirm first
   *    - null: interaction has no effect on the tour (default)
   */
  setup_setting(tour_setting, name, start_callback, end_callback, exit_callback, interaction) {
    this.setting = tour_setting
    this.name = name || "tour_" + tour_id
    if (!this.setting) {return}
    this.tourstop_array = []
    this.curr_step = 0

    this.start_callback = start_callback
    this.end_callback = end_callback
    this.exit_callback = exit_callback
    this.interaction = interaction
    /**
     * If true, it will remove tour stop template from tour wrap when the tour is not active
     */
    this.dump_template_when_inactive = tour_setting.hasOwnProperty('dump_template_when_inactive') ? 
      tour_setting.dump_template_when_inactive : false

    tour_setting.general = tour_setting.general || {}
    tour_setting.general.dom_names = tour_setting.general.dom_names || {}
    /* set a unique wrapper ID */
    this.wrapper_id = tour_setting.general.dom_names.wrapper_id || 'tour_wrapper'
    this.exit_confirm_class = tour_setting.general.dom_names.exit_confirm_class || 'exit_confirm'
    this.exit_cancel_class = tour_setting.general.dom_names.exit_cancel_class || 'exit_cancel'
    /* the following 3 classes should probably belong to the tourstop instead */
    this.next_class = tour_setting.general.dom_names.next_class || 'tour_next'
    this.prev_class = tour_setting.general.dom_names.prev_class || 'tour_prev'
    this.exit_class = tour_setting.general.dom_names.exit_class || 'tour_exit'

    let shared_setting = tour_setting['tourstop_shared'] || {}

    /**
     * Merge shared settings with stop setting in tour stop
     */
    tour_setting.tourstops = tour_setting.tourstops || []
    tour_setting['tourstops'].forEach(tourstop_setting => {
      let merged_setting = {}
      $.extend(true, merged_setting, shared_setting, tourstop_setting)
      this.tourstop_array.push(new TourStop(this, merged_setting))
    })

    /**
     * Exit tour after interaction if setting.interaction.effect equals 'exit'
     */
    if (this.interaction &&
      (
        this.interaction === 'exit' ||
        this.interaction === 'exit_after_confirmation'
      )) {
      Interaction_Action_Arr.forEach(action_name => {
        console.log("Adding hook for " + action_name)
        add_hook(action_name, () => {
          if (this.started) {
            /**
             * Only call exit if tour is running
             */
            console.log("Action detected, exiting")
            if (this.interaction === 'exit') {
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
  }

  /**
   * Start tour
   */
  start() {
    if (!this.setting) {
        if (this.name) {
            alert("The tour " + this.name + " is disabled, as its settings are empty")
        } else {
            alert("You have tried to start a tour that has not yet been set up")
        }
    }
    this.exit(false)
    this.append_template_to_tourstop()
    //Enable tour style
    console.log("Enabling tour " + this.name + "styles")
    $('#tour_style_' + this.tour_id).removeAttr('disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).removeAttr('disabled')

    this.started = true
    this.rough_initial_loc = this.onezoom.utils.largest_visible_node()
    this.curr_step = -1
    this.goto_next()

    /**
     * disable interaction if interaction.effect equals to 
     * 'block', 'exit', or 'exit_after_confirmation'
     */
    if (this.interaction && (
      this.interaction === 'block' ||
      this.interaction === 'exit' ||
      this.interaction === 'exit_after_confirmation'
    )) {
      tree_state.disable_interaction = true
    }

    if (typeof this.start_callback === 'function') {
      this.start_callback()
    }
    console.log("Tour " + this.name + "started")
  }

  /**
   * Pause tour
   */
  pause() {
    if (this.curr_stop()) {
      this.curr_stop().pause()
    }
    //console.log("paused")
  }

  /**
   * Continue paused tour stop
   */
  continue() {
    //console.log("continuing")
    if (this.curr_stop()) {
      this.curr_stop().continue()
    }
    //console.log("continued")
  }

  /**
   * Exit tour
   */
  exit(invoke_callback = true) {
    console.log("exiting tour")
    if (this.dump_template_when_inactive) {
      this.dump_template()
    }
    if (!this.setting) {return}
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }
    this.hide_other_stops()

    //disable tour stylesheet
    $('#tour_style_' + this.tour_id).attr('disabled', 'disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).attr('disabled', 'disabled')

    //should have option to remove DOM objects here. See https://github.com/OneZoom/OZtree/issues/199

    //hide tour
    this.started = false
    this.curr_step = -1
    tree_state.disable_interaction = false

    if (invoke_callback && typeof this.exit_callback === 'function') {
      this.exit_callback()
    }
    //console.log("exited tour")

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
      //console.log("goto_next: transition_skipped")
    } else {
      if (this.curr_step === this.tourstop_array.length - 1) {
        // end of tour, exit gracefully
        if (typeof this.end_callback === 'function') {
            this.end_callback()
        }
        this.exit(false)
        return
      }
      this.curr_stop().exit()
      this.curr_step++
      this.curr_stop().play('forward')
      this.set_ui_content()
    }
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
        $('#' + this.wrapper_id).find(".tourstop").not(keep_shown).hide()
        if (keep_shown.is(":hidden")) {
            keep_shown.show()
        }
    } else {
       $('#' + this.wrapper_id).find(".tourstop").hide()
    }
  }

  /**
   * Bind previous, next, exit button event
   */
  bind_template_ui_event(tourstop) {
    tourstop.container.find('.' + this.next_class).click(() => {
      this.goto_next()
    })

    tourstop.container.find('.' + this.prev_class).click(() => {
      this.goto_prev()
    })

    tourstop.container.find('.' + this.exit_class).click(() => {
      this.exit()
    })
  }

  /**
   * Bind exit or hide exit confirm events on the buttons of exit confirm popup
   */
  bind_exit_confirm_event() {
    this.exit_confirm_popup.find('.' + this.exit_confirm_class).click(() => {
      this.exit()
      this.exit_confirm_popup.hide()
    })
    this.exit_confirm_popup.find('.' + this.exit_cancel_class).click(() => {
      this.continue()
      this.exit_confirm_popup.hide()
    })
  }

  /**
   * Fetch images in tour in advance
   */
  prefetch_image(tourstop) {
    const update_class = tourstop.setting.update_class || {}
    const container = tourstop.container
    for (let key in update_class) {
      if (typeof update_class[key] === 'object' && update_class[key].hasOwnProperty('src')) {
        container.find('.' + key).attr('src', update_class[key].src)
      }
    }
  }

  /**
   * Dump tour stop html templates from dom tree, 
   */
  dump_template() {
    this.tourstop_array.forEach(tourstop => {
      tourstop.container.remove()
      tourstop.container_appended = false
    })
  }

  /**
   * Opposite action to dump_template. This function would append tour stop templates into tour_wrapper
   */
  append_template_to_tourstop() {
    this.tourstop_array.forEach(tourstop => {
      if (!tourstop.container_appended) {
        $('#' + this.wrapper_id).append(tourstop.container)
        this.bind_template_ui_event(tourstop)
        tourstop.container_appended = true
      }
    })
  }

  /**
   * Create a div for this tour in the $(#wrapper_id) div, then fill it with
   * templates
   * Then set tourstop.container = $(temp_div)
   */
  load_template() {
    let style_url_cache = new Set()

    if ($('#' + this.wrapper_id).length === 0) {
      console.error(
        'Expected to have a tour container with id:' + this.wrapper_id + ', but none found'
      )
    }

    this.load_exit_confirm_popup()

    this.tourstop_array.forEach(tourstop => {
      /**
       * Load template div
       */
      const template_url =
        location.protocol +
        '//' +
        location.host +
        '/' +
        encodeURI(tourstop.setting.template)

      const temp_div = document.createElement('div')
      temp_div.classList.add("tourstop", this.name)
      $(temp_div).load(template_url + " .container", () => {
        $(temp_div).hide()
        tourstop.container = $(temp_div) /* this is the way to access this specific stop */

        if (!this.dump_template_when_inactive) {
          $('#' + this.wrapper_id).append($(temp_div))
          tourstop.container_appended = true
          this.bind_template_ui_event(tourstop)
        }
        
        this.prefetch_image(tourstop)
      })

      /**
       * Load template style if not loaded
       */
      if (
        tourstop.setting.template_style &&
        !style_url_cache.has(tourstop.setting.template_style)
      ) {
        style_url_cache.add(tourstop.setting.template_style)

        const style_url =
          location.protocol +
          '//' +
          location.host +
          '/' +
          encodeURI(tourstop.setting.template_style)
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
    if (this.interaction === 'exit_after_confirmation') {
      if (!this.setting.general.hasOwnProperty('confirm_template')) {
        console.error('You choose to popup confirmation popup when user interacts, but no popup template is provided')
      } else {
        const template_url = location.protocol +
          '//' +
          location.host +
          '/' +
          encodeURIComponent(this.setting.general.confirm_template)

        const temp_div = document.createElement('div')
        $(temp_div).load(template_url + " .container", () => {
          $('#' + this.wrapper_id).append($(temp_div))
          $(temp_div).hide()
          this.exit_confirm_popup = $(temp_div)
          this.bind_exit_confirm_event()
        })

        const style_url =
          location.protocol +
          '//' +
          location.host +
          '/' +
          this.setting.general.confirm_template_style
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
    this.tourstop_array.forEach(tourstop => {
      if (tourstop.setting.ott && !isNaN(tourstop.setting.ott)) {
          ott_id_set.add(tourstop.setting.ott)
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
    return this.tourstop_array[Math.abs(this.curr_step)]
  }

  /**
   * Set UI Content
   */
  set_ui_content() {
    const container = this.curr_stop().container
    const update_class = this.curr_stop().setting.update_class || {}
    for (let key in update_class) {
      /* find match in children and also if this element matches */
      const selectedDom = container.find('.' + key).add(container.filter('.' + key))
      if (selectedDom.length === 0) {
        console.error(
          'Expected to set dom content with class: ' + key + ', but dom is not found'
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
