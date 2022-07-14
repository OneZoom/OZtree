// define colours that will be used

let black = 'rgb(0,0,0)';
let very_dark_grey = 'rgb(40,40,40)';
let dark_grey = 'rgb(75,75,75)';
let grey = 'rgb(110,110,110)';
let light_grey = 'rgb(140, 140, 140)';
let very_light_grey = 'rgb(190, 190, 190)';
let off_white = 'rgb(240,240,240)'
let white = 'rgb(255,255,255)';

let half_transparent_black = 'rgba(0,0,0,0.5)';
let transparent_black = 'rgba(0,0,0,0.2)';
let slightly_tranparent_white = 'rgba(255,255,255,0.85)';
let half_transparent_white = 'rgba(255,255,255,0.5)';
let very_transparent_white = 'rgba(255,255,255,0.2)';

let dark_blue = 'rgb(0,20,80)';
let blue = 'rgb(30,70,135)';
let light_blue = 'rgb(90,135,215)';

let dark_red = 'rgb(80,00,00)'
let red = 'rgb(140,20,20)';
let light_red = 'rgb(225,180,155)';

let pastel_red = 'rgb(255,130,130)';
let pastel_green = 'rgb(130,255,130)';
let pastel_blue = 'rgb(130,130,255)';
let pastel_cyan = 'rgb(100,200,200)';
let pastel_magenta = 'rgb(200,100,200)';
let pastel_yellow = 'rgb(200,200,100)';

// define a colour gradient that will be linearly interpolated.
let gradient = [
  {num: 0, red:0, green:0, blue:150},
  {num: 0.1, red:70, green:70, blue:200},
  {num: 0.55, red:70, green:200, blue:70},
  {num: 0.65, red:250, green:125, blue:30},
  {num: 1, red:255, green:30, blue:30}
]

// define a colour gradient that will be linearly interpolated.
let gradient2 = [
                {num: 0, red:0, green:0, blue:100},
                {num: 0.1, red:30, green:30, blue:150},
                {num: 0.55, red:30, green:150, blue:30},
                {num: 0.65, red:200, green:100, blue:0},
                {num: 1, red:200, green:0, blue:0}
                ]

// define functions of a node that return different colours depending on node status

//got these two numbers from the database - they will likely need updating nad someday should be fetched automatically
const min_popularity = 10826;
const max_popularity = 170009;
let count = 0;

function get_color_by_popularity(node,colour_map) {

        /**
         * popularity       10826             -> 204009
         * ratio            0                 -> 1
         * color            rgb(140, 20, 30)  -> rgb(70, 135, 30)
         */
        
        let ratio = (node.popularity - min_popularity) / max_popularity;
        ratio = Math.max(ratio, 0);
        ratio = Math.min(ratio, 1);
        
        for(let i = 1; i < colour_map.length; i++)
        {
            if (ratio <= colour_map[i].num) {
                
                let scaled_red = colour_map[i-1].red + (colour_map[i].red- colour_map[i-1].red)*(ratio - colour_map[i-1].num)/( colour_map[i].num - colour_map[i-1].num);
                
                 let scaled_green = colour_map[i-1].green + (colour_map[i].green- colour_map[i-1].green)*(ratio - colour_map[i-1].num)/( colour_map[i].num - colour_map[i-1].num);
                
                 let scaled_blue = colour_map[i-1].blue + (colour_map[i].blue- colour_map[i-1].blue)*(ratio - colour_map[i-1].num)/( colour_map[i].num - colour_map[i-1].num);

                return `rgb(${scaled_red},${scaled_green},${scaled_blue})`;
            }
        }
    
}


function outline_highlight(node) {
    return black;
}

function sponsor_color(node) {
    return slightly_tranparent_white;
}

function leaf_text_hover_outline(node) {
    return transparent_black;
}

function get_leaf_text_fill(node) {
    return white;
}

function leafcolor1(node) {
    // for 'fake' leaves at end of branches that are not developed yet
    if (node.richness_val > 1) {
        return off_white;
    } else {
        if (!node.popularity) {
            return off_white;
        } else {
            return get_color_by_popularity(node,gradient);
        }
    }
}

function leafcolor2(node) {
    // for 'fake' leaves at end of branches that are not developed yet
    // note that this is not the same as undeveloped branches that are rendered as circles by a different colour scheme and dealt with as part of branch rendering.
    if (node.richness_val > 1) {
        return grey;
    } else {
        if (!node.popularity) {
            return grey;
        } else {
            return get_color_by_popularity(node,gradient2);
        }
    }
}

function sponsor_highlight(node) {
    if (node.richness_val > 1) {
        return black;
    } else {
        return white;
    }
}


function copyright_highlight_fill(node) {
    if (node.richness_val > 1) {
        return half_transparent_white;
    } else {
        return copyright_fill(node);
    }
}

function copyright_highlight_stroke(node) {
    if (node.richness_val > 1) {
        return black;
    } else {
        return sponsor_highlight(node);
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
        return sponsor_color(node);
    }
}

function copyright_text_fill(node) {
    if (node.richness_val > 1) {
        return leafcolor2(node);
    } else {
        return sponsor_color(node);
    }
}

function copyright_text_highlight_fill(node) {
    if (node.richness_val > 1) {
        return black;
    } else {
        return sponsor_highlight(node);
    }
}

function branch_colour(node) {
    if (node._is_polytomy == true)
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
fill: very_light_grey
},
    
 
circle_hover: {
stroke: light_grey,
fill: light_grey
},
circle: {
stroke: light_grey,
fill: grey
},
circle_searchin: {
stroke: half_transparent_white
},
circle_highlight: {
outer: {
fill: grey
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
        fill: white,
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
