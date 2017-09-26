function get_abs_x(node, x) {
  return node.xvar + node.rvar * x;
}

function get_abs_y(node, y) {
  return node.yvar + node.rvar * y;
}

function get_abs_r(node, r) {
  return node.rvar * r;
}

function substitute_variables(str, vars) {
    /* with a string like 'foo {bar}', and a vars object like {'bar':'sub'}, return 'foo sub' */
    return str.replace(/\{(\w+)\}/g, function (match, capture) {return(vars[capture])});
}

export {get_abs_x, get_abs_y, get_abs_r, substitute_variables};
