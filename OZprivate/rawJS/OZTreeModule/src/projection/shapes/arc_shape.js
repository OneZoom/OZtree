import * as renderer from '../../render/arc_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class ArcShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.x = 1.0;
    this.y = 1.0;
    this.r = 1.0;
    this.order = null;
    this.circle = false;
    this.stroke  = {
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.fill = {
      color: 'rgb(255, 255, 255)'
    }
  }
  release() {
    this.do_stroke = false;
    this.stroke  = {
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.do_fill = false;
    this.order = null;
    this.circle = false;
  }
}
ArcShape.obj_pool = new ObjectPool(ArcShape, 8000);

export default ArcShape;