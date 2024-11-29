import tree_state from './tree_state';
import {max, min} from './util/index';

let x_add = null;
let y_add = null;
let r_mult = null;
let fly_start_time = null;
let global_anim_speed = 10; // set this to 15 for recoding smoother flight animations larger numbers mean slower
/**
 * The duration of this phase of the flight in seconds.
 * Not necessarily the duration to the target as we may need to re-anchor after this phase and keep going. 
 */
let fly_duration_s = null; 
let more_flying_needed = null;
let original_flight_fps = 1000/60; // the frame rate used when global_anim_speed was calibrated
let into_node;
let pre_xp, pre_yp, pre_ws;
let fly_frame_request_id = null

/** Update xvar, yvar and rvar of all targeted nodes and their direct children based on that of anchored nodes. */
function drawreg_target(node,x,y,r) {
  // we assume that only those for whom graphref is true will call this routine
  if (node.has_child) {
    let graphref_index = null;
    for (let i=0; i<node.children.length; i++) {
      let child = node.children[i];
      if (child.graphref) {
        drawreg_target(child, x, y, r);
        node.rvar = child.rvar/node.nextr[i];
        node.xvar = child.xvar-node.rvar*node.nextx[i];
        node.yvar = child.yvar-node.rvar*node.nexty[i];
        graphref_index = i;
        break;
      }
    }
    if (graphref_index !== null && node.targeted) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        if (i !== graphref_index) {
          drawreg2_target(node.children[i], node.xvar+node.rvar*node.nextx[i], node.yvar+node.rvar*node.nexty[i], node.rvar*node.nextr[i]);
        }
      }
    } else if (graphref_index === null) {
      drawreg2_target(node, x, y, r);
    }
  } else {
    // we are a leaf and we are referencing - we are the referencing node so record x,y,r
    drawreg2_target(node, x,y,r); //does all we need and will automatically skip any child commands
  }
}

function drawreg2_target(node, x,y,r) {
  node.xvar = x;
  node.yvar = y;
  node.rvar = r;
  if(node.targeted) {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      drawreg2_target(node.children[i], x+r*node.nextx[i], y+r*node.nexty[i], r*node.nextr[i]);
    }
  }
}

/**
 * Update x_add / y_add / r_mult / more_flying_needed globals,
 * either to node location if developed, or x2/y2/r2
 */
function get_xyr_target(node, x2,y2,r2,into_node) {
  let x = node.rvar ? node.xvar : x2;
  let y = node.rvar ? node.yvar : y2;
  let r = node.rvar ? node.rvar : r2;

  // Node not targeted / already there --> nothing to do.
  if (!node.targeted && r_mult >= 0.00000001) return;

  // Work out desired bounding box for this node
  let x_targ_max;
  let x_targ_min;
  let y_targ_max;
  let y_targ_min;
  // we don't want to include the stem in this and so we include both child horizons only
  if (node.has_child) {
    if (into_node&&into_node==true) {
      [x_targ_max, x_targ_min, y_targ_max, y_targ_min] = get_v_horizon_by_arc(node, 1.1, x, y, r);
    } else {
      [x_targ_max, x_targ_min, y_targ_max, y_targ_min] = get_v_horizon_by_child(node, x, y, r);
    }
  } else {
    [x_targ_max, x_targ_min, y_targ_max, y_targ_min] = get_v_horizon_by_arc(node, 1.305, x, y, r);
  }

  // find out if new target area is constained by x or y axis compared to current view
  if (tree_state.focal_area.width / tree_state.focal_area.height > (x_targ_max-x_targ_min)/(y_targ_max-y_targ_min)) {
    // height controls size
    r_mult = tree_state.focal_area.height / (y_targ_max-y_targ_min);
  } else {
    // width controls size
    r_mult = tree_state.focal_area.width / (x_targ_max-x_targ_min);
  }

  // Center node in focal area
  x_add = (x_targ_max+x_targ_min)/2 - tree_state.focal_area.xcentre;
  y_add = (y_targ_max+y_targ_min)/2 - tree_state.focal_area.ycentre;

  // only go 1000000 at a time on r_mult
  if (r_mult >= 10000000 && !node.graphref) {
    more_flying_needed = true;
    return;
  }

  // No children, nowhere to recurse to
  if (!node.has_child) return;

  // Find the first child that's targeted, recurse & use those values
  for (let i=0; i < node.children.length; i++) {
    let child = node.children[i];
    if (child.targeted) {
      get_xyr_target(child, x+r*node.nextx[i],y+r*node.nexty[i],r*node.nextr[i],into_node);
      return;
    }
  }

  // If we didn't find a target child, use graphref/gvar to recurse
  if (r_mult < 0.00000001) more_flying_needed = true;
  for (let i=0; i<node.children.length; i++) {
    let child = node.children[i];
    if (child.graphref && !child.gvar) {
      get_xyr_target(child, x+r*node.nextx[i],y+r*node.nexty[i],r*node.nextr[i],into_node);
      return;
    }
  }
}

function deanchor(node) {
  if (node.graphref) {
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      deanchor(node.children[i]);
    }
    node.graphref = false;
  }
}


// OZid gives us the OneZoom ID of the leaf or node we need to zoom into (
// (negative for a leaf, positive for an internal node
// If midnode has stored_metacode, then it has not been fully developed yet. 
// Otherwise it stores its metacode in node.metacode.
function target_by_code(node, OZid) {
  let target_is_leaf = OZid < 0
  if (target_is_leaf && node.is_leaf && (node.metacode == -OZid)) {
    node.targeted = true;
  } else if ((!target_is_leaf) && node.is_interior_node && (node.metacode == OZid)) {
    node.targeted = true;
  } else if (node.has_child) {
    node.targeted = false;
    for (let i=0; i<node.children.length; i++) {
      let child = node.children[i];
      node.targeted = node.targeted || target_by_code(child, OZid);
    }
  } else {
    node.targeted = false;
  }
  return node.targeted;
}

function get_v_horizon_by_child(node, x, y, r) {
  let xmax = [], ymax = [], xmin = [], ymin = [];
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    let child = node.children[i];
    xmax.push(x+r*node.nextx[i] + r*node.nextr[i]*child.hxmax);
    xmin.push(x+r*node.nextx[i] + r*node.nextr[i]*child.hxmin);
    ymax.push(y+r*node.nexty[i] + r*node.nextr[i]*child.hymax);
    ymin.push(y+r*node.nexty[i] + r*node.nextr[i]*child.hymin);
  }
  let vxmax = max.apply(null, xmax);
  let vxmin = min.apply(null, xmin);
  let vymax = max.apply(null, ymax);
  let vymin = min.apply(null, ymin);
  return [vxmax, vxmin, vymax, vymin];
}

function get_v_horizon_by_arc(node, factor, x, y, r) {
  let vxmax = (x+r*(node.arcx+node.arcr*factor));
  let vxmin = (x+r*(node.arcx-node.arcr*factor));
  let vymax = (y+r*(node.arcy+node.arcr*factor));
  let vymin = (y+r*(node.arcy-node.arcr*factor)); // add for leaf points   *1.305 doesn't care about the leaf direction - could change this later perhaps
  return [vxmax, vxmin, vymax, vymin]
}


// this function clears completely all the targeted tags in the tree
function clear_target(node) {
  // set value to false
  node.targeted = false;
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    clear_target(node.children[i]);
  }
}

/**
 * Fly to targeted node
 *
 * Targeted node is set with target_by_code()
 *
 * @param {controller} controller OneZoom Controller object
 * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node fills the screen, rather than
 * the wider-angle viewpoint that to show the entire tree structure descended from that node.
 * @param {func} speed is optional, and gives the relative speed compared to the globally set
 *   animation speed (greater than 1 gives faster animations, less than one gives slower, Infinity is a leap)
 * @param {func} accel_type is optional, and gives the acceleration type ('accel', 'decel' or 'linear' (default)
 * @param {func} finalize_func is optional, and gives a function to call at the end of the zoom
 * @param {func} abrupt_func is optional, and gives a function to call when fly is abrupted
 * @return {boolean} returns false if the distance to codein_fly is too short so there is no animation performed.
 */
function perform_actual_fly(controller, into_node, speed=1, accel_type="linear", finalize_func=null, abrupt_func=null) {
  tree_state.flying = true;
  more_flying_needed = false;
  drawreg_target(controller.root, tree_state.xp, tree_state.yp, 220*tree_state.ws);
  pre_xp = tree_state.xp;
  pre_yp = tree_state.yp;
  pre_ws = tree_state.ws;
  get_xyr_target(controller.root, tree_state.xp, tree_state.yp, 220*tree_state.ws, into_node);
  fly_start_time = performance.now();
  if(((r_mult>0.9999)&&(r_mult<1.00001))&&(x_add*x_add<1)&&(y_add*y_add<1)) {
    // nothing to zoom to so better to do nothing and return false or it feels like a bug
    if (typeof finalize_func === "function") {
      finalize_func()
    }
    return false;
  } else if (speed === Infinity) {
    // Infinite speed, i.e. leap straight to destination
    pan_zoom(1, 1);
    controller.re_calc();
    controller.reanchor();
    if (more_flying_needed) {
      perform_actual_fly(controller, into_node, speed, accel_type, finalize_func, abrupt_func);
      return true;
    }
    controller.trigger_refresh_loop();
    tree_state.flying = false;
    if (typeof finalize_func === "function") {
      finalize_func()
    }
    return true;
  } else {
    fly_duration_s = Math.max(Math.abs(Math.log(r_mult)) * global_anim_speed, 12) / speed / original_flight_fps;
    fly_frame_request_id = requestAnimationFrame(function () {
      perform_fly_b2(controller, into_node, speed, accel_type, finalize_func, abrupt_func);
    });
    return true;
  }
}



/**
 * Perform flight set up in globals.
 * @param {controller} controller OneZoom Controller object
 * @param {boolean} into_node Set this to 'true' to end up zoomed so the interior node fills the screen, rather than
 * the wider-angle viewpoint that to show the entire tree structure descended from that node.
 * @param {func} speed gives the relative speed compared to the globally set animation speed
 * @param {string} accel_type Acceleration curve to use for this flight
 *    - 'accel': Accelerate away from node
 *    - 'decel': Decelerate into node
 *    - '' (or anything else): Linear
 * @param {func} finalize_func is optional, and gives a function to call at the end of the zoom
 * @param {func} abrupt_func is optional, and gives a function to call when fly is abrupted
 */
function perform_fly_b2(controller, into_node, speed, accel_type, finalize_func, abrupt_func) {

  const time_proportion = (performance.now() - fly_start_time) / 1000 / fly_duration_s;
  const clamped_time_proportion = Math.max(0, Math.min(time_proportion, 1));

  function pan_proportion(time_proportion) {
    var out = (Math.sin((time_proportion+0.25) * Math.PI*2) + 1) / 2;

    return accel_type === 'accel' ? (time_proportion > 0.5 ? out : 0)
         : accel_type === 'decel' ? 1 - (time_proportion < 0.5 ? out : 0)
         : time_proportion;
  }
  function zoom_proportion(time_proportion) {
    var out = (Math.sin((time_proportion+1.5) * Math.PI) + 1) / 2;

    return accel_type === 'accel' ? out
         : accel_type === 'decel' ? out
         : time_proportion;
  }

  if (more_flying_needed) {
    //need to reanchor, this sometimes causes jerkiness
    //also we may not know how many steps we will need to take
    // NB: Approximate accel/decel by not panning at all, let the final non-reanchor step handle it
    pan_zoom(accel_type === 'accel' || accel_type === 'decel'? 0 : clamped_time_proportion, clamped_time_proportion);
    tree_state.set_action(r_mult > 1 ? "fly-in" : "fly-out");
    controller.re_calc();
    controller.reanchor();
    controller.trigger_refresh_loop();

    if (tree_state.flying) {
      perform_actual_fly(controller, into_node, speed, 'linear', finalize_func, abrupt_func);
    } else if (typeof abrupt_func === 'function') {
      abrupt_func()
    }

  } else {
    //don't need to reanchor - this is more normal, and is smoother
    pan_zoom(
      pan_proportion(clamped_time_proportion),
      zoom_proportion(clamped_time_proportion)
    );
    tree_state.set_action(r_mult > 1 ? "fly-in" : "fly-out");
    controller.re_calc();
    controller.trigger_refresh_loop();
    
    cancelAnimationFrame(fly_frame_request_id);

    if (time_proportion < 1) {
      fly_frame_request_id = requestAnimationFrame(function () {
        if (tree_state.flying) {
          perform_fly_b2(controller, into_node, speed, accel_type, finalize_func, abrupt_func);
        } else if (typeof abrupt_func === 'function') {
          abrupt_func()
        }
      });
    } else {
      tree_state.flying = false;
      tree_state.set_action(null);
      if (typeof finalize_func === "function") {
          finalize_func()
      }
    }
  }
}

/**
 * Pan/zoom canvas to a proportion of x_add/y_add/r_mult
 * @param {float} prop_p Proportion of x_add/y_add to pan (0 - start, 1 - end)
 * @param {float} prop_z Proportion of r_mult to zoom (0 - start, 1 - end)
 */
function pan_zoom(prop_p, prop_z) {
  // Copy globals so we can modify
  let pre_xp2 = pre_xp;
  let pre_yp2 = pre_yp;
  let pre_ws2 = pre_ws;
  let y_add2 = y_add;
  let x_add2 = x_add;
  let r_mult2 = r_mult;

  const tree_centreX = tree_state.focal_area.xcentre;
  const tree_centreY = tree_state.focal_area.ycentre;

  if (r_mult2 < 1) { // Zooming outwards
    pre_xp2 = tree_centreX + (pre_xp2-x_add2-tree_centreX)*r_mult2;
    pre_yp2 = tree_centreY + (pre_yp2-y_add2-tree_centreY)*r_mult2;
    pre_ws2 = pre_ws2 * r_mult2;

    prop_p = 1-prop_p;
    prop_z = 1-prop_z;

    y_add2 = (-y_add2)*r_mult2;
    x_add2 = (-x_add2)*r_mult2;
    r_mult2 = 1/r_mult2;
    // todo - getting there, but need to play with the function still - it's not right
    // also can transform the prop_p and prop_z components of this to make it non linear and more zooming initially
    // could change to measure x and y add in terms of the zoomed out version
  }

  tree_state.ws = pre_ws2 * Math.pow(r_mult2,prop_z);
  tree_state.xp = tree_centreX + x_add2*(1-prop_p) + (pre_xp2-x_add2-tree_centreX) * Math.pow(r_mult2,prop_z);
  tree_state.yp = tree_centreY + y_add2*(1-prop_p) + (pre_yp2-y_add2-tree_centreY) * Math.pow(r_mult2,prop_z);
}

function reanchor_at_node(node) {
  node.graphref = true;
  if (node.upnode) {
    reanchor_at_node(node.upnode);
  }
}

function reanchor(node) {
  if (node.dvar) {
    node.graphref = true;
    if (node.gvar || !node.has_child || (node.rvar > 2.2 && node.rvar < 22000)) {
      tree_state.xp = node.xvar;
      tree_state.yp = node.yvar;
      tree_state.ws = node.rvar / 220;
      let length = node.children.length; 
      for (let i=0; i<length; i++) {
        deanchor(node.children[i]);
      }
    } else {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        if (node.children[i].dvar) {
          reanchor(node.children[i]);
          for (let j=0; j<length; j++) {
            if (i !== j) {
              deanchor(node.children[j]);
            }
          }
          break;
        }
      }
    }
  }
}

function get_anim_speed() {
  return global_anim_speed;
}

function set_anim_speed(val) {
  if (isNaN(val)) {
    throw new Error(val + ' is not a number');
  }
  global_anim_speed = val;
}

export {deanchor, reanchor, reanchor_at_node, target_by_code, clear_target, perform_actual_fly, get_anim_speed, set_anim_speed};
