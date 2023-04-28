import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class FernPreCalc {
  constructor() {
    this._viewtype = "fern";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in FernPreCalc.");
    else return this._viewtype;
  }
  pre_calc(node) {
    let partl1 = 0.55;
    if (node.is_root) {
      node.bezsx = -Math.sin(Math.PI*0.05);
      node.bezsy = 0; // start y position
      node.bezex = -Math.sin(Math.PI*0.05); // end x position
      node.bezey = -Math.cos(Math.PI*0.05); // end y position
      node.bezc1x= -Math.sin(Math.PI*0.05); // control point 1 x position 
      node.bezc1y= -0.05; // control point 2 y position
      node.bezc2x= -Math.sin(Math.PI*0.05); // control point 2 x position
      node.bezc2y= -0.95; // control point 2 y position
      node.bezr  = partl1; // line width
      node.arca = Math.PI*(3/2-0.05);
      node.dir = true;
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
  let thisangleleft = 0.2;
  let thisangleright = 0.1;
  let thisratio1 = 0.85;
  let thisratio2 = 0.42;  
  let child1right = false;
  let partl1a = partl1;
	let partl1b = partl1;
  
  let tempsinpre = Math.sin(node.arca);
  let tempcospre = Math.cos(node.arca);
  let tempsin90pre = Math.sin(node.arca + Math.PI/2.0);
  let tempcos90pre = Math.cos(node.arca + Math.PI/2.0);
  
  if (!node.dir) {
    thisangleleft = 0.1;
    thisangleright = 0.2;
    thisratio1 = 0.42;
    thisratio2 = 0.85;
    if (node.has_child) {
      if ((node.children[0].richness_val) < (node.children[1].richness_val)) {
        child1right = true;
      }
    }
  } else {
    if (node.has_child) {
      if ((node.children[0].richness_val) >= (node.children[1].richness_val)) {
        child1right = true;
      }
    }
  }
  
  let tempsin2 = Math.sin(node.arca + Math.PI*thisangleright);
	let tempcos2 = Math.cos(node.arca + Math.PI*thisangleright);
	let tempsin3 = Math.sin(node.arca - Math.PI*thisangleleft);
	let tempcos3 = Math.cos(node.arca - Math.PI*thisangleleft);

  if (node.has_child) {
    if (child1right) {
      node.nextr[0] = thisratio1; // r (scale) reference for child 1
      node.nextr[1] = thisratio2; // r (scale) reference for child 2
      
      (node.children[0]).bezsx = -(0.3)*(tempcospre)/thisratio1;
      (node.children[0]).bezsy = -(0.3)*(tempsinpre)/thisratio1;
      (node.children[0]).bezex = tempcos2;
      (node.children[0]).bezey = tempsin2;
      (node.children[0]).bezc1x = -0.3*(tempcospre)/thisratio1;
      (node.children[0]).bezc1y = -0.3*(tempsinpre)/thisratio1;
      (node.children[0]).bezc2x = 0.15*(tempcospre)/thisratio1;
      (node.children[0]).bezc2y = 0.15*(tempsinpre)/thisratio1;
      (node.children[0]).bezr = partl1;
      (node.children[0]).arca = node.arca + Math.PI*thisangleright;
      (node.children[0]).dir = !node.dir;
      
      (node.children[1]).bezsx = -(0.3)*(tempcospre)/thisratio2;
      (node.children[1]).bezsy = -(0.3)*(tempsinpre)/thisratio2;
      (node.children[1]).bezex = tempcos3;
      (node.children[1]).bezey = tempsin3;
      (node.children[1]).bezc1x = 0.1*(tempcospre)/thisratio2;
      (node.children[1]).bezc1y = 0.1*(tempsinpre)/thisratio2;
      (node.children[1]).bezc2x = 0.9*tempcos3;
      (node.children[1]).bezc2y = 0.9*tempsin3;
      (node.children[1]).bezr = partl1;
      (node.children[1]).arca = node.arca - Math.PI*thisangleleft;
      (node.children[1]).dir = !node.dir;

      node.nextx[0] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1a*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1a*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[1] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1b*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1b*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    }
    else
    {
      node.nextr[1] = thisratio1; // r (scale) reference for child 1
      node.nextr[0] = thisratio2; // r (scale) reference for child 2
      
      (node.children[1]).bezsx = -(0.3)*(tempcospre)/thisratio1;
      (node.children[1]).bezsy = -(0.3)*(tempsinpre)/thisratio1;
      (node.children[1]).bezex = tempcos2;
      (node.children[1]).bezey = tempsin2;
      (node.children[1]).bezc1x = -0.2*(tempcospre)/thisratio1;
      (node.children[1]).bezc1y = -0.2*(tempsinpre)/thisratio1;
      (node.children[1]).bezc2x = 0.15*(tempcospre)/thisratio1;
      (node.children[1]).bezc2y = 0.15*(tempsinpre)/thisratio1;
      (node.children[1]).bezr = partl1;
      (node.children[1]).arca = node.arca + Math.PI*thisangleright;
      (node.children[1]).dir = !node.dir;
      
      (node.children[0]).bezsx = -(0.3)*(tempcospre)/thisratio2;
      (node.children[0]).bezsy = -(0.3)*(tempsinpre)/thisratio2;
      (node.children[0]).bezex = tempcos3;
      (node.children[0]).bezey = tempsin3;
      (node.children[0]).bezc1x = 0.1*(tempcospre)/thisratio2;
      (node.children[0]).bezc1y = 0.1*(tempsinpre)/thisratio2;
      (node.children[0]).bezc2x = 0.9*tempcos3;
      (node.children[0]).bezc2y = 0.9*tempsin3;
      (node.children[0]).bezr = partl1;
      (node.children[0]).arca = node.arca - Math.PI*thisangleleft;
      (node.children[0]).dir = !node.dir;
      
      node.nextx[1] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1a*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1a*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[0] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1b*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1b*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    }
    
    node.arcx = node.bezex*1.01;
    node.arcy = node.bezey*1.01;
    node.arcr = (node.bezr)/2;
    
    if (node.has_child)
    {
      if (node.children[0].recalc) _pre_calc(node.children[0]);
      if (node.children[1].recalc) _pre_calc(node.children[1]);
    }
  }
  else
  {
    node.arcx = node.bezex+posmult*(tempcospre);
    node.arcy = node.bezey+posmult*(tempsinpre);
    node.arcr = leafmult*partc;
  }
}

let fern_pre_calc = new FernPreCalc();

export default fern_pre_calc;
