import BaseShape from './base_shape';
import {ObjectPool} from '../../util/index';

class ArcTextShape extends BaseShape {
  constructor(obj) {
    super(obj);
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
  render(context) {
    // save the context state so we don't mess it up
    context.save();    
    // we need a monospaced font in order for this not to look rubbish
    if (this.font_style) {
      context.font = this.font_style + ' ' + (this.width.toString() + 'px courier');
    } else {
      context.font = (this.width.toString() + 'px courier');
    }
    // context.fillStyle = textColor;
    if (this.do_fill) {
      context.fillStyle = this.fill.color;
    }
  
    context.translate(this.x, this.y);
    context.rotate(this.start_angle);
    if (this.text_direction == -1) {
      context.rotate(Math.PI)
    }
  
    // loop around each character
    for (let i = 0 ; i < this.text.length ; i ++) {
      // push context onto context state stack
      context.save();
      // move from centre to edge of circle
      context.translate(0,this.text_direction*(-this.r));
      // fill text
      context.fillText(this.text[i],0,0);
      // restore context by popping back from context state stack
      context.restore();
      // rotate ready for next position
      context.rotate(this.text_direction*this.gap_angle);
    }
  
    // restore the context
    context.restore();
  }
}

ArcTextShape.obj_pool = new ObjectPool(ArcTextShape, 100);

export default ArcTextShape;
