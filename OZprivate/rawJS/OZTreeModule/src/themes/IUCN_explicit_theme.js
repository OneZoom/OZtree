// define colours that will be used

let black = 'rgb(0,0,0)';
let very_dark_grey = 'rgb(50,50,50)';
let dark_grey = 'rgb(85,85,85)';
let grey = 'rgb(107,107,107)';
let light_grey = 'rgb(125,125,125)';
let very_light_grey = 'rgb(180, 180, 180)';
let off_white = 'rgb(240,240,240)'
let white = 'rgb(255,255,255)';

let half_transparent_black = 'rgba(0,0,0,0.5)';
let transparent_black = 'rgba(0,0,0,0.2)';
let slightly_tranparent_white = 'rgba(255,255,255,0.85)';
let half_transparent_white = 'rgba(255,255,255,0.5)';
let very_transparent_white = 'rgba(255,255,255,0.2)';

let dark_green = 'rgb(20,80,00)';
let green = 'rgb(70,135,30)';
let light_green = 'rgb(135,215,90)';

let dark_red = 'rgb(80,00,00)'
let red = 'rgb(140,20,20)';
let light_red = 'rgb(225,180,155)';

let pastel_red = 'rgb(255,130,130)';
let pastel_green = 'rgb(130,255,130)';
let pastel_blue = 'rgb(130,130,255)';
let pastel_cyan = 'rgb(100,200,200)';
let pastel_magenta = 'rgb(200,100,200)';
let pastel_yellow = 'rgb(200,200,100)';

// define functions of a node that return different colours depending on node status

function outline_highlight(node) {
  if (node.richness_val > 1) {
    return black;
  } else {
    return leafcolor2b(node);
  }
}

function leafcolor2b(node) {
   // this is for the colour of the line around a leaf on mouseover
  switch(node.redlist) {
    case "EX":
          return very_dark_grey;
    case "EW":
          return very_dark_grey;
    case "CR":
          return dark_red;
    case "EN":
          return dark_red;
    case "VU":
          return dark_red;
    case "NT":
          return dark_green;
    case "LC":
          return dark_green;
    case "DD":
          return very_dark_grey;
    case "NE":
          return very_dark_grey;
    default:
          return very_dark_grey;
  }
}

function leafcolor1(node) {
  // for 'fake' leaves at end of branches that are not developed yet
  if (node.richness_val > 1 && node.threatened_branch) {
    return light_red;
  } else if (node.richness_val > 1) {
    return off_white;
  } else {
    return get_redlist_color(node);
  }
}

function get_redlist_color(node) {
  // this is for the colour of the interior of a leaf
  switch(node.redlist) {
    case "EX":
          return light_grey;
    case "EW":
          return light_grey;
    case "CR":
          return light_red;
    case "EN":
          return light_red;
    case "VU":
          return light_red;
    case "NT":
          return light_green;
    case "LC":
          return light_green;
    case "DD":
          return off_white;
    case "NE":
          return off_white;
    default:
          return off_white;
  }
}

function leafcolor2(node) {
  // for 'fake' leaves at end of branches that are not developed yet
  if (node.richness_val > 1) {
    if (node.threatened_branch == true) {
      return red;
    }
    return grey;
  } else {
    return(get_redlist_color2(node));
  }
}

function get_redlist_color2(node) {
  // this is for the colour of the line around a leaf without mouseover
  switch(node.redlist) {
    case "EX":
          return grey;
    case "EW":
          return grey;
    case "CR":
          return red;
    case "EN":
          return red;
    case "VU":
          return red;
    case "NT":
          return green;
    case "LC":
          return green;
    case "DD":
          return grey;
    case "NE":
          return grey;
    default:
          return grey;
  }    
}

function sponsor_highlight(node) {
  if (node.richness_val > 1) {
    return black;
  } else {
    return white;
  }
}

function sponsor_color(node) {
  if (node.richness_val > 1) {
    return light_grey;
  } else {
      switch(node.redlist) {
          case "EX":
              return off_white;
          case "EW":
              return off_white;
          case "CR":
              return light_red;
          case "EN":
              return light_red;
          case "VU":
              return light_red;
          case "NT":
              return light_green;
          case "LC":
              return light_green;
          case "DD":
              return very_light_grey;
          case "NE":
              return very_light_grey;
          default:
              return very_light_grey;
      }
  }
}

function copyright_highlight_fill(node) {
  if (node.richness_val > 1) {
    return half_transparent_white;
  } else {
    return white;
  }
}

function copyright_highlight_stroke(node) {
  if (node.richness_val > 1) {
    return black;
  } else {
    return white;
  }
}

function copyright_fill(node) {
  if (node.richness_val > 1) {
    return leafcolor1(node);
  } else {
    return leafcolor2(node);
  }
}

function copyright_stroke(node) {
  if (node.richness_val > 1) {
    return leafcolor2(node);
  } else {
    return leafcolor1(node);
  }
}

function copyright_text_fill(node) {
  if (node.richness_val > 1) {
    return leafcolor2(node);
  } else {
    return leafcolor1(node);
  }
}

function copyright_text_highlight_fill(node) {
  if (node.richness_val > 1) {
    return black;
  } else {
    return white;
  }
}

function leaf_text_hover_outline(node) {
    switch(node.redlist) {
        case "EX":
            return very_transparent_white;
        case "EW":
            return very_transparent_white;
        case "CR":
            return half_transparent_white;
        case "EN":
            return half_transparent_white;
        case "VU":
            return half_transparent_white;
        case "NT":
            return half_transparent_white;
        case "LC":
            return half_transparent_white;
        case "DD":
            return transparent_black;
        case "NE":
            return transparent_black;
        default:
            return transparent_black;
    }
}

function get_leaf_text_fill(node) {
    switch(node.redlist) {
        case "EX":
            return white;
        case "EW":
            return white;
        case "CR":
            return black;
        case "EN":
            return black;
        case "VU":
            return black;
        case "NT":
            return black;
        case "LC":
            return black;
        case "DD":
            return black;
        case "NE":
            return black;
        default:
            return black;
    }
}

function branch_colour(node) {
    if (node._is_polytomy == 1)
    {
        return light_grey;
    } else {
        return grey;
    }
}

const theme = {
  branch: {
    stroke: branch_colour,
  
  // this pallette stores colours that are mapped to marked areas in config.marked_area_color_map
  marked_area_pallette: {
      '0': pastel_blue,
      '1': pastel_red,
      '2': pastel_green,
      '3': pastel_magenta,
      '4': pastel_cyan,
      '5': pastel_yellow
  },
      
    highlight_search_hit: {
      stroke: pastel_red
    },
    // for search hit colouring including common ancestor markings
    highlight_search_hit1: {
      stroke: pastel_red
    },
    highlight_search_hit2: {
      stroke: pastel_blue
    },
    highlight_arrow_search_hit: {
      fill: pastel_red
    },
    highlight_arrow_search_hit1: {
      fill: pastel_red
    },
    highlight_arrow_search_hit2: {
      fill: pastel_blue
    }
  },
    
  interior: {
    pic_text_hover: {
      stroke: transparent_black,
      fill: white
    },
    pic_text: {
      fill: white
    },
    
    
    text_hover: {
      stroke: transparent_black
    },
    text: {
      fill: white
    },
    
    sponsor_text_hover: {
      fill: white
    },
    sponsor_text: {
      fill: very_light_grey
    },
    
    
    circle_hover: {
      stroke: grey,
      fill: light_grey
    },
    circle: {
      stroke: grey,
      fill: grey
    },
    circle_searchin: {
      stroke: half_transparent_white
    },
    circle_highlight: {
      outer: {
        fill: light_grey
      },
      inner: {
        fill: half_transparent_white
      }
    },
      
    copyright_hover: {
      fill: white,
      stroke: black
    },
      
    copyright: {
      fill: half_transparent_white,
      stroke: black,
      text: {
      fill: black
      },
        text_hover: {
        fill: black,
      }
    }
      
  },
    
  signpost: {
    pic: {
      stroke: half_transparent_white
    },
    
    pic_hover: {
      stroke: half_transparent_black
    },
    
    pic_inner: {
      stroke: white
    },
    
    pic_text: {
      stroke: slightly_tranparent_white,
      fill: dark_grey
    },
    
    pic_text_hover: {
      stroke: white,
      fill: black
    }
  },
    
  leaf: {
    bg: {
      fill: white
    },
    
    'outline_hover': {
      fill: outline_highlight
    },
    
    outline: {
      fill: leafcolor2,
      stroke: leafcolor2
    },
    
    inside: {
      fill: leafcolor1
    },
    
    'inside_hover': {
      fill: leafcolor1
    },
    
    text: {
      fill: get_leaf_text_fill
    },
    
    'text_hover': {
      stroke: leaf_text_hover_outline
    },
    
    sponsor: {
      fill: sponsor_color
    },
    
    'sponsor_hover': {
      fill: sponsor_highlight
    },
    
    'copyright_hover': {
      fill: copyright_highlight_fill,
      stroke: copyright_highlight_stroke
    },
    
    copyright: {
      fill: copyright_fill,
      stroke: copyright_stroke,
      text: {
        fill: copyright_text_fill
      },
      'text_hover': {
        fill: copyright_text_highlight_fill
      }
    }
  }
}

export default theme;
