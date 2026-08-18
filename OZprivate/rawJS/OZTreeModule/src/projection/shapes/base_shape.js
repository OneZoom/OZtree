import {set_data} from './utils';

let uid = 0;
class BaseShape {
  constructor(obj) {
    set_data(this, obj);
    this.uid = uid++;
  }
  static create(obj) {
    let shape = this.obj_pool.get();
    set_data(shape, obj);
    shape.uid = uid++;
    return shape;
  }
  free() {
    this.constructor.obj_pool.release(this);
  }
}

export default BaseShape;