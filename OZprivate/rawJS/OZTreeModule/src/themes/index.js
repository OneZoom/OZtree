/**
 * To define a new theme, add a file to the themes directory which exports a default themes object
 * (look at natural_theme.js for an example), then add it to this file. It should be picked up
 * as one of the options available for the OneZoom object (in tree_settings.js)
 **/
export {default as natural} from './natural_theme';
export {default as natural_CBF} from './natural_colour_blind_friendly';
export {default as AT} from './at_theme';
export {default as AT_CBF} from './at_colour_blind_friendly';
export {default as otop} from './otop_theme';
export {default as popularity} from './popularity_theme';
export {default as popularity_CBF} from './popularity_colour_blind_friendly';
export {default as IUCN} from './IUCN_explicit_theme';
export {default as IUCN_CBF} from './IUCN_explicit_colour_blind_friendly';

export {default as gencons} from './genetic_conservation_theme';
export {default as gencons_CBF} from './genetic_conservation_theme';

// any themes ending in CBF are colour blind friendly themes
// all themes should be matched with a CBF equivalent
// otop is accessed from a different page where no CBF option is in the UI

// from the console you can active any theme by typing
// onezoom.controller.change_color_theme('_____')
// e.g.
// onezoom.controller.change_color_theme('IUCN')
