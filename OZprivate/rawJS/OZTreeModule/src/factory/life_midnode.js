import Midnode from './midnode';
import {ObjectPool} from '../util/index';

class LifeMidnode extends Midnode {
  constructor() {
    super();
    this.bezsx = undefined;
    this.bezsy = undefined;
    this.bezc1x = undefined;
    this.bezc1y = undefined;
    this.bezc2x = undefined;
    this.bezc2y = undefined;
    this.bezex = undefined;
    this.bezey = undefined;
    this.bezr = undefined;
  }
}

LifeMidnode.obj_pool = new ObjectPool(LifeMidnode, 25000);

export default LifeMidnode;