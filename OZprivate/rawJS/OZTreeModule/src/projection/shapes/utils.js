export function set_data(obj1, obj2) {
  for (let key in obj2) {
    obj1[key] = obj2[key];
  }
}


export function get_abs_x(node, x) {
  return node.xvar + node.rvar * x;
}

export function get_abs_y(node, y) {
  return node.yvar + node.rvar * y;
}

export function get_abs_r(node, r) {
  if (typeof r === "function") {
    let res = r(node.rvar);
    return res;
  } else {
    return node.rvar * r;
  }
}