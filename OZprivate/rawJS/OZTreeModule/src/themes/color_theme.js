import {resolve} from '../util/index';

class ColorTheme {
  constructor() {
    this.theme = null;
  }
  /**
   * There are two ways to get a color.
   * Firstly, provide a name and get the color of that name
   * Secondly, provide a name and get a function and then call the function together with the current node to get the color.
   *
   * (alpha) allows code to override the alpha portion of the color, if the
   * color is defined as a function the desired alpha will be provided as the
   * second parameter. If a string then get_color() will place the alpha value
   * inside before returning. If the color already has an alpha channel this
   * will override anything the code provides.
   */
  get_color(name, node, alpha) {
    //name here is like 'interior.text.stroke' or 'branch.stroke' .....
    let color = resolve(this.theme, name);
    if (!alpha) {
        alpha = 1;
    }
    
    if (typeof color === "function") {
      return color(node, alpha);
    } else if (typeof color === "string") {
      if (alpha !== 1) {
        // Add alpha to end of any rgb() or hsl() color
        color = color.replace(/(rgb|hsl)\((.*)\)/, "$1a($2," + alpha + ")");
      }
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