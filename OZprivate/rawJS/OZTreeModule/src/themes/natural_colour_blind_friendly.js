import theme from './natural_theme';
import merge from 'lodash/merge';

let pastel_red = 'rgb(255,130,130)';
let pastel_blue = 'rgb(130,130,255)';
let off_white = 'rgb(240,240,240)'
let black = 'rgb(0,0,0)';

const natural_theme = merge({}, theme, {

                            branch: {
                            
                            // this pallette stores colours that are mapped to highlights
                            marked_area_pallette: {
                            '0': pastel_blue,
                            '1': pastel_red,
                            '2': off_white,
                            '3': black
                            },
                            
                            }
                            
                               });


export default natural_theme;

