let _interior_layout, _leaf_layout, _branch_layout, _signpost_layout;

function set_layout(BranchLayout, NodeLayout, LeafLayout, SignpostLayout) {
  _interior_layout = new NodeLayout();
  _branch_layout = new BranchLayout();
  _leaf_layout = new LeafLayout();
  _signpost_layout = new SignpostLayout();
}

function get_signpost_shapes(node, shapes) {
  return _signpost_layout.get_shapes(node, shapes);
}

function get_leaf_shapes(node, shapes) {
  return _leaf_layout.get_shapes(node, shapes);
}

function get_interior_shapes(node, shapes) {
  return _interior_layout.get_shapes(node, shapes);
}

function get_branch_shapes(node, shapes) {
  return _branch_layout.get_shapes(node, shapes);
}

export {set_layout, get_signpost_shapes, get_leaf_shapes, get_interior_shapes, get_branch_shapes}