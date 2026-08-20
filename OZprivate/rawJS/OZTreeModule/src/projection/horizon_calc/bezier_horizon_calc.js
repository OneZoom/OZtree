import {max, min} from '../../util/index'

class BezierHorizonCalc {
  constructor() {
    this.horizon_calc_type = "bezier";
  }
  /*
   * Recalc node horizon when horizon of its children c
   */ 
  recalc_node_horizon(node) {
    let length = node.children.length;
    let changed = true;
    for (let index=0; index<length; index++) {
      let child = node.children[index];
      if (node.hxmax < node.nextx[index]+node.nextr[index]*child.hxmax) {
        node.hxmax = node.nextx[index]+node.nextr[index]*child.hxmax;
        changed = true;
      }
      if (node.hxmin > node.nextx[index]+node.nextr[index]*child.hxmin) {
        node.hxmin = node.nextx[index]+node.nextr[index]*child.hxmin;
        changed = true;
      }
      if (node.hymax < node.nexty[index]+node.nextr[index]*child.hymax) {
        node.hymax = node.nexty[index]+node.nextr[index]*child.hymax;
        changed = true;
      }
      if (node.hymin > node.nexty[index]+node.nextr[index]*child.hymin) {
        node.hymin = node.nexty[index]+node.nextr[index]*child.hymin;
        changed = true;
      }
      // node.hxmax = max(node.hxmax, node.nextx[index]+node.nextr[index]*child.hxmax);
      // node.hxmin = min(node.hxmin, node.nextx[index]+node.nextr[index]*child.hxmin);
      // node.hymax = max(node.hymax, node.nexty[index]+node.nextr[index]*child.hymax);
      // node.hymin = min(node.hymin, node.nexty[index]+node.nextr[index]*child.hymin);
    }
    return changed;
  }
  calc_horizon(node) {
    // jamestodo
    // find the bounding box for the bezier curve
    // A layout can taper its branches, drawing one wider where it starts than where it ends
    // (bezsr, see propspiral_pre_calc), so pad by the widest the curve gets, not its end
    let half_width = (node.bezsr > node.bezr ? node.bezsr : node.bezr) / 2;

    if (node.path_points) {
      // A path's segments each lie inside their own control points, so the box around all of
      // them is one the whole curve fits in --- and a tighter one than the single coarse cubic
      // below gives, whose control points swing well outside the curve on a wide turn
      let xmin = node.bezsx, xmax = node.bezsx;
      let ymin = node.bezsy, ymax = node.bezsy;

      for (const p of node.path_points) {
        if (p.c1x < xmin) xmin = p.c1x; if (p.c1x > xmax) xmax = p.c1x;
        if (p.c2x < xmin) xmin = p.c2x; if (p.c2x > xmax) xmax = p.c2x;
        if (p.x   < xmin) xmin = p.x;   if (p.x   > xmax) xmax = p.x;
        if (p.c1y < ymin) ymin = p.c1y; if (p.c1y > ymax) ymax = p.c1y;
        if (p.c2y < ymin) ymin = p.c2y; if (p.c2y > ymax) ymax = p.c2y;
        if (p.y   < ymin) ymin = p.y;   if (p.y   > ymax) ymax = p.y;
      }

      node.hxmax = xmax + half_width;
      node.hxmin = xmin - half_width;
      node.hymax = ymax + half_width;
      node.hymin = ymin - half_width;
    } else {
      node.hxmax = max(
        node.bezsx,
        node.bezc1x,
        node.bezc2x,
        node.bezex) + half_width;
      node.hxmin = min(
        node.bezsx,
        node.bezc1x,
        node.bezc2x,
        node.bezex) - half_width;
      node.hymax = max(
        node.bezsy,
        node.bezc1y,
        node.bezc2y,
        node.bezey) + half_width;
      node.hymin = min(
        node.bezsy,
        node.bezc1y,
        node.bezc2y,
        node.bezey) - half_width;
    }

    //expand the bounding box to include the arc if necessary // 1.305 = 0.9*1.45 is to allow for leaves with points that stick out from their main circle
    node.hxmax = max(node.hxmax, node.arcx+node.arcr*1.305);
    node.hxmin = min(node.hxmin, node.arcx-node.arcr*1.305);
    node.hymax = max(node.hymax, node.arcy+node.arcr*1.305);
    node.hymin = min(node.hymin, node.arcy-node.arcr*1.305);
  
    // set the graphics bounding box before the horizon is expanded for children
    node.gxmax = node.hxmax;
    node.gxmin = node.hxmin;
    node.gymax = node.hymax;
    node.gymin = node.hymin;

    // check for children
    if(node.has_child) {
      let length = node.children.length;
      for (let i=0; i<length; i++) {
        this.calc_horizon(node.children[i]);
      }
      this.recalc_node_horizon(node);
    }
  }
}

let bezier_horizon_calc = new BezierHorizonCalc();

export default bezier_horizon_calc;