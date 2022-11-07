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
import {popupstate} from '../navigation/setup_page';
import {call_hook} from '../util/index';
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
  }
  
  rebuild_tree() {
    this.factory.build_tree();
  }
  
  /**
   * Builds the initial tree
   * @param {data_obj} an object of the form {raw_data: xxx, }
   *   xxx is the raw_data newick data which represents the topology of the tree. For example: '(())'
   * @param {String} cut_map_json a stringified json object which maps node position in rawData to its cut position of its children in rawData
   * @param {Object} metadata metadata of leaves and nodes.
   */
  build_tree(data_obj) {
    data_repo.setup(data_obj);
    this.factory.build_tree();    
    this.update_form();
  }
  /**
   * onpopstate listens to browser history navigation. The popupstate callback would navigate the tree view according to url.
   */
  bind_listener() {
    this.interactor.bind_listener(this.canvas);
    window.onpopstate = popupstate;
  }
  setup_canvas(canvas) {
    this.canvas = canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.renderer.setup_canvas(canvas);
    tree_state.setup_canvas(canvas);
  }
  update_form() {
    this.projection.pre_calc(this.root, true);
    this.projection.calc_horizon(this.root);
    this.projection.re_calc(this.root, tree_state.xp, tree_state.yp, tree_state.ws);
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

  re_calc() {
    this.projection.re_calc(this.root, tree_state.xp, tree_state.yp, tree_state.ws);
  }
  reanchor() {
    position_helper.reanchor(this.root);
  }
  /**
   * @return {boolean} return true if the tree has more developed nodes after this function call.
   * developed_nodes contains most close ancestor of the nodes which have just been developed.
   */
  dynamic_loading() {
    let developed_nodes = this.factory.dynamic_loading(); // this returns the ancestor of the new nodes not the new nodes themselves.
    for (let i=0; i<developed_nodes.length; i++) {
      let node = developed_nodes[i];
      this.projection.pre_calc(node);
      this.projection.calc_horizon(node);
    }
    this.projection.update_parent_horizon(developed_nodes);
    return developed_nodes && developed_nodes.length > 0;
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
