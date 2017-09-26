import * as renderer from '../../render/move_to_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class MoveToShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.x = 1.0;
    this.y = 1.0;
  }
}

MoveToShape.obj_pool = new ObjectPool(MoveToShape, 2000);

export default MoveToShape;