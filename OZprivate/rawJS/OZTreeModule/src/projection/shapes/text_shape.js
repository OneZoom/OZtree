import * as renderer from '../../render/text_renderer';
import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class TextShape extends BaseShape {
  constructor(obj) {
    super(obj);
    this.renderer = renderer;
    this.font_style = this.font_style ? this.font_style : null;
    this.min_text_size_extra = this.min_text_size_extra ? this.min_text_size_extra : 0;
    this.height = this.height ? this.height : 5;
    this.defpt = 1.0;
    this.x = 1.0;
    this.y = 1.0;
    this.width = 1.0;
    this.line = 1;
    this.do_stroke = false;
    this.do_fill = false;
    this.stroke  = {
      line_cap: 'round',
      line_width : 1.0,
      color: "rgb(255, 255, 255)"
    };
    this.fill = {
      color: 'rgb(255, 255, 255)'
    }
  }
  release() {
    this.do_stroke = false;
    this.do_fill = false;
    this.line = 1;
    this.font_style = null;
  }
}

TextShape.obj_pool = new ObjectPool(TextShape, 1000);

export default TextShape;