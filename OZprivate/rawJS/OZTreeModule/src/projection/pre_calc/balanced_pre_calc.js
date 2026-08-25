import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class BalancedPreCalc {
  constructor() {
    this._viewtype = "balanced";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in BalancedPreCalc.");
    else return this._viewtype;
  }
  pre_calc(node) {
    let partl1 = 0.55;
    if (node.is_root) {
      node.branch_cubic({
        sx: 0, sy: 0, // start position
        cp1x: 0, cp1y: -0.05, // control point 1 position
        cp2x: 0, cp2y: -0.95, // control point 2 position
        ex: 0, ey: -1, // end position
      });
      node.bezr  =  partl1; // line width
      node.arca = Math.PI*(3/2);
    }
    _pre_calc(node);
  }
  setup() {
    set_horizon_calculator('bezier');
  }
}

function _pre_calc(node) {
  let leafmult = 3.2;
  let posmult = 0.9;
  let partc = 0.4;
  let partl1 = 0.55;
  let thisangleleft = 0.33;
  let thisangleright = 0.33;
  let thisratio1 = 0.61;
  let thisratio2 = 0.61;  
  
  let tempsinpre = Math.sin(node.arca);
  let tempcospre = Math.cos(node.arca);
  let tempsin90pre = Math.sin(node.arca + Math.PI/2.0);
  let tempcos90pre = Math.cos(node.arca + Math.PI/2.0);

  if (node.has_child) {
    let tempsin2 = Math.sin(node.arca + Math.PI*thisangleright);
    let tempcos2 = Math.cos(node.arca + Math.PI*thisangleright);
    let tempsin3 = Math.sin(node.arca - Math.PI*thisangleleft);
    let tempcos3 = Math.cos(node.arca - Math.PI*thisangleleft);
    let richest_child = (node.children[0].richness_val) >= (node.children[1].richness_val) ? 0 : 1
    let other_child = (node.children[0].richness_val) >= (node.children[1].richness_val) ? 1 : 0

    node.nextr[richest_child] = thisratio1; // r (scale) reference for child 1
    node.nextr[other_child] = thisratio2; // r (scale) reference for child 2
      
    node.children[richest_child].branch_cubic({
      sx: -(0.3)*(tempcospre)/thisratio1,
      sy: -(0.3)*(tempsinpre)/thisratio1,
      cp1x: (richest_child === 0 ? -0.3 : -0.2) * tempcospre/thisratio1,
      cp1y: (richest_child === 0 ? -0.3 : -0.2) * tempsinpre/thisratio1,
      cp2x: 0.15*(tempcospre)/thisratio1,
      cp2y: 0.15*(tempsinpre)/thisratio1,
      ex: tempcos2,
      ey: tempsin2,
    });
    node.children[richest_child].bezr = partl1;
    node.children[richest_child].arca = node.arca + Math.PI*thisangleright;

    node.children[other_child].branch_cubic({
      sx: -(0.3)*(tempcospre)/thisratio2,
      sy: -(0.3)*(tempsinpre)/thisratio2,
      cp1x: 0.1*(tempcospre)/thisratio2,
      cp1y: 0.1*(tempsinpre)/thisratio2,
      cp2x: 0.9*tempcos3,
      cp2y: 0.9*tempsin3,
      ex: tempcos3,
      ey: tempsin3,
    });
    node.children[other_child].bezr = partl1;
    node.children[other_child].arca = node.arca - Math.PI*thisangleleft;
      
    node.nextx[richest_child] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[richest_child] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
    node.nextx[other_child] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[other_child] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    
    node.arcx = node.branch_end.x*1.01;
    node.arcy = node.branch_end.y*1.01;
    node.arcr = (node.bezr)/2;
    
    if (node.has_child)
    {
      _pre_calc(node.children[0]);
      _pre_calc(node.children[1]);
    }
  }
  else {
    node.arcx = node.branch_end.x+posmult*(tempcospre);
    node.arcy = node.branch_end.y+posmult*(tempsinpre);
    node.arcr = leafmult*partc;
  }
}

let balanced_pre_calc = new BalancedPreCalc();

export default balanced_pre_calc;
