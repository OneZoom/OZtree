import tree_state from '../tree_state';
import config from '../global_config';
import {global_button_action} from '../button_manager';
import {is_on_mobile} from '../util/index';
/**
 * Renderer controls how to render and routes different shapes to different sub renderers to render
 */
 
let last_xp = null;
let last_yp = null;
let last_ws = null;
let last_btn_data = null;
let last_btn_action = null;

//Do not skip refresh when render_id = 60, 120, 180... because we want to refresh page when node details or images get fetched.
let render_id = 0;

let controller = null;
let context = null;
let temp_context = null;
let canvas = null;
let bg_canvas = null;
let bg_context = null;

let last_draw_by_redraw = true;
  
function add_controller(_c) {
  controller = _c;
}

function setup_canvas(_c) {
  canvas = _c;
  context = canvas.getContext("2d");
  if (!bg_canvas) {
    bg_canvas = document.createElement('canvas');
    bg_context = bg_canvas.getContext('2d');
  }
  bg_canvas.width = _c.width;
  bg_canvas.height = _c.height;
}

function set_temp_context(_c) {
    temp_context = context;
    context = _c;
}

function unset_temp_context() {
    context = temp_context;
}

/**
 * This function would first dynamically develop undeveloped parts. 
 * Then it would refresh the canvas unless it is called by user moving mouse and live area has not been changed.
 * @param {Midnode} root
 * @param {String} action indicates which action cause this function call.
 */
function refresh(root) {
  reanchor_and_dynamic_load_tree();
  let start = new Date().getTime();
  let shapes = [];
  controller.projection.get_shapes(root, shapes);
  if (need_refresh()) {
    if (is_on_mobile && tree_state.is_dragging()) {
      refresh_by_image(shapes);
    } else {
      refresh_by_redraw(shapes, context);
      let end = new Date().getTime();
      adjust_threshold(end-start);
      record_view_position();
    }
  }
  release_shapes(shapes);
}


/**
 * This function would first dynamically develop undeveloped parts.
 * Then it would refresh the canvas unless it is called by user moving mouse and live area has not been changed.
 * @param {Midnode} root
 * @param {String} action indicates which action cause this function call.
 */
function draw_frame(root) {
    reanchor_and_dynamic_load_tree();
    let shapes = [];
    controller.projection.get_shapes(root, shapes);
    need_refresh(); // this still needs to be run so the render id is incremented even though we ignore the return value and draw a new frame regardless of what it says.
    refresh_by_redraw(shapes, context);
    release_shapes(shapes);
}

function release_shapes(shapes) {
  let length = shapes.length;
  for (let i=0; i<length; i++) {
    shapes[i].free();
  }
}

function reanchor_and_dynamic_load_tree() {
  if (need_reanchor()) {
    controller.reanchor();
  }
  controller.dynamic_loading()  
  controller.re_calc();
}

function need_refresh() {
  render_id++;
  return view_changed() || render_id % 60 == 0;
}

function refresh_by_image(shapes) {
  if (last_draw_by_redraw) {
    /**
     ************************************************************************************
     ***********Solve issue: page turning blank while pinching and then panning***********
     ************************************************************************************
     *
     *
     * The commented code would possibly result in blank image while pinching and then move.
     * Because refresh is fired by timer rather than mouse or touch event, front canvas does
     * not precisely reflect the current tree_state.xp and tree_state.yp.
     *
     * Suppose frame 1 is drawn at (0, 0), and last_xp and last_yp is set to (0, 0)
     * When the xp and yp changed to (2000, 2000) before frame 2, if we draw frame 2 by image, then it 
     * would first cache frame 1 in background canvas, then draw background canvas onto front canvas
     * with a shift of (2000, 2000). Clearly, most phones would fail to display any information because (2000, 2000)
     * is off the screen in frame 1.
     * .
     *
     * In our uncomment code, we draw current view on background canvas by repaint and then reset last_xp and last_yp to (1000,1000).
     *
     * Dramatically change in xp and yp while pinching is the real reason behind this issue. In pure panning, xp and yp changes are
     * so small that we wouldn't worry about shifting the background image and partial blank area is often reasonable and acceptable.
     */
    refresh_by_redraw(shapes, bg_context);
    record_view_position();
    // bg_context.clearRect(0, 0, tree_state.widthres, tree_state.heightres);
    // bg_context.drawImage(canvas, 0, 0);
  }
  context.clearRect(0,0,tree_state.widthres,tree_state.heightres);
  context.drawImage(bg_canvas, tree_state.xp - last_xp, tree_state.yp - last_yp);
  last_draw_by_redraw = false;
}

function refresh_by_redraw(shapes, _context) {
  _context.clearRect(0,0,tree_state.widthres,tree_state.heightres);
  let length = shapes.length;
  for (let i=0; i<length; i++) {
    /**
     * TODO: if in development mode, check if shape if valid
     * This would prevent bugs like: path_shape's length not defined. height of shape not defined.
     */
    shapes[i].render(_context);
  }
  last_draw_by_redraw = true;
}


/**
 * Has the view of the tree changed, or the mouseover state of a button changed?
 * @return a boolean telling us if the tree view has changed such that it requires redrawing.
 */
function view_changed() {
    if (tree_state.xp != last_xp
        || tree_state.yp != last_yp
        || tree_state.ws != last_ws)
    {
        return true; // the tree position has changed
    }
    else if (!areEqual(global_button_action.action,last_btn_action))
    {
        return true; // the button action has changed
    }
    else if (!areEqual(global_button_action.data,last_btn_data))
    {
        return true; // the button data has changed
    }
    else {
        return false; // nothing has changed if we got down to here without returning true
    }
}

/**
 * A test for two input parameters to see if they are the same
 * this is needed because the inputs may be arrays, or they may not be arrays
 * we're assuming the inputs are not generic JSON objects in which case it would be very hard to write such a function.
 * @param x the first input parameter
 * @param y the second input parameter
 * @return a boolean telling us if the two inputs are the same
 */
function areEqual(x,y) {
    if (Array.isArray(x))
    {
        if (Array.isArray(y))
        {
            // both arrays so need to test more
            if (x.length != y.length)
            {
                // not the same length so return false
                return false;
            }
            else
            {
                // the same length so need further checks
                for (var i = x.length; i--;) {
                    if (x[i] !== y[i])
                    {
                        return false; // we found an element that's not the same
                    }
                }
                return true; // they must be the same if we haven't returned false already by this point
            }
        }
        else
        {
            // one is an array the other isn't so aren't the same
            return false;
        }
    }
    else
    {
        if (Array.isArray(y))
        {
            // one is an array the other isn't so aren't the same
            return false;
        }
        else
        {
            // neither is an array so it's easy
            return x==y;
        }
    }
}

function record_view_position() {
  last_xp = tree_state.xp;
  last_yp = tree_state.yp;
  last_ws = tree_state.ws;
  last_btn_data = global_button_action.data;
  last_btn_action = global_button_action.action;
}

function adjust_threshold(duration, finding_benchmark) {
  if (!config.threshold.dynamic_adjust) return;
  if (tree_state.is_idle() && !finding_benchmark) {
    tree_state.threshold = Math.max(1, tree_state.recommond_threshold-1);
  } else if (!tree_state.is_dragging()) {
    if (duration > 400) {
      tree_state.recommond_threshold = Math.min(12, tree_state.recommond_threshold+4);
    } else if (duration > 250) {
      tree_state.recommond_threshold = Math.min(12, tree_state.recommond_threshold+2.5);
    } else if (duration > 140) {
      tree_state.recommond_threshold = Math.min(12, tree_state.recommond_threshold+1.5);
    } else if (duration > 60) {
      tree_state.recommond_threshold = Math.min(12, tree_state.recommond_threshold+0.7);
    } else if (duration < 21) {
      tree_state.recommond_threshold = Math.max(1, tree_state.recommond_threshold-0.5);
    }
    tree_state.threshold = tree_state.recommond_threshold;
  }
}

function need_reanchor() {
  //TODO: also need to test touch.
  return (tree_state.ws > 100 || tree_state.ws < 0.01) && !tree_state.flying && !tree_state.mouse_hold && !tree_state.touch_hold;
}

function find_benchmark(root) {
  reanchor_and_dynamic_load_tree();
  let start = new Date().getTime();
  let shapes = [];
  controller.projection.get_shapes(root, shapes);
  refresh_by_redraw(shapes, bg_context);
  let end = new Date().getTime();
  adjust_threshold((end-start), true);
  record_view_position();
  release_shapes(shapes);
}

export {refresh, draw_frame, add_controller, setup_canvas, find_benchmark, set_temp_context, unset_temp_context};
