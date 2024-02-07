import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class LineToShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.x = 1.0;
    this.y = 1.0;
  }
  render(context) {
    context.lineTo(this.x, this.y);
  }
  follow_path(context) {
    context.lineTo(this.x, this.y);
  }
}

LineToShape.obj_pool = new ObjectPool(LineToShape, 2000);

export default LineToShape;
