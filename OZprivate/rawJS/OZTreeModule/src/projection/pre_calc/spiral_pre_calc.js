import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class SpiralPreCalc {
  constructor() {
    this._viewtype = "spiral";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in SpiralPreCalc.");
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
  let thisangleleft = 0.46;
  let thisangleright = 0.22;
  let thisratio1 = 1/1.3;
  let thisratio2 = 1/2.25;
  let partl1 = 0.55;
  let tempsinpre = Math.sin(angle);
  let tempcospre = Math.cos(angle);
  let tempsin90pre = Math.sin(angle + Math.PI/2.0);
  let tempcos90pre = Math.cos(angle + Math.PI/2.0);
  let tempsin2 = Math.sin(angle + Math.PI*thisangleright);
  let tempcos2 = Math.cos(angle + Math.PI*thisangleright);
  let tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
  let tempcos3 = Math.cos(angle - Math.PI*thisangleleft);
  
  node.arca = angle;  
  node.bezsx = node.bezsx  !== undefined ? node.bezsx : 0;
  node.bezsy = node.bezsy  !== undefined ? node.bezsy : 0; // start y position
  node.bezex = node.bezex  !== undefined ? node.bezex : 0; // end x position
  node.bezey = node.bezey  !== undefined ? node.bezey : -1; // end y position
  node.bezc1x= node.bezc1x !== undefined ? node.bezc1x: 0; // control point 1 x position 
  node.bezc1y= node.bezc1y !== undefined ? node.bezc1y: -0.05; // control point 2 y position
  node.bezc2x= node.bezc2x !== undefined ? node.bezc2x: 0; // control point 2 x position
  node.bezc2y= node.bezc2y !== undefined ? node.bezc2y: -0.95; // control point 2 y position
  node.bezr  = node.bezr   !== undefined ? node.bezr  : partl1; // line width

  if (node.has_child)
  {
    let atanpre = Math.atan2(node.children[0].richness_val,node.children[1].richness_val);
    let atanpowpre = Math.atan2(Math.pow(node.children[0].richness_val,0.5),Math.pow(node.children[1].richness_val,0.5));

    if ((node.children[0].richness_val) >= (node.children[1].richness_val)) {
      node.nextr[0] = thisratio1; // r (scale) reference for child 1
      node.nextr[1] = thisratio2; // r (scale) reference for child 2
      node.children[0].bezsx = -(0.3)*(tempcospre)/thisratio1;
      node.children[0].bezsy = -(0.3)*(tempsinpre)/thisratio1;
      node.children[0].bezex = tempcos2;
      node.children[0].bezey = tempsin2;
      node.children[0].bezc1x = -0.3*(tempcospre)/thisratio1;
      node.children[0].bezc1y = -0.3*(tempsinpre)/thisratio1;
      node.children[0].bezc2x = 0.15*(tempcospre)/thisratio1;
      node.children[0].bezc2y = 0.15*(tempsinpre)/thisratio1;
      
      node.children[1].bezsx = -(0.3)*(tempcospre)/thisratio2;
      node.children[1].bezsy = -(0.3)*(tempsinpre)/thisratio2;
      node.children[1].bezex = tempcos3;
      node.children[1].bezey = tempsin3;
      node.children[1].bezc1x = 0.1*(tempcospre)/thisratio2;
      node.children[1].bezc1y = 0.1*(tempsinpre)/thisratio2;
      node.children[1].bezc2x = 0.9*tempcos3;
      node.children[1].bezc2y = 0.9*tempsin3;
      
      node.nextx[0] = (1.3*Math.cos(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[1] = (1.3*Math.cos(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    } else {
      node.nextr[1] = thisratio1; // r (scale) reference for child 1
      node.nextr[0] = thisratio2; // r (scale) reference for child 2
      
      node.children[1].bezsx = -(0.3)*(tempcospre)/thisratio1;
      node.children[1].bezsy = -(0.3)*(tempsinpre)/thisratio1;
      node.children[1].bezex = tempcos2;
      node.children[1].bezey = tempsin2;
      node.children[1].bezc1x = -0.2*(tempcospre)/thisratio1;
      node.children[1].bezc1y = -0.2*(tempsinpre)/thisratio1;
      node.children[1].bezc2x = 0.15*(tempcospre)/thisratio1;
      node.children[1].bezc2y = 0.15*(tempsinpre)/thisratio1;
      
      node.children[0].bezsx = -(0.3)*(tempcospre)/thisratio2;
      node.children[0].bezsy = -(0.3)*(tempsinpre)/thisratio2;
      node.children[0].bezex = tempcos3;
      node.children[0].bezey = tempsin3;
      node.children[0].bezc1x = 0.1*(tempcospre)/thisratio2;
      node.children[0].bezc1y = 0.1*(tempsinpre)/thisratio2;
      node.children[0].bezc2x = 0.9*tempcos3;
      node.children[0].bezc2y = 0.9*tempsin3;
      
      node.nextx[1] = (1.3*Math.cos(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(angle))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[0] = (1.3*Math.cos(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(angle))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    }
    
    node.arcx = node.bezex*1.01;
    node.arcy = node.bezey*1.01;
    node.arcr = node.bezr/2;
    
    if ((node.children[0].richness_val) >= (node.children[1].richness_val)) {
      _pre_calc(node.children[0], angle + Math.PI*thisangleright);
      _pre_calc(node.children[1], angle - Math.PI*thisangleleft);
    } else {
      _pre_calc(node.children[1], angle + Math.PI*thisangleright);
      _pre_calc(node.children[0], angle - Math.PI*thisangleleft);
    }
  } else {
    node.arcx = node.bezex+posmult*(tempcospre);
    node.arcy = node.bezey+posmult*(tempsinpre);
    node.arcr = leafmult*partc;
  }
}

let spiral_pre_calc = new SpiralPreCalc();

export default spiral_pre_calc;
