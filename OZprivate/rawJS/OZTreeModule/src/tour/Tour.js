import handler_htmlaudio from './HandlerHtmlAudio';
import handler_vimeo from './HandlerVimeo';
import handler_youtube from './HandlerYoutube';
import TourStopClass from './TourStop'
import tree_state from '../tree_state';
import { add_hook, remove_hook } from '../util';

let tour_id = 1
const Interaction_Action_Arr = ['mouse_down', 'mouse_wheel', 'touch_start', 'touch_move', 'touch_end', 'window_size_change']

//Tour State classes
const tstate = {
  INACTIVE: 'tstate-inactive',
  PLAYING: 'tstate-playing',
  PAUSED: 'tstate-paused',
};

class Tour {
  constructor(onezoom) {
    this.tour_id = tour_id++
    this.onezoom = onezoom // enabling access to controller
    this.curr_step = 0
    this.prev_step = null
    this.tourstop_array = []
    this.state = tstate.INACTIVE;

    this.wrapper_id = 'tour_wrapper';
    this.div_wrapper = document.getElementById(this.wrapper_id);
    if (!this.div_wrapper) {
      console.error(
        'Expected to have a tour container with id:' + this.wrapper_id + ', but none found'
      )
    }
  }

  /**
   * Give an example of a tour_settings object
   * @param {boolean} as_json return a JSON string rather than a javascript object
   * @return {(Object|String)} An example of the tour settings object
   */
  example(as_json = false) {
    // TODO:
  }

  get state() {
    return this._state || tstate.INACTIVE;
  }
  set state(new_state) {
    this._state = new_state;

    // Update container state based on our state
    // NB: Do this atomically so we don't generate mutation noise
    if (this.container) this.container[0].className = this.container[0].className.replace(/ tstate-(\w+)|$/, ' ' + this._state);

    // When playing we should be able to block interaction
    if (new_state === tstate.PLAYING) {
      this.add_canvas_interaction_callbacks()
    } else {
      this.remove_canvas_interaction_callbacks()
    }

    return this._state;
  }

  /**
   * If the tour is active, return the current tour_setting URL
   * otherwise, return null
   */
  get_active_setting() {
    if (this._state === tstate.INACTIVE) return null
    if (typeof this.tour_setting === 'string') {
        return this.tour_setting + "@" + this.curr_step
    }
    return this.tour_setting
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
   * @param {function} start_callback A function to run before the tour starts
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
  setup_setting(tour_setting, start_callback, end_callback, exit_callback,
                interaction, interaction_callback, ready_callback) {
    if (!tour_setting) {return}
    this.tour_setting = tour_setting
    this.tourstop_array = []
    this.curr_step = 0
    this.prev_step = null
    this.container = null

    this.start_callback = start_callback || (() => {});
    this.end_callback = end_callback || (() => {});
    this.exit_callback = exit_callback || (() => {});
    this.interaction = interaction
    this.interaction_callback = interaction_callback || (() => {});
    this.ready_callback = ready_callback || (() => {});
    this.interaction_hooks = {} // when we add interaction hooks, we store the ids here so we can remove them later

    var resolve_tour_loaded;
    this.tour_loaded = new Promise((resolve) => resolve_tour_loaded = resolve).then(() => {
      if (window.is_testing) console.log("Loaded tour")
      return this.ready_callback();
    });

    if (tour_setting instanceof window.Text) {
      // HTML TextObject (i.e. the content of a script tag), render that as our tour
      return this.load_tour_from_string(tour_setting.textContent).then(resolve_tour_loaded);
    } else {
      // Assume URL, fetch and render
      let tour_start_step = null
      let m = tour_setting.match(/(.*?)@([0-9]+$)/)
      if (m) {
        this.tour_setting = tour_setting = m[1]
        tour_start_step = parseInt(m[2])
      }
      return $.ajax({ url: tour_setting, dataType: "html", success: (s) => {
        return this.load_tour_from_string(s, tour_start_step).then(resolve_tour_loaded);
      }});
    }
  }

  /**
   * Add the tour HTML to our page and configure ourselves accordingly
   */
  load_tour_from_string(tour_html_string, tour_start_step) {
    var old_loading_tour = window.loading_tour;
    window.loading_tour = this;
    this.container = $(tour_html_string);
    this.container.appendTo(this.div_wrapper)
    window.loading_tour = old_loading_tour;

    // Join classes to make up a descriptive name
    this.name = (this.container[0].className || '').replace(/\s+/g, '__')

    this.tourstop_array = [].map.call(this.container[0].querySelectorAll(':scope > .container'), (div_tourstop) => {
      let ts = new TourStopClass(this, $(div_tourstop));
      return ts;
    });
    if (this.tourstop_array.length > 0) {
      this.tourstop_array[0].container.addClass('ts-first')
      this.tourstop_array[this.tourstop_array.length - 1].container.addClass('ts-last')
    }
    this.exit_confirm_popup = this.container.children('.exit_confirm')
    this.exit_confirm_popup.hide();

    // Reset tour to the desired step, or start
    this.clear(tour_start_step)

    // Attach all plugins to tour, loaded when everything is finished
    return Promise.all([
      this.bind_ui_events(),
      new Promise((resolve) => {
        // Fetch ott -> id conversion map
        const ott_id_set = new Set();
        this.tourstop_array.forEach(tourstop => {
          if (tourstop.setting.ott && !isNaN(tourstop.setting.ott)) {
              ott_id_set.add(tourstop.setting.ott)
          }
        });

        const ott_id_array = [];
        for (let ott_id of ott_id_set.values()) {
          ott_id_array.push({ OTT: ott_id })
        };

        this.onezoom.utils.process_taxon_list(
          JSON.stringify(ott_id_array),
          null, null,
          resolve
        )
      }),
      handler_htmlaudio(this),
      handler_vimeo(this),
      handler_youtube(this),
    ]);
  }

  add_canvas_interaction_callbacks() {
    let fn;

    /** 
     * Add hooks called when the user interacts with the onezoom canvas
     */
    if (this.interaction_hooks.length) {return} // hooks already added: don't add again

    if (this.interaction == null) {
      /**
       * Default behaviour: pause tour on interaction
       */
      fn = () => this.user_pause()
    } else if (this.interaction === 'exit') {
      /**
       * Exit tour after interaction
       */
      fn = () => this.user_exit()
    } else if (this.interaction === 'exit_after_confirmation') {
      /**
       * Exit tour after interaction & confirmation
       */
      fn = () => { this.user_pause() ; this.exit_confirm_popup.show() }
    } else if (this.interaction === 'block') {
      /**
       * Block: Stop any other interaction happening
       * (NB: any custom interaction will happen first)
       */
      fn = () => false
    } else if (this.interaction === 'block_on_flight') {
      /**
       * Block during flight, otherwise pause tour
       */
      fn = () => {
          if (tree_state.flying) return false;
          this.user_pause()
      }
    } else {
      throw new Error("Unknown value of interaction setting: " + this.interaction)
    }

    if (window.is_testing) console.log("Adding canvas hooks")
    Interaction_Action_Arr.forEach(action_name => {
        if (typeof this.interaction_callback === 'function') {
            // Add the user's interaction callback as well
            this.interaction_hooks[action_name + '_custom'] = add_hook(action_name, this.interaction_callback)
        }
        this.interaction_hooks[action_name] = add_hook(action_name, fn)
    })
  }

  remove_canvas_interaction_callbacks() {
    for (let action_name in this.interaction_hooks) {
      remove_hook(action_name, this.interaction_hooks[action_name])
      delete this.interaction_hooks[action_name];
    }
  }

  /**
   * Start tour
   */
  start() {
    // Make sure we only start when the tour has loaded
    return this.tour_loaded.then(() => {
      if (this.tourstop_array.length == 0) {
          alert("This tour has no tourstops")
          return
      }

      this.state = tstate.PLAYING
      this.rough_initial_loc = this.onezoom.utils.largest_visible_node()
      if (window.is_testing) console.log("Tour `" + this.name + "` started")
      if (typeof this.start_callback === 'function') {
        this.start_callback()
      }

      // RUN!
      this.curr_stop().play_from_start('forward')
    })
  }

  /**
   * Clear tour, reset to start_step (or first step if not specified)
   */
  clear(start_step) {
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }
    if (this.prev_stop()) this.prev_stop().exit()
    this.state = tstate.INACTIVE

    //hide tour
    this.curr_step = start_step || 0
    this.prev_step = null
  }

  /**
   * Remove tour from DOM, ready to be thrown away
   */
  remove() {
    this.clear()

    this.tourstop_array = []
    if (this.container) this.container.remove()
  }

  /**
   * Go to the next tour stop immediately
   */  
  goto_next() {
    if (this.state === tstate.INACTIVE) {
      return
    }
    // Leave current stop
    this.curr_stop().leave();
    if (this.curr_step === this.tourstop_array.length - 1) {
      // end of tour, exit gracefully
      if (typeof this.end_callback === 'function') {
          this.end_callback()
      }
      this.clear()
      return
    }
    this.prev_step = this.curr_step++
    this.state = tstate.PLAYING  // NB: Cancel any paused state
    this.curr_stop().play_from_start('forward')
  }

  /**
   * Go to previous tour stop
   */
  goto_prev() {
    if (this.state === tstate.INACTIVE) {
      return
    }
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    if (this.curr_step > 0) {
      this.prev_step = this.curr_step--
    }

    this.state = tstate.PLAYING  // NB: Cancel any paused state
    this.curr_stop().play_from_start('backward')
  }

  curr_stop() {
    // Converting negative numbers to positive allows back & forth looping
    // NB: Math.abs(null) === 0, so have to check first
    return this.curr_step === null ? null : this.tourstop_array[Math.abs(this.curr_step)]
  }

  prev_stop() {
    return this.prev_step === null ? null : this.tourstop_array[Math.abs(this.prev_step)]
  }

  /**
   * Play tour - initiated by user
   */
  user_play() {
    if (this.state !== tstate.INACTIVE) {
      this.user_resume()
    } else {
      this.clear()
      this.start()
    }
  }

  /**
   * Pause tour
   */
  user_pause() {
    if (this.state !== tstate.INACTIVE && this.curr_stop()) {
      if (window.is_testing) console.log("User paused")
      this.state = tstate.PAUSED
      this.curr_stop().pause()
    }
  }

  /**
   * Resume paused tour stop
   */
  user_resume() {
    if (this.state !== tstate.INACTIVE && this.curr_stop()) {
      if (window.is_testing) console.log("User resumed")
      this.state = tstate.PLAYING
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
    // Results of any advance() will cancel any pause
    this.state = tstate.PLAYING;

    // NB: advance will then call goto_next() if required
    this.curr_stop().advance()
  }

  user_backward() {
    this.goto_prev()
  }

  /**
   * Bind previous, next, pause, play, exit button event
   */
  bind_ui_events() {
    const document = this.container[0].ownerDocument;

    this.container.click((e) => {
      var target = $(e.target).closest('.tour_forward,.tour_backward,.tour_play,.tour_pause,.tour_resume,.tour_exit,.exit_confirm,.exit_cancel');

      if (target.length === 0) return;
      if (target.hasClass('tour_forward')) return this.user_forward()
      if (target.hasClass('tour_backward')) return this.user_backward()
      if (target.hasClass('tour_play')) return this.user_play()
      if (target.hasClass('tour_pause')) return this.user_pause()
      if (target.hasClass('tour_resume')) return this.user_resume()
      if (target.hasClass('tour_exit')) return this.user_exit()
      if (target.hasClass('exit_confirm')) {
        this.exit_confirm_popup.hide()
        return this.user_exit()
      }
      if (target.hasClass('exit_cancel')) {
        this.exit_confirm_popup.hide()
        return this.user_resume()
      }
    })

    // Listen to document level visibility (read: inactive tab), translate to tourstop blocks
    const onVisibilityChange = (e) => {
      this.tourstop_array.forEach((ts) => {
        ts.block_toggle('hiddentab', document.visibilityState !== 'visible');
      });
    };
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  /**
   * Generate a mutation observer listening for (class_to_notify) being
   * added / removed
   */
  tourstop_observer(target_sel, class_to_notify, add_fn, remove_fn) {
    const active_re = new RegExp(class_to_notify.map((s) => '(?:^| )' + s + '(?:$| )').join("|"))

    const mo = new window.MutationObserver((mutationList, observer) => {
      for(const mutation of mutationList) {
        const cur_active = !!mutation.target.className.match(active_re)
        const old_active = !!mutation.oldValue.match(active_re)

        if (cur_active && !old_active && add_fn) {
          add_fn(this, mutation.target)
        } else if (!cur_active && old_active && remove_fn) {
          remove_fn(this, mutation.target)
        }
      }
    })
    const opts = { attributes: true, attributeOldValue: true, attributeFilter: ['class'] };

    // For all tourstops selected by target_sel, add our observer
    this.container[0].querySelectorAll(':scope > ' + target_sel).forEach((el_ts) => {
      mo.observe(el_ts, opts);
    });
  }
}

export default Tour
