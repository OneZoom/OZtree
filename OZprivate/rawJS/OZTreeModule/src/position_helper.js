import tree_state from './tree_state';
import {max, min} from './util/index';

let targetScreenProp = 0.95;
let x_add = null;
let y_add = null;
let r_mult = null;
let intro_step_num = null;
let intro_sec_step_num = null;
let global_anim_speed = 10; // set this to 15 for recoding smoother flight animations larger numbers mean slower
let length_intro = null;
let num_intro_steps = null;
let more_flying_needed = null;
let flight_fps = 1000/60; // set this to 1000/500 for recording much slower flight animations that can then be sped up after the screen casting process is complete.
let into_node;
let pre_xp, pre_yp, pre_ws;
let fly_timer = null

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
 * Update x_add / y_add / r_mult globals, either to node location if developed,
 * or x2/y2/r2
 */
function get_xyr_target(node, x2,y2,r2,into_node) {
  let x = node.rvar ? node.xvar : x2;
  let y = node.rvar ? node.yvar : y2;
  let r = node.rvar ? node.rvar : r2;
  
  if ((node.targeted)||(r_mult<0.00000001)) {
    // nothing to do otherwise
    
    // update all the variables as we go.
    /* this vx part is copied from move routines above*/
    let vxmax;
    let vxmin;
    let vymax;
    let vymin;
    
    // we don'fly_timer want to include the stem in this and so we include both child horizons only
    if (node.has_child) {
      if (into_node&&into_node==true) {
        [vxmax, vxmin, vymax, vymin] = get_v_horizon_by_arc(node, 1.1, x, y, r);
      } else {
        [vxmax, vxmin, vymax, vymin] = get_v_horizon_by_child(node, x, y, r);
      }
    } else {
      [vxmax, vxmin, vymax, vymin] = get_v_horizon_by_arc(node, 1.305, x, y, r);
    }
    
    let x_targ_max = vxmax;
    let x_targ_min = vxmin;
    let y_targ_max = vymax;
    let y_targ_min = vymin;
    
    // find out if new target area is constained by x or y axis compared to current view
    if ((tree_state.widthres/tree_state.heightres)> (x_targ_max-x_targ_min)/(y_targ_max-y_targ_min)) {
      // height controls size
      r_mult = (tree_state.heightres*targetScreenProp)/(y_targ_max-y_targ_min);
    } else {
      // width controls size
      r_mult = (tree_state.widthres*targetScreenProp)/(x_targ_max-x_targ_min);
    }
    x_add = (x_targ_max+x_targ_min - tree_state.widthres)/2;
    y_add = (y_targ_max+y_targ_min - tree_state.heightres)/2;
    //* // strangely when I comment this out I get a perfect zoom out!
    
    if ((r_mult<10000000)||(node.graphref)) {// only go 1000000 at a time on r_mult
      if (node.has_child) {
        let child_targeted = false;
        let length = node.children.length;
        for (let i=0; i<length; i++) {
          let child = node.children[i];
          if (child.targeted && !child_targeted) {
            child_targeted = true;
            get_xyr_target(child, x+r*node.nextx[i],y+r*node.nexty[i],r*node.nextr[i],into_node);
          }
        }
        
        if (!child_targeted) {
          if (r_mult < 0.00000001) more_flying_needed = true;
          for (let i=0; i<node.children.length; i++) {
            let child = node.children[i];
            if (child.graphref && !child.gvar) {
              get_xyr_target(child, x+r*node.nextx[i],y+r*node.nexty[i],r*node.nextr[i],into_node);
              break;
            }
          }
        }
      }
    } else {
      more_flying_needed = true;
    }
  }
}

function move(node, xtargmin,xtargmax,ytargmin,ytargmax) {
  if (node.targeted) {
    node.graphref = true;
    let child_targeted = false;
    let length = node.children.length;
    for (let i=0; i<length; i++) {
      let child = node.children[i];
      if (child.targeted && !child_targeted) {
        child_targeted = true;
        move(child, xtargmin,xtargmax,ytargmin,ytargmax);
      }      
    }

    if (!child_targeted) {      
      setxyr3r(node, 40,tree_state.widthres-40,40,tree_state.heightres-40);
      setxyr3r(node, 40,tree_state.widthres-40,40,tree_state.heightres-40);
    }
  }
}

function setxyr3r(node, xtargmin,xtargmax,ytargmin,ytargmax) {
  tree_state.ws = 1;
  tree_state.xp = tree_state.widthres/2;
  tree_state.yp = tree_state.heightres;
  let x = tree_state.xp;
  let y = tree_state.yp;
  let r = 220*tree_state.ws;
  
  let vxmax;
  let vxmin;
  let vymax;
  let vymin;
  if (node.has_child) {
    [vxmax, vxmin, vymax, vymin] = get_v_horizon_by_child(node, x, y, r);
  } else {
    [vxmax, vxmin, vymax, vymin] = get_v_horizon_by_arc(node, 1, x, y, r);
  }
  
  let ywsmult = ((ytargmax-ytargmin)/(vymax-vymin));//propmove;
  // the number we need to multply ws by to get the right size for a vertical fit
  let xwsmult = ((xtargmax-xtargmin)/(vxmax-vxmin));//propmove;
  // the number we need to multply ws by to get the right size for a horizontal fit
  let wsmult;
  if (ywsmult > xwsmult)
  {
    // we use xwsmult - the smaller
    wsmult = xwsmult;
  }
  else
  {
    // we use ywsmult - the smaller
    wsmult = ywsmult;
  }
  
  tree_state.xp += (((xtargmax+xtargmin)/2.0)-((vxmax+vxmin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
  tree_state.yp += (((ytargmax+ytargmin)/2.0)-((vymax+vymin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
  
  tree_state.ws = tree_state.ws*wsmult;
  tree_state.xp = (xtargmax+xtargmin)/2 + (tree_state.xp-(xtargmax+xtargmin)/2)*wsmult;
  tree_state.yp = (ytargmax+ytargmin)/2 + (tree_state.yp-(ytargmax+ytargmin)/2)*wsmult;
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


// to_index gives us the index of the leaf or node we need to zoom into
// to_leaf tells us if that index refers to a leaf (1) or not (-1)
// If midnode has stored_metacode, then it has not been fully developed yet. Otherwise it stores its metacode in node.metacode.
function target_by_code(node, to_leaf , to_index) {
  if (to_leaf > 0 && node.is_leaf && (node.metacode == to_index)) {
    node.targeted = true;
    // print_target_node(node);
  } else if (to_leaf <= 0 && node.is_interior_node && (node.metacode == to_index)) {
    node.targeted = true;
    // print_target_node(node);
  } else if (node.has_child) {
    node.targeted = false;
    for (let i=0; i<node.children.length; i++) {
      let child = node.children[i];
      node.targeted = node.targeted || target_by_code(child, to_leaf, to_index);
    }
  } else {
    node.targeted = false;
  }
  // send back information on whether or not this node is targeted
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
  let vymin = (y+r*(node.arcy-node.arcr*factor)); // add for leaf points   *1.305 doesn'fly_timer care about the leaf direction - could change this later perhaps
  return [vxmax, vxmin, vymax, vymin]
}


function print_target_node(node) {
  let arr = [];
  get_targets(node, arr);
  console.log(arr.reverse());
}

function get_targets(node, arr) {
  arr.push(node.metacode);
  if (node.upnode) {
    get_targets(node.upnode, arr);
  }
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

function perform_actual_leap(controller) {
  deanchor(controller.root);
  move(controller.root, 40, tree_state.widthres-40, 65, tree_state.heightres-40);  
  controller.re_calc();
  controller.trigger_refresh_loop();
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
 *   animation speed (greater than 1 gives faster animations, less than one gives slower)
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
  intro_step_num = 0;
  intro_sec_step_num = 0;
  if(((r_mult>0.9999)&&(r_mult<1.00001))&&(x_add*x_add<1)&&(y_add*y_add<1)) {
    // nothing to zoom to so better to do nothing and return false or it feels like a bug
    return false;
  } else {
    length_intro = Math.abs(Math.log(r_mult))*global_anim_speed/speed;      
    num_intro_steps = Math.max(Math.floor(length_intro),5);
    perform_fly_b2(controller, into_node, speed, accel_type, finalize_func, abrupt_func);
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
  function pan_proportion(step, total) {
    var x = step / total,
        out = (Math.sin((x+0.25) * Math.PI*2) + 1) / 2;

    return accel_type === 'accel' ? (x > 0.5 ? out : 0)
         : accel_type === 'decel' ? 1 - (x < 0.5 ? out : 0)
         : x;
  }
  function zoom_proportion(step, total) {
    var x = step / total,
        out = (Math.sin((x+1.5) * Math.PI) + 1) / 2;

    return accel_type === 'accel' ? out
         : accel_type === 'decel' ? out
         : x;
  }

  if (more_flying_needed) {
    //need to reanchor, this sometimes causes jerkiness
    //also we may not know how many steps we will need to take
    // NB: Approximate accel/decel by not panning at all, let the final non-reanchor step handle it
    pan_zoom(accel_type === 'accel' || accel_type === 'decel'? 0 : 1/num_intro_steps, 1/num_intro_steps);
    tree_state.set_action(r_mult > 1 ? "fly-in" : "fly-out");
    controller.re_calc();
    controller.reanchor();
    controller.trigger_refresh_loop();
    
    clearTimeout(fly_timer);
    fly_timer = setTimeout(function () {
      if (tree_state.flying) {
        perform_actual_fly(controller, into_node, speed, 'linear', finalize_func, abrupt_func);
      } else if (typeof abrupt_func === 'function') {
        abrupt_func()
      }
    },1000.0/flight_fps);
  } else if (!more_flying_needed && intro_step_num <num_intro_steps) {
    //don't need to reanchor - this is more normal, and is smoother
    intro_step_num++;
    intro_sec_step_num++;
    pan_zoom(
      pan_proportion(intro_sec_step_num, num_intro_steps),
      zoom_proportion(intro_sec_step_num, num_intro_steps)
    );
    tree_state.set_action(r_mult > 1 ? "fly-in" : "fly-out");
    controller.re_calc();
    controller.trigger_refresh_loop();
    
    clearTimeout(fly_timer);
    fly_timer = setTimeout(function () {
      if (tree_state.flying) {
        perform_fly_b2(controller, into_node, speed, accel_type, finalize_func, abrupt_func);
      } else if (typeof abrupt_func === 'function') {
        abrupt_func()
      }
    },1000.0/flight_fps);
  } else {
    clearTimeout(fly_timer);
    tree_state.flying = false;
    tree_state.set_action(null);
    if (typeof finalize_func === "function") {
        finalize_func()
    }
  }
}

/**
 * Pan/zoom canvas to a proportion of x_add/y_add/r_mult
 * @param {float} prop_p Proportion of x_add/y_add to pan (0 - start, 1 - end)
 * @param {float} prop_z Proportion of r_mult to zoom (0 - start, 1 - end)
 */
function pan_zoom(prop_p, prop_z) {
  if (r_mult >= 1) {
    auto_pan_zoom(prop_p, prop_z);
  } else {
    auto_pan_zoom_out(prop_p, prop_z);
  }
}

function auto_pan_zoom(prop_p,prop_z) {  
  let centreY = y_add + tree_state.heightres/2;
  let centreX = x_add + tree_state.widthres/2;
  tree_state.ws = pre_ws*(Math.pow(r_mult,prop_z));
  tree_state.xp = centreX + (pre_xp-centreX)*(Math.pow(r_mult,prop_z)) - x_add*prop_p;
  tree_state.yp = centreY + (pre_yp-centreY)*(Math.pow(r_mult,prop_z)) - y_add*prop_p;
}

function auto_pan_zoom_out(prop_p,prop_z){
  let pre_xp_new = tree_state.widthres/2 + (pre_xp-tree_state.widthres/2 - x_add)*r_mult;
  let pre_yp_new = tree_state.heightres/2 + (pre_yp-tree_state.heightres/2 - y_add)*r_mult;
  let pre_ws_new = pre_ws*r_mult;
  
  let prop_p2 = 1-prop_p;
  let prop_z2 = 1-prop_z;
  
  let y_add2 = (-y_add)*r_mult;
  let x_add2 = (-x_add)*r_mult;
  let r_mult2 = 1/r_mult;
    
  let centreY = y_add2+tree_state.heightres/2;
  let centreX = x_add2+tree_state.widthres/2;
  tree_state.ws = pre_ws_new*(Math.pow(r_mult2,prop_z2));
  tree_state.xp = centreX + (pre_xp_new-centreX)*(Math.pow(r_mult2,prop_z2)) - x_add2*prop_p2;
  tree_state.yp = centreY + (pre_yp_new-centreY)*(Math.pow(r_mult2,prop_z2)) - y_add2*prop_p2;

  // todo - getting there, but need to play with the function still - it's not right
  // also can transform the prop_p and prop_z components of this to make it non linear and more zooming initially
  // could change to measure x and y add in terms of the zoomed out version
};

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

export {move, setxyr3r, deanchor, reanchor, reanchor_at_node, target_by_code, clear_target, perform_actual_leap, perform_actual_fly, get_anim_speed, set_anim_speed};
