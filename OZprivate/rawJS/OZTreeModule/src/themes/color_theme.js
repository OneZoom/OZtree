import {resolve} from '../util/index';

class ColorTheme {
  constructor() {
    this.theme = null;
  }
  /**
   * There are two ways to get a color.
   * Firstly, provide a name and get the color of that name
   * Secondly, provide a name and get a function and then call the function together with the current node to get the color.
   */
  get_color(name, node) {
    //name here is like 'interior.text.stroke' or 'branch.stroke' .....
    let color = resolve(this.theme, name);
    
    if (typeof color === "function") {
      return color(node);
    } else if (typeof color === "string") {
      return color;
    } else {
      throw new Error(`Can't find color ${name}. Please make sure that you've defined ${name}`);
    }
  }
}

function set_theme(val) {
  color_theme.theme = val;
}

let color_theme = new ColorTheme();
export {color_theme, set_theme};