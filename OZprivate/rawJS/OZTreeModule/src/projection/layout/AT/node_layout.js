import NodeLayoutBase from '../node_layout_helper';
import config from '../../../global_config';
import {color_theme} from '../../../themes/color_theme';
import {ageAsText, gpmapper, is_primary_or_secondary_name} from '../../../factory/utils';

class ATNodeLayout extends NodeLayoutBase {
  get_textonly_header(node) {
    if (node.concestor) {
      return get_concestor_interior_header(node);
    } else {
      return super.get_textonly_header.call(this, node);
    }
  }
  
  get_pic_header_text(node) {
    if (node.concestor) {
      return get_concestor_interior_header(node);
    } else {
      return super.get_pic_header_text.call(this, node);
    }
  }
  
  fill_low_res_text_style(text_shape, node) {
    text_shape.x = node.xvar + node.rvar * node.arcx;
    text_shape.y = node.yvar + node.rvar * node.arcy;
    text_shape.width = node.rvar * node.arcr * 1.65 * (1-config.projection.partl2/2.0);
    if (node.concestor) {
      text_shape.defpt = this.theight2 * 1.4;  
    } else {
      text_shape.defpt = this.theight2 * 0.57;
    }
    
    text_shape.height = 3;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color('interior.text.fill', node);
  }
  
  fill_low_res_text_content(text_shape, node) {
    if (node.concestor) {
      text_shape.text = node.concestor;
      text_shape.line = 1;
    } else if (node.cname) {
      text_shape.text = node.cname;
      text_shape.line = 3;
    } else if (node.latin_name) {
      text_shape.text = node.latin_name;
      text_shape.line = 2;
    } else if (node.richness_val >= 10000) {
      text_shape.text = node.spec_num_full;
      text_shape.line = 2;
    } else {
      text_shape.text = node.spec_num_full;
      text_shape.line = 1;
    }
  }
}

function get_concestor_interior_header(node) {
  let textonly_header;
  let concestor_append = "Concestor " + node.concestor + ",";
  if (node.lengthbr && node.lengthbr>0) {
    //This is a dated node
    if (is_primary_or_secondary_name(node)) {
      textonly_header = (["", "", "the most recent common ancestor to today’s",
      "the " + gpmapper(node.lengthbr) + " period, lived " + concestor_append,
      ageAsText(node.lengthbr) + ", during"]);
    } else {
      textonly_header = (["", "common ancestor to species including",  "lived " + concestor_append + " the most recent",
      "during the " + gpmapper(node.lengthbr) + " period,",
      ageAsText(node.lengthbr)])
    }
  } else {
    //This is an undated node (shouldn't happen)
    if (is_primary_or_secondary_name(node)) {
      textonly_header = (["","","the most recent common ancestor to today's", concestor_append]);
    } else {
      textonly_header = (["","ancestor to species including", "the most recent common", concestor_append]);
    }
  }
  return textonly_header;
}

export default ATNodeLayout;    