// define colours that will be used

let black = 'rgb(0,0,0)';
let very_dark_grey = 'rgb(40,40,40)';
let dark_grey = 'rgb(75,75,75)';
let grey = 'rgb(95,95,95)';
let mid_grey = 'rgb(115,115,115)';
let light_grey = 'rgb(135,135,135)';
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

let dark_blue = 'rgb(0,20,80)';
let blue = 'rgb(30,70,135)';
let light_blue = 'rgb(90,135,215)';


let dark_orange = 'rgb(80,30,00)';
let orange = 'rgb(200,70,0)';
let light_orange = 'rgb(253,134,18)';

let dark_brown = 'rgb(100,62,45)';
let brown = 'rgb(155,115,85)';//'rgb(125,70,55)';
let light_brown = 'rgb(175,115,85)';

let pastel_red = 'rgb(255,130,130)';
let pastel_green = 'rgb(130,255,130)';
let pastel_blue = 'rgb(130,130,255)';
let pastel_cyan = 'rgb(100,200,200)';
let pastel_magenta = 'rgb(200,100,200)';
let pastel_yellow = 'rgb(200,200,100)';

let age_limit_1 = 10;
let age_limit_2 = 50;

// define functions of a node that return different colours depending on node status

function outline_highlight(node) {
    if (node.richness_val > 1) {
        return black;
    } else {
        return leafcolor2b(node);
    }
}

function leafcolor2b(node) {
    return dark_green;
}

function leafcolor1(node) {
    switch(node.redlist) {
        case "EX":
            return black;
        default:
            return node_fill_colour(node);
    }
}

function leafcolor2(node) {
    // for 'fake' leaves at end of branches that are not developed yet
    // note that this is not the same as undeveloped branches that are rendered as circles by a different colour scheme and dealt with as part of branch rendering.
    switch(node.redlist) {
        case "EX":
            return black;
        default:
            return node_stroke_colour(node);
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
        return light_green;
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
    return half_transparent_white;
}

function get_leaf_text_fill(node) {
    return black;
}

function age(node) {
    if (node.is_leaf)  {
        if (node.upnode) {
            return (node.upnode.lengthbr)
        } else {
            return null;
        }
    } else {
        return node.lengthbr;
    }
}

function branch_colour(node) {
    let temp_age = age(node);
    if (temp_age) {
        if (temp_age < age_limit_2) {
            if (temp_age < age_limit_1)  {
                return light_green;
            } else {
                return light_blue;
            }
        }
        else {
            return brown;
        }
    } else {
        return light_grey;
    }
}


function node_fill_colour(node) {
    return(branch_colour(node))
}

function node_stroke_colour(node) {
    let temp_age = age(node);
    if (temp_age) {
        if (temp_age < age_limit_2) {
            if (temp_age < age_limit_1)  {
                return green;
            } else {
                return blue;
            }
        }
         else {
            return dark_brown;
        }
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
    
undeveloped: {
stroke: light_grey,
fill: off_white
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
fill: light_brown
},
    
    
circle_hover: {
stroke: node_stroke_colour,
fill: node_stroke_colour
},
circle: {
stroke: node_stroke_colour,
fill: node_fill_colour
},
circle_searchin: {
stroke: half_transparent_white
},
circle_highlight: {
outer: {
fill: light_brown
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
    fill: black
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
fill: leafcolor1
},
    
    'sponsor_hover': {
    fill: sponsor_highlight
    },
    
    'copyright_hover': {
    fill: copyright_fill,
    stroke: white
    },
    
copyright: {
fill: copyright_fill,
stroke: copyright_stroke,
text: {
fill: copyright_text_fill
},
    'text_hover': {
    fill: white
    }
}
}
}

export default theme;
