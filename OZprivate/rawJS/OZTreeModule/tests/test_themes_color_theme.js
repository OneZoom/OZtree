/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_themes_color_theme.js
  */
import { color_theme, set_theme } from '../src/themes/color_theme';
import test from 'tape';

test('pick_marked_area_color', function (t) {
    set_theme({ branch: { marked_area_pallette: {
        '0': 'hsl(0, 100%, 100%)',
        '1': 'hsl(1, 100%, 100%)',
        '2': 'hsl(2, 100%, 100%)',
    }}});
    t.deepEqual(color_theme.pick_marked_area_color([], null), 'hsl(0, 100%, 100%)', "Picked first colour");
    t.deepEqual(color_theme.pick_marked_area_color([
        'hsl(1, 100%, 100%)'
    ], null), 'hsl(0, 100%, 100%)', "Picked first colour (not used yet)");
    t.deepEqual(color_theme.pick_marked_area_color([
        'hsl(0, 100%, 100%)',
        'hsl(1, 100%, 100%)',
        'hsl(2, 100%, 100%)',
        'hsl(0, 100%, 100%)',
    ], null), 'hsl(1, 100%, 100%)', "Wrapped, picked second colour");

    t.end();
});
