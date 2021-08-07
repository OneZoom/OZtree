let green1= 'rgb(135,215,90)';
let green2 = 'rgb(70,135,30)';
let red1 = 'rgb(225,180,155)'; // green1;//
let red2 = 'rgb(140,20,20)'; // green2;//
let branch_color = 'rgb(125, 125, 125)'; //'rgb(84,37,1)'
let bar_color =  'rgb(107, 107, 107)'; //'rgb(50,31,16)'//
let highlight_color = 'rgba(255, 255, 255, .5)';
let int_text_stroke_hover = 'rgb(96,96,96)';
let int_text_fill_hover = 'rgb(255,255,255)';
let int_text_fill = 'rgb(255,255,255)';
let int_sponsor_fill_hover = 'rgb(255, 255, 255)';
let int_sponsor_fill = 'rgb(180, 180, 180)';

let iucnEX = 'rgb(125,125,125)';
let iucnEW = 'rgb(125,125,125)';
let iucnCR = red1;
let iucnEN = red1;
let iucnVU = red1;
let iucnNT = green1;
let iucnLC = green1;
let iucnDD = green1;
let iucnNE = 'rgb(240,240,240)'//'rgb(177,215,90)'//'rgb(213,71,0)' //'rgb(139, 146, 22)';
let iucnDefault = 'rgb(240,240,240)'//'rgb(177,215,90)'//'rgb(213,71,0)' //'rgb(139, 146, 22)'

function outline_highlight(node) {
  if (node.richness_val > 1) {
    return 'rgb(0,0,0)';
  } else {
    return leafcolor2b(node);
  }
}

function leafcolor2b(node) {
   // this is for the colour of the line around a leaf on mouseover
  switch(node.redlist) {
    case "EX":
    return ('rgb(50,50,50)');
    case "EW":
    return ('rgb(50,50,50)');
    case "CR":
    return ('rgb(80,00,00)');
    case "EN":
    return ('rgb(80,00,00)');
    case "VU":
    return ('rgb(80,00,00)');
    case "NT":
    return ('rgb(20,80,00)');
    case "LC":
    return ('rgb(20,80,00)');
    case "DD":
    return ('rgb(20,80,00)');
    case "NE":
    return ('rgb(20,80,00)');
    default:
    return ('rgb(0,0,0)');
  }
}

function leafcolor1(node) {
  // for 'fake' leaves at end of branches that are not developed yet
  if (node.richness_val > 1 && node.threatened_branch) {
    return red1;
  } else if (node.richness_val > 1) {
    return iucnDefault;
  } else {
    return get_redlist_color(node);
  }
}

function get_redlist_color(node) {
  // this is for the colour of the interior of a leaf
  switch(node.redlist) {
    case "EX":
    //return ('rgb(150,175,215)'); // new blue
    return iucnEX;
    case "EW":
    //return ('rgb(150,175,215)'); // new blue
    return iucnEW;
    //return ('rgb(80,80,80)');
    case "CR":
    return iucnCR;
    //////////return (red1);
    //'rgb(215,175,150)' = dinah pink
    case "EN":
    //return ('rgb(225,185,130)');
    //return ('rgb(210,170,145)');
    return iucnEN;
    //////////return (red1);
    
    case "VU":
    return iucnVU;
    //return (red1);
    //return ('rgb(210,170,145)');
    //return ('rgb(220,220,220)');
    case "NT":
    return iucnNT;
    //return ('rgb(170,195,96)');
    //return ('rgb(180,208,90)');
    //return ('rgb(200,220,180)');
    //return ('rgb(190,200,80)');
    case "LC":
    return iucnLC;
    case "DD":
    return iucnDD;
    //return ('rgb(60,50,135)');
    case "NE":
    return iucnNE;
    //return ('rgb(0,0,190)');
    default:
    return iucnDefault;
  }
}

function leafcolor2(node) {
  // for 'fake' leaves at end of branches that are not developed yet
  if (node.richness_val > 1) {
    if (node.threatened_branch == true) {
      return red2;
    }
    return 'rgb(107,107,107)';
  } else {
    return(get_redlist_color2(node));
  }
}

function get_redlist_color2(node) {
  // this is for the colour of the line around a leaf without mouseover
  switch(node.redlist) {
    case "EX":
    //return ('rgb(0,30,150)');
    return 'rgb(107,107,107)'//('rgb(110,110,110)');
    case "EW":
    //return ('rgb(0,30,150)');
    return 'rgb(107,107,107)'//('rgb(110,110,110)');
    case "CR":
    return red2;
    case "EN":
    //return (red2);
    return red2;
    case "VU":
    return red2;
    //return ('rgb(170,0,0)');
    case "NT":
    return green2;
    case "LC":
    return green2;
    case "DD":
    return green2;
    //return ('rgb(60,50,135)');
    case "NE":
    return ('rgb(107,107,107)'); //green2 // 'rgb(107, 107, 107)'//'rgb(80,80,80)' //('rgb(120,120,120)');
    //return ('rgb(0,0,190)');
    default:
    return ('rgb(107,107,107)'); //green2 //'rgb(107, 107, 107)' //'rgb(167, 159, 15)'//('rgb(237, 164, 33)');
  }    
}

function sponsor_highlight(node) {
  if (node.richness_val > 1) {
    return 'rgb(0,0,0)';
  } else {
    return 'rgb(255,255,255)';
  }
}

function sponsor_color(node) {
  if (node.richness_val > 1) {
    return 'rgb(110,110,110)';
  } else {
    return leafcolor1(node);
  }
}

function copyright_highlight_fill(node) {
  if (node.richness_val > 1) {
    return 'rgba(255,255,255,0.4)';
  } else {
    return 'rgb(0,0,0)';
  }
}

function copyright_highlight_stroke(node) {
  if (node.richness_val > 1) {
    return 'rgb(0,0,0)';
  } else {
    return 'rgb(255,255,255)';
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
    return 'rgb(0,0,0)';
  } else {
    return 'rgb(255,255,255)';
  }
}

const theme = {
  branch: {
    stroke: branch_color,
  
  // this pallette stores colours that are mapped to marked areas in config.marked_area_color_map
  marked_area_pallette: {
      '0': 'rgb(130,130,255)',
      '1': 'rgb(255,130,130)',
      '2': 'rgb(130,255,130)',
      '3': 'rgb(200,100,200)',
      '4': 'rgb(100,200,200)',
      '5': 'rgb(200,200,100)'
  },
      
      
    highlight_search_hit: {
      stroke: 'rgb(200,100,100)'
    },
    // for search hit colouring including common ancestor markings
    highlight_search_hit1: {
      stroke: 'rgb(200,100,100)'
    },
    highlight_search_hit2: {
      stroke: 'rgb(100,100,200)'
    },
    highlight_arrow_search_hit: {
      fill: 'rgb(200,100,100)'
    },
    highlight_arrow_search_hit1: {
      fill: 'rgb(200,100,100)'
    },
    highlight_arrow_search_hit2: {
      fill: 'rgb(100,100,200)'
    }
  },
    
  interior: {
    pic_text_hover: {
      stroke: int_text_stroke_hover,
      fill: int_text_fill_hover
    },
    pic_text: {
      fill: int_text_fill
    },
    
    
    text_hover: {
      stroke: int_text_stroke_hover
    },
    text: {
      fill: int_text_fill
    },
    
    
    sponsor_text_hover: {
      fill: int_sponsor_fill_hover
    },
    sponsor_text: {
      fill: int_sponsor_fill
    },
    
    
    circle_hover: {
      stroke: bar_color,
      fill: bar_color
    },
    circle: {
      stroke: bar_color,
      fill: branch_color
    },
    circle_searchin: {
      stroke: highlight_color
    },
    circle_highlight: {
      outer: {
        fill: branch_color
      },
      inner: {
        fill: highlight_color
      }
    },
      
    copyright_hover: {
      fill: 'rgb(255,255,255)',
      stroke: 'rgb(0,0,0)'
    },
      
    copyright: {
      fill: 'rgba(255,255,255,0.5)',
      stroke: 'rgb(0,0,0)',
      text: {
      fill: 'rgb(0,0,0)'
      },
        text_hover: {
        fill: 'rgb(0,0,0)',
      }
    }
      
  },
    
  signpost: {
    pic: {
      stroke: 'rgba(255,255,255,.5)'
    },
    
    pic_hover: {
      stroke: 'rgba(0,0,0,.5)'
    },
    
    pic_inner: {
      stroke: 'rgb(255,255,255)'
    },
    
    pic_text: {
      stroke: 'rgba(255,255,255,0.85)',
      fill: 'rgb(85,85,85)'
    },
    
    pic_text_hover: {
      stroke: 'rgb(255,255,255)',
      fill: 'rgb(0,0,0)'
    }
  },
    
  leaf: {
    bg: {
      fill: 'rgb(255,255,255)'
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
      fill: 'rgb(0,0,0)'
    },
    
    'text_hover': {
      stroke: 'rgba(255,255,255,0.6)'
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
