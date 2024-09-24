import {max, min} from '../../util/index'

class PolytomyHorizonCalc {
  constructor() {
    this.horizon_calc_type = "polytomy";
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
    // Calculate parent's arcr within our coordinate reference.
    function parent_arcr(node) {
      if (!node.upnode) return 0;

      for (let i = 0; i < node.upnode.children.length; i++) {
        if (node.upnode.children[i] === node) {
          return node.upnode.arcr / node.upnode.nextr[i];
        }
      }
    }

    // find the bounding box for the polytomy branch.
    node.hxmax = max(node.sx, node.ex) + node.branch_width/2;
    node.hxmin = min(node.sx, node.ex) - node.branch_width/2;
                          
    node.hymax = max(node.sy, node.ey) + node.branch_width/2;
    node.hymin = min(node.sy, node.ey) - node.branch_width/2;

    // Expand bounding box to include the parent interior node at one end, the arc + current node at the other
    // NB: 1.305 = 0.9*1.45 is to allow for leaves with points that stick out from their main circle
    var parent_arcr = parent_arcr(node);
    node.hxmax = max(node.hxmax + parent_arcr, node.arcx+node.arcr*1.305);
    node.hxmin = min(node.hxmin - parent_arcr, node.arcx-node.arcr*1.305);
    node.hymax = max(node.hymax + parent_arcr, node.arcy+node.arcr*1.305);
    node.hymin = min(node.hymin - parent_arcr, node.arcy-node.arcr*1.305);

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

let polytomy_horizon_calc = new PolytomyHorizonCalc();

export default polytomy_horizon_calc;
