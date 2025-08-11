// this recalculates the positions of everything on screen after the view window has moved.

import tree_state from '../tree_state';


function re_calc(node, xp, yp, ws) {
  drawreg(node, xp, yp, ws*220);
}

// the horizon is precalcualted these parts are calculated every time the tree view gets moved
function drawreg(node, x, y, r) {
  //////////////////////////////////
  // dvar is true if this node (or a descendent node) needs to be drawn on the screen
  // gvar is true if this node itself needs to be drawn on screen
  // graphref is a path to the referencing node
  //////////////////////////////////
  let child_graphref = false;
  let length = node.children.length;
  for (let index=0; index<length; index++) {
    let child = node.children[index];
    if (child.graphref && !child_graphref) {
      child_graphref = true;
      drawreg(child, x, y, r);
      node.rvar = child.rvar / node.nextr[index];
      node.xvar = child.xvar - node.rvar * node.nextx[index];
      node.yvar = child.yvar - node.rvar * node.nexty[index];
      node.dvar = false;
      for (let other=0; other<length; other++) {
        if (other !== index) {
          node.children[other].gvar = false;
          node.children[other].dvar = false;
        }
      }
      
      if(node_on_screen(node, true)) {
        if (node.rvar > tree_state.threshold) {
          for (let other=0; other<length; other++) {
            if (other !== index) {
              drawreg2(node.children[other],
                  node.xvar + node.rvar * node.nextx[other],
                  node.yvar + node.rvar * node.nexty[other],
                  node.rvar * node.nextr[other]);
            }
          }
        }
        set_node_gvar_dvar(node);
        
        if (node.rvar <= tree_state.threshold) {
          for (let i=0; i<length; i++) {
            node.children[i].gvar = false;
            node.children[i].dvar = false;
          }
        }
      } else {
        node.gvar = false;
      }
      node.dvar = get_dvar_by_children(node);
    }
  }
  if (!child_graphref) drawreg2(node, x, y, r);
}

function drawreg2(node, x, y, r) {
  node.xvar = x;
  node.yvar = y;
  node.rvar = r;
  node.dvar = false;	
  node.gvar = false;
  if(node_on_screen(node, true)) {
    if (node.has_child) {
      if (r > tree_state.threshold) {
        let length = node.children.length;
        for (let i=0; i<length; i++) {
          drawreg2(node.children[i],
            x + r * node.nextx[i],
            y + r * node.nexty[i],
            r * node.nextr[i]);
        }
      } else {
        let length = node.children.length;
        for (let i=0; i<length; i++) {
          node.children[i].gvar = false;
          node.children[i].dvar = false;
        }
      }
      node.dvar = get_dvar_by_children(node);
    }
    set_node_gvar_dvar(node);
  } 
}

function get_dvar_by_children(node) {
  let dvar = false;
  let length = node.children.length;
  for (let i=0; i<length; i++) {
    if (node.children[i].dvar) {
      dvar = true;
      break;
    }
  }
  return dvar;
}

/**
 * Does the bounding box of the node / node-and-descendants fit on screen?
 */
function node_on_screen(node, inclDescendants) {
  const x1 = node.xvar + node.rvar * (inclDescendants ? node.hxmin : node.gxmin);
  const x2 = node.xvar + node.rvar * (inclDescendants ? node.hxmax : node.gxmax);
  const y1 = node.yvar + node.rvar * (inclDescendants ? node.hymin : node.gymin);
  const y2 = node.yvar + node.rvar * (inclDescendants ? node.hymax : node.gymax);

  if (x2 < 0) return false;
  if (x1 > tree_state.widthres) return false;
  if (y2 < 0) return false;
  if (y1 > tree_state.heightres) return false;
  return true;
}

function set_node_gvar_dvar(node) {
  if(node_on_screen(node, false)) {
    node.gvar = true;        
    node.dvar = true;        
  } else {
    node.gvar = false;
  }
}

export default re_calc;
