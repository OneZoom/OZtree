import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';
import TextShape from '../../shapes/text_shape';
import ImageShape from '../../shapes/image_shape';
import * as tree_setting from '../../../tree_setting';
import {get_image, image_ready} from '../../../image_cache'
import {global_button_action} from '../../../button_manager';
import {live_area_config} from '../../live_area_config';

import SignpostLayoutBase from '../signpost_layout_helper';

// this overwrites the default behaviour of signpost_layout

class SignpostLayoutBase2 extends SignpostLayoutBase {
    
    // need to change the centre point to be over the circular horizon of the node
    calc_center_point(node) {
        this.centerx = node.xvar + node.rvar * node.ex;
        this.centery = node.yvar + node.rvar * node.ey;;
        this.centerr = node.rvar;
    }
    
}

export default SignpostLayoutBase2;
