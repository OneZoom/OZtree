import * as renderer from '../../render/bezier_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class BezierShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.sx = NaN;
    this.sy = NaN;
    this.do_stroke = false;
    
    //following parameters would be override each time a bezier_shape is created.
    this.c1x = 1.0;
    this.c1y = 1.0;
    this.c2x = 1.0;
    this.c2y = 1.0;
    this.ex = 1.0;
    this.ey = 1.0;
    this.path_points = [];
    this.stroke  = {
      line_cap: 'round',
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.markings_list = [];
  }
  release() {
    this.sx = NaN;
    this.sy = NaN;
    this.do_stroke = false;
    this.path_points = [];
  }
}

BezierShape.obj_pool = new ObjectPool(BezierShape, 15000);

export default BezierShape;