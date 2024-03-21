/**
 * OneZoom Tour engine
 *
 * Generate a tour of the onezoom tree from an HTML document.
 *
 * Starting a tour isn't generally done from here, rather the ``tour`` URL parameter, e.g:
 *
 *     onezoom.controller.set_treestate('?tour=/tour/data.html/superpowers');
 *     /life/?tour=/tour/data.html/superpowers
 *
 * Tours can be described in 2 ways:
 *
 * * As an HTML document, parsed by this module
 * * As a JSON document, stored in the DB & converted to HTML by ``views/tour/data.html``
 *
 * For information on the JSON fornat, see ``views/tour/data.html``.
 *
 * The HTML document describes the tour and tourstops and is of the following form, where each
 * ``div.container`` is an individual tourstop:
 *
 *     <div class="tour">
 *       <link rel="stylesheet ...><!-- NB: A tour can include CSS/JS, which will get included into the page -->
 *       <div class="container [visibility classes]"
 *            data-ott="770315"
 *            data-transition_in="fly_straight"
 *            data-transition_in_wait="1000"
 *            data-fly_in_speed="0.7"
 *            data-stop_wait="3000">
 *         ... Tour stop HTML ...
 *       </div>
 *       <div class="container" data-ott="770616">
 *         ... Tour stop HTML ...
 *       </div>
 *     </div>
 *
 * * ``[visibility classes]``: The TourStop states that a TourStop will be visible in. One of:
 *   * ``visible-transition_in``: Visible whilst transitioning to the tourstop node
 *   * ``visible-transition_out``: Visible whilst transitioning to the next tourstop node
 *   * ``hidden-active_wait``: Hidden whilst at the tourstop (NB: The default is ``visible-active_wait``)
 * * ``data-ott``: Specifies the OTT / Pinpoint that the tourstop will view, or ``0`` for point on the tree the tour started at
 * * ``data-transition_in``: The type of transition to use, one of ``leap``, ``fly_straight``. Defaults to ``flight``
 * * ``data-transition_in_wait``: Delay start of flight, in milliseconds. Defaults to 0
 * * ``data-fly_in_speed``: Relative flight speed to global setting, default is 1. See {@link controller/controller_anim/fly_on_tree_to}
 * * ``data-stop_wait``: Wait at tourstop for (stop_wait) milliseconds, then automatically move on. By default wait for user to press "next"
 *
 * Other modules provide extra functionality useful when writing tours, in particular:
 * * {@link tour/handler/HtmlAV} Autoplays/stops HTML ``<audio>`` / ``<video>`` in a tourstop based on ``data-ts_autoplay``.
 * * {@link tour/handler/QsOpts} Applies/reverts tree state based on ``data-qs_opts``, e.g. highlights, colour schemes, language.
 * * {@link tour/handler/UiEvents} Behavioural CSS classes to add to tour forward/backward/etc buttons.
 * * {@link tour/handler/TsProgress} Individual links to tourstops, showing currently visited stops.
 * * {@link tour/handler/Vimeo} Autoplays/stops embedded Vimeo in a tourstop based on ``data-ts_autoplay``.
 * * {@link tour/handler/Youtube} Autoplays/stops embedded Youtube in a tourstop based on ``data-ts_autoplay``.
 * * ``applications.OZtree.modules.embed:media_embed``: Given a media URL from one of the recognised hosting sites, generate embed HTML suitable for the handlers above.
 *
 * @module tour/Tour
 */
import handler_htmlav from './handler/HtmlAV';
import handler_qsopts from './handler/QsOpts';
import handler_uievents from './handler/UIEvents';
import handler_tsprogress from './handler/TsProgress';
import handler_vimeo from './handler/Vimeo';
import handler_youtube from './handler/Youtube';
import TourStopClass from './TourStop'
import tree_state from '../tree_state';
import { add_hook, remove_hook } from '../util';
import { resolve_pinpoints } from '../navigation/pinpoint';

const Interaction_Action_Arr = ['mouse_down', 'mouse_wheel', 'touch_start', 'touch_move', 'touch_end', 'window_size_change']

//Tour State classes
const tstate = {
  INACTIVE: 'tstate-inactive',
  PLAYING: 'tstate-playing',
  PAUSED: 'tstate-paused',
};

class Tour {
  constructor(onezoom) {
    this.onezoom = onezoom // enabling access to controller
    this.curr_step = 0
    this.prev_step = null
    this.tourstop_array = []
    this.state = tstate.INACTIVE;
    this.pinpoint_to_ozid = {}

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
    if (this.container) this.container[0].setAttribute('data-state', this._state);

    // Set CSS class if anything is happening, so UI can decide to dim
    if (this.div_wrapper) {
      const anyActive = Array.from(this.div_wrapper.children).find((c) => c.getAttribute('data-state') !== tstate.INACTIVE);
      this.div_wrapper.classList.toggle('tour-active', !!anyActive);
    }

    // When playing we should be able to block interaction
    if (new_state === tstate.PLAYING) {
      this.add_canvas_interaction_callbacks()
    } else {
      this.remove_canvas_interaction_callbacks()
    }

    // Inside a tour, leave room for tourstops during flights
    if (new_state === tstate.INACTIVE) {
      tree_state.constrain_focal_area(1, 1);
    } else if (this.container[0].hasAttribute('data-focal-area')){
      tree_state.constrain_focal_area.apply(
          tree_state,
          this.container[0].getAttribute('data-focal-area').split(" "),
      );
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
      if (window.tour_trace) console.log("Loaded tour")
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

    // Reset OTT/pinpoint to OZid map
    this.pinpoint_to_ozid = {}

    // Attach all plugins to tour, loaded when everything is finished
    return Promise.all([
      handler_uievents(this),
      resolve_pinpoints(this.tourstop_array.map((s) => !s.setting.ott || s.setting.ott === "0" ? null : s.setting.ott)).then((pps) => {
        pps.forEach((pp) => {
          this.pinpoint_to_ozid[pp.pinpoint] = pp.ozid;
        });
      }),
      handler_htmlav(this),
      handler_qsopts(this),
      handler_tsprogress(this),
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

    if (window.tour_trace) console.log("Adding canvas hooks")
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
      this.rough_initial_loc = this.onezoom.controller.largest_visible_node().ozid
      if (window.tour_trace) console.log("Tour `" + this.name + "` started")
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
   * Index of tourstop considered "next", or null to stop
   * overridden by Screensaver to create a looping tour
   */
  next_tourstop() {
    if (this.curr_step === this.tourstop_array.length - 1) {
      return null
    }
    return this.curr_step + 1;
  }

  /**
   * Go to the next tour stop immediately
   */  
  goto_next() {
    if (this.state === tstate.INACTIVE) {
      return
    }
    let next_ts = this.next_tourstop();
    if (next_ts === null) {
      // end of tour, exit gracefully
      if (typeof this.end_callback === 'function') {
          this.end_callback()
      }
      this.clear()
      return
    }
    this.prev_step = this.curr_step
    this.curr_step = next_ts
    this.state = tstate.PLAYING  // NB: Cancel any paused state
    this.curr_stop().play_from_start('forward')
  }

  /**
   * Go to previous tour stop
   */
  goto_prev() {
    this.goto_stop(Math.max(this.curr_step - 1, 0));
  }

  /**
   * Jump to given tourstop
   */
  goto_stop(requested_step) {
    if (this.state === tstate.INACTIVE) {
      return
    }
    if (this.curr_stop()) {
      this.curr_stop().exit()
    }

    if (requested_step != this.curr_step) {
      this.prev_step = this.curr_step;
      this.curr_step = requested_step;
    }

    this.state = tstate.PLAYING  // NB: Cancel any paused state
    // NB: We assume any jump is "backward", for the current use-cases it's the right thing
    //     but this may not be what we want for a quiz, e.g.
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
      if (window.tour_trace) console.log("User paused")
      this.state = tstate.PAUSED
      this.curr_stop().pause()
    }
  }

  /**
   * Resume paused tour stop
   */
  user_resume() {
    if (this.state !== tstate.INACTIVE && this.curr_stop()) {
      if (window.tour_trace) console.log("User resumed")
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
   * Listen for tourstops matched by CSS selector (target_sel), when
   * the enter one of the states in (expected_states), add_fn is called.
   * When they leave (expected_states), remove_fn is called.
   *
   * expected_states can also be "*", in which case add_fn is called for
   * every state change
   */
  tourstop_observer(target_sel, expected_states, add_fn, remove_fn) {
    var mo;
    const opts = { attributes: true, attributeOldValue: true, attributeFilter: ['data-state'] };

    if (expected_states === "*") {
      // Special observer that just fires on every state-change
      if (remove_fn) throw new Error("remove_fn should not be supplied when listening to every state");

      mo = new window.MutationObserver((mutationList, observer) => {
        for(const mutation of mutationList) {
          add_fn(this, mutation.target.tourstop, mutation.target);
        }
      });
    } else {
      expected_states = new Set(expected_states)
      mo = new window.MutationObserver((mutationList, observer) => {
        if (remove_fn) for(const mutation of mutationList) {
          const cur_active = expected_states.has(mutation.target.getAttribute(opts.attributeFilter[0]))
          const old_active = expected_states.has(mutation.oldValue)

          if (!cur_active && old_active) {
            remove_fn(this, mutation.target.tourstop, mutation.target)
          }
        }
        if (add_fn) for(const mutation of mutationList) {
          const cur_active = expected_states.has(mutation.target.getAttribute(opts.attributeFilter[0]))
          const old_active = expected_states.has(mutation.oldValue)

          if (cur_active && !old_active) {
            add_fn(this, mutation.target.tourstop, mutation.target)
          }
        }
      })
    }

    // For all tourstops selected by target_sel, add our observer
    this.container[0].querySelectorAll(':scope > ' + target_sel).forEach((el_ts) => {
      mo.observe(el_ts, opts);
    });
  }
}

export default Tour
