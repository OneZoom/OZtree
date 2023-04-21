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
  get_color(name, node, alpha, missing_okay = false) {
    //name here is like 'interior.text.stroke' or 'branch.stroke' .....
    let color = resolve(this.theme, name);
    if (!alpha) {
        alpha = 1;
    }
    
    if (typeof color === "function") {
      return color(node, alpha);
    }
    if (typeof color === "string") {
      if (alpha !== 1) {
        // Add alpha to end of any rgb() or hsl() color
        color = color.replace(/(rgb|hsl)\((.*)\)/, "$1a($2," + alpha + ")");
      }
      return color;
    }
    if (missing_okay) {
      return undefined;
    }
    throw new Error(`Can't find color ${name}. Please make sure that you've defined ${name}`);
  }

  /**
   * Pick a new colour from the branch.marked_area_pallette, based on what's already selected
   * @param existing_colors Array/String Either
   *                        Array of currently used HTML colour specs, e.g: ['rgb(...)', 'rgb(...)']
   *                        Name of color from color scheme
   * @param node Midnode A node to hand to get_color()
   */
  pick_marked_area_color(existing_colors, node) {
    if (typeof existing_colors === 'string') {
      // Handed a string, assume it's a name in the pallete
      return this.get_color('branch.marked_area_pallette.' + existing_colors , node, undefined, true)
    }
    // color needs to be automatically defined
    let existing_color_use_tally = [];
    // how many times have colours been used (want to minimise repeats)
    let existing_color_min_distance = [];
    // calculate how many elements in color map?
    let num_colors_in_pallette = Object.keys(this.theme.branch.marked_area_pallette).length
    // calculate how many colors available in pallette?
    for (let i=0; i<num_colors_in_pallette; i++) {
      existing_color_use_tally.push(0);
      existing_color_min_distance.push(existing_colors.length + 1);
      // setup the arrays with zeros
    }
    // double loop to populate the arrays
    for (let i=0; i<existing_colors.length; i++) {
      for (let j=0; j<(num_colors_in_pallette); j++) {
        // looping over all possible colors and all used colors
        let color =  this.get_color('branch.marked_area_pallette.' + j , node);
        // find out what color was used in the colour pallette
        if (color == existing_colors[i]) {
            // the color is a match
            existing_color_use_tally[j] = existing_color_use_tally[j] + 1;
            // measure distance from end and put that in the array
            let distance_from_end = (existing_colors.length-i-1);
            if (existing_color_min_distance[j] > distance_from_end)
            {
              existing_color_min_distance[j] = distance_from_end;
            }
          }
      }
    }
    // look to see if any colors are unused
    for (let i=0; i<existing_color_use_tally.length; i++) {
      if (existing_color_use_tally[i] == 0)
      {
        // color is unused so use it
        return this.get_color('branch.marked_area_pallette.' + i , node);
      }
    }
    // we need to choose the color furthest from the end
    let max_min_distance = 0 ;
    // maximum of the min distance tally
    let max_min_distance_index = existing_colors.length -1;
    for (let i=0; i<existing_color_min_distance.length; i++) {
      // loop through all to select choice
      if (existing_color_min_distance[i] > max_min_distance)
      {
        max_min_distance_index = i;
        max_min_distance = existing_color_min_distance[i];
      }
    }
    return this.get_color('branch.marked_area_pallette.' + max_min_distance_index, node);
  }
}

function set_theme(val) {
  color_theme.theme = val;
}

let color_theme = new ColorTheme();
export {color_theme, set_theme};