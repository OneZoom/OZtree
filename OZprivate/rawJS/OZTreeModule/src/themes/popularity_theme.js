import theme from './life_theme';
import merge from 'lodash/merge';

/**
 * version (-1483269673) does not contain popularity.
 */
 //got these two number from database.
const min_popularity = 10826;
const max_popularity = 204009;
let count = 0;
function get_color_by_popularity(node) {
  if (!node.popularity) {
    return 'rgb(50,50,50)';
  } else {
    /**
     * popularity       10826             -> 204009
     * ratio            0                 -> 1
     * color            rgb(140, 20, 30)  -> rgb(70, 135, 30)
     */
     
    let ratio = (node.popularity - min_popularity) / max_popularity;
    ratio = Math.max(ratio, 0);
    ratio = Math.min(ratio, 1);
    let red = 140 - Math.floor(70 * ratio);
    let green = 20 + Math.floor(115 * ratio)
    let blue = 30;    
    return `rgb(${red},${green},${blue})`;
  }
}

const popularity_theme = merge({}, theme, {
  leaf: {
    inside: {
      fill: get_color_by_popularity
    },
    inside_hover: {
      fill: get_color_by_popularity
    },
    outline: {
      fill: 'rgb(125,125,125)'
    },
    outline_hover: {
      fill: 'rgb(10,10,10)'
    }
  }
});


export default popularity_theme;