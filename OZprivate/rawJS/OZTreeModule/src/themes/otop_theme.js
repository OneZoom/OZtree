let branch_color = 'rgb(255,255,255)';
let bar_color = 'rgba(0,0,0,0)';
let highlight_color = 'hsl(64, 100%, 83%)';
let int_text_stroke_hover = 'rgb(96,96,96)';
let int_text_fill_hover = 'rgb(255,255,255)';
let int_text_fill = 'rgb(255,255,255)';
let int_sponsor_fill_hover = 'rgb(255,255,255)';
let int_sponsor_fill = 'rgb(227,200,115)';

let challenge_colours = {
  'homo sapiens': { circle: '0, 0%, 19%', haze: '#000F38' },
  "default": { circle: '104, 20.7%, 57.5%', haze: '#34ca00' },
  'water_1': { circle: '211.3, 33%, 57.8%', haze: '#007aff' },
  'food_2': { circle: '10.2, 29.6%, 61%', haze: '#ff5943' },
  'energy_3': { circle: '49.3, 20.5%, 57.1%', haze: '#ffd100' },
  'nature_4': { circle: '104, 20.7%, 57.5%', haze: '#34ca00' },
  'food_5': { circle: '10.2, 29.6%, 61%', haze: '#ff5943' },
  'waste_6': { circle: '264.8, 18.5%, 48.6%', haze: '#7200ff' },
  'energy_7': { circle: '49.3, 20.5%, 57.1%', haze: '#ffd100' },
  'energy_8': { circle: '49.3, 20.5%, 57.1%', haze: '#ffd100' },
  'water_9': { circle: '211.3, 33%, 57.8%', haze: '#007aff' },
  'nature_10': { circle: '104, 20.7%, 57.5%', haze: '#34ca00' },
  'waste_11': { circle: '264.8, 18.5%, 48.6%', haze: '#7200ff' },
  'nature_12': { circle: '104, 20.7%, 57.5%', haze: '#34ca00' },
  'waste_13': { circle: '264.8, 18.5%, 48.6%', haze: '#7200ff' },
  'food_14': { circle: '10.2, 29.6%, 61%', haze: '#ff5943' },
  'nature_15': { circle: '104, 20.7%, 57.5%', haze: '#34ca00' },
}

/**
 * Generate a colour based on the location of the node within the
 * raw_data tree
 */
function location_color(node, alpha) {
  var colors, uplimit = 20;

  while (!node.region && node.upnode && uplimit > 0) {
      // We don't have a colour, but maybe the parent does. It'll probably be right
      node = node.upnode;
      uplimit--;
  }

  // Choose color for this node
  if (node.latin_name === 'Homo sapiens') {
    colors = challenge_colours['homo sapiens'];
  } else {
    colors = challenge_colours[node.region] || challenge_colours['default'];
  }

  // Feed the current colour to background.js
  window.last_location_color = colors.haze;
  return 'hsla(' + colors.circle + ',' + (alpha === undefined ? 1 : alpha) + ')';
}

/**
 * Generate colour based on node and endanagered status
 */
function endangered_location_color(node, alpha) {
  if (node.redlist === "CR") {
    return 'hsla(0.6, 46.1%, 40%, ' + Math.max(alpha || 0, 0.6) + ')';
  } else if (node.redlist === "EN") {
    return 'hsla(15.7, 55.8%, 44.3%, ' + Math.max(alpha || 0, 0.5) + ')';
  }
  return location_color(node, alpha);
}


const theme = {
  branch: {
    stroke: branch_color,
    marked_area_pallette: {
        '0': highlight_color,
        '1': 'hsl(133, 100%, 83%)',
        '2': 'hsl(188, 100%, 83%)',
        '3': 'hsl(252, 100%, 83%)',
        '4': 'hsl(296, 100%, 83%)',
        '5': 'hsl(332, 100%, 83%)',
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
    
    
    'text_hover': {
      stroke: int_text_stroke_hover
    },
    'text': {
      fill: int_text_fill,
      stroke: '#000000'
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
      fill: location_color,
    },
    
    pic_hover: {
      stroke: 'rgb(251,255,208,0.8)',
    },
    
    pic_inner: {
      stroke: 'rgb(255,255,255)'
    },
    
    pic_text: {
      stroke: 'rgb(66,66,66)',
      fill: 'rgba(255,255,255,1)'
    },
    
    pic_text_hover: {
      stroke: 'rgba(0,0,0,0.8)',
      fill: 'hsla(64, 100%, 83%, 1)',  // NB: We specify alpha so it's always opaque
    }
  },
    
  leaf: {
    bg: {
      fill: '#666666',
    },
    
    'outline_hover': {
      fill: 'rgb(0,0,0)'
    },
    
    outline: {
      fill: 'rgba(0,0,0,0)',
      stroke: 'rgba(0,0,0,0)',
    },
    
    inside: {
      fill: endangered_location_color,
    },
    
    'inside_hover': {
      fill: '#666666',
    },
    
    text: {
      stroke: 'rgb(66,66,66)',
      fill: 'rgba(255,255,255,1)'
    },
    
    'text_hover': {
      stroke: 'rgba(0,0,0,0.8)',
      fill: 'hsla(64, 100%, 83%, 1)',  // NB: We specify alpha so it's always opaque
    },
    
    sponsor: {
      fill: int_text_fill,
    },
    
    'sponsor_hover': {
      fill: int_text_fill_hover,
    },
    
    'copyright_hover': {
      fill: 'rgb(0,0,0)',
      stroke: 'rgb(255,255,255)'
    },
    
    copyright: {
      fill: 'rgba(30,30,30,0.3)',
      stroke: 'rgb(80,80,80)',
      text: {
        fill: 'rgb(80,80,80)'
      },
      text_hover: {
        fill: 'rgb(255,255,255)'
      }
    }
  }
}

export default theme;
