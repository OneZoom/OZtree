
var choosing_pop_spec = false;
var switching_allowed = true;
var switching_button_txt = "Change images"
var switch_to = "altpics" // add ./ to this // "altpics" means switch pic source instead

/* screen saver options*/

var screen_saver = {
    
    'start_on_ss':false,
    
    'kickin_wait':-180,
    //wait time in seconds before the screen saver kicks in. Negative means never
    'switch_wait':-3600 ,
    // wait time in seconds before the style switches. Negative means never
    'animation_wait':-12 , // 9
    // wait in seconds between each animation cycle. Negative means never cycle
    
    // proportions of time spent in each of the visual categories
    
    'sound':0.5,
    'pic':0.5,
    
    'plain_prop':0.0 , // plain colours
    'time_prop':0.0 , // geological history colours
    'redlist_prop':1.0 , // redlist colours
    
    'natural_prop': 0.0 , // natural view shape
    'spiral_prop': 1.0 , // spiral view shape
    'feather_prop': 0.0 , // feather view shape
    'balanced_prop': 0.0 , // balanced view shape
    
    'latin_prop':0.0 , // latin names
    'common_prop':1.0 , // comon names
    
    // proportions of time spent on different events
    
    'zoomin__':0.0 , // leave as zero
    'growth_animation': 0.2 , // growth animation
    'zoomin_random':0.6 , // zoom in on random leaf
    'slideshow':0.2 ,// slideshow
    
    // zooming into a spot and startup and message to say use the mouse any time to explore message
    'zosens':0.92 ,// the closer to 1 the slower the animation must be less than 1
    'sslength':3 , // slideshow length in number of slides
    'flightspeed':12 , // more is slower - affects screen saver flights only
}

/* button styles for control panel */

// this defines the color and style of a blank button in the control panel
var control_button_style = {
    'standard':{
        'inner_col': 'rgb(220,220,220)',
        'line_col': 'rgb(155,155,155)',
        'line_width': 0
    },
    'over':{
        'inner_col': 'rgb(255,200,120)',
        'line_col': 'rgb(155,155,155)',
        'line_width': 0
    },
    'clicked':{
        'inner_col': 'rgb(255,200,120)',//'rgb(170,200,230)',
        'line_col': 'rgb(0,0,0)',
        'line_width': 0
    },
    'disabled':{
        'inner_col': 'rgb(120,150,70)',
        'line_col': 'rgb(155,155,155)',
        'line_width': 0
    }
}

/* tree display style and data path */

// path to data

var data_path_sounds = "Tree_of_Life_Data_Set/Sounds/";

var alt_pics_on = 0;

var data_pic_col_alt = "phyloPicID"; //"phyloPicID";
var data_path_pics_alt = "AT_Data_Set/alt_pics/";
var data_path_thumbs_alt = "AT_Data_Set/alt_pics/";
var data_pic_ext_alt = ".jpg";
var data_pic_thumb_ext_alt = ".jpg";

var data_pic_col_main = "picID";
var data_pic_col_credit_main = "picID_credit";
var data_pic_col_rating_main = "picID_rating";
//var data_path_pics_main = "AT_Data_Set/pics/";
//var data_path_thumbs_main = "AT_Data_Set/pics/";
var data_pic_ext_main = ".jpg";
var data_pic_thumb_ext_main = ".jpg";

var data_pic_col = data_pic_col_main;
var data_pic_col_credit = data_pic_col_credit_main;
var data_pic_col_rating = data_pic_col_rating_main;
var data_path_pics = data_path_pics_main;
var data_path_thumbs = data_path_thumbs_main;
var data_pic_ext = data_pic_ext_main;
var data_pic_thumb_ext = data_pic_thumb_ext_main;

// todo easy building of popular species lists.

/* popular species list */

popular_species_ct = "OTT"; // "OZ" means OZ leaf / node id (- in front means leaf) or use "OTT" for OTT ID

popular_species = [
                   ["Cheer Pheasant",521329],
                   ["Golden Pheasant",521325],
                   ["Climbing Shrew",850879],
                   ["Forest Shrew",563474],
                   ["Horse family",1070066],
                   ["Titi monkeys",842878],
                   ["Tiny Yellow Bat",3613895],
                   ["Amazon Tree Boa",292207],
                   ["Fiji Crested Iguana",458470]
];

/* style parameters - control panel colours */

var button_text_col = 'rgb(0,0,0)'; // button text color
var disabled_button_text_col = 'rgb(0,0,0)'; // button text color


var control_col = 'rgb(255,255,255)';//'rgb(145,145,145)'; // control panel background color
var control_col2 = 'rgb(255,255,255)';//'rgb(210,230,250)';//'rgb(145,145,145)'; // control panel background color

var control_line_col = 'rgb(105,115,145)'; // control panel line color
var control_text_col = 'rgb(0,0,0)'; // control panel text color
var control_highlight_col = 'rgb(220,230,255)'; // control panel highlight color

var picborder_col = 'rgb(155,155,155)';

var txtbox_col = 'rgb(220,230,255)'; // text box background color
var txtbox_line_col = 'rgb(155,165,175)'; // text box line color
var txtbox_text_col = 'rgb(0,0,0)'; // text box text color

/* style parameters - control panel proportions */

var button_corner = 10; // button corner size
var button_gap = 9; // gap between buttons
var button_height = 38; // height of buttons

// alpha buttons are used for making the onscreen keyboard
var alpha_button_corner = 6; // alphabetic button corner size
var alpha_button_gap = 5; // alphabetic button gap
var alpha_button_height = 38; // alphabetic button height

// control area dimension parameters
var control_margin = 20; // control column margin
var control_width = 285; // control column width (assumed to be full height constantly)
var control_line_width = 1; // width of control column line (null means do not draw)

var txtbox_height = 275; // height of feedback panel
var txtbox_line_width = 1; // text box line width (null means do not draw)

var textoutlinecolor = 'rgba(255,255,255,0.85)'

/* other globals to be defined */

var touch_debugger = false;
var restart_flag = true;

// default viewing options (can be changed with buttons when running)
var polytype = 3; // the way polytomies are expressed (should be 0,1,2 or 3)
var viewtype = 1; // the default viewtype (should be 1,2,3,4 or 5)
var colourtype = 1; // the default colour mode - note: if doing further editing of colour palette's below this may become irrelevant
// colourtype = 3 is only suited for redlist data
var leaftype = 1; // leaf shape circular or natural - this cannpt be changed with buttons it is recommended you leave it

var fonttype = 'Helvetica'; // change the text font to match the rest of your article and journal style // 'sans-serif' // is good too
var intnodetextcolor = 'rgb(255,255,255)' // yan could change here if you wish for interior node text colour where there is a name to be put
// note there are more advanced options later to change th interior node text
var backgroundcolor = null //background color 'null' if no background is wanted
var logobackgroundcolor = 'rgba(255,255,255,0.8)' //background color 'null' if no background is wanted
var outlineboxcolor = 'rgb(90,90,90)' // outline box colour
var auto_interior_node_labels = false; // monophyletic groups of genera are to be automatically labelled in interior nodes.

var pie_background_color = 'rgb(255,255,255)';
var pieborder = 0.12;

var innode_label_help = false; // supresses the cutting out of 'namingtodo' labels in the interior nodes of the tree
var commonlabels = true; // makes common names the primary info if false then latin names become the primary focus
var intcircdraw = true; // display interior circles or not?
var mintextsize = 3; // the smallest size text you want to have displayed

var searchinteriornodes = false;

var growthtimetot = 45;

var EP_anim_length_in = 10;
var pop_anim_length_in = 8;
var length_intro_in = 20;

var fly_on_search = false;

var touch_rem_wait = 6;

var targetScreenProp = 0.95; // proportion of screen that should be filled with targeted area when zooming in / out

/* visualisation style settings */

var draw_first_pie = -1;
var draw_second_pie = -1; // -1 for no 1 for yes

// cannot have two pies and sound player with current layout

/* global color key settings */

function conconvert(casein)
{
    switch(casein)
    {
        case "EX":
			return ("Extinct");
        case "EW":
			return ("Extinct in the Wild");
        case "CR":
			return ("Critically Endangered");
        case "EN":
			return ("Endangered");
        case "VU":
			return ("Vulnerable");
        case "NT":
			return ("Near Threatened");
        case "LC":
			return ("Least Concern");
        case "DD":
			return ("Data Deficient");
        case "NE":
			return ("Not Evaluated");
        default:
			return ("Not Evaluated");
    }
}

function conconvert2(casein)
{
    switch(casein)
    {
        case "EX":
			return (0);
        case "EW":
			return (1);
        case "CR":
			return (2);
        case "EN":
			return (3);
        case "VU":
			return (4);
        case "NT":
			return (5);
        case "LC":
			return (6);
        case "DD":
			return (7);
        case "NE":
			return (8);
        default:
			return (9);
    }
}

// colour codes for redlist
function redlistcolor(codein)
{
    switch(codein)
    {
        case "EX":
			return ('rgb(0,0,180)');
            //return ('rgb(0,0,0)');
        case "EW":
			return ('rgb(60,50,135)');
            //return ('rgb(80,80,80)');
        case "CR":
			return ('rgb(210,0,10)');
        case "EN":
			return ('rgb(125,50,00)');
        case "VU":
			return ('rgb(85,85,30)');
        case "NT":
			return ('rgb(65,120,0)');
        case "LC":
			return ('rgb(0,180,20)');
        case "DD":
			return ('rgb(80,80,80)');
            //return ('rgb(60,50,135)');
        case "NE":
			return ('rgb(0,0,0)');
            //return ('rgb(0,0,190)');
        default:
			return ('rgb(0,0,0)');
    }
}

var global_colorkey_title =
[
 "Leaf and branch colours show" ,
 "the risk of extinction, based" ,
 "on The International Union for" ,
 "Conservation of Nature (IUCN)" ,
 "Red List of Threatened Species"
];

var global_colorkey_text = [];
var global_colorkey_col = [];

var temp_piekey = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"];

// loop over key elements
for (var hc = 0 ; hc < temp_piekey.length ; hc++)
{
    // use existing red list tools to parse key information into text and colors
    global_colorkey_col[hc] = redlistcolor(temp_piekey[hc]);
    global_colorkey_text[hc] = conconvert(temp_piekey[hc]);
}

/* credit text settings */

var creditsText =
[
 
 [20,],
 [5,"OneZoom Tree of Life Explorer"],
 [3,],
 [5,"www.OneZoom.org"],
 [15,],
 // [3,"Multi-touch display code version 1.3 (2014)"]
 // [3,],
 
 [3.5,"A project based at Imperial College London"],
 [2,],
 [3.5,"Funded by the Natural Environment Reseach Council"],
 [2,],
 [3.5,"Created and developed by"],
 [2,],
 [3.5,"James Rosindell"],
 
 [9,],
 [3.5,"Special thanks to"],
 [2,],
 [3.5,"Luke Harmon"],
 [3.5,"Duncan Gillies"],
 [3.5,"Laura Nunes"],
 [3.5,"Yan Wong"],
 [3.5,"Kai Zhong"],
 [4,],
 [3.5,"This work is a contribution to Imperial College's"],
 [3.5,"Grand Challenges in Ecosystems and the Environment initiative."],
 
 [9,],
 
 [3.5,"Data sources"],
 [1,],
 [3,"Conservation status data"],
 [1,],
 [2.2,"The IUCN Red List of Threatened Species. Version 2012.1."],
 [2.2,"IUCN, Available from http://www.iucnredlist.org. (2012)"],
 [1,],
 [3,"Mammal data"],
 [1,],
 [2.2,"Bininda-Emonds OR, Cardillo M, Jones KE, MacPhee RD, Beck RM, et al."],
 [2.2,"The delayed rise of present-day mammals."],
 [2.2,"Nature 446: 507-512. (2007)"],
 [1,],
 [3,"Bird data"],
 [1,],
 [2.2,"Jetz W, Thomas GH, Joy JB, Hartmann K, Mooers AO"],
 [2.2,"The global diversity of birds in space and time"],
 [2.2,"Nature 491: 444-448 (2012)"],
 [2.2,"Also see www.birdtree.org"],
 [2.2,"Conservation status data for birds downloaded from birdtree.org"],
 [1,],
 [3,"Amphibian data"],
 [1,],
 [2.2,"Isaac NJB, Redding DW, Meredith HM and Safi K"],
 [2.2,"Phylogenetically-Informed Priorities for Amphibian Conservation"],
 [2.2,"PLoS One (2012)"],
 [1,],
 [3,"Squamate data (excluding snakes)"],
 [1,],
 [2.2,"Bergmann PJ, Irschick, DJ"],
 [2.2,"Vertebral Evolution and the Diversification of Squamate Reptiles"],
 [2.2,"Evolution 66(4) (2012)"],
 [1,],
 [3,"Snake data"],
 [1,],
 [2.2,"Pyron RA, Kandambi HKD, Hendry CR, Pushpamal V, Burbrink FT and Somaweera R."],
 [2.2,"Genus-level molecular phylogeny of snakes reveals"],
 [2.2,"the origins of species richness in Sri Lanka."],
 [2.2,"Molecular Phylogenetics and Evolution 66: 969-978 (2013)"],
 [1,],
 [3,"Testudine data"],
 [1,],
 [2.2,"Jaffe AL, Slater GJ and Alfaro ME"],
 [2.2,"The evolution of island gigantism and body size variation in tortoises and turtles."],
 [2.2,"Biology Letters (7) doi: 10.1098/rsbl.2010.1084 (2011)"],
 [1,],
 [3,"Crocodilian data"],
 [1,],
 [2.2,"Oaks JR"],
 [2.2,"A time-calibrated species tree of crocodylia"],
 [2.2,"reveals a recent radiation of the true crocodiles"],
 [2.2,"Evolution doi:10.1111/j.1558-5646.2011.01373.x (2011)"],
 [1,],
 [3,"Dates of common ancestry between clades"],
 [1,],
 [2.2,"Hedges SB, Dudley J and Kumar S"],
 [2.2,"TimeTree: A public knowledge-base of divergence times among organisms."],
 [2.2,"Bioinformatics 22: 2971-2972 (2006)"],
 [2.2,"Also see www.timetree.org"],
 [1,],
 
 [3,"Original OneZoom publication reference"],
 [1,],
 [2.2,"Rosindell J and Harmon LJ"],
 [2.2,"OneZoom: A Fractal Explorer for the Tree of Life"],
 [2.2,"PLoS Biology DOI: 10.1371/journal.pbio.1001406 (2012)"],
 
 [4,],
 [4,"Images"],
 [1,],
 [3.0,"All images were downloaded from the Encyclopedia of Life www.eol.org"],
 [2.2,"Zoom into the copyright symbol on the bottom right"],
 [2.2,"of any image to see the author and source details"],
 [2,],
 
 [7,],
 [3,"Please go to www.OneZoom.org/about.htm for further details"],
 [2,],
 [3,"Thank you for exploring the tree of life with OneZoom"],
 [15,],
 ];

// SECTION 2: GLOBAL VARIABLE DECLARIATION

// display size variables - there are defaults but these values are automatically changed later
var widthres = 1000;
var heightres = 600;
var xmin = 0;
var xmax = widthres;
var ymin = 0;
var ymax = heightres;

var widthofcontrols = 920;
var widthofcontrols2 = 560;
var widthofinfobar = 620;

var buttonoptions = 0;
// data and graphics variables
var context; // the graphics element
var myCanvas; // the canvas

var fulltree; // the full tree
var datahastraits = false; // if data has traits

// zoom and pan position variables
var ws = 1; // current zoom
var xp = widthres/2; // current x position
var yp = heightres;  // current y position
var wsinit; // used for comparison with ws to obtain zoom level
var calculating = false; // if in the process of calculating for zoom

// growth functions
var timelim = -3; // used as a global variable by the growth function to store the current time limit
var timeinc; // used as a global variable by the growth function to store the time scaling factor
var t2; // second timing object for growth function
var growing = false; // if in the process of growth
var growingpause = false;
var growingdir = true; // true if growing forwards

// flight functons
var flying = false; // if in the process of flying
var flying_2 = false; // if in the process of flying up or down as part of navigation.
var countdownB = 0;
var t; // timing object for flying

// search functions
var numhits;
var searchinparts = [];
var searchinfull = null;
var fullsearch = null;
var highlight_search = false;
var latin_search = false;
var common_search = true;
var trait_search = true;

// variables indicating current preferences
var infotype = 0; // for the info bar
var mywindow;

// variables for screensaver
var tout_ss; // time out for screen saver kick in
var tout_sw; // time out for view change in screen saver
var tout_aw; // time out for animation wait in screen saver

var screensaver_on = false; // screen saver in use right now
var viewchange_due = false; // view change is due soon

var nowloading = true;

// branch and leaf colouring algorithms

function midnode (x)
{
    // all the graphics parameters referenced from the reference point and reference scale which are set once and changed only when the fractal form is changed
    
    // for bezier curve (basic graphics element 1 of 2)
    var bezsx; // start x position
    var bezsy; // start y position
    var bezex; // end x position
    var bezey; // end y position
    var bezc1x; // control point 1 x position
    var bezc1y; // control point 2 y position
    var bezc2x; // control point 2 x position
    var bezc2y; // control point 2 y position
    var bezr; // line width
    
    // for the circle (basic graphics element 2 of 2)
    var arcx; // centre x position
    var arcy; // centre y position
    var arcr; // radius
    var arca; // angle of the arc
    
    // for the horizon (the region within which all graphics elements of this node and all its child nodes are contained)
    var hxmin; // min x value
    var hxmax; // max x value
    var hymin; // min y value
    var hymax; // max y value
    
    // for the graphics box (the region within which all graphics elements of this node alone (excluding its children) are contained
    var gxmin; // min x value
    var gxmax; // max x value
    var gymin; // min y value
    var gymax; // max y value
    
    // for the flight box (frames the region that defines a nice flight to the target after a search)
    var fxmin; // min x value
    var fxmax; // max x value
    var fymin; // min y value
    var fymax; // max y value
    
    // for the reference points of the two children
    var nextx1; // x refernece point for both children
    var nexty1; // y reference point for both children
    var nextx2; // x refernece point for both children
    var nexty2; // y reference point for both children
    var nextr1; // r (scale) reference for child 1
    var nextr2; // r (scale) reference for child 2
    
    // stores the refernce point and reference scale which get updated with each redraw of the page
    var xvar; // x
    var yvar; // y
    var rvar; // the value of r for the current view (null means nothign to draw)
    
    // variables indicating if drawing is needed for this node or its children updated with each redraw of the page
    var dvar; // true if this or its children need to be drawn
    var gvar; // true if graphics elements in this node itself need to be drawn
    
    // flight and search data
    var searchin = 0; // any part of a match of each term to some place in the search
    var searchin_full = 0; // exact match of search term
    var searchin_word = 0; // match to each complete word
    // note that we have no fuzzy search
    
    var startscore = 0; // gives this node a score for being the starting node
    var onroute = false;
    var targeted = false;
    var searchinpast = 0;
    var flysofarA = false;
    var flysofarB = false;
    
    // other data
    var npolyt = true; // true if node is NOT a polytomy
    var graphref = false; // true for one path of nodes through the tree, the IFIG is anchored on the node at the end of that path
    
    this.phylogenetic_diversity = 0.0;
    
    // This part of the code initialises the mode from newick format
    var bracketscount = 0;
    var cut;
    var end;
    
    // picture tools
    var num_pics = 0;
    var num_good_pics = 1;
    var picset_code; // the metacode of the leaves that we will draw the pictures of
    var picset_file; // this will store up to 6 example images - the file names - in priority order taking into account picture quality and PD
    var picset_qual; // this will store up to 6 example images - the file qualities - matching the picset_file array
    var picset_latin; // stores the latin names of the pictures
    var picset_common; // stores the common names of the pictures
    
    // sound tools
    var num_sounds = 0;
    var playing_sound = false;
    
    // metadata code
    var metacode;
    
    // signpost tools
    var drawsignposts_common = false; // this is not a global it's part of the node object
    var leafpic_drawn = false;
    
    // note: for leaves they get pic_file and pic_qual out of the newick and of course they have the name too.
    
    if (x.charAt(x.length-1) == ';')
    {
        x = x.substr(0,x.length-1);
    }
    
    if (x.charAt(0) == '(')
    {
        for (i = 0; i < x.length ; i++)
        {
            if (x.charAt(i) == '(')
            {
                bracketscount ++;
            }
            if (x.charAt(i) == ')')
            {
                bracketscount --;
            }
            if (x.charAt(i) == ',')
            {
                if (bracketscount == 1)
                {
                    cut = i;
                }
            }
            if (bracketscount == 0)
            {
                end = i;
                i = x.length +1;
            }
        }
        
        var cut1 = x.substr(1,cut-1);
        var cut2 = x.substr(cut+1,end-cut-1);
        var cutname = x.substr(end+1,x.length-end);
        // this is an interior node with name 'cutname'
        // the two children are given by cut1 ad cut2
        
        var lengthcut = -1;
        for (i = 0; i < cutname.length ; i++)
        {
            if (cutname.charAt(i) == ':')
            {
                lengthcut = i;
            }
        }
        if (lengthcut == -1)
        {
            this.lengthbr = null;
        }
        else
        {
            this.lengthbr = parseFloat(cutname.substr(lengthcut+1,(cutname.length)-lengthcut));
            cutname = cutname.substr(0,lengthcut);
        }
        
        // at this stage cutname does not have the length data associated with it
        // and we're on an interior node
        
        if (cutname.length > 0)
        {
            
            lengthcut = -1;
            
            for (i = 0; i < cutname.length ; i++)
            {
                if (cutname.charAt(i) == '[')
                {
                    lengthcut = i;
                    i = cutname.length;
                }
            }
            if (lengthcut == -1)
            {
                // no common names
                this.cname = null;
                this.name1 = cutname;
                this.name2 = null;
            }
            else
            {
                // common names
                
                this.metacode = parseInt(cutname.substr(lengthcut+1,(cutname.length)-lengthcut-2));
                if (lengthcut != 1)
                {
                    this.name1 = cutname.substr(0,lengthcut);
                }
                else
                {
                    this.name1 = null;
                }
                if (mc_key_n["common_en"]) this.cname = metadata.node_meta[this.metacode][mc_key_n["common_en"]];
                //console.log(mc_key_n["common_en"],this.cname)
            }
        }
        else
        {
            this.name2 = null;
            this.name1 = null;
            this.cname = null;
            this.metacode = null;
        }
        
        // initialise children
        this.child1 = new midnode(cut1,this);
        this.child2 = new midnode(cut2,this);
        // initialise interior node variables
        this.richness_val = 0;
    }
    else
    {
        this.child1 = null;
        this.child2 = null;
        this.richness_val =0; // these richness values are sorted out later
        
        var lengthcut = -1;
        for (i = 0; i < x.length ; i++)
        {
            if (x.charAt(i) == ':')
            {
                lengthcut = i;
            }
        }
        if (lengthcut == -1)
        {
            this.lengthbr = null;
        }
        else
        {
            this.lengthbr = parseFloat(x.substr(lengthcut+1,(x.length)-lengthcut));
            x = x.substr(0,lengthcut);
        }
        
        // at this stage cutname does not have the length data associated with it
        // and we're on a leaf node
        
        if (x.length > 0)
        {
            lengthcut = -1;
            for (i = 0; i < x.length ; i++)
            {
                if (x.charAt(i) == '[')
                {
                    lengthcut = i;
                    i = x.length;
                }
            }
            if (lengthcut == -1)
            {
                datahastraits = false;
            }
            else
            {
                
                this.metacode = parseInt(x.substr(lengthcut+1,(x.length)-lengthcut-2));
                x = x.substr(0,lengthcut);
            }
            
            if ((x.substr((x.length) - 1))=='_')
            {
                this.name2 = null;
                this.name1 = null;
            }
            else
            {
                
                lengthcut = -1;
                for (i = 0; i < x.length ; i++)
                {
                    if (x.charAt(i) == '_')
                    {
                        lengthcut = i;
                        i = x.length;
                    }
                }
                if (lengthcut == -1)
                {
                    this.name2 = null;
                    this.name1 = x;
                }
                else
                {
                    this.name1 = x.substr(lengthcut+1,(x.length)-lengthcut-1);
                    this.name2 =  x.substr(0,lengthcut);
                }
            }

        }
        else
        {
            this.name2 = null;
            this.name1 = null;
            this.metacode = null;
            datahastraits = false;
        }
    }
}

midnode.prototype.branchcolor = function() // branch colour logic
{
    // this script sets the colours of the branches
    var colortoreturn = 'rgb(207, 185, 95)'; // yan uncomment this line  to go back (and comment out hte below line)
    //var colortoreturn = 'rgb(110,110,110)';
    return colortoreturn;
}

midnode.prototype.barccolor = function() // branch outline colour logic
{
    // this script sets the color for the outline of the branches
    var colortoreturn = 'rgba(50,37,25,0.3)'; // yan uncomment this line  to go back (and comment out hte below line)

    //var colortoreturn = 'rgba(0,0,0,0.3)';
    return colortoreturn;
}

midnode.prototype.fakeleafcolor1 = function()
{
    return ('rgb(100,130,50)');
}

midnode.prototype.fakeleafcolor2 = function()
{
    return ('rgb(0,0,150)');
}

midnode.prototype.leafcolor1 = function()
{
    if (this.extraleafinfo) {
        //special, e.g. for ancestor's tale, has tale
        //return ('rgb(200,150,100)');
        return ('rgb(0,0,255)');

    } else {
        if (this.richness_val > 1)
        {
            return ('rgb(220,230,200)');
        }
        else
        {
            return ('rgb(100,130,50)');
        }
    }
}


midnode.prototype.leafcolor2 = function()
{
    if (this.extraleafinfo) {
        //special, e.g. for ancestor's tale, has tale
        return ('rgb(0,0,150)');
        //return ('rgb(0,0,0)');
    } else {
        if (this.richness_val > 1)
        {
            return ('rgb(0,100,0)');
        }
        else
        {
            return ('rgb(0,100,0)');
        }
    }
}

midnode.prototype.leafcolor3 = function()
{
    if (this.richness_val > 1)
    {
        return ('rgb(0,0,0)'); // for the leaf text
    }
    else
    {
        return ('rgb(255,255,255)'); // for the leaf text
    }
}

midnode.prototype.leafcolor4 = function()
{

    return ('rgb(255,255,255)'); // for the leaf outline text
}

midnode.prototype.hitstextcolor = function()
{
    // for text showing number of hits in each interior node (for search function)
    if ((this.npolyt)||(polytype == 3))
    {
        return ('rgb(255,255,255)');
    }
    else
    {
        return this.branchcolor();
    }
}

midnode.prototype.highlightcolor = function() // highlight colour logic
{
    return 'rgba(255,255,255,0.5)';
    /*
     // this logic defines the stripe colors that indicate search results, but could be edited to indicate other features such as traits
     return 'rgba('+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+',0.6)';
     //*/
}

midnode.prototype.datetextcolor = function() // date text colour logic
{
    var colortoreturn = 'rgb(0,0,0)';
    return colortoreturn;
}

midnode.prototype.richnesstextcolor = function() // richness text colour logic
{
    var colortoreturn = 'rgb(0,0,0)';
    return colortoreturn;
}


midnode.prototype.drawPieSet = function(x,y,r)
{
    var piedata = [this.num_LC, this.num_NT, this.num_VU, this.num_EN,this.num_CR, this.num_EW, this.num_EX, this.num_DD,this.num_NE];
    var piekey = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"];
    var piecolors = [0,0];
    piecolors.length = 9;
    var pietext1 = [0,0];
    pietext1.length = 9;
    for (i = 0 ; i < piekey.length ; i ++)
    {
        piecolors[i] = redlistcolor(piekey[i]);
        pietext1[i] = conconvert(piekey[i]);
    }
    var pietext2 = [,,"Threatened","Threatened","Threatened",,,,];
    
    // draw chart
    drawPie(x-r, y, r ,piedata,piecolors,this.richness_val);
    drawPieKey(x+r, y-r*0.75, r*0.2 , r*2 , piedata.slice(0,5),piecolors.slice(0,5),this.richness_val,pietext1.slice(0,5),pietext2.slice(0,5),piekey.slice(0,5),this.leafcolor3(),"species");
    drawPieKey(x+r, y-r*0.25, r*0.2 , r*1.6 , piedata.slice(5,9),piecolors.slice(5,9),this.richness_val,pietext1.slice(5,9),pietext2.slice(5,9),piekey.slice(5,9),this.leafcolor3(),"species");
    
    context.fillStyle = intnodetextcolor;
    autotext3(false,"Conservation status pie chart key" ,   x+r, y+r*0.5,r*2,r*0.25);
}

// if draw second pie is set then this will be drawn instead of the speaker when there are no sounds - this is a bit of a fix but it's good enough

midnode.prototype.drawPieSet_2 = function(x,y,r)
{
    var piedata = [this.num_LC, this.num_NT, this.num_VU, this.num_EN,this.num_CR, this.num_EW, this.num_EX, this.num_DD,this.num_NE];
    var piekey = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"];
    var piecolors = [0,0];
    piecolors.length = 9;
    var pietext1 = [0,0];
    pietext1.length = 9;
    for (i = 0 ; i < piekey.length ; i ++)
    {
        piecolors[i] = redlistcolor(piekey[i]);
        pietext1[i] = conconvert(piekey[i]);
    }
    var pietext2 = [,,"Threatened","Threatened","Threatened",,,,];
    
    // draw chart
    drawPie(x-r, y, r ,piedata,piecolors,this.richness_val);
    drawPieKey(x+r, y-r*0.75, r*0.2 , r*2 , piedata.slice(0,5),piecolors.slice(0,5),this.richness_val,pietext1.slice(0,5),pietext2.slice(0,5),piekey.slice(0,5),this.leafcolor3(),"species");
    drawPieKey(x+r, y-r*0.25, r*0.2 , r*1.6 , piedata.slice(5,9),piecolors.slice(5,9),this.richness_val,pietext1.slice(5,9),pietext2.slice(5,9),piekey.slice(5,9),this.leafcolor3(),"species");
    
    context.fillStyle = intnodetextcolor;
    autotext3(false,"Conservation status pie chart key 2" ,   x+r, y+r*0.5,r*2,r*0.25);
}

midnode.prototype.concalc = function() // calculation of metadata - need not be conservation based
{
    this.num_EX = 0;
    this.num_EW = 0;
    this.num_CR = 0;
    this.num_EN = 0;
    this.num_VU = 0;
    this.num_NT = 0;
    this.num_LC = 0;
    this.num_DD = 0;
    this.num_NE = 0;
    
    this.num_I = 0;
    this.num_D = 0;
    this.num_S = 0;
    this.num_U = 0;
    
    if (this.child1)
    {
        (this.child1).concalc();
        (this.child2).concalc();
        
        
        this.num_EX = ((this.child1).num_EX) + ((this.child2).num_EX);
        this.num_EW = ((this.child1).num_EW) + ((this.child2).num_EW);
        this.num_CR = ((this.child1).num_CR) + ((this.child2).num_CR);
        this.num_EN = ((this.child1).num_EN) + ((this.child2).num_EN);
        this.num_VU = ((this.child1).num_VU) + ((this.child2).num_VU);
        this.num_NT = ((this.child1).num_NT) + ((this.child2).num_NT);
        this.num_LC = ((this.child1).num_LC) + ((this.child2).num_LC);
        this.num_DD = ((this.child1).num_DD) + ((this.child2).num_DD);
        this.num_NE = ((this.child1).num_NE) + ((this.child2).num_NE);
        
        this.num_I = ((this.child1).num_I) + ((this.child2).num_I);
        this.num_D = ((this.child1).num_D) + ((this.child2).num_D);
        this.num_S = ((this.child1).num_S) + ((this.child2).num_S);
        this.num_U = ((this.child1).num_U) + ((this.child2).num_U);
        
    }
    else
    {
        this.num_EX = 0;
        this.num_EW = 0;
        this.num_CR = 0;
        this.num_EN = 0;
        this.num_VU = 0;
        this.num_NT = 0;
        this.num_LC = 0;
        this.num_DD = 0;
        this.num_NE = 0;
		
        this.num_I = 0;
        this.num_D = 0;
        this.num_S = 0;
        this.num_U = 0;
        
        if (this.redlist)
        {
            switch(this.redlist)
            {
                case "EX":
                {
                    this.num_EX = 1;
                    break;
                }
                case "EW":
                {
                    this.num_EW = 1;
                    break;
                }
                case "CR":
                {
                    this.num_CR = 1;
                    break;
                }
                case "EN":
                {
                    this.num_EN = 1;
                    break;
                }
                case "VU":
                {
                    this.num_VU = 1;
                    break;
                }
                case "NT":
                {
                    this.num_NT = 1;
                    break;
                }
                case "LC":
                {
                    this.num_LC = 1;
                    break;
                }
                case "DD":
                {
                    this.num_DD = 1;
                    break;
                }
                case "NE":
                {
                    this.num_NE = 1;
                    break;
                }
                default:
                {
                    this.num_NE = 1;	
                    break;
                }
            }
        }
        else
        {
            this.num_NE = 1;
        }
        
        if (this.popstab)
        {
            switch(this.popstab)
            {
                case "I":
                {
                    this.num_I = 1;
                    break;
                }
                case "S":
                {
                    this.num_S = 1;
                    break;
                }
                case "D":
                {
                    this.num_D = 1;
                    break;
                }
                case "U":
                {
                    this.num_U = 1;
                    break;
                }
                default:
                {
                    this.num_U = 1;	
                    break;
                }
            }
        }
        else
        {
            this.num_U = 1;
        }
        
    }
}

midnode.prototype.extxt = function() // returns text for redlist status
{
    if (this.redlist)
    {
        return conconvert(this.redlist);
    }
    else
    {
        return ("Not Evaluated");
    }
}

midnode.prototype.specnumfull = function()
{
    var speciestext1 = (this.richness_val).toString();
    if (this.richness_val >= 1000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-3) + "," + speciestext1.substring(speciestext1.length-3, speciestext1.length);
    }
    if (this.richness_val >= 1000000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-7) + "," + speciestext1.substring(speciestext1.length-7, speciestext1.length);
    }
    
    return(speciestext1 + " species");
}

midnode.prototype.leaf_txtline1 = function()
{
    if (((((this.redlist == "EX")||(this.redlist == "EW"))||
          ((this.redlist == "CR")||(this.redlist == "EN")))||
         ((this.redlist == "VU")||(this.redlist == "NT")))||(this.redlist == "LC"))
    {
        return ("Conservation status");
    }
    else
    {
        return ("");
    }
}

midnode.prototype.leaf_txtline2 = function()
{
    if (((((this.redlist == "EX")||(this.redlist == "EW"))||
          ((this.redlist == "CR")||(this.redlist == "EN")))||
         ((this.redlist == "VU")||(this.redlist == "NT")))||(this.redlist == "LC"))
    {
        return (this.extxt());
    }
    else
    {
        return ("");
    }
}

midnode.prototype.node_spec_txtline1 = function()
{
    var speciestext1 = (this.richness_val).toString();
    if (this.richness_val >= 1000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-3) + "," + speciestext1.substring(speciestext1.length-3, speciestext1.length);
    }
    if (this.richness_val >= 1000000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-7) + "," + speciestext1.substring(speciestext1.length-7, speciestext1.length);
    }
    
    return(speciestext1 + " species");
}


// resize the canvas to fit the space
function Resize_only()
{
    
    // change size of canvas
    myCanvas.width = myCanvas.clientWidth;//1920-285;
    myCanvas.height = myCanvas.clientHeight//1080;
    widthres =  myCanvas.width;
    heightres =  myCanvas.height;
}

function draw_loading()
{
	
    Resize_only();
    if (backgroundcolor)
    {
        context.fillStyle = backgroundcolor;
        context.fillRect(0,0,widthres,heightres);
    }
    else
    {
        context.clearRect(0,0,widthres,heightres);
    }
    
    context.beginPath();
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    
    context.fillStyle = 'rgb(0,0,0)';
    context.font = '110px Helvetica';
    context.textAlign = 'center';
    context.fillText  ("Loading", widthres/2 ,heightres/2, widthres/2);//(widthres+control_width)/2-control_width,heightres/2, widthres);
    
    return true;
}

// this initialises the whole IFIG

function insert_scripts_onload(array_of_scripts, last) {
    if (array_of_scripts.length == 0) {
        //no more scripts to call
        setTimeout(last,10);
    } else {
        var script = array_of_scripts.shift()
        var tempscript = document.createElement('script');
        tempscript.setAttribute("id", script["id"]);
        document.head.appendChild(tempscript);
        tempscript.src = script['path'];
        tempscript.onload = function() {insert_scripts_onload(array_of_scripts, last)}
    }
}

function init_first(script_array, last)
{
    myCanvas = document.getElementById("myCanvas");
    context= myCanvas.getContext('2d'); // sort out the canvas element
    
    Resize_only();
    
    draw_loading();
    
    insert_scripts_onload(script_array, last)
}

// todo linkng to other viewers