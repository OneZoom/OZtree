import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class MoveToShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.x = 1.0;
    this.y = 1.0;
  }
  render(context) {
    context.moveTo(this.x, this.y);
  }
  follow_path(context) {
    context.moveTo(this.x, this.y);
  }
}

MoveToShape.obj_pool = new ObjectPool(MoveToShape, 2000);

export default MoveToShape;
