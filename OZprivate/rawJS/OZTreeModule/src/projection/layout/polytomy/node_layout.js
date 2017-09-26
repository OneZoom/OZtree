import NodeLayoutBase from '../node_layout_helper';
import config from '../../../global_config';

import tree_state from '../../../tree_state';
import {color_theme} from '../../../themes/color_theme';
import ArcShape from '../../shapes/arc_shape';
import TextShape from '../../shapes/text_shape';
import ImageShape from '../../shapes/image_shape';
import ArcTextShape from '../../shapes/arc_text_shape';
import {ageAsText, gpmapper, is_primary_or_secondary_name} from '../../../factory/utils';
import {add_mr} from '../../move_restriction';
import {global_button_action} from '../../../button_manager';
import {live_area_config} from '../../live_area_config';



class PolytomyNodeLayout extends NodeLayoutBase {
  calc_twh(node) {
    this.twidth = node.rvar * node.arcr;
    this.theight = node.rvar * node.arcr * 0.53;
    this.theight2 = node.rvar * node.arcr * 0.37;
  }
    
    interior_circle_shapes(node, shapes) {
        
        // uncomment this to get guidelines
        /*
        let horizonarc = ArcShape.create();
        if (!this.hovered && this.live_area_interior_circle_test(node)) {
            this.hovered = true;
            this.hovering = true;
            live_area_config.interior_low_res_circle.register_button_event(node);
        }
        horizonarc.x = node.xvar + node.rvar * node.arcx;
        horizonarc.y = node.yvar + node.rvar * node.arcy;
        horizonarc.r = node.rvar;
        horizonarc.circle = true;
        horizonarc.height = 2;
        horizonarc.order = "fill_first";
        horizonarc.do_stroke = true;
        horizonarc.stroke.line_width = 1;
        horizonarc.stroke.color = color_theme.get_color('interior.circle.stroke', node);
        shapes.push(horizonarc);
        //*/
        
        let condition = node.rvar > config.projection.node_low_res_thres && config.projection.interior_circle_draw;
        if (!condition) return;
        let arc_shape = ArcShape.create();
        if (!this.hovered && this.live_area_interior_circle_test(node)) {
            this.hovered = true;
            this.hovering = true;
            live_area_config.interior_low_res_circle.register_button_event(node);
        }
        arc_shape.x = node.xvar + node.rvar * node.arcx;
        arc_shape.y = node.yvar + node.rvar * node.arcy;
        arc_shape.r = node.rvar * node.arcr * (1-config.projection.partl2/2.0);
        arc_shape.circle = true;
        arc_shape.height = 2;
        arc_shape.order = "fill_first";
        arc_shape.do_stroke = true;
        arc_shape.stroke.line_width = node.arcr * config.projection.partl2 * node.rvar;
        arc_shape.stroke.color = color_theme.get_color('interior.circle.stroke', node);
        /*
        // James - I think this code allows the stroke around an interior circle to be a different colour depending on whether it's a search hit or not. This never happens, which I think is beacuse it's bugged
        // for now I'm simply removing as this was not such an important feature anyway.
        if (node.has_child) {
            let is_common_ancestor = true;
            let length = node.children.length;
            for (let i=0; i<length; i++) {
                if (!node.children[i].route_to_search) { // the bug is here, requires all descendents to be marked in order for it to work
                    is_common_ancestor = false;
                    break;
                }
            }
            if (is_common_ancestor) {
                arc_shape.stroke.color = color_theme.get_color('interior.circle_searchin.stroke', node)
            }
        }
        */
        arc_shape.do_fill = true;
        arc_shape.fill.color = color_theme.get_color('interior.circle.fill', node);
        if (this.hovering) {
            arc_shape.stroke.color = color_theme.get_color('interior.circle_hover.stroke', node);
            arc_shape.fill.color = color_theme.get_color('interior.circle_hover.fill', node);
        }
        this.hovering = false;
        shapes.push(arc_shape);
    }
}

export default PolytomyNodeLayout;
