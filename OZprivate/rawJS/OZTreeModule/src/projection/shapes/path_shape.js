import * as renderer from '../../render/path_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class PathShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.x = NaN;
    this.y = NaN;
    this.do_fill = false;
    this.do_stroke = false;
    this.path = new Array(9);
    this.path_length = 0;
    this.fill = {
      color: 'rgb(255, 255, 255)'
    };
    this.stroke = {
      color: 'rgb(255, 255, 255)',
      linw_width: 1
    }
  }
  release() {
    for (let i=0; i<this.path_length; i++) {
      let _shape = this.path[i];
      _shape.free();  
    }
    this.path_length = 0;
    this.do_fill = false;
    this.do_stroke = false;
  }
}

PathShape.obj_pool = new ObjectPool(PathShape, 4500);

export default PathShape;