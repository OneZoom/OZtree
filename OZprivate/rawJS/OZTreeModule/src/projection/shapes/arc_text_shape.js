import * as renderer from '../../render/arc_text_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class ArcTextShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.x = 1.0;
    this.y = 1.0;
    this.r = 1.0;
    this.text = null;
    this.text_direction = 1;
    this.font_style = null;
    this.start_angle = 1.0;
    this.gap_angle = 1.0;
    this.width = 1.0;
    this.fill = {
      color : 'rgb(255, 255, 255)'
    };
    this.do_fill = false;
  }
  release() {
    this.do_fill = false;
    this.font_style = null;
  }
}

ArcTextShape.obj_pool = new ObjectPool(ArcTextShape, 100);

export default ArcTextShape;