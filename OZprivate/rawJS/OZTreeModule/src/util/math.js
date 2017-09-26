export function max() {
  let temp_max;
  if (arguments.length <= 1) {
    throw new Error("max must have two or more arguments");
  } else {
    temp_max = arguments[0];
    for (let i=1; i<arguments.length; i++) {
      if (!isNaN(arguments[i])) {
        temp_max = Math.max(temp_max, arguments[i]);  
      }
    }
  }
  return temp_max;
}

export function min() {
  let temp_min;
  if (arguments.length <= 1) {
    throw new Error("min must have two or more arguments");
  } else {
    temp_min = arguments[0];
    for (let i=1; i<arguments.length; i++) {
      if (!isNaN(arguments[i])) {
        temp_min = Math.min(temp_min, arguments[i]);
      }
    }
  }
  return temp_min;
}