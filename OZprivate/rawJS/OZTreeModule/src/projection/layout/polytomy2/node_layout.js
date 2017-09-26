import NodeLayoutBase from '../node_layout_helper';
import config from '../../../global_config';

class PolytomyNodeLayout extends NodeLayoutBase {
  calc_twh(node) {
    this.twidth = node.rvar * node.arcr;
    this.theight = node.rvar * node.arcr * 0.53;
    this.theight2 = node.rvar * node.arcr * 0.37;
  }
}

export default PolytomyNodeLayout;