import BranchLayoutBase from '../branch_layout_helper';

const THIN = true;
const NORMAL = false;

class ATBranchLayout extends BranchLayoutBase {
  get_branch_shapes(node, shapes) {
    this.get_bezier_shapes(node, shapes);
    if (node.route_to_search || node.route_to_search1 || node.route_to_search2) {
      this.draw_hightlight_on_search_route(node, shapes);
    } else if (node.concestor) {
      this.draw_interior_circle(node, shapes);
      this.get_highlight_shapes(node, shapes, 'concestor', NORMAL);
    }
  }
}

export default ATBranchLayout;