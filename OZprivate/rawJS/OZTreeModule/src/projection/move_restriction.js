import tree_state from '../tree_state';
import config from '../global_config';
import {add_hook} from '../util/index';

// these are official thresholds (could be tweaked)
let maxradius;
let maxfromedgexl;
let maxfromedgeyl;
let maxfromedgex;
let maxfromedgey;
let maxfromedgexs;
let maxfromedgeys;
let sensitivity = config.sensitivity;

/**
 * Whenever window size changes, the following variables would be changed as well.
 */
add_hook("window_size_change", function() {
  maxradius = Math.max(tree_state.heightres*0.65,tree_state.widthres*0.65,1000); // number of pixels wide maximum for the smallest leaf / node on screen
  maxfromedgexl = (tree_state.widthres/10.0); // number of pixels minimum from edge for meaningful information to be drawn
  maxfromedgeyl = (tree_state.heightres/10.0); // number of pixels minimum from edge for meaningful information to be drawn
  maxfromedgex = (tree_state.widthres/12.0); // number of pixels minimum from edge for meaningful information to be drawn (slightly smaller for U)
  maxfromedgey = (tree_state.heightres/12.0); // number of pixels minimum from edge for meaningful information to be drawn (slightly smaller for U)
  maxfromedgexs = (tree_state.widthres/11.0); // number of pixels minimum from edge for meaningful information to be drawn (even smaller for zoom)
  maxfromedgeys = (tree_state.heightres/11.0); // number of pixels minimum from edge for meaningful information to be drawn (even smaller for zoom)
});


/**
  * Reset the window's move restrictions, e.g. on a fresh redraw cycle
  */
export function reset_mr() {
  tree_state.ok_up = 0;
  tree_state.ok_down = 0;
  tree_state.ok_left = 0;
  tree_state.ok_right = 0;
  tree_state.ok_zoom = 0;
  tree_state.ok_lim = 0;
}

export function add_mr(x,y,r,max_r) {
  // add information on another drawn circle to the movement restriction data
  // x, y, r are the centre coordinates and radius of the circle that could be drawn - with reference to the view itself
  // - max_r: the maximum size this object can be, in multiples of screen's longest edge
  
  // check that the circle is on screen at all
  // if ((((x+r)>0)&&((x-r)<(tree_state.widthres)))&&(((y+r)>0)&&((y-r)<(tree_state.heightres))))
  if (circle_in_range(x,r,0,tree_state.widthres) && circle_in_range(y,r,0,tree_state.heightres)) {
    // check if it's not yet shown OK to move up.
    tree_state.ok_up    = (tree_state.ok_up   === 1) ? tree_state.ok_up   : if_ok_up(x,y,r);
    tree_state.ok_down  = (tree_state.ok_down === 1) ? tree_state.ok_down : if_ok_down(x,y,r);
    tree_state.ok_left  = (tree_state.ok_left === 1) ? tree_state.ok_left : if_ok_left(x,y,r);
    tree_state.ok_right = (tree_state.ok_right=== 1) ? tree_state.ok_right: if_ok_right(x,y,r);
    tree_state.ok_zoom  = (tree_state.ok_zoom === 1) ? tree_state.ok_zoom : if_ok_zoom(x,y,r);

    // sort out tree_state.ok_lim which is simple.
    if (max_r) {
        max_r = Math.max(tree_state.heightres, tree_state.widthres) * max_r;
    } else {
        max_r = maxradius;
    }
    if (true || r < max_r) {
      tree_state.ok_lim = 1;
    }
  }
}

function if_ok_zoom(x,y,r) {
  let res = 0;
  // one variable for figuring out if this circle is OK or not
  
  // we do need to keep checking
  
  // note current mouse position
  // admitedly this means we have to rely on redraw every time the mouse is moved
  // but I think that's OK - if need be we can do a redraw before and after zoom later
  

  // figure out thresholds for all 4 edges based on mouse position
  let maxaroundl = maxfromedgexs + ((1-sensitivity)*tree_state.button_x);
  let maxaroundr = maxfromedgexs + ((1-sensitivity)*(tree_state.widthres-tree_state.button_x));
  let maxaroundu = maxfromedgeys + ((1-sensitivity)*tree_state.button_y);
  let maxaroundd =  maxfromedgeys + ((1-sensitivity)*(tree_state.heightres-tree_state.button_y));
  
  
  if (circle_in_range(x,r,maxaroundl,tree_state.widthres-maxaroundr) && circle_in_range(y,r,maxaroundu,tree_state.heightres-maxaroundd)) {
    let temp_ok_zoom = 1;
    let templim = 0; // variable used in these brackets
    
    // check up
    //(y+r) is the bottom of the circle but need to detect if also off the corner
    if (x<maxaroundl) {
      // off to the left
      templim = Math.pow(r*r-(x-maxaroundl)*(x-maxaroundl),0.5)+y;
    } else if (x > (tree_state.widthres-maxaroundr)) {
      // off to the right
      templim = Math.pow(r*r-(x-(tree_state.widthres-maxaroundr))*(x-(tree_state.widthres-maxaroundr)),0.5)+y;
    } else {
      // top edge
      templim = r+y;
    }
    // check
    if (templim < maxaroundu) {//&&(templim<(tree_state.heightres-maxaroundd)))
      temp_ok_zoom = 0;
    }
    
    // check down
    //(y-r) is the top of the circle
    // tree_state.heightres is the bottom of the page
    if (x<maxaroundl) {
      // off to the left
      templim = Math.pow(r*r-(x-maxaroundl)*(x-maxaroundl),0.5)+(tree_state.heightres-maxaroundl)-y;
    } else if (x > (tree_state.widthres-maxaroundr)) {
      // off to the right
      templim = Math.pow(r*r-(x-(tree_state.widthres-maxaroundr))*(x-(tree_state.widthres-maxaroundr)),0.5)+(tree_state.heightres)-y;
    } else {
      // bottom edge
      templim = tree_state.heightres-y+r;
    }
    // check
    if (templim < maxaroundd) {//&&(templim<(tree_state.heightres-maxaroundu)))
      temp_ok_zoom = 0;
      //context.strokeStyle = 'rgb(255,0,0)';
    }
    
    // check left
    //(x+r) is the right of the circle
    if (y<maxaroundu) {
      // off to the top
      templim = Math.pow(r*r-(y-maxaroundu)*(y-maxaroundu),0.5)+x;
    } else if (y > (tree_state.heightres-maxaroundd)) {
      // off to the bottom
      templim = Math.pow(r*r-(y-(tree_state.heightres-maxaroundd))*(y-(tree_state.heightres-maxaroundd)),0.5)+x;
    } else {
      // left edge
      templim = x+r;
    }
    // check
    if (templim < maxaroundl) {//&&(templim<(tree_state.widthres-maxaroundr)))
      temp_ok_zoom = 0;
    }
    
    // check right
    if (y<maxaroundu) {
      // off to the top
      templim = Math.pow(r*r-(y-maxaroundu)*(y-maxaroundu),0.5)+(tree_state.widthres)-x;
    } else if (y > (tree_state.heightres-maxaroundd)) {
      // off to the bottom
      templim = Math.pow(r*r-(y-(tree_state.heightres-maxaroundd))*(y-(tree_state.heightres-maxaroundd)),0.5)+(tree_state.widthres)-x;
    } else {
      // left edge
      templim = (tree_state.widthres)-x+r;
    }
    // check
    if (templim < maxaroundr) {//&&(templim<(tree_state.widthres-maxaroundl)))
      temp_ok_zoom = 0;
      //context.strokeStyle = 'rgb(255,0,0)';
    }
    
    if (temp_ok_zoom ==1) {
      res = 1;
    }
  }
  return res;
}

function if_ok_right(x,y,r) {
  // check that the circle is not off to the top or bottom too far to count
  let res = 0;
  if (circle_in_range(y,r,maxfromedgey,tree_state.heightres-maxfromedgey)) {
    let templim;
    
    if (y<maxfromedgey)
    {
      // off to the top
      templim = Math.pow(r*r-(y-maxfromedgey)*(y-maxfromedgey),0.5)+tree_state.widthres-x;
    }
    else if (y > (tree_state.heightres-maxfromedgey))
    {
      // off to the bottom
      templim = Math.pow(r*r-(y-tree_state.heightres+maxfromedgey)*(y-tree_state.heightres+maxfromedgey),0.5)+tree_state.widthres-x;
    }
    else
    {
      // left edge
      templim = tree_state.widthres-x+r;
    }
    
    if (templim > maxfromedgexl)
    {
      res = 1;
    }
  }
  return res;
}

function if_ok_left(x,y,r) {
  // check that the circle is not off to the top or bottom too far to count
  let res = 0;
  if (circle_in_range(y, r, maxfromedgey, tree_state.heightres-maxfromedgey)) {
    //(x+r) is the right of the circle
    let templim;
    
    if (y<maxfromedgey)
    {
      // off to the top
      templim = Math.pow(r*r-(y-maxfromedgey)*(y-maxfromedgey),0.5)+x;
    }
    else if (y > (tree_state.heightres-maxfromedgey))
    {
      // off to the bottom
      templim = Math.pow(r*r-(y-tree_state.heightres+maxfromedgey)*(y-tree_state.heightres+maxfromedgey),0.5)+x;
    }
    else
    {
      // left edge
      templim = x+r;
    }
    if (templim > maxfromedgexl)
    {
      res = 1;
    }
  }
  return res;
}

function if_ok_up(x, y, r) {
  let res = 0;
  // check that the circle is not off to the left or right too far to count
  // if (((x+r)>maxfromedgex)&&((x-r)<(tree_state.widthres-maxfromedgex)))
  if (circle_in_range(x,r,maxfromedgex,tree_state.widthres-maxfromedgex)) {
    //(y+r) is the bottom of the circle but need to detect if also off the corner
    let templim;
    
    if (x < maxfromedgex) {
      // off to the left
      templim = Math.pow(r*r-(x-maxfromedgex)*(x-maxfromedgex),0.5)+y;
    } else if (x > (tree_state.widthres-maxfromedgex)) {
      // off to the right
      templim = Math.pow(r*r-(x-tree_state.widthres+maxfromedgex)*(x-tree_state.widthres+maxfromedgex),0.5)+y;
    } else {
      // top edge
      templim = r+y;
    }
    
    if (templim>maxfromedgeyl) {
      res = 1;
    }
  }
  return res;
}

function if_ok_down(x,y,r) {
  // check that the circle is not off to the left or right too far to count
  //(y-r) is the top of the circle
  // tree_state.heightres is the bottom of the page
  let res = 0;
  if (circle_in_range(x,r,maxfromedgex,tree_state.widthres-maxfromedgex)) {
    let templim;
    
    if (x<maxfromedgex)
    {
      // off to the left
      templim = Math.pow(r*r-(x-maxfromedgex)*(x-maxfromedgex),0.5)+tree_state.heightres-y;
    }
    else if (x > (tree_state.widthres-maxfromedgex))
    {
      // off to the right
      templim = Math.pow(r*r-(x-tree_state.widthres+maxfromedgex)*(x-tree_state.widthres+maxfromedgex),0.5)+tree_state.heightres-y;
    }
    else
    {
      // bottom edge
      templim = tree_state.heightres-y+r;
    }
    
    if (templim>maxfromedgeyl)
    {
      res = 1;
    }
  }
  return res;
}

function circle_in_range(c, r, min, max) {
  return (
    (c+r) > min &&
    (c-r) < max
  )
}
