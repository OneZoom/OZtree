import LeafLayoutBase from '../leaf_layout_helper';

import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';
import ArcTextShape from '../../shapes/arc_text_shape';
import TextShape from '../../shapes/text_shape';
import PathShape from '../../shapes/path_shape';
import ImageShape from '../../shapes/image_shape';
import BezierShape from '../../shapes/bezier_shape';
import MoveToShape from '../../shapes/move_to_shape';
import LineToShape from '../../shapes/line_to_shape';
import tree_state from '../../../tree_state';
import {get_abs_x, get_abs_y, get_abs_r} from '../utils';
import {global_button_action} from '../../../button_manager';
import {live_area_config} from '../../live_area_config';
import {add_mr} from '../../move_restriction';
import {get_image, image_ready} from '../../../image_cache';
import {extxt, spec_num_full} from '../../../factory/utils';
import config from '../../../global_config';

class PolytomyLeafLayoutBase extends LeafLayoutBase {
    // redefine the leafbase so that we don't get a background coloured slither around the leaf
    fullLeafBase(x,y,r,angle,node,shapes) {
        this.leafBaseLiveAreaTest(x,y,r,node);
        this.randomNaturalLeaf(x,y,r,angle,node,shapes);
        this.hovering = false;
    }
}

export default PolytomyLeafLayoutBase;
