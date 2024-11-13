import {set_horizon_calculator} from '../horizon_calc/horizon_calc';

class SpiralPreCalc {
  constructor() {
    this._viewtype = "spiral";
  }
  get viewtype() {
    if (!this._viewtype) throw new Error("viewtype not defined in SpiralPreCalc.");
    else return this._viewtype;
  }
  pre_calc(node) {
    let partl1 = 0.55;
    if (node.is_root) {
      node.bezsx =  0;
      node.bezsy =  0; // start y position
      node.bezex =  0; // end x position
      node.bezey =  -1; // end y position
      node.bezc1x=  0; // control point 1 x position 
      node.bezc1y=  -0.05; // control point 2 y position
      node.bezc2x=  0; // control point 2 x position
      node.bezc2y=  -0.95; // control point 2 y position
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
  let thisangleleft = 0.46;
  let thisangleright = 0.22;
  let thisratio1 = 1/1.3;
  let thisratio2 = 1/2.25;
  let partl1 = 0.55;
  let tempsinpre = Math.sin(node.arca);
  let tempcospre = Math.cos(node.arca);
  let tempsin90pre = Math.sin(node.arca + Math.PI/2.0);
  let tempcos90pre = Math.cos(node.arca + Math.PI/2.0);
  let tempsin2 = Math.sin(node.arca + Math.PI*thisangleright);
  let tempcos2 = Math.cos(node.arca + Math.PI*thisangleright);
  let tempsin3 = Math.sin(node.arca - Math.PI*thisangleleft);
  let tempcos3 = Math.cos(node.arca - Math.PI*thisangleleft);
  
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

    const [leftChildIndex, rightChildIndex] = (node.children[0].richness_val) >= (node.children[1].richness_val) ? [1, 0] : [0, 1];
    const leftChild = node.children[leftChildIndex];
    const rightChild = node.children[rightChildIndex];
    
    node.nextr[rightChildIndex] = thisratio1; // r (scale) reference for child 1
    node.nextr[leftChildIndex] = thisratio2; // r (scale) reference for child 2
    rightChild.bezsx = -(0.3)*(tempcospre)/thisratio1;
    rightChild.bezsy = -(0.3)*(tempsinpre)/thisratio1;
    rightChild.bezex = tempcos2;
    rightChild.bezey = tempsin2;
    rightChild.bezc1x = -0.3*(tempcospre)/thisratio1;
    rightChild.bezc1y = -0.3*(tempsinpre)/thisratio1;
    rightChild.bezc2x = 0.15*(tempcospre)/thisratio1;
    rightChild.bezc2y = 0.15*(tempsinpre)/thisratio1;
    rightChild.arca = node.arca + Math.PI*thisangleright;
    
    leftChild.bezsx = -(0.3)*(tempcospre)/thisratio2;
    leftChild.bezsy = -(0.3)*(tempsinpre)/thisratio2;
    leftChild.bezex = tempcos3;
    leftChild.bezey = tempsin3;
    leftChild.bezc1x = 0.1*(tempcospre)/thisratio2;
    leftChild.bezc1y = 0.1*(tempsinpre)/thisratio2;
    leftChild.bezc2x = 0.9*tempcos3;
    leftChild.bezc2y = 0.9*tempsin3;
    leftChild.arca = node.arca - Math.PI*thisangleleft;
    
    node.nextx[rightChildIndex] = (1.3*Math.cos(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[rightChildIndex] = (1.3*Math.sin(node.arca))+(((node.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
    node.nextx[leftChildIndex] = (1.3*Math.cos(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
    node.nexty[leftChildIndex] = (1.3*Math.sin(node.arca))-(((node.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
    
    node.arcx = node.bezex*1.01;
    node.arcy = node.bezey*1.01;
    node.arcr = node.bezr/2;
    
    _pre_calc(node.children[0]);
    _pre_calc(node.children[1]);
  } else {
    node.arcx = node.bezex+posmult*(tempcospre);
    node.arcy = node.bezey+posmult*(tempsinpre);
    node.arcr = leafmult*partc;
  }
}

let spiral_pre_calc = new SpiralPreCalc();

export default spiral_pre_calc;
