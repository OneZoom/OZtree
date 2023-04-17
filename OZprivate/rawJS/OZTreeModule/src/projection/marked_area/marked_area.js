export function marked_area(node, area_map) {
  // Only do this for developed nodes
  if (!node.has_child) return;

  // If we're the root, do our own marked areas
  if (node.is_root) {
    node.markings = [];
    for (let i = 0; i < area_map.length; i++) {
      node.markings.push(area_map[i]);
    }
  }

  // Clear markings on children
  for (let i = 0; i < node.children.length; i++) {
    node.children[i].markings = [];
  }

  // For each area_map, add a highlight for the child heading towards the ozid
  for (let i = 0; i < area_map.length; i++) {
    let idx = node.child_index_towards(area_map[i].ozid);
    // NB: We populate by-reference, so we don't spew strings everywhere
    if (idx !== null) node.children[idx].markings.push(area_map[i]);
  }

  // Recurse
  for (let i = 0; i < node.children.length; i++) {
    marked_area(node.children[i], area_map);
  }
}
