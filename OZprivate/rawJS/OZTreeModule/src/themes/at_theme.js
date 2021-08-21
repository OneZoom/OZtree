let branch_color = 'rgb(207,180,95)';
let bar_color = 'rgb(177,145,60)';
let highlight_color = 'rgb(177,145,60)';
let int_text_stroke_hover = 'rgba(255,255,255,0.5)';
let int_text_fill_hover = 'rgb(0,0,0)';
let int_text_fill = 'rgb(0,0,0)';
let int_sponsor_fill_hover = 'rgb(255,255,255)';
let int_sponsor_fill = 'rgb(227,200,115)';

function leafcolor1(node) {
  if (node.extra_leaf_info) {
    return 'rgb(0,0,255)';
  } else {
    return 'rgb(100,130,50)';
  }
}

function leafcolor3(node) {
  if (node.richness_val > 1) {
    return 'rgb(0,0,0)';
  } else {
    return 'rgb(255,255,255)';
  }
}

function leafcolor2(node) {
  if (node.extra_leaf_info) {
    return 'rgb(0,0,150)';
  } else {
    return 'rgb(0,100,0)';
  }
}


const theme = {
  branch: {
    stroke: branch_color,
    marked_area_pallette: {
        '0': highlight_color,
    },
    highlight_concestor: {
      stroke: highlight_color
    },
    highlight_search_hit: {
      stroke: highlight_color
    },
    highlight_search_hit1: {
      stroke: 'rgba(255,255,255,0.6)'
    },
    highlight_search_hit2: {
      stroke: 'rgb(190,140,70)'
    },
    highlight_arrow_concestor: {
      fill: highlight_color
    },
    highlight_arrow_search_hit: {
      fill: highlight_color
    },
    highlight_arrow_search_hit1: {
      fill: 'rgba(255,255,255,0.6)'
    },
    highlight_arrow_search_hit2: {
      fill: 'rgb(190,140,70)'
    }
  },
    
  interior: {
    'pic_text_hover': {
      stroke: int_text_stroke_hover,
      fill: int_text_fill_hover
    },
    'pic_text': {
      fill: int_text_fill
    },
    
    undeveloped: {
    stroke: branch_color,
    fill: branch_color
    },
      
    'text_hover': {
      stroke: int_text_stroke_hover
    },
    'text': {
      fill: int_text_fill
    },
    
    
    'sponsor_text_hover': {
      fill: int_sponsor_fill_hover
    },
    'sponsor_text': {
      fill: int_sponsor_fill
    },
    
    
    'circle_hover': {
      stroke: bar_color,
      fill: bar_color
    },
    'circle': {
      stroke: bar_color,
      fill: branch_color
    },
    'circle_searchin': {
      stroke: highlight_color
    },
    'circle_highlight': {
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
      fill: 'rgba(255,255,255, 0.8)'
    },
    
    'outline_hover': {
      fill: 'rgb(0,50,0)'
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
      fill: leafcolor3
    },
    
    'text_hover': {
      stroke: 'rgba(0,0,0,0.6)'
    },
    
    sponsor: {
      fill: 'rgb(150,180,100)'
    },
    
    'sponsor_hover': {
      fill: 'rgb(255,255,255)'
    },
    
    'copyright_hover': {
      fill: 'rgb(0,0,0)',
      stroke: 'rgb(255,255,255)'
    },
    
    copyright: {
      fill: leafcolor2,
      stroke: 'rgb(150,180,100)',
      text: {
        fill: 'rgb(150,180,100)'
      },
      text_hover: {
        fill: 'rgb(255,255,255)'
      }
    }
  }
}

export default theme;
