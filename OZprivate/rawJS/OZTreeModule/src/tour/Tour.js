import TourStopClass from './TourStop'
import tree_state from '../tree_state';
import { add_hook, remove_hook } from '../util';

let tour_id = 1
const Interaction_Action_Arr = ['mouse_down', 'mouse_wheel', 'touch_start', 'touch_move', 'touch_end']

class Tour {
  constructor(onezoom) {
    this.tour_id = tour_id++
    this.onezoom = onezoom // enabling access to controller
    this.curr_step = 0
    this.tourstop_array = []
    this.started = false
    this.name = null
    this.callback_timers = [] // To store any timers that are fired off by callbacks, so they can be cancelled if necessary
  }

  /**
   * Give an example of a tour_settings object
   * @param {boolean} as_json return a JSON string rather than a javascript object
   * @return {(Object|String)} An example of the tour settings object
   */
  example(as_json = false) {
    // TODO:
  }


  /**
   * Create tour stops based on a settings object (which could be parsed from JSON)
   * All arguments are optional, although if tour_setting is empty, the tour is treated
   * as inactive.
   * The primary parameters that structure the tour are in the settings_object, including
   * details of the stops, paths to html templates, etc.
   *
   * @param {String} tour_setting A string specifying where to fetch the tour document from,
   *    or TextContent node containing a tour HTML string
   * @param {String} name A unique name for this tour for help in indentification. This
   *    name is added as a class to each tourstop. If null, the name is automatically set
   *    to tour_1, tour_2, etc.
   * @param {function} start_callback A function to run before the tour starts, defaults
   *    to onezoom.config.ui.closeAll().
   * @param {function} end_callback A function to run at the natural end of the tour 
   * @param {function} exit_callback A function to run at if the tour is exited prematurely
   * @param {String} interaction What to do when the user interacts with the onezoom
   *    instance, e.g. by moving the mouse on screen.
   *    - "block": disable interaction
   *    - "exit": interaction causes tour exit
   *    - "exit_after_confirmation": interaction causes tour exit, but user must confirm first
   *    - null: interaction permitted, tour pauses but can be resumed (default)
   * @param {function} interaction_callback Function to call when the user interacts with
   *    the onezoom instance, e.g. by moving the mouse on screen, e.g. to activate a resume 
   *    button if the tour is set to pause on interaction
   * @param {function} ready_callback Function to call when the tour is ready to go (in
   *    particular, we have the mappings from OTT-> onezoom IDs ready
   */
  setup_setting(tour_setting, name, start_callback, end_callback, exit_callback,
                interaction, interaction_callback, ready_callback) {
    this.name = name || "tour_" + tour_id
    if (!tour_setting) {return}
    this.tourstop_array = []
    this.curr_step = 0

    this.start_callback = start_callback !== undefined ? start_callback : onezoom.config.ui.closeAll()
    this.end_callback = end_callback
    this.exit_callback = exit_callback
    this.interaction = interaction
    this.interaction_callback = interaction_callback
    this.ready_callback = ready_callback
    this.interaction_hooks = {} // when we add interaction hooks, we store the ids here so we can remove them later

    this.wrapper_id = 'tour_wrapper'  // TODO: This should be unique?
    this.exit_confirm_class = 'exit_confirm'
    this.exit_cancel_class = 'exit_cancel'
    /* the following 3 classes should probably belong to the tourstop instead */
    this.forward_class = 'tour_forward'
    this.backward_class = 'tour_backward'
    this.play_class = 'tour_play'
    this.pause_class = 'tour_pause'
    this.resume_class = 'tour_resume'
    this.exit_class = 'tour_exit'
    /* some default settings */
    this.hide_tourstop_style = {"display": "none"}
    this.show_tourstop_style = {"display": "block"}

    this.tour_loaded = new Promise((resolve) => this.resolve_tour_loaded = resolve);


    if (tour_setting instanceof window.Text) {
      // HTML TextObject (i.e. the content of a script tag), render that as our tour
      this.load_tour_from_string(tour_setting.textContent);
    } else {
      // Assume URL, fetch and render
      return $.ajax({ url: tour_setting, dataType: "html", success: this.load_tour_from_string.bind(this) });
    }
  }

  /**
   * Add the tour HTML to our page and configure ourselves accordingly
   */
  load_tour_from_string(tour_html_string) {
    let div_wrapper = document.getElementById(this.wrapper_id);

    if (!div_wrapper) {
      console.error(
        'Expected to have a tour container with id:' + this.wrapper_id + ', but none found'
      )
    }

    let tour_div = $(tour_html_string);
    tour_div.appendTo(div_wrapper)

    this.tourstop_array = [].map.call(tour_div[0].querySelectorAll(':scope > .container'), (div_tourstop) => {
      let ts = new TourStopClass(this, $(div_tourstop));
      this.bind_template_ui_event(ts);
      return ts;
    });
    this.exit_confirm_popup = tour_div.children('.' + this.exit_confirm_class)
    this.exit_confirm_popup.hide();

    this.load_ott_id_conversion_map(this.ready_callback)
    this.resolve_tour_loaded()
    if (window.is_testing) console.log("Loaded tour")
  }

  add_canvas_interaction_callbacks() {
    /** 
     * Add hooks called when the user interacts with the onezoom canvas
     */
    if (this.interaction_hooks.length) {return} // hooks already added: don't add again

    if (this.interaction == null) {
      /**
       * Default behaviour: pause tour on interaction
       */
      Interaction_Action_Arr.forEach(action_name => {
        if (window.is_testing) console.log("Adding hook for " + action_name)
        this.interaction_hooks[action_name] = add_hook(action_name, () => {
            if (typeof this.interaction_callback === 'function') {
                this.interaction_callback()
            }
            this.user_pause()
        })
      })
    } else {
      /**
       * Exit tour after interaction if setting.interaction.effect equals 'exit'
       */
      if (this.interaction === 'exit' ||
          this.interaction === 'exit_after_confirmation') {
        Interaction_Action_Arr.forEach(action_name => {
          if (window.is_testing) console.log("Adding hook for " + action_name)
          this.interaction_hooks[action_name] = add_hook(action_name, () => {
            if (window.is_testing) console.log("Action detected with interaction = " + this.interaction + ", exiting")
            if (typeof this.interaction_callback === 'function') {
                this.interaction_callback()
            }
            if (this.interaction === 'exit') {
              this.user_exit()
            } else if (this.exit_confirm_popup) {
              this.user_pause()
              this.exit_confirm_popup.show()
            }
          })
        })
      } else {
        if (typeof this.interaction_callback === 'function') {
          Interaction_Action_Arr.forEach(action_name => {
            this.interaction_hooks[action_name] = add_hook(action_name, () => {
              this.interaction_callback()
            })
          })
        }
      }
    }
  }

  remove_canvas_interaction_callbacks() {
    for (let action_name in this.interaction_hooks) {
      remove_hook(action_name, this.interaction_hooks[action_name])
    }
  }

  /**
   * Start tour
   */
  start() {
    if (this.tourstop_array.length == 0) {
        alert("This tour has no tourstops")
        return
    }
    // Make sure we only start when the tour has loaded
    return this.tour_loaded.then(() => {
      // Reset, should also set curr_step to 0
      this.clear()
      //Enable tour style
      $('#tour_style_' + this.tour_id).removeAttr('disabled')
      $('#tour_exit_confirm_style_' + this.tour_id).removeAttr('disabled')
    
      this.started = true
      this.add_canvas_interaction_callbacks()
      this.rough_initial_loc = this.onezoom.utils.largest_visible_node()
      if (window.is_testing) console.log("Tour `" + this.name + "` started")
      if (typeof this.start_callback === 'function') {
        this.start_callback()
      }

      /**
       * disable interaction - it should be restored immediately the first stop is shown
       * or on exit, but for the moment we should not allow the tour to be interrupted
       * as there may otherwise be no indication that we are on a tour
       */
      this.block_user_interaction_if_required()
      // RUN!
      this.curr_stop().play_from_start('forward')
    })
  }

  /**
   * Clear tour
   */
  clear() {
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }
    this.hide_and_show_stops()

    //disable tour stylesheet
    $('#tour_style_' + this.tour_id).attr('disabled', 'disabled')
    $('#tour_exit_confirm_style_' + this.tour_id).attr('disabled', 'disabled')

    //should have option to remove DOM objects here. See https://github.com/OneZoom/OZtree/issues/199

    //hide tour
    this.started = false
    this.curr_step = 0
    this.remove_canvas_interaction_callbacks()
    tree_state.disable_interaction = false
  }


  /**
   * Go to the next tour stop immediately
   */  
  goto_next() {
    if (!this.started) {
      return
    }
    this.curr_stop().exit()   
    if (this.curr_step === this.tourstop_array.length - 1) {
      // end of tour, exit gracefully
      if (typeof this.end_callback === 'function') {
          this.end_callback()
      }
      this.clear()
      return
    }
    this.curr_step++
    this.curr_stop().play_from_start('forward')
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

    this.curr_stop().play_from_start('backward')
  }

  /*
   * Hide all the stops (optionally, except one, which will be shown)
   * this function also takes care of user interaction which (in the deafult case of this.interaction == null) should only be allowed when a stop is shown.
   * hence other parts of the code will potentially have disallowed interaction where here needs to be allowed if a stop is being shown.
   *
   * @param {Object} keep_shown The JQuery object to show or keep shown, or null if 
   *    all stops should be hidden
   * @param {boolean} block_user_interaction_if_required If all stops are
   *    hidden and we risks hiding all the control buttons too, which means that we could
   *    accidentally pause the tour via an interaction, and we would have no idea
   *    that we are still in a tour. To avoid this, we can specify 'true' here, which
   *    bans interaction if it would normally pause or exit the tour.
   * @return {boolean} true if keep_shown stop was previously hidden, and is now revealed; false
   *     if keep_shown stop was already showing, or null if no keep_shown stop given
   */
  hide_and_show_stops(keep_shown=null, block_user_interaction_if_required=false) {
    let keep_shown_was_hidden = null
    if (block_user_interaction_if_required) {
      this.block_user_interaction_if_required()
    }
    this.tourstop_array.forEach((tourstop) => {
      if (tourstop.container == keep_shown) {
        this.restore_user_interaction_if_required()
        if (tourstop.shown()) {
          keep_shown_was_hidden = false
        } else {
          tourstop.show()
          keep_shown_was_hidden = true
        }
      } else {
        tourstop.hide()
      }
    })
    return keep_shown_was_hidden
  }

  /**
   * Fetch ott -> id conversion map
   */
  load_ott_id_conversion_map(ready_callback) {
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
      null, null,
      ready_callback
    )
  }

  curr_stop() {
    // Converting negative numbers to positive allows back & forth looping
    return this.tourstop_array[Math.abs(this.curr_step)]
  }

  /**
   * Block any user interaction in cases where it would normally be allowed: i.e. when
   * tour.interaction equals 'null' or default. In other cases, user interaction during a
   * tour is trapped and handled sensibly
   */
  block_user_interaction_if_required() {
    if (this.interaction && 
      (this.interaction === 'exit' || 
      this.interaction === 'exit_after_confirmation')) {
        //Do nothing
    } else {
      //console.log("Blocking interaction")
      // Setting tree_state.disable_interaction doesn't disable callbacks: we need to do
      // that explicitly
      this.remove_canvas_interaction_callbacks()
      tree_state.disable_interaction = true
    }
  }

  /**
   * Recover user interaction after block_user_interaction_if_required()
   */
  restore_user_interaction_if_required() {
    if (this.interaction &&
      (this.interaction === 'block' ||
      this.interaction === 'exit' ||
      this.interaction === 'exit_after_confirmation')) {
      //Do nothing
    } else {
      //console.log("Enabling interaction")
      this.add_canvas_interaction_callbacks()
      tree_state.disable_interaction = false
    }
  }

  /**
   * Clear callback timers
   */
  clear_callback_timers() {
    this.callback_timers.forEach((timer) => clearTimeout(timer))
    this.callback_timers = []
  }

  /**
   * Play tour - initiated by user
   */
  user_play() {
    if (this.started) {
      this.user_resume()
    } else {
      this.start()
    }
  }

  /**
   * Pause tour
   */
  user_pause() {
    if (this.started && this.curr_stop()) {
      if (window.is_testing) console.log("User paused")
      this.remove_canvas_interaction_callbacks() // Don't trigger any more pauses
      this.curr_stop().pause()
    }
  }

  /**
   * Resume paused tour stop
   */
  user_resume() {
    if (this.started && this.curr_stop()) {
      if (window.is_testing) console.log("User resumed")
      this.add_canvas_interaction_callbacks() // Allow interactions to trigger pauses again
      this.curr_stop().resume()
    }
  }

  /**
   * Exit tour
   */
  user_exit() {
    this.clear()
    if (typeof this.exit_callback === 'function') {
      this.exit_callback()
    }
  }

  /**
   * Activate next tour stop. If transition is running, go to end of the
   * current transition, otherwise go to next stop. Refer to Tours Timeline picture
   * and accompany table for details
   */
  user_forward() {
    let tourstop = this.curr_stop()
    this.clear_callback_timers()
    clearTimeout(this.goto_next_timer)
    
    if (!this.started) {
        user_play()
    }
    if (!tourstop) {
        console.log("Error: no current tourstop")
        return
    }
    if (tourstop.state === TourStopClass.INACTIVE) {
        console.log("Error: tried to goto_next on an inactive stop")
        return
    }
    if (tourstop.state !== TourStopClass.ARRIVED) {
        // We are in a transition
        if (tourstop.setting.transition_in !== "show_self") {
            // We are showing the previous stop or nothing at all
            //console.log("User pressed forward when transitioning with current stop not shown")
            this.curr_stop().skip_transition()
        } else {
            // We are showing the current stop
            //console.log("User pressed forward when transitioning with current stop shown")
            this.curr_stop().skip_transition()
        }
    } else {
        // We are at the tourstop and have finished transitions
        //console.log("User pressed forward at current stop")
        this.goto_next()
    }
  }

  user_backward() {
    this.goto_prev()
  }

  /**
   * Bind previous, next, pause, play, exit button event
   */
  bind_template_ui_event(tourstop) {
    tourstop.container.find('.' + this.forward_class).click(() => {
      this.user_forward()
    })

    tourstop.container.find('.' + this.backward_class).click(() => {
      this.user_backward()
    })

    tourstop.container.find('.' + this.play_class).click(() => {
      this.user_play()
    })

    tourstop.container.find('.' + this.pause_class).click(() => {
      this.user_pause()
    })

    tourstop.container.find('.' + this.resume_class).click(() => {
      this.user_resume()
    })

    tourstop.container.find('.' + this.exit_class).click(() => {
      this.user_exit()
    })
  }

  /**
   * Bind exit or hide exit confirm events on the buttons of exit confirm popup
   */
  bind_exit_confirm_event() {
    this.exit_confirm_popup.find('.' + this.exit_confirm_class).click(() => {
      this.user_exit()
      this.exit_confirm_popup.hide()
    })
    this.exit_confirm_popup.find('.' + this.exit_cancel_class).click(() => {
      this.user_resume()
      this.exit_confirm_popup.hide()
    })
  }
}

export default Tour
