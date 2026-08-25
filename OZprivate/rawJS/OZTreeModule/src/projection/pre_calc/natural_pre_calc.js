import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class NaturalPreCalc {
  constructor() {
    this._viewtype = "natural";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in NaturalPreCalc.");
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
  let thisangleleft = 0.5;
  let thisangleright = 0.2;
  let thisratio1 = 0.77;
  let thisratio2 = 0.47;  
  
  let tempsinpre = Math.sin(node.arca);
  let tempcospre = Math.cos(node.arca);
  let tempsin90pre = Math.sin(node.arca + Math.PI/2.0);
  let tempcos90pre = Math.cos(node.arca + Math.PI/2.0);

  if (node.has_child) {
    let atanpre = Math.atan2(node.children[0].richness_val, node.children[1].richness_val);
    let atanpowpre = Math.atan2(Math.pow(node.children[0].richness_val, 0.5),Math.pow(node.children[1].richness_val, 0.5));
    
    if (node.children[0].richness_val >= node.children[1].richness_val) {
      thisangleright = 0.45-(atanpre)/Math.PI/0.5*0.449;
      thisangleleft = 0.45-(0.5-(atanpre)/Math.PI)/0.5*0.449;
      thisratio1 = 0.3+(atanpowpre)/Math.PI/0.5*0.5;
      thisratio2 = 0.3+(0.5-(atanpowpre)/Math.PI)/0.5*0.5;
    } else {
      thisangleleft = 0.45-(atanpre)/Math.PI/0.5*0.449;
      thisangleright = 0.45-(0.5-(atanpre)/Math.PI)/0.5*0.449;
      thisratio2 = 0.3+(atanpowpre)/Math.PI/0.5*0.5;
      thisratio1 = 0.3+(0.5-(atanpowpre)/Math.PI)/0.5*0.5;
    }
    let tempsin2 = Math.sin(node.arca + Math.PI*thisangleright);
    let tempcos2 = Math.cos(node.arca + Math.PI*thisangleright);
    let tempsin3 = Math.sin(node.arca - Math.PI*thisangleleft);
    let tempcos3 = Math.cos(node.arca - Math.PI*thisangleleft);

    if ((node.children[0].richness_val) >= (node.children[1].richness_val))
    {
      node.nextr[0] = thisratio1; // r (scale) reference for child 1
      node.nextr[1] = thisratio2; // r (scale) reference for child 2
      
      node.children[0].branch_cubic({
        sx: -(0.3)*(tempcospre)/thisratio1,
        sy: -(0.3)*(tempsinpre)/thisratio1,
        cp1x: 0,
        cp1y: 0,
        cp2x: 0.9*tempcos2,
        cp2y: 0.9*tempsin2,
        ex: tempcos2,
        ey: tempsin2,
      });
      node.children[0].bezr = partl1;
      node.children[0].arca = node.arca + Math.PI*thisangleright;

      node.children[1].branch_cubic({
        sx: -(0.3)*(tempcospre)/thisratio2,
        sy: -(0.3)*(tempsinpre)/thisratio2,
        cp1x: 0,
        cp1y: 0,
        cp2x: 0.3*tempcos3,
        cp2y: 0.3*tempsin3,
        ex: tempcos3,
        ey: tempsin3,
      });
      node.children[1].bezr = partl1;
      node.children[1].arca = node.arca - Math.PI*thisangleleft;
      
      node.nextx[0] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[1] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    }
    else
    {
      node.nextr[1] = thisratio1; // r (scale) reference for child 1
      node.nextr[0] = thisratio2; // r (scale) reference for child 2
      
      node.children[1].branch_cubic({
        sx: -(0.3)*(tempcospre)/thisratio1,
        sy: -(0.3)*(tempsinpre)/thisratio1,
        cp1x: 0,
        cp1y: 0,
        cp2x: 0.9*tempcos2,
        cp2y: 0.9*tempsin2,
        ex: tempcos2,
        ey: tempsin2,
      });
      node.children[1].bezr = partl1;
      node.children[1].arca = node.arca + Math.PI*thisangleright;

      node.children[0].branch_cubic({
        sx: -(0.3)*(tempcospre)/thisratio2,
        sy: -(0.3)*(tempsinpre)/thisratio2,
        cp1x: 0,
        cp1y: 0,
        cp2x: 0.9*tempcos3,
        cp2y: 0.9*tempsin3,
        ex: tempcos3,
        ey: tempsin3,
      });
      node.children[0].bezr = partl1;
      node.children[0].arca = node.arca - Math.PI*thisangleleft;
      
      node.nextx[1] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[1] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
      node.nextx[0] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
      node.nexty[0] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    }
    
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

let natural_pre_calc = new NaturalPreCalc();

export default natural_pre_calc;
