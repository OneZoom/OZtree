import {set_horizon_calculator} from '../horizon_calc/horizon_calc'; // import a function which enables us to choose the horizon calc.

/* precalc relationships */

// you have to use the existing names becauase they are hard coded into

class PolytomyPreCalc {
    
  constructor() {
    this._viewtype = "polytomy";
  }
    
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in PolytomyPreCalc.");
    else return this._viewtype;
  }
    
  pre_calc(node) {
    let angle = node.is_root ? Math.PI*(3/2) : node.arca;
    if (node.is_root) {
      // Control points on top of start/end, i.e. line should be straight
      node.bezex = node.bezc2x = Math.cos(angle);
      node.bezey = node.bezc2y = Math.sin(angle);
      node.bezsx = node.bezc1x = 0;
      node.bezsy = node.bezc1y = -0.4;
      node.bezr = 0.02;
    }
    _pre_calc(node, angle);
  }
    
  setup() {
    set_horizon_calculator('polytomy'); // this sets the horizon calculation type
  }
    
}

function _pre_calc(node, angle) {
  node.arca = angle;
  node.arcx = node.bezex;
  node.arcy = node.bezey;
  // James
  //node.arcr = 0.01; // this is the size of the node arc compared to the size of the node itself
  // Kai
    
  node.arcr = 0.08; // this is the size of the node arc compared to the size of the node itself
  node.branch_width = 0.05;
  
  let new_angle_base = node.arca - Math.PI/2;
  if (node.has_child) {
    let total = 0;
      
    let child_order_map = []
    for (let i=0; i<node.children.length; i++) {
      child_order_map.push([i,node.children[i].richness_val]);

      // we're not staggering the children in two rows
      // CHANGE THIS TO CHANGE RELATIVE IMPORTANCE OF BRANCHES
      // clade_richness is defined using get clade_richness in polytomy_midnode.js
      // within the 'factory' dir

      // one of these lines will most likely not be used but I'll leave them in for now
      //total += Math.sqrt(node.children[i].richness_val);
      total += Math.log(node.children[i].richness_val+1)
    }
    child_order_map = child_order_map.sort(function (a, b) { return a[1] - b[1]; });

    for (let j=0; j<node.children.length; j++) {
      let i = child_order_map[j][0];
      let ratio = Math.log(node.children[i].richness_val+1) / total;
      //let ratio = Math.sqrt(node.children[i].richness_val) / total;
      let angle_assigned = ratio * Math.PI;
      let child_angle = new_angle_base + angle_assigned/2

      new_angle_base += angle_assigned;
      node.nextx[i] = node.bezex; // position in x to pass to child i
      node.nexty[i] = node.bezey; // position in y to pass to child i

      let tana = Math.tan(angle_assigned/2);
      let newscale = (tana)/(1+tana);
      let distance = 1-newscale;
      let target = node.arcr*1.1*(1+newscale); // we want the distance to be at least this much so that nodes don't overlap
      if (distance < (target)) {
        distance = target;
      }

      node.nextr[i] = newscale; // scale to pass to child node i
            
      // bezex and bezey are the start and end positions of the line belonging to the child.
      // their position starts at position of the parent
      // it's all as a multiple of the ratio.

      node.children[i].bezex = node.children[i].bezc2x = Math.cos(child_angle) * (distance)/newscale;
      node.children[i].bezey = node.children[i].bezc2y =  Math.sin(child_angle) * (distance)/newscale;

      node.children[i].bezsx = node.children[i].bezc1x =  0; // same position as the node itself.
      node.children[i].bezsy = node.children[i].bezc1y =  0; // this is where it connects to the parent.
      node.children[i].bezr = node.bezr;
      _pre_calc(node.children[i], child_angle);
    }
  } else {
      node.arcr = 0.75;
  }
}

let polytomy_pre_calc = new PolytomyPreCalc();

// export the class which does what we need for polytomy calculations.
export default polytomy_pre_calc;
