function form_change_aux(argument) {
	if (argument == viewtype) return;
	if (argument == 1) viewtype = 4;
	else viewtype = argument-1;
	form_change();
}

function colour_change_aux(argument) {
	if (argument == colourtype) return;
	else colourtype = argument;
	draw2();
}

function font_change_aux(argument) {
	fonttype = argument;
	draw2();
}

function change_background_color(argument) {
	backgroundcolor = argument;
	draw2();
}

function change_highlight_color1(argument) {
	highlightcolor1 = argument;
	draw2();
}


function change_highlight_color2(argument) {
	highlightcolor2 = argument;
	draw2();
}

function change_leaf_color1(argument) {
	l1col_URL = argument;
	draw2();
}

function change_leaf_color2(argument) {
	l2col_URL = argument;
	draw2();
}

function change_branch_color1(argument) {
	b1col_URL = argument;
	draw2();
}

function change_branch_color2(argument) {
	b2col_URL = argument;
	draw2();
}

function change_text_color(argument) {
	txtcol_URL = argument;
	draw2();
}

function polytype_change_aux(argument) {
	polytype = argument;
	draw2();
}

function leaftype_change_aux(argument) {
	leaftype = argument;
	draw2();
}

function int_highlight_change_aux(argument) {
	int_highlight_type = argument;
	draw2();
}

function hexToRgb(hex) {
	   var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	   return result ? {
	       r: parseInt(result[1], 16),
	       g: parseInt(result[2], 16),
	       b: parseInt(result[3], 16)
	   } : null;
}