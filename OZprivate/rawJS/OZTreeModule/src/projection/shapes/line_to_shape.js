import * as renderer from '../../render/line_to_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class LineToShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.x = 1.0;
    this.y = 1.0;
  }
}

LineToShape.obj_pool = new ObjectPool(LineToShape, 2000);

export default LineToShape;