import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class BalancedPreCalc {
  constructor() {
    this._viewtype = "balanced";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in BalancedPreCalc.");
    else return this._viewtype;
  }
  pre_calc(node, from_root) {
    let angle = from_root ? Math.PI*(3/2) : node.arca;
    let partl1 = 0.55;
    if (from_root) {
      node.bezsx =  0;
      node.bezsy =  0; // start y position
      node.bezex =  0; // end x position
      node.bezey =  -1; // end y position
      node.bezc1x=  0; // control point 1 x position 
      node.bezc1y=  -0.05; // control point 2 y position
      node.bezc2x=  0; // control point 2 x position
      node.bezc2y=  -0.95; // control point 2 y position
      node.bezr  =  partl1; // line width
    }
    _pre_calc(node, angle);
  }
  setup() {
    set_horizon_calculator('bezier');
  }
}

function _pre_calc(node, angle) {
  let leafmult = 3.2;
  let posmult = 0.9;
  let partc = 0.4;
  let partl1 = 0.55;
  let thisangleleft = 0.33;
  let thisangleright = 0.33;
  let thisratio1 = 0.61;
  let thisratio2 = 0.61;  
  
  let tempsinpre = Math.sin(angle);
  let tempcospre = Math.cos(angle);
  let tempsin90pre = Math.sin(angle + Math.PI/2.0);
  let tempcos90pre = Math.cos(angle + Math.PI/2.0);  

  node.arca = angle;

  if (node.has_child) {
    let atanpre = Math.atan2(node.children[0].richness_val, node.children[1].richness_val);
    let atanpowpre = Math.atan2(Math.pow(node.children[0].richness_val, 0.5),Math.pow(node.children[1].richness_val, 0.5));
    
    let tempsin2 = Math.sin(angle + Math.PI*thisangleright);
    let tempcos2 = Math.cos(angle + Math.PI*thisangleright);
    let tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
    let tempcos3 = Math.cos(angle - Math.PI*thisangleleft);  
    let richest_child = (node.children[0].richness_val) >= (node.children[1].richness_val) ? 0 : 1
    let other_child = (node.children[0].richness_val) >= (node.children[1].richness_val) ? 1 : 0

    node.nextr[richest_child] = thisratio1; // r (scale) reference for child 1
    node.nextr[other_child] = thisratio2; // r (scale) reference for child 2
      
    node.children[richest_child].bezsx = -(0.3)*(tempcospre)/thisratio1;
    node.children[richest_child].bezsy = -(0.3)*(tempsinpre)/thisratio1;
    node.children[richest_child].bezex = tempcos2;
    node.children[richest_child].bezey = tempsin2;
    node.children[richest_child].bezc1x = (richest_child === 0 ? -0.3 : -0.2) * tempcospre/thisratio1;
    node.children[richest_child].bezc1y = (richest_child === 0 ? -0.3 : -0.2) * tempsinpre/thisratio1;
    node.children[richest_child].bezc2x = 0.15*(tempcospre)/thisratio1;
    node.children[richest_child].bezc2y = 0.15*(tempsinpre)/thisratio1;
    node.children[richest_child].bezr = partl1;
      
    node.children[other_child].bezsx = -(0.3)*(tempcospre)/thisratio2;
    node.children[other_child].bezsy = -(0.3)*(tempsinpre)/thisratio2;
    node.children[other_child].bezex = tempcos3;
    node.children[other_child].bezey = tempsin3;
    node.children[other_child].bezc1x = 0.1*(tempcospre)/thisratio2;
    node.children[other_child].bezc1y = 0.1*(tempsinpre)/thisratio2;
    node.children[other_child].bezc2x = 0.9*tempcos3;
    node.children[other_child].bezc2y = 0.9*tempsin3;
    node.children[other_child].bezr = partl1;
      
    node.nextx[richest_child] = (1.3*Math.cos(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[richest_child] = (1.3*Math.sin(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
    node.nextx[other_child] = (1.3*Math.cos(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[other_child] = (1.3*Math.sin(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    
    node.arcx = node.bezex;
    node.arcy = node.bezey;
    node.arcr = (node.bezr)/2;
    
    if (node.has_child)
    {
      if ((node.children[0].richness_val) >= (node.children[1].richness_val))
      {
        _pre_calc(node.children[0], angle + Math.PI*thisangleright);
        _pre_calc(node.children[1], angle - Math.PI*thisangleleft);
      }
      else
      {
        _pre_calc(node.children[1], angle + Math.PI*thisangleright);
        _pre_calc(node.children[0], angle - Math.PI*thisangleleft);
      }
    }
  }
  else {
    node.arcx = node.bezex+posmult*(tempcospre);
    node.arcy = node.bezey+posmult*(tempsinpre);
    node.arcr = leafmult*partc;
  }
}

let balanced_pre_calc = new BalancedPreCalc();

export default balanced_pre_calc;