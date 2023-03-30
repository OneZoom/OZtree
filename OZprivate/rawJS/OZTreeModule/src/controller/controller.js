/** @class Controller */
import * as position_helper from '../position_helper';
import config from '../global_config';
import tree_state from '../tree_state';
import install_controller_dom from './controller_dom';
import install_controller_loc from './controller_loc';
import install_controller_search from './controller_search';
import install_controller_anim from './controller_anim';
import install_controller_interactor from './controller_interactor';
import install_controller_tour from './controller_tour';
import {reset_global_button_action} from '../button_manager';
import get_interactor from '../interactor/interactor';
import * as renderer from '../render/renderer';
import get_projection from '../projection/projection';
import {get_factory} from '../factory/factory';
import { setup_page_by_location } from '../navigation/setup_page';
import { record_url_delayed } from '../navigation/record';
import { add_hook, call_hook} from '../util/index';
import data_repo from '../factory/data_repo';

/**
 * Controller is the hub of the app. It defines methods that would be used in other modules and possibly delegates these functions to its components, like factory, renderer, etc.
 * Controller 
 */
class Controller {
  constructor() {
    this.interactor = get_interactor();
    this.renderer = renderer;
    this.projection = get_projection();
    this.factory = get_factory();
    this.interactor.add_controller(this);
    this.renderer.add_controller(this);

    // Set-up the record_url-after-flight hook, wiring up the controller
    add_hook("flying_finish", record_url_delayed.bind(null, this));
  }
  
  /**
   * (re)build tree, on init or tree-change.
   * Assumes that the data_repo has already been set-up with data_repo.setup()
   */
  rebuild_tree() {
    this.factory.build_tree();

    this.dynamic_load_and_calc(this.root.ozid);
    this.re_calc();
  }
  
  /**
   * onpopstate listens to browser history navigation. The popupstate callback would navigate the tree view according to url.
   */
  bind_listener() {
    this.interactor.bind_listener(this.canvas);
    window.onpopstate = setup_page_by_location.bind(null, this);
  }
  setup_canvas(canvas) {
    this.canvas = canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.renderer.setup_canvas(canvas);
    tree_state.setup_canvas(canvas);
  }
  reset() {
    return this.leap_to(this.root.metacode);  // NB: root is always a node, so ozID positive
  }
  draw_loading() {
    config.ui.loadingMessage(true);
  }
  /**
   * Set finding_benchmark_remain to N. In the next N frame, using background 
   * canvas to draw tree and adjust drawing threshold according to frame cost.
   */
  find_proper_initial_threshold(finding_benchmark_remain) {
    if (finding_benchmark_remain === undefined) {
      finding_benchmark_remain = 5;
    }
    if (finding_benchmark_remain > 0) {
      let self = this;
      self.renderer.find_benchmark(self.root);
      finding_benchmark_remain--;
      window.requestAnimationFrame(function() {
        self.find_proper_initial_threshold(finding_benchmark_remain)
      });
    }
  }

    /**
     * Draw a single frame on a given context
     */
    draw_single_frame(newcontext) {
        this.stop_refresh_loop() // stop refresh loop to prevent problems
        if (newcontext)
        {
            this.renderer.set_temp_context(newcontext);
            // save old context if needed
        }
        reset_global_button_action();
        this.renderer.draw_frame(this.root); // this forces a frame draw unlike refresh which was built for a different purpose.
        if (newcontext)
        {
            this.renderer.unset_temp_context();
            // reload old context
        }
        this.trigger_refresh_loop() // restart refresh loop
    }
    
  /**
    * Start / keep the refresh loop running
    *
    * Any events that will result in a change of view should call
    * trigger_refresh_loop(), if no calls happen after 3 seconds
    * then screen redraw will stop until the next trigger_refresh_loop()
    */
  trigger_refresh_loop() {
    function refresh_loop() {
      call_hook("before_draw");
      if ((this.widthres != this.canvas.clientWidth)||(this.heightres != this.canvas.clientHeight))
      {
          this.widthres = this.canvas.width = this.canvas.clientWidth;
          this.heightres = this.canvas.height = this.canvas.clientHeight;
          // we are setting 1px on canvas = 1px on screen (client)
          this.cancel_flight();
          this.re_calc();
          this.renderer.setup_canvas(this.canvas);
          tree_state.setup_canvas(this.canvas);
      }
      reset_global_button_action();
      tree_state.last_render_at = new Date();
      this.renderer.refresh(this.root);
      call_hook("after_draw");

      if (tree_state.flying || Date.now() < this._refresh_timeout) {
        this.refresh_timer = window.requestAnimationFrame(refresh_loop.bind(this));
      } else {
        // No activity, idle out
        this.refresh_timer = null;
      }
    }

    this._refresh_timeout = Date.now() + 3000;
    if (!this.refresh_timer) {
      config.ui.loadingMessage(false);
      this.refresh_timer = window.requestAnimationFrame(refresh_loop.bind(this));
    }
  }

  /** Force the refresh loop to stop */
  stop_refresh_loop() {
    this._refresh_timeout = 0;
    window.cancelAnimationFrame(this.refresh_timer);
    this.refresh_timer = null;
  }

  /**
   * Load new midnodes, either aiming at a target OZid or 'visible' for nodes currently in view
   */
  dynamic_load_and_calc(target_OZid = null, { generation_at_searched_node = 0, generation_on_subbranch = 0 } = {}) {
    var node, precalc_from;

    if (target_OZid === 'visible') {
      node = this.factory.dynamic_loading_by_visibility();
      precalc_from = node;
      // If nothing to develop, return
      if (!node) return;
    } else {
      node = this.factory.dynamic_loading_by_metacode(target_OZid);
      // NB: _by_visibility returns the last existant node, _by_metacode returns the target node
      //     (which may not have existed). Ideally we should know both here.
      //     As we've no idea what the last existant node was, assume root.
      precalc_from = this.root;
    }

    // Develop upwards and outwards
    node.develop_children(generation_at_searched_node);
    if (generation_on_subbranch > 0) {
      node.develop_branches(generation_on_subbranch);
      precalc_from = this.root;
    }

    this.projection.pre_calc(precalc_from, precalc_from.upnode === null);
    this.projection.calc_horizon(precalc_from)
    this.projection.update_parent_horizon(precalc_from)

    return node;
  }

  /**
   * Recalculate all positions, e.g. after a tree move
   */
  re_calc() {
    this.projection.re_calc(this.root, tree_state.xp, tree_state.yp, tree_state.ws);
  }
  reanchor() {
    position_helper.reanchor(this.root);
  }
  get root() {
    return this.factory.get_root();
  }
}

/**
 * In order to keep the controller file small, I split its prototypes in several files and call the following functions to add these prototypes on Controller.
 */
install_controller_loc(Controller);
install_controller_search(Controller);
install_controller_dom(Controller);
install_controller_anim(Controller);
install_controller_interactor(Controller);
install_controller_tour(Controller);


let controller;
function get_controller() {
  if (!controller) {
    controller = new Controller();
  }
  return controller;
}
export default get_controller;
