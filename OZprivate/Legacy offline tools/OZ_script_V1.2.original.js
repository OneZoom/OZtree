/**********************************************\
*
*       Block: Data Parser
*
\**********************************************/


function userdata () {
	fulltree = new midnode(rawData);
}

// this will indicate pop up text

function cutNewickToThreePart (x)
{
	var i;
	var bracketscount = 0;
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
	
    var cutString = new Array();
    cutString[0] = x.substr(1,cut-1);
    cutString[1] = x.substr(cut+1, end-cut-1);
    cutString[2] = x.substr(end+1,x.length-end);
    
    return cutString;
}

midnode.prototype.parseLeafNode = function(x)
{
    this.child1 = null;
    this.child2 = null;
    this.richness_val =0; // these richness values are sorted out later
    var lengthcut = -1;
    
    x = this.parseAge(x);
    x = this.parseCode(x);
    
    if (x.length > 0)
    {
        lengthcut = x.indexOf("_");
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
    else
    {
        this.name2 = null;
        this.name1 = null;
    }
};

midnode.prototype.parseCircleNode = function(cutname)
{
	cutname = this.parseAge(cutname);
    cutname = this.parseCode(cutname);
    // at this stage cutname does not have the length data associated with it
    if (cutname.length > 0)
    {
    	this.setNames(cutname);
    }
    else
    {
        this.name2 = null;
        this.name1 = null;
    }
    this.richness_val = 0;
};

midnode.prototype.parseAge = function(cutname)
{
	var i;
	var lengthcut = cutname.indexOf(":");
    
    if (lengthcut == -1)
    {
        this.lengthbr = null;
    }
    else
    {
        this.lengthbr = parseFloat(cutname.substr(lengthcut+1,(cutname.length)-lengthcut-1));
        cutname = cutname.substr(0,lengthcut);
    }
    return cutname;
};

midnode.prototype.parseCode = function(cutname)
{
	var lengthcut = cutname.indexOf("[");
    
    if (lengthcut == -1)
    {
        this.metacode = null;
    }
    else
    {
        this.metacode = parseFloat(cutname.substr(lengthcut+1,(cutname.length)-lengthcut-2));
        cutname = cutname.substr(0,lengthcut);
    }
    return cutname;
};

// note that sometime there are null values in the metadata

midnode.prototype.setNames = function(cutname)
{
    // no common names
    this.name1 = cutname;
    this.name2 = null;
};

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
    var ing;
    
    // flight and search data
    var searchin = 0;
    var searchin2 = 0;
    var startscore = 0; // gives this node a score for being the starting node
    var onroute = false;
    var targeted = false;
    var searchinpast = 0;
    var flysofarA = false;
    var flysofarB = false;
    
    // other data
    var npolyt = true; // true if node is NOT a polytomy
    var graphref = false; // true for one path of nodes through the tree, the IFIG is anchored on the node at the end of that path
    
    this.linkclick = false; // tells if a link has been clicked
    
    this.phylogenetic_diversity = 0.0;
    
    // This part of the code initialises the mode from newick format
    var bracketscount = 0;
    var cut;
    var end;
    
    if (x.charAt(x.length-1) == ';')
    {
        x = x.substr(0,x.length-1);
    }
    
    if (x.charAt(0) == '(')
    {
        // this is an interior node with name 'cutname'
        // the two children are given by cut1 ad cut2
    	var cutString = cutNewickToThreePart(x);
	  	this.parseCircleNode(cutString[2]);
    	this.child1 = new midnode(cutString[0],this);
    	this.child2 = new midnode(cutString[1],this);
    }
    else
    {
        this.parseLeafNode(x);
    }
}



/**********************************************\
 *
 *      Block: Initialiser and mouse control
 *
 \**********************************************/
//-3: no animation and bottom title has been seen
//-1: no animation
//-2: animation ends and bottom title has been seen
//0: animation not started yet
//1: animation should be start now
//2: animation finish
var animation_status = -1;
var previous_filename;
var previous_draftonly;

// various variables misc that should probably be removed

var searchinteriornodes = false;
var auto_interior_node_labels = true; // monophyletic groups of genera are to be automatically labelled in interior nodes.

// this is the logic that draws the leaves and could be edited or added to with additional functions
var popuptext = null;
var popuptext2 = null;
var justopened;
var zoominnum;
var zoomoutnum;
var shapechanged = false;

var loadingcontent = false;

// SECTION 2: GLOBAL VARIABLE DECLARIATION

// display size variables - there are defaults but these values are automatically changed later
var widthres = 1000;
var heightres = 600;
var xmin = 0;
var xmax = widthres;
var ymin = 0;
var ymax = heightres;

var widthofcontrols = 800;
var widthofcontrols2 = 560;
var widthofinfobar = 620;

var buttonoptions = 0;
// data and graphics variables
var context; // the graphics element
var myCanvas; // the canvas
var fulltree; // the full tree

// zoom and pan position variables
var ws = 1; // current zoom
var xp = widthres/2; // current x position
var yp = heightres;  // current y position
var wsinit; // used for comparison with ws to obtain zoom level
var calculating = false; // if in the process of calculating for zoom

var latest_ws; // stores the ws of the last refactoring

// variables for mouse use
var mousehold = false;
var buttonhold = false;
var mouseX;
var mouseY;
var oldyp; // old y position for moving
var oldxp; // old x position for moving

// growth functions
var timelim = -1; // used as a global variable by the growth function to store the current time limit
var timeinc; // used as a global variable by the growth function to store the time scaling factor
var t2; // second timing object for growth function
var growing = false; // if in the process of growth
var growingpause = false;

// flight functons
var flying = false; // if in the process of flying
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

var mouse_on_url = null;
// this global variable will store the url of a link that the mouse is over
// null means the mouse is over no url
// on mouse off we should load the url
var mouse_on_url_new = true;
// if true the link will open in a new window
// if false it will replace the current window
var mouse_on_url_valid = false;
// true when there is a url that we want to link to
var about_to_open_url;
var about_to_open_url_new;
var justopened_url = false;
var introlock = false;

var mywindow;

var debugtext = null;

// INITIALISERS

// this initialises the whole IFIG
function init()
{
    loadingcontent = true;
    set_defaults();
    init_logos();
    shapechanged = false;
    zoominnum = 7;
    zoomoutnum = 7;
	myCanvas = document.getElementById("myCanvas");
	

	if (($(myCanvas).attr('data_status') == "embedded"
		|| $('#myCanvas').attr('data_status') == 'embedded_front')
		&& animation_status != 1 && animation_status != -2 && animation_status != -3)
		animation_status = 0;
	else if (animation_status != -2 && animation_status != -3)
		animation_status = 1;
	clearbuttons();
	buttonoptions = 0;
	
    document.getElementById("JSnotsupported").style.display = 'none';
    
	context= myCanvas.getContext('2d'); // sort out the canvas element
    if (!(context))
    {
        document.getElementById("Canvasnotsupported").style.display = '';
    }
    else
    {
        document.getElementById("Canvasnotsupported").style.display = 'none';
    }
	Resize_only();
	draw_loading();
    setTimeout('init2()',10); // changed here
}

function init2()
{
	if (typeof previous_filename == 'undefined' || previous_filename != file_name 
			|| typeof previous_draftonly == 'undefined' || previous_draftonly != draft_only) {
		previous_filename = file_name;
	    previous_draftonly = draft_only;

	    var element = document.getElementById("_min");
	    if (element)
	    {
	        element.parentNode.removeChild(element);
	    }
	    element = document.getElementById("_tree");
	    if (element)
	    {
	        element.parentNode.removeChild(element);
	    }
	    element = document.getElementById("_meta");
	    if (element)
	    {
	        element.parentNode.removeChild(element);
	    }
	    if (draft_only)
	    {
	        var tempscript = document.createElement('script');
	        tempscript.setAttribute("id", "_min");
	        tempscript.src = "user/"+file_name+"_min.js";
	        tempscript.onload = function () {
	            init3();
	        };
	        document.head.appendChild(tempscript);
	    }
	    else
	    {
	        var tempscript = document.createElement('script');
	        tempscript.setAttribute("id", "_tree");
	        tempscript.src = "user/"+file_name+"_tree.js";
	        tempscript.onload = function () {
	            var tempscript2 = document.createElement('script');
	            tempscript2.setAttribute("id", "_meta");
	            tempscript2.src = "user/"+file_name+"_meta.js";
	            tempscript2.onload = function () {
	                init3();
	            };
	            document.head.appendChild(tempscript2);
	        };
	        document.head.appendChild(tempscript);
	    }
        
	} else {
		init3();
	}
}

function init3()
{	
	// sort out event listeners for zoom and pan
    latest_ws = ws;
    
    myCanvas.onmousedown = holdon;
	myCanvas.onmouseup = holdoff;
	myCanvas.onmouseout = mouseout;
	myCanvas.onmousemove = movemouse;
	if (myCanvas.addEventListener)
	{
		myCanvas.addEventListener ("mousewheel", mousewheel, false);
		myCanvas.addEventListener ("DOMMouseScroll", mousewheel, false);
        myCanvas.addEventListener ("MozMousePixelScroll", mousewheel, false);
	}
	else
	{
		if (myCanvas.attachEvent)
		{
			myCanvas.attachEvent ("onmousewheel", mousewheel);
		}
	}
    
    if (document.addEventListener)
	{
		document.addEventListener ("mousewheel", mousewheel_pd, false);
		document.addEventListener ("DOMMouseScroll", mousewheel_pd, false);
        document.addEventListener ("MozMousePixelScroll", mousewheel_pd, false);
	}
	else
	{
		if (document.attachEvent)
		{
			document.attachEvent ("onmousewheel", mousewheel_pd);
		}
	}
    
	readintree(); // read in the tree and do all the necessary precalculations
    
    Resize_only();

    if ((genus_URL||taxa_URL)&&(animation_status==1))
    {
    	 search_init();
    }
    else
    {
    	if (!genus_URL && !taxa_URL && animation_status != -2 && animation_status != -3)
    		animation_status = -1;
    	
        justopened = true;
        Reset(); // set the canvas size and draw the IFIG initial view
        draw2();
        setTimeout('cancelfirstuse()',5000);
        if (init_URL&&(init_URL == 4))
        {
            buttonoptions = 2;
            document.getElementById("closebutton").style.display = '';
            document.getElementById("growtitle").style.display = '';
            document.getElementById("growtxt").style.display = '';
            document.getElementById("revgbutton").style.display = '';
            document.getElementById("pausegbutton").style.display = '';
            document.getElementById("playgbutton").style.display = '';
            document.getElementById("endgbutton").style.display = '';
            growplay();
            Resize();
        }
    }
}

function init_logos()
{
	if ($('#myCanvas').attr('data_status') == 'embedded'
		|| $('#myCanvas').attr('data_status') == 'embedded_front') {
		$('#logo1').hide();
		return;
	}
	
	if (logo_URL)
    {
        document.getElementById("logo1").style.display = 'initial';
        document.getElementById("logo1").src = logo_URL;
        document.getElementById("logo1").onload = function () {
            Resize_only();
            draw2();
        };
        
        var thetitle = "OneZoom Tree of Life Explorer";
        
        if (title_add1)
        {
            thetitle += " " + title_add1;
        }
        if (title_add2)
        {
            thetitle += " " + title_add2;
        }
        document.title = thetitle;
        
    } else if(url_URL) {
    	$('#logo1').attr('src',"icons/Home_icon.png");
    	$('#logo1').show();
    } else {
    	$('#logo1').hide();
    }
};

// read in the tree data
function readintree()
{
	// read in information from text input
	var stringin = document.forms["myform"]["datain"].value;
	fulltree = null;
	if (stringin)
	{
		// if there is data inputed use this as the tree
		fulltree = new midnode(stringin);
	}
	else
	{
		// otherwise use embedded data set at top of file
		userdata();
	}
	// calculate species richness at all nodes
	fulltree.richness_calc();
    fulltree.traitprecalc();
    if (auto_interior_node_labels)
    {
        
        // check all names and find monophyletic genera groups
        fulltree.name_calc();
    }
    // calculate ages
	fulltree.phylogeneticdiv_calc();
	fulltree.age_calc();
	// calculate labels
    if (auto_interior_node_labels)
    {
        fulltree.inlabel_calc(null);
	}
    // update fractal form and do all precalculations
	update_form();
	// resize canvas to fit
	Resize();
	// centre view on IFIG
	fulltree.setxyr3r(40,widthres-40,40,heightres-40);
	// store initial zoom level
	wsinit = ws;
    loadingcontent = false;
}

// resize the canvas to fit the space
function Resize_only()
{
    
	widthres = 1024; // default
	heightres = 660; // default
	if (document.body && document.body.offsetWidth) {
		widthres = document.body.offsetWidth;
		winH = document.body.offsetHeight;
	}
	if (document.compatMode=='CSS1Compat' &&
		document.documentElement &&
		document.documentElement.offsetWidth ) {
		widthres = document.documentElement.offsetWidth;
		heightres = document.documentElement.offsetHeight;
	}
	if (window.innerWidth && window.innerHeight) {

		widthres = document.getElementById("wholecontainer").offsetWidth;
		heightres = document.getElementById("wholecontainer").offsetHeight;
//		widthres = window.innerWidth;
//		heightres = window.innerHeight;
	}
	// need to allow for space for buttons and border etc.
	if ($('#myCanvas').attr('data_status') == 'embedded' 
		|| $('#myCanvas').attr('data_status') == 'embedded_front') {
		top_page_gap = 255;
	} 
    var blackspace_width = widthres-top_page_gap;
    if (document.getElementById("logo1").style.display!= 'none')
    {
        blackspace_width -= parseInt(document.getElementById("logo1").width);
    }
    document.getElementById("headerspace").width = blackspace_width;
    if (($('#myCanvas').attr('data_status') != 'embedded' 
    	&& $('#myCanvas').attr('data_status') != 'embedded_front')
    	&& $('#myCanvas').attr('data_status') != 'front_iframe') {
		heightres -= 60;
		widthres -=30;
	} 
    document.getElementById("headerspace2").style.display = 'none';
	if (buttonoptions != 0)
	{
        document.getElementById("headerspace2").style.display = '';
		heightres = heightres - 40;
		if (widthres < widthofcontrols)
		{
			heightres = heightres - 27; // add space for two rows of buttons
			if (widthres < widthofcontrols/2)
			{
				heightres = heightres - 27; // add space for three rows of buttons
				if (widthres < widthofcontrols/3)
				{
					heightres = heightres - 27; // add space for four rows of buttons
				}
			}
		}
	}
	if (((infotype != 0 || growing || growingpause) && (buttonoptions ==0) ))
	{
		heightres -= 42 // add space for infobar if needed
		if (widthres < widthofinfobar)
		{
			heightres -= 42
		}
	}
    
	
	if (widthres < widthofcontrols2)
    {
        heightres = heightres - 27; // add space for two rows of buttons
        if (widthres < widthofcontrols2/2)
        {
            heightres = heightres - 27; // add space for three rows of buttons
            if (widthres < widthofcontrols2/3)
            {
                heightres = heightres - 27; // add space for four rows of buttons
            }
        }
    }
	// change size of canvas
	myCanvas.width = widthres;
	myCanvas.height = heightres;
	// redraw canvas
}

function Resize()
{
	Resize_only();
	draw2();
}

function cancelfirstuse()
{
    justopened = false;
    draw2();
}

function usersearchclear()
{
    document.getElementById("searchtf").value="";
    justopened = false;
    clearTimeout(t);
	flying = false;
	performclear();
	fulltree.clearsearch();
	//fulltree.clearlinks();
	fulltree.clearonroute();
	document.getElementById("numhittxt").innerHTML= ('no hits');
    
}

function userReset()
{
    if (!introlock)
    {
        popup_out();
        justopened = false;
  
        if((genus_URL||taxa_URL))
        {
            Reset();
            var temptype = viewtype
            set_defaults();
            if (viewtype != temptype)
            {
                update_form();
                Resize();
            }
            highlight_search = true;
            fulltree.search_URLinit();
            if(genus2_URL||taxa2_URL)
            {
                fulltree.search_URLinit2();
            }
            draw2();
        }
        else
        {
            Reset();
        }
    }
}

// reset the search and view to its start position
function Reset()
{
	threshold =2;
	if ((growing)||(growingpause))
	{
		clearTimeout(t);
		draw2();
		timelim = -1;
		Resize();
		growing = false;
		growingpause = false;
		Resize();
	}
    document.getElementById("numhittxt").innerHTML= ('no hits');
    calculating = false;
	clearTimeout(t);
	flying = false;
	clearTimeout(t2);
	performclear();
	timelim = -1;
	fulltree.deanchor();
	fulltree.graphref = true;
	fulltree.clearsearch();
	//fulltree.clearlinks();
	fulltree.clearonroute();
	fulltree.setxyr3r(40,widthres-40,40,heightres-40);
	wsinit = ws;
	Resize_only();
    draw2();
}

// MOUSE CONTROL, PAN AND ZOOM
var clicking;

// if holding down left mouse button - prepare to pan
function holdon(event)
{
	if (typeof use_image_before_loading != 'undefined') {
		use_image_before_loading = false;
	}
	
	if (animation_status == -1) animation_status = -3;
    else if (animation_status == 2) animation_status = -2;
	else if (animation_status == 0) animation_status = 1;
	else if (animation_status == 1) return;
	
	if (draft_only == true) {
		draft_only = false;
		init();
		return;
	}
	
	if ((genus_URL||taxa_URL)&&(animation_status==1))
    {
    	 search_init();
    }
	
    if (!introlock||in_about)
    {
        if (in_about)
        {
            AboutOZ();
        }
        justopened = false;
        clearTimeout(t);
        flying = false;
        mouseY = event.clientY-myCanvas.offsetTop;
        mouseX = event.clientX-myCanvas.offsetLeft;
        if (mouse_on_url_valid)
        {
            mousehold = false;
            buttonhold = true;
            calculating = true;
            draw2();
            calculating = false;
        }
        else
        {
            mousehold = true;
            clicking = true;
            oldyp = yp;
            oldxp = xp;
            setTimeout('clicktoolate()',200);
        }
    } 
}

function clicktoolate()
{
    clicking = false;
}

// if releasing left mouse button
function holdoff()
{
    if (!introlock)
    {
        if (mouse_on_url_valid)
        {
            about_to_open_url = mouse_on_url;
            about_to_open_url_new = mouse_on_url_new;
            
            mouse_on_url_valid = false;
            mouse_on_url = null;
            justopened_url = true;
            buttonhold = false;
            mousehold = false;
            draw2();
            if(about_to_open_url_new){
                mywindow = window.open(about_to_open_url);
            } else {
                window.location.href = about_to_open_url;
            }
        }
        if(clicking)
        {
            click2zoomnum = 4;
            click2zoom();
        }
        
        buttonhold = false;
        mousehold = false;
        calculating = false;
    }
}

function mouseout ()
{
    mousehold = false;
	calculating = false;
    mouseX = -1;
    mouseY = -1;
    draw2();
}

// mouse move, so if left button held redraw
function movemouse(event){
    justopened_url = false;
	if (mousehold){
        yp = oldyp + (-mouseY+event.clientY -myCanvas.offsetTop);
        xp = oldxp + (-mouseX+event.clientX -myCanvas.offsetLeft);
        if ((yp-oldyp)^2>9){
            clicking = false;
        }
        if ((xp-oldxp)^2>9){
            clicking = false;
        }
        draw2();
	}
	else{
        mouseY = event.clientY -myCanvas.offsetTop;
        mouseX = event.clientX -myCanvas.offsetLeft;
        calculating = true;
        draw2();
        calculating = false;
	}
};


function mousewheel_pd(event)
{
    if ($(myCanvas).attr('data_status') == "embedded")
    {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    
    if (embed_tool_htm)
    {
    }
    else
    {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    
    
}

// need to zoom in or out
function mousewheel(event)
{
    event.preventDefault();
    event.stopPropagation();
	
	if (typeof use_image_before_loading != 'undefined') 
		use_image_before_loading = false;
		
    if (animation_status != 0) {
        if(animation_status == -1) animation_status = -3;
        else if (animation_status == 2) animation_status = -2;
        
        if (draft_only == true) {
    		draft_only = false;
    		init();
    		return;
    	}
        
        if (!introlock)
        {
            justopened = false;
            if (!calculating)
            {
                clearTimeout(t);
                flying = false;
                if (!mousehold)
                {
                    var delta = 0;
                    if ('wheelDelta' in event)
                    {
                        delta = event.wheelDelta;
                    }
                    else
                    {
                        delta = -event.detail / 2;
                    }
                    
                    if ((parseFloat(delta)) > 0.0)
                    {
                        calculating = true;
                        zoomin(event)
                    }
                    else
                    {
                        calculating = true;
                        zoomout(event)
                    }
                }
                setTimeout('calcfalse()',1);
                // there is a tiny delay here to force redraw in all browsers when zooming a lot
            }
        }
        else
        {
            if (in_about)
            {
                AboutOZ();
            }
        }
    }
    return false;
}

// handles the calculating flag
function calcfalse()
{
	calculating = false;
}

// zoom in function
function zoomin(event)
{
	clearTimeout(t);
	mouseY = event.clientY -myCanvas.offsetTop;
    mouseX = event.clientX -myCanvas.offsetLeft;
	flying = false;
	ws = ws/sensitivity;
	xp = mouseX + (xp-mouseX)/sensitivity;
	yp = mouseY + (yp-mouseY)/sensitivity;
	draw2();
}

// zoom out function
function zoomout(event)
{
    mouseY = event.clientY -myCanvas.offsetTop;
    mouseX = event.clientX -myCanvas.offsetLeft;
    clearTimeout(t);
    flying = false;
    
    if((((fulltree).rvar*(fulltree.hxmax-fulltree.hxmin))>(widthres*0.7))||(((fulltree).rvar*(fulltree.hymax-fulltree.hymin))>(heightres*0.7)))
    {
        ws = ws*sensitivity;
        xp = mouseX + (xp-mouseX)*sensitivity;
        yp = mouseY + (yp-mouseY)*sensitivity;
        draw2();
        
    }
}

var click2zoomnum;

function click2zoom()
{
    
    clearTimeout(t);
    flying = false;
    ws = ws/sensitivity3;
    xp = mouseX + (xp-mouseX)/sensitivity3;
    yp = mouseY + (yp-mouseY)/sensitivity3;
    draw2();
    click2zoomnum --;
    if (click2zoomnum >= 0)
    {
        t = setTimeout('click2zoom()',33);
    }
}

// zoom in function
function CZoomin()
{
    if (!introlock)
    {
        if (zoominnum > 0)
        {
            zoominnum --;
        }
        click2zoomnum = 4;
        CZoomin2();
    }
}

// zoom out function
function CZoomout()
{
    if (!introlock)
    {
        if (zoomoutnum > 0)
        {
            zoomoutnum --;
        }
        click2zoomnum = 4;
        CZoomout2();
    }
}

// zoom in function
function CZoomin2()
{
    clearTimeout(t);
    flying = false;
    ws = ws/sensitivity2;
    xp = widthres/2 + (xp-widthres/2)/sensitivity2;
    yp = heightres/2 + (yp-heightres/2)/sensitivity2;
    draw2();
    click2zoomnum --;
    if (click2zoomnum >= 0)
    {
        t = setTimeout('CZoomin2()',33);
    }
}

// zoom out function
function CZoomout2()
{
    clearTimeout(t);
    flying = false;
    
    if((((fulltree).rvar*(fulltree.hxmax-fulltree.hxmin))>(widthres*0.7))||(((fulltree).rvar*(fulltree.hymax-fulltree.hymin))>(heightres*0.7)))
    {
        ws = ws*sensitivity2;
        xp = widthres/2 + (xp-widthres/2)*sensitivity2;
        yp = heightres/2 + (yp-heightres/2)*sensitivity2;
        draw2();
        
    }
    click2zoomnum --;
    if (click2zoomnum >= 0)
    {
        t = setTimeout('CZoomout2()',33);
    }
}



/**********************************************\
 *
 *      Block: Defaults and URL parser
 *
 \**********************************************/



// program settings hierarchy:
// end user settings (can be overridden by disabling) >
// url args (can be overidden by diabling) >
// url profile settings >
// custom view settings in json file >
// onezoom defaults

// define defaults

/* vars set here, and in json and in url parser */

var polytype = 3; // the way polytomies are expressed (should be 0,1,2 or 3) // note that end user cannot set option 2 at present
var viewtype = 1; // the default viewtype (should be 1,2,3 or 4)
var colourtype = 3; // the default colour mode - note: if doing further editing of colour palette's below this may become irrelevant 3 is only for redlist data
var commonlabels = true; // makes common names the primary info if false then latin names become the primary focus
var drawsignposts = true; // draw signposts
var leaftype = 2; // leaf shape circular or natural - this cannot be changed with buttons it is recommended you leave it
var int_highlight_type = 2; // arrows - 1 means circular - this cannot be changed with buttons it is recommended you leave it
var fonttype = 'Helvetica'; // change the text font to match the rest of your article and journal style // 'sans-serif' // is good too - this cannot be changed with buttons

/* Set other (not deemed necessary for user override - they have been tuned already but can be changed in json) */

var intcircdraw = true; // display interior circles or not?
var sign_background_size = 0.35; // size of signpost background note: 0.5 fills the horizon area
var sign_text_size = 0.265; // size of text in signposts
var pieborder = 0.12; // border size for pie chart
var partl2 = 0.1; // width of lines on int nodes
var total_num_polyt = 3; // number of different polytomy vis methods supported
var total_num_cols = 3; // number of different colour schemes supported

/* Set UI technical variables (not deemed necessary for user override - they have been tuned already but can be changed in json) */

var sensitivity = 0.84; // for mouse sensitivity zooming in
var sensitivity3 = 0.9; // for click to zoom step size
var sensitivity2 = 0.88; // for mouse sensitivity zooming in
var mintextsize = 4; // the smallest size text you want to have displayed
var threshold =2; // for the detail threshold
var thresholdtxt =2; // for the detail threshold
var growthtimetot = 30; // number of seconds growth animation should last
var allowurlparse = true; // allow url parsing in

var title_add1 = null; // tells me what version this is
var title_add2 = null; // adds more text to the title

var length_init_zoom2 = 30; // steps (time) for hybrid method with small zoom in
var init_zoom_speed = 1.1; // speed for hybrid method with small zoom in
var length_intro_in = 15; // speed for full fly thorough
var length_intro_in2 = 8; // speed for full fly thorough following branches

/* these vars only defined here, no need to make them easier to edit */
var credits_roll_speed = 1.8;
var about_height = 12;
var top_page_gap = 614; // make this smaller to increase the size of the packing piece at the top of the page

/* set colour defaults - can be overidden by the json file,
 if new cols are parsed by url then these appear as a new colour scheme
 they do not replace existing colours */

var leaf_outline_def = 'rgb(0,150,30)';
var leaf_fill_def = 'rgb(0,100,0)';
var leaf_text_col_def = 'rgb(255,255,255)';
var brown_branch_def = 'rgb(100,75,50)';
var signpost_col_def = 'rgba(255,255,255,0.5)';
var signpost_txtcol_def = 'rgb(0,0,0)';
var popupbox_col = 'rgba(0,0,0,0.85)';
var popupbox_txtcol = 'rgb(255,255,255)';
var loading_txtcol = 'rgb(0,0,0)';
var pie_background_color = 'rgb(255,255,255)';
var link_background_color = 'rgb(255,255,255)';
var link_highlight_color = 'rgb(0,0,0)';
var intnodetextcolor = 'rgb(255,255,255)'; // for interior node text colour where there is a name to be put
var backgroundcolor = 'rgb(255,255,200)'; //background color 'null' if no background is wanted
var outlineboxcolor = 'rgb(0,0,0)'; // outline box colour
var highlightcolor1 = 'rgba(255,255,255,0.5)'; // two highlight colours
var highlightcolor2 = 'rgba(0,0,0,0.5)';


function set_defaults()
{
    
    if (UserOptions.polytype) {
        polytype=UserOptions.polytype;
    }
    if (UserOptions.viewtype) {
        viewtype=UserOptions.viewtype;
    }
    if (UserOptions.colourtype) {
        colourtype=UserOptions.colourtype;
    }
    if (UserOptions.commonlabels) {
        commonlabels=bin_parse(UserOptions.commonlabels,commonlabels);
    }
    if (UserOptions.drawsignposts) {
        drawsignposts=bin_parse(UserOptions.drawsignposts,drawsignposts);
    }
    if (UserOptions.leaftype) {
        leaftype=UserOptions.leaftype;
    }
    if (UserOptions.int_highlight_type) {
        int_highlight_type=UserOptions.int_highlight_type;
    }
    if (UserOptions.fonttype) {
        fonttype=UserOptions.fonttype;
    }
    if (UserOptions.intcircdraw) {
        intcircdraw=bin_parse(UserOptions.intcircdraw,intcircdraw);
    }
    if (UserOptions.sign_background_size) {
        sign_background_size=UserOptions.sign_background_size;
    }
    if (UserOptions.sign_text_size) {
        sign_text_size=UserOptions.sign_text_size;
    }
    if (UserOptions.pieborder) {
        pieborder=UserOptions.pieborder;
    }
    if (UserOptions.partl2) {
        partl2=UserOptions.partl2;
    }
    if (UserOptions.total_num_polyt) {
        total_num_polyt=UserOptions.total_num_polyt;
    }
    if (UserOptions.total_num_cols) {
        total_num_cols=UserOptions.total_num_cols;
    }
    if (UserOptions.sensitivity) {
        sensitivity=UserOptions.sensitivity;
    }
    if (UserOptions.sensitivity3) {
        sensitivity3=UserOptions.sensitivity3;
    }
    if (UserOptions.sensitivity2) {
        sensitivity2=UserOptions.sensitivity2;
    }
    if (UserOptions.mintextsize) {
        mintextsize=UserOptions.mintextsize;
    }
    if (UserOptions.threshold) {
        threshold=UserOptions.threshold;
    }
    if (UserOptions.thresholdtxt) {
        thresholdtxt=UserOptions.thresholdtxt;
    }
    if (UserOptions.growthtimetot) {
        growthtimetot=UserOptions.growthtimetot;
    }
    if (UserOptions.allowurlparse) {
        allowurlparse=bin_parse(UserOptions.allowurlparse,allowurlparse);
    } else {
    	allowurlparse = false;
    }
    
    if (UserOptions.length_init_zoom2) {
        length_init_zoom2=UserOptions.length_init_zoom2;
    }
    if (UserOptions.init_zoom_speed) {
        init_zoom_speed=UserOptions.init_zoom_speed;
    }
    if (UserOptions.length_intro_in) {
        length_intro_in=UserOptions.length_intro_in;
    }
    if (UserOptions.length_intro_in2) {
        length_intro_in2=UserOptions.length_intro_in2;
    }
    if (UserOptions.titleadd1) {
        title_add1=UserOptions.titleadd1;
    }
    if (UserOptions.titleadd2) {
        title_add2=UserOptions.titleadd2;
    }
    
    if (UserOptions.leaf_outline_def) {
        leaf_outline_def=UserOptions.leaf_outline_def;
    }
    if (UserOptions.leaf_fill_def) {
        leaf_fill_def=UserOptions.leaf_fill_def;
    }
    if (UserOptions.leaf_text_col_def) {
        leaf_text_col_def=UserOptions.leaf_text_col_def;
    }
    if (UserOptions.brown_branch_def) {
        brown_branch_def=UserOptions.brown_branch_def;
    }
    if (UserOptions.signpost_col_def) {
        signpost_col_def=UserOptions.signpost_col_def;
    }
    if (UserOptions.signpost_txtcol_def) {
        signpost_txtcol_def=UserOptions.signpost_txtcol_def;
    }
    if (UserOptions.popupbox_col) {
        popupbox_col=UserOptions.popupbox_col;
    }
    if (UserOptions.popupbox_txtcol) {
        popupbox_txtcol=UserOptions.popupbox_txtcol;
    }
    if (UserOptions.loading_txtcol) {
        loading_txtcol=UserOptions.loading_txtcol;
    }
    if (UserOptions.pie_background_color) {
        pie_background_color=UserOptions.pie_background_color;
    }
    if (UserOptions.link_background_color) {
        link_background_color=UserOptions.link_background_color;
    }
    if (UserOptions.link_highlight_color) {
        link_highlight_color=UserOptions.link_highlight_color;
    }
    if (UserOptions.intnodetextcolor) {
        intnodetextcolor=UserOptions.intnodetextcolor;
    }
    if (UserOptions.backgroundcolor) {
        backgroundcolor=UserOptions.backgroundcolor;
    }
    if (UserOptions.outlineboxcolor) {
        outlineboxcolor=UserOptions.outlineboxcolor;
    }
    if (UserOptions.highlightcolor1) {
        highlightcolor1=UserOptions.highlightcolor1;
    }
    if (UserOptions.highlightcolor2) {
        highlightcolor2=UserOptions.highlightcolor2;
    }
    if(allowurlparse)
    {
        URL_parse();
    }
}

function bin_parse(stringin,default_val)
{
    var toret = default_val;
    var true_list = ["1","true","yes","y","t"];
    var false_list = ["0","false","no","n","f"];
    for (i = 0 ; i < true_list.length ; i ++)
    {
        if (stringin == true_list[i])
        {
            toret = true;
        }
        if (stringin == false_list[i])
        {
            toret = false;
        }
    }
    return toret;
}

// declaration of global URL parse info
var l1col_URL=null,l2col_URL=null,b1col_URL=null,b2col_URL=null,txtcol_URL=null;
var genus_URL=null,species_URL=null,taxa_URL=null,genus2_URL=null,species2_URL=null,taxa2_URL=null;
var init_URL=3,url_URL=null,text_URL=null,logo_URL=null,sitename_URL=null,profile_URL=null,cutdown_URL=null,info_URL=null;
var leaf_link_priority=null, node_link_priority=null

function URL_parse()
{
	l1col_URL=null;l2col_URL=null;b1col_URL=null;b2col_URL=null;txtcol_URL=null;
	genus_URL=null;species_URL=null;taxa_URL=null;genus2_URL=null;species2_URL=null;taxa2_URL=null;
	init_URL=3;url_URL=null;text_URL=null;logo_URL=null;sitename_URL=null;
	profile_URL=null;cutdown_URL=null;info_URL=null;
	leaf_link_priority=null; node_link_priority=null;
    // URL parse settings e.g. ?genus=Tachyglossus&species=aculeatus&profile=DL
    // init codes: 1 = fly, 2 = hybrid, 3 = jump, 4 = grow, 5 = mark
	//Original
	//    if( this_url = window.location.search.substring(1))
	//Modify from search to hash because hash won't refresh page when hash is set:
	var search;
	if( window.location.search.length > 1)
		search = window.location.search;
	else
		search = window.location.hash;
    search = search.split("%20").join(" ");
	if( this_url = search.substring(1))
    {
        this_url = this_url.toString();
        var urlParts = this_url.split("&");
        
        for (var j = 0 ; j < urlParts.length ; j ++)
        {
            var tempURL = urlParts[j];
            tempURLparts = tempURL.split("=");
            if (tempURLparts[0] == "profile") {
                profile_URL = tempURLparts[1];
                
                for (var jj = 0 ; jj < PartnerProfiles.length ; jj ++)
                {
                    if (PartnerProfiles[jj])
                    {
                        if (PartnerProfiles[jj].profilename == profile_URL)
                        {
                            if (PartnerProfiles[jj].poly) {
                                polytype = PartnerProfiles[jj].poly;
                            }
                            if (PartnerProfiles[jj].view) {
                                viewtype = PartnerProfiles[jj].view;
                            }
                            if (PartnerProfiles[jj].colour) {
                                colourtype = PartnerProfiles[jj].colour;
                            }
                            if (PartnerProfiles[jj].common) {
                                commonlabels = bin_parse(PartnerProfiles[jj].common,commonlabels);
                            }
                            if (PartnerProfiles[jj].signs) {
                                drawsignposts = bin_parse(PartnerProfiles[jj].signs,drawsignposts);
                            }
                            if (PartnerProfiles[jj].ltype) {
                                leaftype = PartnerProfiles[jj].ltype;
                            }
                            if (PartnerProfiles[jj].hltype) {
                                int_highlight_type = PartnerProfiles[jj].hltype;
                            }
                            if (PartnerProfiles[jj].bgcol) {
                                backgroundcolor = PartnerProfiles[jj].bgcol;
                            }
                            if (PartnerProfiles[jj].font) {
                                fonttype = PartnerProfiles[jj].font;
                            }
                            if (PartnerProfiles[jj].init) {
                                init_URL = PartnerProfiles[jj].init;
                            }
                            if (PartnerProfiles[jj].url) {
                                url_URL = PartnerProfiles[jj].url;
                            }
                            if (PartnerProfiles[jj].text) {
                                text_URL = PartnerProfiles[jj].text;
                            }
                            if (PartnerProfiles[jj].logo) {
                                logo_URL = PartnerProfiles[jj].logo;
                            }
                            if (PartnerProfiles[jj].name) {
                                sitename_URL = PartnerProfiles[jj].name;
                            }
                            if (PartnerProfiles[jj].titleadd2) {
                                title_add2 = PartnerProfiles[jj].titleadd2;
                            }
                            if (PartnerProfiles[jj].info) {
                                info_URL = bin_parse(PartnerProfiles[jj].info,info_URL);
                            }
                            if (PartnerProfiles[jj].growt) {
                                growthtimetot = PartnerProfiles[jj].growt;
                            }
                            if (PartnerProfiles[jj].leaf_link_priority) {
                                leaf_link_priority = PartnerProfiles[jj].leaf_link_priority;
                            }
                            if (PartnerProfiles[jj].node_link_priority) {
                                node_link_priority = PartnerProfiles[jj].node_link_priority;
                            }
                        }
                    }
                }
            }
        }
        
        for (ii = 0 ; ii < urlParts.length ; ii ++)
        {
            var tempURL = urlParts[ii];
            tempURLparts = tempURL.split("=");
            if (tempURLparts[0] == "poly"){
                polytype = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "view") {
                viewtype = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "colour") {
                colourtype = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "common") {
                commonlabels = bin_parse(tempURLparts[1]);
            } else if (tempURLparts[0] == "signs") {
                drawsignposts = bin_parse(tempURLparts[1]);
            } else if (tempURLparts[0] == "ltype") {
                leaftype = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "hltype") {
                int_highlight_type = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "bgcol") {
                backgroundcolor = tempURLparts[1];
            } else if (tempURLparts[0] == "l1col") {
                l1col_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "l2col") {
                l2col_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "b1col") {
                b1col_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "b2col") {
                b2col_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "h1col") {
                highlightcolor1 = tempURLparts[1];
            } else if (tempURLparts[0] == "h2col") {
                highlightcolor2 = tempURLparts[1];
            } else if (tempURLparts[0] == "txtcol") {
                txtcol_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "font") {
                fonttype = tempURLparts[1];
            } else if (tempURLparts[0] == "genus") {
                genus_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "species") {
                species_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "taxa") {
                taxa_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "genus2") {
                genus2_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "species2") {
                species2_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "taxa2") {
                taxa2_URL = tempURLparts[1].toLowerCase();
            } else if (tempURLparts[0] == "init") {
                init_URL = parseInt(tempURLparts[1]);
            } else if (tempURLparts[0] == "url") {
                url_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "text") {
                text_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "name") {
                sitename_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "logo") {
                logo_URL = tempURLparts[1];
            } else if (tempURLparts[0] == "cutdown") {
                cutdown_URL = bin_parse(tempURLparts[1]);
            } else if (tempURLparts[0] == "info") {
                info_URL = bin_parse(tempURLparts[1]);
            }else if (tempURLparts[0] == "growt") {
                growthtimetot = parseFloat(tempURLparts[1]);
            }else if (tempURLparts[0] == "initt1") {
                length_intro_in = parseInt(tempURLparts[1]);
            }else if (tempURLparts[0] == "initt1b") {
                length_intro_in2 = parseInt(tempURLparts[1]);
            }else if (tempURLparts[0] == "initt2") {
                length_init_zoom2 = parseInt(tempURLparts[1]);
            }else if (tempURLparts[0] == "inits2") {
                init_zoom_speed = parseFloat(tempURLparts[1]);
            }
        }
        
        if(((l1col_URL||l2col_URL)||(b1col_URL||b2col_URL))||(txtcol_URL))
        {
            
            total_num_cols ++;
            colourtype = total_num_cols;
        }
    }
    
}


/**********************************************\
 *
 *      Block: Name Mapper and text tools
 *
 \**********************************************/

// makes strings of dates and names for us to use in higher level node and leaf layouts

midnode.prototype.datefull = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() +
        " Million years ago (" + gpmapper(this.lengthbr) + ")";
    }
    else if (this.lengthbr >1)
    {
    	return (Math.round((this.lengthbr)*100)/100.0).toString()  +
    	" Million years ago (" + gpmapper(this.lengthbr) + ")";
    }
    else
    {
    	return (Math.round((this.lengthbr)*10000)/10.0).toString()  +
    	" Thousand years ago (" + gpmapper(this.lengthbr) + ")";
    }
};

midnode.prototype.datemed = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() + " Million years ago";
    }
    else if (this.lengthbr >1)
    {
    	return (Math.round((this.lengthbr)*100)/100.0).toString()  + " Million years ago";
    }
    else
    {
    	return (Math.round((this.lengthbr)*10000)/10.0).toString()  + " Thousand years ago";
    }
};

midnode.prototype.datepart = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() + " Mya";
    }
    else if (this.lengthbr >1)
    {
    	return (Math.round((this.lengthbr)*100)/100.0).toString()  + " Mya";
    }
    else
    {
    	return (Math.round((this.lengthbr)*10000)/10.0).toString()  + " Kya";
    }
};

// definition of geological periods
function gpmapper(datein)
{
	if (datein > 419.2) {
		return ("pre Devonian");
	} else if (datein > 359.2) {
		return ("Devonian");
	} else if (datein > 298.9) {
		return ("Carboniferous");
	} else if (datein > 252.2) {
		return ("Permian");
	} else if (datein > 203.6) {
		return ("Triassic");
	} else if (datein > 150.8) {
		return ("Jurassic");
	} else if (datein > 70.6) {
		return ("Cretaceous");
	} else if (datein > 28.4) {
		return ("Paleogene");
	} else if (datein > 3.6) {
		return ("Neogene");
	} else {
		return ("Quaternary");
	}
}



midnode.prototype.iprimaryname = function()
{
    if (commonlabels)
    {
        if (this.child1)
        {
            return(metadata.node_meta[this.metacode][metadata_cnp_node-1]);
        }
        else
        {
            return(metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1]);
        }
    }
    else if (this.child1)
    {
    	return(this.name1);
    }
    else
    {
    	return(this.name2 + " " + this.name1);
    }
};

midnode.prototype.isecondaryname = function()
{
    if (commonlabels)
    {
        if (this.child1)
        {
            return(this.name1);
        }
        else
        {
            return(this.name2 + " " + this.name1);
        }
    }
    else
    {
        if (this.child1)
        {
            if (metadata.node_meta[this.metacode][metadata_cnp_node-1] != "")
            {
                return(metadata.node_meta[this.metacode][metadata_cnp_node-1]);
            }
            else
            {
                return null;
            }
            
        }
        else
        {
            if (metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1] != "")
            {
                return(metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1]);
            }
            else
            {
                return null;
            }
        }
    }
};


// TEXT DRAWING TOOLS

// text tool
function autotext(initalic,texttodisp,textx,texty,textw,defpt)
{
    var drawntext = false;
    if (defpt > mintextsize)
    {
        // draws text within a bounding width but only if possible with font size > 1
        // if possible uses the defpt font size and centres the text in the box
        // otherwise fills the box
        context.textBaseline = 'middle';
        context.textAlign = 'left';
        if (initalic)
        {
            context.font = 'italic ' + (defpt).toString() + 'px '+fonttype;
        }
        else
        {
            context.font = (defpt).toString() + 'px '+ fonttype;
        }
        var testw = context.measureText(texttodisp).width;
        if (testw > textw)
        {
            if ((defpt*textw/testw) > mintextsize)
            {
                if (initalic)
                {
                    context.font = 'italic ' + (defpt*textw/testw).toString() + 'px '+fonttype;
                }
                else
                {
                    context.font = (defpt*textw/testw).toString() + 'px '+fonttype;
                }
                context.fillText  (texttodisp , textx - textw/2.0,texty);
                drawntext = true;
            }
        }
        else
        {
            context.fillText  (texttodisp , textx - (testw)/2.0,texty);
            drawntext = true;
        }
    }
    return drawntext;
}

function autotext2(initalic,texttodisp,textx,texty,textw,defpt)
{
    var drawntext = false;
    // x and y are the centres
    if (defpt >mintextsize)
    {
        
        // draws text within a bounding width but only if possible with font size > 1
        // if possible uses the defpt font size and centres the text in the box
        // otherwise fills the box
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        if (initalic)
        {
            context.font = 'italic ' + (defpt).toString() + 'px '+fonttype;
        }
        else
        {
            context.font = (defpt).toString() + 'px '+ fonttype;
        }
        
        var centerpoint = (texttodisp.length)/3;
        var splitstr = texttodisp.split(" ");
        var print1 = " ";
        var print2 = " ";
        
        if (splitstr.length == 1)
        {
            drawntext = autotext(initalic,texttodisp,textx,texty,textw,defpt);
        }
        else
        {
            if (splitstr.length == 2)
            {
                print1  = (splitstr[0]);
                print2  = (splitstr[1]);
            }
            else
            {
                for (i = (splitstr.length -1) ; i >= 0 ; i--)
                {
                    if ((print2.length)>centerpoint)
                    {
                        print1  = (" " + splitstr[i] + print1);
                    }
                    else
                    {
                        print2 = (" " + splitstr[i] + print2);
                    }
                }
            }
            var testw = context.measureText(print2).width;
            if (testw < (context.measureText(print1).width))
            {
                testw = context.measureText(print1).width
            }
            if (testw > textw)
            {
                if ((defpt*textw/testw) > mintextsize)
                {
                    
                    if (initalic)
                    {
                        context.font = 'italic ' + (defpt*textw/testw).toString() + 'px '+fonttype;
                    }
                    else
                    {
                        context.font = (defpt*textw/testw).toString() + 'px '+fonttype;
                    }
                    
                    context.fillText  (print1 , textx ,texty-defpt*textw/testw/1.7);
                    context.fillText  (print2 , textx ,texty+defpt*textw/testw/1.7);
                    drawntext = true;
                }
            }
            else
            {
                context.fillText  (print1 , textx ,texty-defpt/1.7);
                context.fillText  (print2 , textx ,texty+defpt/1.7);
                drawntext = true;
            }
        }
        
    }
    return drawntext;
}


function autotext3(initalic,texttodisp,textx,texty,textw,defpt)
{
    var drawntext = false;
    // x and y are the centres
    if (defpt >mintextsize)
    {
        
        // draws text within a bounding width but only if possible with font size > 1
        // if possible uses the defpt font size and centres the text in the box
        // otherwise fills the box
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        if (initalic)
        {
            context.font = 'italic ' + (defpt).toString() + 'px '+fonttype;
        }
        else
        {
            context.font = (defpt).toString() + 'px '+ fonttype;
        }
        
        var centerpoint = (texttodisp.length)/4;
        var splitstr = texttodisp.split(" ");
        var print1 = " ";
        var print2 = " ";
        var print3 = " ";
        
        if (splitstr.length == 1)
        {
            drawntext = autotext(initalic,texttodisp,textx,texty,textw,defpt*3);
        }
        else
        {
            if (splitstr.length == 2)
            {
                drawntext = autotext2(initalic,texttodisp,textx,texty,textw,defpt*2);
            }
            else
            {
                if (splitstr.length == 3)
                {
                    print1  = (splitstr[0]);
					print2  = (splitstr[1]);
                    print3  = (splitstr[2]);
                }
                else
                {
                    for (var ii = (splitstr.length -1) ; ii >= 0 ; ii--)
                    {
                        if ((print3.length)>=centerpoint)
                        {
                            if ((print2.length)>=centerpoint)
                            {
                                print1  = (" " + splitstr[ii] + print1);
                            }
                            else
                            {
                                print2 = (" " + splitstr[ii] + print2);
                            }
                        }
                        else
                        {
                            print3 = (" " + splitstr[ii] + print3);
                        }
                    }
                }
            }
            
            if ((print3.length >= (print1.length+print2.length))||(print1.length >= (print3.length+print2.length)))
            {
                drawntext = autotext2(initalic,texttodisp,textx,texty,textw,defpt);
            }
            else
            {
                
                var testw = context.measureText(print2).width;
                if (testw < (context.measureText(print1).width))
                {
                    testw = context.measureText(print1).width;
                }
                if (testw < (context.measureText(print3).width))
                {
                    testw = context.measureText(print3).width;
                }
                if (testw > textw)
                {
                    if ((defpt*textw/testw) > mintextsize)
                    {
                        
                        if (initalic)
                        {
                            context.font = 'italic ' + (defpt*textw/testw).toString() + 'px '+fonttype;
                        }
                        else
                        {
                            context.font = (defpt*textw/testw).toString() + 'px '+fonttype;
                        }
                        
                        context.fillText  (print1 , textx ,texty-defpt*textw/testw*1.2);
                        context.fillText  (print2 , textx ,texty);
                        context.fillText  (print3 , textx ,texty+defpt*textw/testw*1.2);
                        drawntext = true;
                    }
                }
                else
                {
                    context.fillText  (print1 , textx ,texty-defpt*1.2);
                    context.fillText  (print2 , textx ,texty);
                    context.fillText  (print3 , textx ,texty+defpt*1.2);
                    drawntext = true;
                }
            }
        }
        
    }
    return drawntext;
}






/**********************************************\
 *
 *      Block : Draw Procedures
 *
 \**********************************************/


/* basic drawing subroutines */

function drawArc(x,y,r,sAngle,eAngle,counterclockwise,color) {
	context.fillStyle = color;
    context.beginPath();
    context.arc(x,y,r,sAngle,eAngle,counterclockwise);
    context.fill();
};

/* drawing the tree: main routine (not signposts) */


midnode.prototype.draw = function() {
    
	this.ing = false;
	var x,y,r;
	if (this.rvar) {
		x = this.xvar;
		y = this.yvar;
		r = this.rvar;
	}
	if (this.shouldDrawChildren()) {
		this.drawChildren();
	}
	if (this.shouldDrawBranch()) {
		this.drawBranch();
	}
	
	if (this.dvar && (this.lengthbr > timelim)) {
		if (this.shouldDrawFakeLeaf()) {
			this.drawFakeLeaf();
		} else if (this.ing && this.child1) { 
			this.drawInternal();
		} else if (this.ing) {
			this.drawLeaf();
		}
	}
	
	//used during growing animation
	if (this.dvar && (this.lengthbr <= timelim)) {
		if (this.richness_val > 1) {
			this.growthleaflogic(x + ((r) * (this.arcx)), y + (r)
                                 * (this.arcy), r * leafmult * 0.5 * 0.4, this.arca);
		} else {
			this.drawLeaf();
		}
	}
    
};

midnode.prototype.drawChildren = function() {
	if ((this.child1.richness_val) >= (this.child2.richness_val)) {
		this.child1.draw();
		this.child2.draw();
	} else {
		this.child2.draw();
		this.child1.draw();
	}
};

midnode.prototype.shouldDrawChildren = function() {
	if (this.dvar && this.child1 && this.lengthbr > timelim)
		return true;
	else
		return false;
};

midnode.prototype.shouldDrawBranch = function() {
	if (this.dvar && ((this.gvar) && ((polytype != 2) || (this.npolyt))))
		return true;
	else
		return false;
};

midnode.prototype.shouldDrawFakeLeaf = function() {
	var r;
	if (this.rvar) {
		r = this.rvar;
	}
	if ((this.richness_val > 1) && (r <= threshold) && (timelim <= 0)) {
		return true;
	}
	return false;
};

midnode.prototype.drawFakeLeaf = function() {
	var r;
	var x;
	var y;
	if (this.rvar) {
		x = this.xvar;
		y = this.yvar;
		r = this.rvar;
	}
	// we are drawing a fake leaf - ing is irrelevant as this is instead of
	// drawing the children
	this.fakeleaflogic(x + ((r) * (this.nextx1)), y + (r) * (this.nexty1), r
                       * leafmult * 0.75 * 0.4, this.arca);
};

midnode.prototype.drawLeaf = function() {
	var x;
	var y;
	var r;
	
	if (this.rvar) {
		x = this.xvar;
		y = this.yvar;
		r = this.rvar;
	}
	// we are drawing a leaf
	this.tipleaflogic(x + ((r) * this.arcx), y + (r) * this.arcy, r * this.arcr, this.arca);
	if ((r * leafmult) > threshold * 10) {
        if ( r > thresholdtxt*85){
            this.drawLeafTextDetail(x + r * this.arcx, y + r * this.arcy, r * this.arcr *0.77);
        }
        else
        {
            if ( r > thresholdtxt*15)
            {
                this.drawLeafTextRough(x + r * this.arcx, y + r * this.arcy, r * this.arcr *0.77);
            }
        }
	}
};

midnode.prototype.drawSignPost = function() {
	if (this.shouldDrawSignPost()) {
		this.drawSPofThisNode();
	} else if (this.shouldChildrenDrawSignPost()) {
		this.child1.drawSignPost();
		this.child2.drawSignPost();
	}
};

midnode.prototype.shouldDrawSignPost = function() {
	var r;
	if (this.rvar) {
		r = this.rvar;
	}
	if (this.dvar && this.richness_val > 1 && drawsignposts && this.child1) {
		if (((thresholdtxt * 35 < r * (this.hxmax - this.hxmin)) && (r <= thresholdtxt * 50))
            || (this.lengthbr <= timelim)) {
			if ((this.name1 && (!commonlabels))
                || (metadata.node_meta[this.metacode][metadata_cnp_node-1] && (commonlabels))) {
				return true;
			}
		}
	}
	return false;
};

midnode.prototype.shouldChildrenDrawSignPost = function() {
	var r;
	if (this.rvar) {
		r = this.rvar;
	}
	if (this.dvar && this.richness_val > 1 && drawsignposts && this.child1
        && this.lengthbr > timelim) {
		if (((thresholdtxt * 35 < r * (this.hxmax - this.hxmin)) && (r <= thresholdtxt * 50))
            || (this.lengthbr <= timelim)) {
			if (!(this.name1 && (!commonlabels))
                && !(metadata.node_meta[this.metacode][metadata_cnp_node-1] && (commonlabels)))
				return true;
		} else {
			return true;
		}
	}
	return false;
};

/* CORE DRAWING ROUTINES */

function infobar()
{
	document.getElementById("textout").innerHTML = '';
	if (growing || growingpause || (infotype != 0)|| buttonoptions != 0)
	{
		document.getElementById("textout").style.display = '';
	}
	else
	{
		document.getElementById("textout").style.display = 'none';
	}
	
	var toalter = "textout";
	if (buttonoptions ==5)
	{
		toalter = "viewtxt2";
	}
	
	
	if (buttonoptions == 5 || buttonoptions == 0)
	{
        if (infotype == 3)
        {
            var multret = ws/wsinit/fulltree.mult();
            //multret = Math.log(multret)/Math.log(10);
            
            if (multret<2500)
            {
                document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >Current zoom level is ' + (Math.round(multret*10.0)/10.0).toString() + ' times magnification </FONT> ');
            }
            else
            {
                if (multret<1500000)
                {
                    document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >Current zoom level is ' + (Math.round(multret/1000.0)).toString() + ' thousand times magnification </FONT> ');
                }
                else
                {
                    document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >Current zoom level is ' + (Math.round(multret/100000.0)/10.0).toString() + ' million times magnification </FONT> ');
                }
                
            }
            
        }
        else
        {
            if (infotype == 4)
            {
                var multret = ws/wsinit/fulltree.mult();
                var mret = multret*widthres/8661.4;
                if (mret<1.5)
                {
                    document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >The complete image now measures at least ' + (Math.round(mret*1000.0)/10.0).toString() + ' Centimeters across </FONT>');
                }
                else
                {
                    if (mret>1500)
                    {
                        document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >The complete image now measures at least ' + (Math.round(mret/100)/10.0).toString() + ' Kilometers across </FONT>');
                    }
                    else
                    {
                        document.getElementById(toalter).innerHTML= ('<FONT COLOR="FFFFFF" >The complete image now measures at least ' + ((Math.round(mret*10.0))/10.0).toString() + ' Meters across </FONT>');
                    }
                    
                }
                
            }
            else
            {
                
                document.getElementById("viewtxt2").style.display = 'none';
            }
        }
	}
	
    toalter = "growtxt";
	if (buttonoptions != 2)
	{
		toalter = "textout";
	}
	
	if (buttonoptions == 2 || buttonoptions == 0)
	{
		if ((growingpause || growing))
		{
            if (timelim >= 0 )
            {
                if (timelim >10)
                {
                    document.getElementById(toalter).innerHTML = '<FONT COLOR="FFFFFF" >' + (Math.round(timelim*10)/10.0).toString() + ' Million years ago - ' + gpmapper(timelim) + ' Period </FONT>';
                }
                else
                {
                    if (timelim >1)
                    {
                        document.getElementById(toalter).innerHTML =  '<FONT COLOR="FFFFFF" >' + (Math.round(timelim*100)/100.0).toString() + ' Million years ago - ' + gpmapper(timelim) + ' Period </FONT>';
                    }
                    else
                    {
                        document.getElementById(toalter).innerHTML =  '<FONT COLOR="FFFFFF" >' + (Math.round(timelim*10000)/10.0).toString() + ' Thousand years ago - ' + gpmapper(timelim) + ' Period </FONT>';
                    }
                }
                if (growingpause)
                {
                    document.getElementById(toalter).innerHTML += '<FONT COLOR="FFFFFF" >  (paused) </FONT>';
                }
                
            }
		}
		else
		{
			if (buttonoptions == 2 )
			{
				document.getElementById("growtxt").innerHTML = '<FONT COLOR="FFFFFF" > Present day </FONT>';
			}
		}
	}
}

function drawopen()
{
    var rect;
    
    context.fillStyle = popupbox_col;
    
    context.beginPath();
    context.lineTo( myCanvas.width -375 , 40 );
    context.lineTo( myCanvas.width -375, 10);
    context.lineTo( myCanvas.width -187, 10 );
    context.lineTo( myCanvas.width -187, 40 );
    context.fill();
    
    context.beginPath();
    context.lineTo( myCanvas.width -177 , 40 );
    context.lineTo( myCanvas.width -177, 10);
    context.lineTo( myCanvas.width -10, 10 );
    context.lineTo( myCanvas.width -10, 40 );
    context.fill();
    
    rect = document.getElementById("help_icon").getBoundingClientRect();
    var temp_tpos = (rect.right + rect.left)/2-myCanvas.offsetLeft;
    
    context.beginPath();
    context.fillStyle = popupbox_col;
    context.lineTo( temp_tpos+10 , 10 );
    context.lineTo( temp_tpos-10, 10);
    context.lineTo( temp_tpos, 0 );
    context.fill();
    
    rect = document.getElementById("zoomin_icon").getBoundingClientRect();
    var temp_tpos = (rect.right + rect.left)/2-myCanvas.offsetLeft;
    
    context.beginPath();
    context.fillStyle = popupbox_col;
    context.lineTo( temp_tpos+10 , 10 );
    context.lineTo( temp_tpos-10, 10);
    context.lineTo( temp_tpos, 0 );
    context.fill();
    
    rect = document.getElementById("zoomout_icon").getBoundingClientRect();
    var temp_tpos = (rect.right + rect.left)/2-myCanvas.offsetLeft;
    
    context.beginPath();
    context.fillStyle = popupbox_col;
    context.lineTo( temp_tpos+10 , 10 );
    context.lineTo( temp_tpos-10, 10);
    context.lineTo( temp_tpos, 0 );
    context.fill();
    
    rect = document.getElementById("about_icon").getBoundingClientRect();
    var about_icon_pos = Math.max(rect.right-myCanvas.offsetLeft,280);
    
    context.beginPath();
    context.lineWidth = 1;
    context.lineTo( 10 , 40 );
    context.lineTo( 10 , 10);
    context.lineTo( about_icon_pos, 10 );
    context.lineTo( about_icon_pos, 40 );
    context.fillStyle = popupbox_col;
    context.fill();
    
    rect = document.getElementById("OZlogo").getBoundingClientRect();
    var OZlogo_pos = (rect.right + rect.left)/2-myCanvas.offsetLeft;
    context.beginPath();
    context.fillStyle = popupbox_col;
    context.lineTo( OZlogo_pos+10, 10 );
    context.lineTo( OZlogo_pos-10, 10);
    context.lineTo( OZlogo_pos, 0 );
    context.fill();
    
    context.fillStyle = popupbox_txtcol;
    autotext(false, "Click for a tutorial" , myCanvas.width -93, 25 , 250 , 14);
    autotext(false, "Click or scroll to zoom" , myCanvas.width -281, 25 , 250 , 14);
    if (sitename_URL)
    {
        autotext(false, "Links to OneZoom and " + sitename_URL , (10+about_icon_pos)/2, 25 , 250 , 14);
        rect = document.getElementById("logo1").getBoundingClientRect();
        var OZlogo_pos = (rect.right + rect.left)/2-myCanvas.offsetLeft;
        context.beginPath();
        context.fillStyle = popupbox_col;
        context.lineTo( OZlogo_pos+10, 10 );
        context.lineTo( OZlogo_pos-10, 10);
        context.lineTo( OZlogo_pos, 0 );
        context.fill();
        
    }
    else
    {
        autotext(false, "See more trees on OneZoom" , (10+about_icon_pos)/2, 25 , 250 , 14);
    }
    
}

function drawUsingImage() {
    	context.clearRect(0,0,widthres,heightres);
	  context.drawImage(preload_image,0,0,widthres, heightres); // Or at whatever offset you like
      var title;
      if (animation_status == -1 || animation_status == 2) {
          title = "Click to explore and scroll to zoom";
      } else if (animation_status == 0) {
          title = "Click to see animation";
          if (typeof front_page_bottom_text != 'undefined')
              title = front_page_bottom_text;
      } else {
          return;
      }
	  
      context.fillStyle = 'rgba(0,0,0,0.75)';
      if ($('#myCanvas').attr('data_status') == 'embedded_front')
          context.fillRect(0,heightres - 40, widthres, heightres);
      if ($('#myCanvas').attr('data_status') == 'embedded')
          context.fillRect(0,heightres - 70, widthres, heightres);
      context.fillStyle = 'rgba(255,255,255,1)';
    
      if ($('#myCanvas').attr('data_status') == 'embedded_front')
          autotext(false, title, widthres*0.5, heightres - 20, widthres*0.7, 30)
          if ($('#myCanvas').attr('data_status') == 'embedded')
              autotext(false, title, widthres*0.5, heightres - 50, widthres*0.7, 30)			
}


function draw2()
{
	
	if (typeof use_image_before_loading != 'undefined' && use_image_before_loading == true) {
		drawUsingImage();
		return;
	}
	
    if (!loadingcontent)
    {
        context.clearRect(0,0,widthres,heightres);
		
        if (backgroundcolor)
        {
            context.fillStyle = backgroundcolor;
            context.fillRect(0,0,widthres,heightres);
        }
        
        
        mouse_on_url = null;
        mouse_on_url_new = true;
        mouse_on_url_valid = false;
        fulltree.drawreg(xp,yp,220*ws);
        if ((((ws > 100*latest_ws)||(ws < 0.01*latest_ws))&&(!mousehold))) // possibly change these values
        {
            fulltree.reanchor();
            fulltree.drawreg(xp,yp,220*ws);
            latest_ws = ws;
            if ((introlock & (viewtype !=2))||(flying & (viewtype !=2))) { // BE VERY CAREFUL HERE
                // this line manages one of the two types of flight animation when the tree is rerooted
                continue_flyB();
            }
        }
        
        fulltree.draw();
        fulltree.drawSignPost();
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = outlineboxcolor;
        context.moveTo( 0 , 0 );
        var myCanvas = document.getElementById("myCanvas");
        context.lineTo( myCanvas.width , 0 );
        context.lineTo( myCanvas.width , myCanvas.height );
        context.lineTo( 0 , myCanvas.height );
        context.lineTo( 0 , 0 );
        context.stroke();
        infobar();
        
        if (justopened &&
    		($('#myCanvas').attr('data_status') != 'embedded'
             && $('#myCanvas').attr('data_status') != 'embedded_front')
            && $('#myCanvas').attr('data_status') != 'front_iframe')
        {
            drawopen();
        }
        
        if (popuptext)
        {
            context.beginPath();
            context.lineWidth = 1;
            context.lineTo( myCanvas.width -375 , 40 );
            context.lineTo( myCanvas.width -375, 10);
            context.lineTo( myCanvas.width -10, 10 );
            context.lineTo( myCanvas.width -10, 40 );
            context.fillStyle = popupbox_col;
            context.fill();
            context.fillStyle = popupbox_txtcol;
            autotext(false, popuptext , myCanvas.width -192, 25 , 250 , 14);
        }
        
        if (popuptext2)
        {
            var rect = document.getElementById("about_icon").getBoundingClientRect();
            var about_icon_pos = Math.max(rect.right-myCanvas.offsetLeft,280);
            
            context.beginPath();
            context.lineWidth = 1;
            context.lineTo( 10 , 40 );
            context.lineTo( 10 , 10);
            context.lineTo( about_icon_pos, 10 );
            context.lineTo( about_icon_pos, 40 );
            context.fillStyle = popupbox_col;
            context.fill();
            context.fillStyle = popupbox_txtcol;
            autotext(false, popuptext2 , (10+about_icon_pos)/2, 25 , 250 , 14);
        }
        
        if (in_about)
        {
            about_draw();
        }
        
        
        if (debugtext)
        {
            context.fillStyle = loading_txtcol;
            context.font = '50px sans-serif';
            context.textAlign = 'center';
            context.fillText  (debugtext, widthres/2,heightres/2, widthres/2);
        }
        
        if (($('#myCanvas').attr('data_status') != 'embedded')
    		&& $('#myCanvas').attr('data_status') != 'embedded_front') return;
        var title;
        if (animation_status == -1 || animation_status == 2) {
            title = "Click to explore and scroll to zoom";
        } else if (animation_status == 0) {
            title = "Click to see animation";
            if (typeof front_page_bottom_text != 'undefined')
                title = front_page_bottom_text;
        } else {
            return;
        }
        
        context.fillStyle = 'rgba(0,0,0,0.75)';
        if ($('#myCanvas').attr('data_status') == 'embedded_front')
            context.fillRect(0,heightres - 40, widthres, heightres);
        if ($('#myCanvas').attr('data_status') == 'embedded')
            context.fillRect(0,heightres - 70, widthres, heightres);
        context.fillStyle = 'rgba(255,255,255,1)';
        
        //    context.fillStyle = 'rgba(255,255,255,0.5)';
        //    context.fillRect(0,heightres * 0.83, widthres, heightres);
        //    context.fillStyle = '000000';
        if ($('#myCanvas').attr('data_status') == 'embedded_front')
            autotext(false, title, widthres*0.5, heightres - 20, widthres*0.7, 30)
            if ($('#myCanvas').attr('data_status') == 'embedded')
                autotext(false, title, widthres*0.5, heightres - 50, widthres*0.7, 30)
    }
}
    
var in_about = false;
var about_upto = null;
var about_target = null;
var about_anim;

function AboutOZ()
{
    about_target = 0;
    for (i = 0 ; i < creditsText.length ; i ++)
    {
        about_target += creditsText[i][0];
    }
    about_target = about_target * about_height * 1.5;
    
    popup_out();
    if (in_about)
    {
        in_about = false;
        introlock = false;
        clearTimeout(about_anim);
        draw2();
    }
    else
    {
        about_upto = myCanvas.height*0.25;
        in_about = true;
        introlock = true;
        about_draw_anim();
    }
    
}

function about_draw_anim()
{
    if (about_upto >= (myCanvas.height*0.25-about_target))
    {
        draw2();
        about_upto -= credits_roll_speed;
        about_anim = setTimeout('about_draw_anim()',33);
    }
    else
    {
        clearTimeout(about_anim);
        in_about = false;
        introlock = false;
        draw2();
    }
}

function about_draw()
{
    context.fillStyle = backgroundcolor;
    context.fillRect(0,0,widthres,heightres);
    
    var offset_about = about_upto;
    
    context.fillStyle = loading_txtcol;
    for (i = 0 ; i < creditsText.length ; i ++)
    {
        if (creditsText[i][1])
        {
            autotext(false, creditsText[i][1] , myCanvas.width / 2, offset_about , myCanvas.width *0.8 , about_height*creditsText[i][0]);
        }
        offset_about += about_height*creditsText[i][0]*1.5
    }
    
}



function draw_loading()
{
    
	infobar();
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
	context.lineWidth = 1;
	context.strokeStyle = outlineboxcolor;
	context.moveTo( 0 , 0 );
	var myCanvas = document.getElementById("myCanvas");
	context.lineTo( myCanvas.width , 0 );
	context.lineTo( myCanvas.width , myCanvas.height );
	context.lineTo( 0 , myCanvas.height );
	context.lineTo( 0 , 0 );
	context.stroke();
    
	context.beginPath();
	context.textBaseline = 'middle';
	context.textAlign = 'left';
	
	context.fillStyle = loading_txtcol;
	context.font = '50px sans-serif';
	context.textAlign = 'center';
	context.fillText  ('Loading', widthres/2,heightres/2, widthres/2);
	return true;
    
}

/* draw sign post */

midnode.prototype.drawSPofThisNode = function() {
	var x;
	var y;
	var r;
	if (this.rvar) {
		x = this.xvar;
		y = this.yvar;
		r = this.rvar;
	}
    
    drawArc(x + r * (this.hxmax + this.hxmin) / 2, y + r
			* (this.hymax + this.hymin) / 2, r
			* ((this.hxmax - this.hxmin) * sign_background_size), 0, Math.PI * 2, true, signpost_col_def);
    
    var name;
	if (this.name1 && !commonlabels)
		name = this.name1;
	else if((metadata.node_meta[this.metacode][metadata_cnp_node-1]) && commonlabels)
		name = metadata.node_meta[this.metacode][metadata_cnp_node-1];
    
	context.fillStyle = signpost_txtcol_def;
    
	autotext3(true, name, x + r * (this.hxmax + this.hxmin) / 2, y + r
              * (this.hymax + this.hymin) / 2, r * (this.hxmax - this.hxmin)
              * sign_text_size * 2.0, r * ((this.hxmax - this.hxmin) * sign_text_size * 2.0));
    
}

/* draw branch */

midnode.prototype.drawBranch = function() {
	var x;
	var y;
	var r;
	if (this.rvar) {
		x = this.xvar;
		y = this.yvar;
		r = this.rvar;
	}
    
	this.ing = true;
	context.lineCap = "round";  // puts cap on leaf
	context.lineWidth = r * (this.bezr);
	context.beginPath();
	context.moveTo(x + r * (this.bezsx), y + r * this.bezsy);
	context.bezierCurveTo(x + r * (this.bezc1x), y + r * (this.bezc1y), x + r
                          * (this.bezc2x), y + r * (this.bezc2y), x + r * (this.bezex), y + r
                          * (this.bezey));
	context.strokeStyle = this.branchcolor();
	context.stroke();
    var dohighlight = false;
    if (this.should_highlight1()||this.should_highlight2()) {
        dohighlight = true;
    }
    
    if (dohighlight)
    {
        var templw1 = 0.2;
        var templw2 = 0.2;
        if (this.should_highlight1()&&this.should_highlight2())
        {
            templw1 = 0.2;
            templw2 = 0.1;
        }
        
        if (this.should_highlight1())
        {
            context.strokeStyle = this.highlightcolor();
            context.lineWidth = r * (this.bezr) * templw1;
            context.beginPath();
            context.moveTo(x + r * (this.bezsx), y + r * this.bezsy);
            context.bezierCurveTo(x + r * (this.bezc1x), y + r * (this.bezc1y), x
                                  + r * (this.bezc2x), y + r * (this.bezc2y), x + r
                                  * (this.bezex), y + r * (this.bezey));
            context.stroke();
        }
        if (this.should_highlight2())
        {
            context.strokeStyle = this.highlightcolor2();
            context.lineWidth = r * (this.bezr) * templw2;
            context.beginPath();
            context.moveTo(x + r * (this.bezsx), y + r * this.bezsy);
            context.bezierCurveTo(x + r * (this.bezc1x), y + r * (this.bezc1y), x
                                  + r * (this.bezc2x), y + r * (this.bezc2y), x + r
                                  * (this.bezex), y + r * (this.bezey));
            context.stroke();
        }
    }
};

/* draw interior node */

midnode.prototype.drawInternal = function()
{
	var x;
	var y;
	var r;
    if (this.rvar) {
        x = this.xvar;
        y = this.yvar;
        r = this.rvar;
    }
    
    // if we are highlighting search results
    var dohighlight = false;
    if (this.should_highlight1()||this.should_highlight2()) {
        dohighlight = true;
    }
    if (dohighlight)
    {
		context.beginPath();
		context.arc(x + r * (this.arcx), y + r * this.arcy, r * this.arcr, 0, Math.PI * 2, true);
		context.fillStyle = this.branchcolor();
		context.fill(); // draw a circle at the end of the branch to cover up end of hightlight in branch
	}
    
    // internal text drawing starts here
	if ((this.npolyt) || (polytype == 3)) {
        // either we're drawing text regardless of polytomy status or it isn't a polytomy
        // we are drawing proper text in the node if it's large enough
        if (r > thresholdtxt * 50) {
            this.drawInternalCircle(x + r * (this.arcx), y + r * this.arcy, r * this.arcr , dohighlight);
            if (r > thresholdtxt * 280) {
                this.drawInternalTextDetail( x + r * (this.arcx), y + r * this.arcy, r * this.arcr * (1 - partl2) );
            } else {
                this.drawInternalTextRough( x + r * (this.arcx), y + r * this.arcy, r * this.arcr * (1 - partl2) );
            }
        }
        else
        {
            if ((dohighlight)&& ((r * this.arcr * 2) > 3)) {
				this.drawInternalHighlight(x + r * (this.arcx),y+ r * this.arcy,r* this.arcr,this.arca);
            }
        }
	} else {
        
        if (dohighlight) {
            this.drawInternalHighlight(x + r * (this.arcx),y+ r * this.arcy,r* this.arcr,this.arca);
        }
		// polytomy node filling
		if (polytype == 1) {
			context.beginPath();
			context.arc(x + r * (this.arcx), y + r * this.arcy, r * this.arcr, 0, Math.PI * 2, true);
			context.fillStyle = this.barccolor();
			context.fill();
		}
	}
}

midnode.prototype.drawInternalCircle = function(x,y,r,highlighted) {
    context.beginPath();
    context.arc(x , y , r * (1 - partl2 / 2.0), 0, Math.PI * 2, true);
    context.lineWidth = r * partl2;
    if (highlighted) {
        if (this.should_highlight1())
        {
            context.strokeStyle = this.highlightcolor();
        }
        else
        {
            context.strokeStyle = this.highlightcolor2();
        }
    } else {
        context.strokeStyle = this.barccolor();
    }
    context.stroke();
    if (highlighted&&(this.should_highlight1()&&this.should_highlight2()))
    {
        context.beginPath();
        context.arc(x , y , r * (1 - partl2 * 0.75), 0, Math.PI * 2, true);
        context.lineWidth = r * partl2/2.0;
        context.strokeStyle = this.highlightcolor2();
        context.stroke();
    }
};

midnode.prototype.drawInternalHighlight = function(x,y,r,angle) {
    
    
    
    if (int_highlight_type == 2)
    {
        var tempsinpre = Math.sin(angle);
        var tempcospre = Math.cos(angle);
        var tempsin90pre = Math.sin(angle + Math.PI/2.0);
        var tempcos90pre = Math.cos(angle + Math.PI/2.0);
        context.beginPath();
        context.lineTo( x + 0.4*r*tempcospre, y + 0.4*r*tempsinpre);
        context.lineTo( x - 1*r*tempcospre+ 0.7*r*tempcos90pre, y - 1*r*tempsinpre+ 0.7*r*tempsin90pre);
        context.lineTo( x - 1*r*tempcospre- 0.7*r*tempcos90pre, y - 1*r*tempsinpre- 0.7*r*tempsin90pre);
        context.lineTo( x + 0.4*r*tempcospre , y + 0.4*r*tempsinpre);
        context.fillStyle = this.branchcolor();
        context.fill();
        if (this.should_highlight1())
        {
            context.fillStyle = this.highlightcolor();
        }
        else
        {
            context.fillStyle = this.highlightcolor2();
        }
        context.fill();
        
        
        if (this.should_highlight1() && this.should_highlight2())
        {
            context.beginPath();
            context.lineTo( x + 0.17*r*tempcospre, y + 0.17*r*tempsinpre);
            context.lineTo( x - 1*r*tempcospre+ 0.55*r*tempcos90pre, y - 1*r*tempsinpre+ 0.55*r*tempsin90pre);
            context.lineTo( x - 1*r*tempcospre- 0.55*r*tempcos90pre, y - 1*r*tempsinpre- 0.55*r*tempsin90pre);
            context.lineTo( x + 0.17*r*tempcospre , y + 0.17*r*tempsinpre);
            context.fillStyle = this.highlightcolor2();
            context.fill();
        }
        
    } else
    {
        context.beginPath();
        context.arc(x , y , r * 0.5, 0, Math.PI * 2, true);
        if (this.should_highlight1())
        {
            context.fillStyle = this.highlightcolor();
        }
        else
        {
            context.fillStyle = this.highlightcolor2();
        }
        context.fill();
        if (this.should_highlight1()&&this.should_highlight2())
        {
            context.beginPath();
            context.arc(x , y , r * 0.25, 0, Math.PI * 2, true);
            context.fillStyle = this.highlightcolor2();
            context.fill();
        }
    }
    
    
    
    
    
};


/* draw leaf */

//  there are three types of leaves that are drawn by the code
// 1.) Fake leaf: where the tree continues but is smaller than the size
// threshold it is sometimes
// asthetically pleasing to draw a leaf there, especially if the threshold
// is a few pixels wide. If the threshold is much smaller it does not matter if
// the facke leaf is drawn or not.
// 2.) Growth leaf: where growing animations are taking place there should
// be leaves on the tips of the branches
// 3.) Tip leaf: these are the classic leaves in which species names are put
// - these are the tips of the complete tree.
// all leaf classes can be defined with custom logic in the three scripts
// below

midnode.prototype.fakeleaflogic = function(x, y, r, angle) {
	context.strokeStyle = this.leafcolor2();
	context.fillStyle = this.leafcolor1();
	if (leaftype == 1) {
		drawleaf1(x, y, r);
	} else {
		drawleaf2(x, y, r, angle);
	}
};

midnode.prototype.growthleaflogic = function(x, y, r, angle) {
	context.strokeStyle = this.leafcolor2();
	context.fillStyle = this.leafcolor1();
	if (leaftype == 1) {
		drawleaf1(x, y, r);
	} else {
		drawleaf2(x, y, r, angle);
	}
};

midnode.prototype.tipleaflogic = function(x, y, r, angle) {
	context.strokeStyle = this.leafcolor2();
	context.fillStyle = this.leafcolor1();
	if (leaftype == 1) {
		drawleaf1(x, y, r);
	} else {
		drawleaf2(x, y, r, angle);
	}
};

function drawleaf1(x,y,r)
{
	context.beginPath();
	context.arc(x,y,r*(1-partl2*1.5),0,Math.PI*2,true);
	context.lineWidth = r*(partl2*3);
	context.stroke();
	context.fill();
}

function drawleaf2(x,y,r,angle)
{
	var tempsinpre = Math.sin(angle);
	var tempcospre = Math.cos(angle);
	var tempsin90pre = Math.sin(angle + Math.PI/2.0);
	var tempcos90pre = Math.cos(angle + Math.PI/2.0);
	
	var startx = x-r*(1-0.1*1)*tempcospre;
	var endx = x+r*(1-0.1*1)*tempcospre;
	var starty = y-r*(1-0.1*1)*tempsinpre;
	var endy = y+r*(1-0.1*1)*tempsinpre;
	var midy = (endy-starty)/3;
	var midx = (endx-startx)/3;
	
	context.beginPath();
	context.moveTo(startx,starty);
	context.bezierCurveTo(startx+midx+2*r/2.4*tempcos90pre,starty+midy+2*r/2.4*tempsin90pre,startx+2*midx+2*r/2.4*tempcos90pre,starty+2*midy+2*r/2.4*tempsin90pre,endx,endy);
	context.bezierCurveTo(startx+2*midx-2*r/2.4*tempcos90pre,starty+2*midy-2*r/2.4*tempsin90pre,startx+midx-2*r/2.4*tempcos90pre,starty+midy-2*r/2.4*tempsin90pre,startx,starty);
	context.lineWidth = r*(0.1*3);
	context.stroke();
	context.fill();
}

/* generic draw link button */

midnode.prototype.should_draw_link = function(index)
{
    
    var active = true;
    
    if (this.child1)
    {
        if (linkSet.node[index][0] != (-2))
        {
            active = false;
            var temp = metadata.node_meta[0];
            if ((linkSet.node[index][0] < temp.length)&&(linkSet.node[index][0] >= 0))
            {
                if (metadata.node_meta[this.metacode][linkSet.node[index][0]])
                {
                    active = true;
                }
            }
            
            if (linkSet.node[index][0] == -1)
            {
                if (this.name1)
                {
                    active = true;
                }
            }
        }
    }
    else
    {
        if (linkSet.leaf[index][0] != (-2))
        {
            active = false;
            var temp = metadata.leaf_meta[0];
            if ((linkSet.leaf[index][0] < temp.length)&&(linkSet.leaf[index][0] >= 0))
            {
                if (metadata.leaf_meta[this.metacode][linkSet.leaf[index][metadata_cnp_leaf-1]])
                {
                    active = true;
                }
            }
        }
        
        if (linkSet.leaf[index][0] == -1)
        {
            if ((this.name1)&&(this.name2))
            {
                active = true;
            }
        }
    }
    return (active);
}

midnode.prototype.draw_link = function(x,y,r,index,color)
{
    // x position of link
    // y position of link
    // r radius of link
    // text_in will tell us what text should be drawn in the link
    // clicked will tell us if the link is moused over or not
    // color is the color of the canvas that the link is being drawn on
    
    var is_clicked = false; // has the link been clicked on
    
    if (r > 10){
        if ( (((mouseX-x)*(mouseX-x))+((mouseY-y)*(mouseY-y))) <= (r*r) ){
            if((!mousehold)&&(!justopened_url)){
                is_clicked = true;
            }
        }
        if (is_clicked)
        {
            context.fillStyle = link_highlight_color;
        }
        else
        {
            context.fillStyle = link_background_color;
        }
        context.beginPath();
        context.arc(x , y , r, 0, Math.PI * 2, true);
        context.fill();
        
        if (is_clicked)
        {
            context.fillStyle = link_background_color;
        }
        else
        {
            context.fillStyle = color;
        }
        context.beginPath();
        context.arc(x , y , r * 0.833, 0, Math.PI * 2, true);
        context.fill();
        
        if (is_clicked)
        {
            context.fillStyle = link_highlight_color;
        }
        else
        {
            context.fillStyle = link_background_color;
        }
        
        if (this.child1)
        {
            autotext3(true, linkSet.node[index][2], x , y , r * 1.1, r * 0.4);
        }
        else
        {
            autotext3(true, linkSet.leaf[index][2], x , y , r * 1.1, r * 0.4);
        }
        if (is_clicked)
        {
            if (this.child1)
            {
                mouse_on_url = this.Link_convertor(linkSet.node[index][3]);
                mouse_on_url_new = linkSet.node[index][1];
                
            }
            else
            {
                mouse_on_url = this.Link_convertor(linkSet.leaf[index][3]);
                mouse_on_url_new = linkSet.leaf[index][1];
            }
            if (mouse_on_url)
            {
                mouse_on_url_valid = true;
            }
        }
    }
    else{
        // draw a little dot indicating the position of the link to be zoomed on
        context.fillStyle = link_background_color;
        context.beginPath();
        context.arc(x , y , r, 0, Math.PI * 2, true);
        context.fill();
    }
    return is_clicked;
};


midnode.prototype.Link_convertor = function(url_in){
    var url_parts = url_in.split("||");
    var new_url = "";
    for (i = 0 ; i < url_parts.length ; i ++)
    {
        new_url += this.Link_mapper(url_parts[i]);
    }
    return (new_url);
};


midnode.prototype.Link_mapper = function(stringin){
    var matched = false;
    if (this.child1)
    {
        if (stringin == "name")
        {
            if (this.name1)
            {
                matched = true;
                return (this.name1.toLowerCase());
            }
        }
        
        if (! matched)
        {
            var templinkconv = metadata.node_meta[0];
            for (jj = 0 ; jj < (templinkconv).length ; jj ++)
            {
                if (stringin == metadata.node_meta[0][jj])
                {
                    matched = true;
                    return ((metadata.node_meta[this.metacode][jj]).toString());
                }
            }
        }
    }
    else
    {
        if (stringin == "genus")
        {
            if (this.name2)
            {
                matched = true;
                return (this.name2.toLowerCase());
            }
        } else if (stringin == "species") {
            if (this.name1)
            {
                matched = true;
                return (this.name1.toLowerCase());
            }
        }
        
        if (! matched)
        {
            var templinkconv = metadata.leaf_meta[0];
            for (jj = 0 ; jj < templinkconv.length ; jj ++)
            {
                if (stringin == metadata.leaf_meta[0][jj])
                {
                    matched = true;
                    return ((metadata.leaf_meta[this.metacode][jj]).toString());
                }
            }
        }
    }
    if (! matched)
    {
        return(stringin);
    }
};

midnode.prototype.drawLinkSet = function(x,y,r,w) {
    
    // uncomment these to test the box in which we'll draw the set of links
    //context.fillStyle = 'rgba(0,0,255,0.25)';
    //context.fillRect(x-w/2,y-r,w,r*2);
    
    var tot_num_links = 0;
    if (this.child1){
        for (kk = 0; kk < linkSet.node.length; kk++) {
            if (kk != (node_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    tot_num_links ++;
                }
            }
        }
    }
    else{
        for (kk = 0; kk < linkSet.leaf.length; kk++) {
            if (kk != (leaf_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    tot_num_links ++;
                }
            }
        }
    }
    
    var num_links_drawn = 0;
    var draw_priority = 0;
    var rad = r;
    
    if (this.child1){
        if (node_link_priority)
        {
            if (this.should_draw_link((node_link_priority-1)))
            {
                draw_priority = 1.5;
            }
        }
        if ((rad*2*(tot_num_links+draw_priority))>w)
        {
            rad = w/(tot_num_links+draw_priority)/2;
        }
        var kk = 0;
        while((num_links_drawn) < ((tot_num_links /2)-0.1)){
            if (kk != (node_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    this.draw_link(x - w/2 + (num_links_drawn+0.5)*(w/(tot_num_links+draw_priority)) , y , rad , kk , this.branchcolor());
                    num_links_drawn ++;
                }
            }
            kk ++;
        }
        if (node_link_priority)
        {
            if (this.should_draw_link((node_link_priority-1)))
            {
                this.draw_link(x - w/2 + (num_links_drawn+0.5*draw_priority)*(w/(tot_num_links+draw_priority)), y-(rad*0.4) , rad*1.4 , (node_link_priority-1) , this.branchcolor());
                num_links_drawn += draw_priority;
            }
        }
        while((num_links_drawn) < (tot_num_links+draw_priority)){
            if (kk != (node_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    this.draw_link(x - w/2 + (num_links_drawn+0.5)*(w/(tot_num_links+draw_priority)) , y , rad , kk , this.branchcolor());
                    num_links_drawn ++;
                }
            }
            kk ++;
        }
    }
    else{
        if (leaf_link_priority)
        {
            if (this.should_draw_link((leaf_link_priority-1)))
            {
                draw_priority = 1.5;
            }
        }
        if ((rad*2*(tot_num_links+draw_priority))>w)
        {
            rad = w/(tot_num_links+draw_priority)/2;
        }
        var kk = 0;
        while((num_links_drawn) < ((tot_num_links /2)-0.1)){
            if (kk != (leaf_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    this.draw_link(x - w/2 + (num_links_drawn+0.5)*(w/(tot_num_links+draw_priority)) , y , rad , kk , this.leafcolor2());
                    num_links_drawn ++;
                }
            }
            kk ++;
        }
        if (leaf_link_priority)
        {
            if (this.should_draw_link((leaf_link_priority-1)))
            {
                this.draw_link(x - w/2 + (num_links_drawn+0.5*draw_priority)*(w/(tot_num_links+draw_priority)), y-(rad*0.4) , rad*1.4 , (leaf_link_priority-1) , this.leafcolor2());
                num_links_drawn += draw_priority;
            }
        }
        while((num_links_drawn) < (tot_num_links+draw_priority)){
            if (kk != (leaf_link_priority-1))
            {
                if (this.should_draw_link(kk))
                {
                    this.draw_link(x - w/2 + (num_links_drawn+0.5)*(w/(tot_num_links+draw_priority)) , y , rad , kk , this.leafcolor2());
                    num_links_drawn ++;
                }
            }
            kk ++;
        }
    }
    
};

/* generic draw pie chart */

drawPieSlice = function(x,y,r,pieangle, dataValue, color, total)
{
    // x,y position, radius, start angle of slice
    // value of data for slice out of total and color for slice
    if (dataValue > 0)
    {
        var newpieangle = pieangle + (dataValue / total) * Math.PI * 2 ;
        
        context.fillStyle = color
        context.beginPath();
        context.moveTo(x,y);
        context.arc(x,y,r, pieangle, newpieangle , false);
        context.fill();
    }
};

drawPie = function(x,y,r,piedata,piecolors,pietot)
{
    
    var pieangle = -piedata[piedata.length-1] / pietot;
    drawPieSlice( x , y , r*(1.0-pieborder/2), pieangle, piedata[0]+piedata[1]+piedata[piedata.length-1], piecolors[0],pietot);
    pieangle = (piedata[0] / pietot) * Math.PI * 2;
    for (i = 1; i < piedata.length-1; i++) {
        drawPieSlice( x , y , r*(1.0-pieborder/2), pieangle, piedata[i]+piedata[i+1]/2, piecolors[i],pietot);
        pieangle = pieangle + (piedata[i] / pietot) * Math.PI * 2;
    }
    drawPieSlice( x , y , r*(1.0-pieborder/2), pieangle, piedata[piedata.length-1], piecolors[piedata.length-1],pietot);
    
    context.strokeStyle = pie_background_color;
    context.lineWidth = r*pieborder;
    context.beginPath();
    context.arc(x , y , r*(1.0-pieborder/2), 0, Math.PI * 2, true);
    context.stroke();
};

drawPieKey = function(x,y,r,w,piedata,piecolors,pietot,pietext1,pietext2,piekey,pietextcol,unit_text) {
    
    // uncomment these to test the box in which we'll draw the key
    //context.fillStyle = 'rgba(0,0,255,0.75)';
    //context.fillRect(x-w/2,y-r,w,r*2);
    
    for (i = 0; i < piecolors.length; i++) {
        context.fillStyle = pie_background_color;
        context.beginPath();
        context.arc(x - w/2 + (i+0.5)*(w/piecolors.length) , y , r, 0, Math.PI * 2, true);
        context.fill();
        
        context.fillStyle = piecolors[i];
        context.beginPath();
        context.arc(x - w/2 + (i+0.5)*(w/piecolors.length) , y , r*(1.0-pieborder), 0, Math.PI * 2, true);
        context.fill();
        
        context.fillStyle = pietextcol;
        
        autotext(false, piekey[i],
                 x - w/2 + (i+0.5)*(w/piecolors.length) , y , r * (1.0-pieborder)*1.5, r*(1.0-pieborder)*0.8);
        
        if(pietext1[i])
        {
            autotext(false, pietext1[i],
                     x - w/2 + (i+0.5)*(w/piecolors.length) , y + r * (1.0-pieborder)*0.46, r*(1.0-pieborder)*1.5,
                     r*(1.0-pieborder)*0.15);
        }
        
        if(pietext2[i])
        {
            autotext(true, pietext2[i],
                     x - w/2 + (i+0.5)*(w/piecolors.length) , y + r * (1.0-pieborder)*0.7, r*(1.0-pieborder)*0.95,
                     r*(1.0-pieborder)*0.15);
        }
        
        autotext(false, (Math.round(10000.0 * (piedata[i] / pietot)) / 100.0).toString() + " %",
                 x - w/2 + (i+0.5)*(w/piecolors.length) , y - r * (1.0-pieborder)*0.7, r*(1.0-pieborder)*0.95,
                 r*(1.0-pieborder)*0.15);
        
        autotext(false, (piedata[i]).toString() + " " + unit_text,
                 x - w/2 + (i+0.5)*(w/piecolors.length) , y - r * (1.0-pieborder)*0.46, r*(1.0-pieborder)*1.5,
                 r*(1.0-pieborder)*0.15);
        
    }
    
};




/**********************************************\
 *
 *      Block : Pre calculations
 *
 \**********************************************/

// variables that were used for all fractal forms

var partl1 = 0.55; // size of line (used here)
var leafmult = 3.2; // used here
var posmult = leafmult -2; // used here

midnode.prototype.precalc = function(x,y,r,angle)
{
	this.arca = angle;
	var tempsinpre = Math.sin(angle);
	var tempcospre = Math.cos(angle);
	var tempsin90pre = Math.sin(angle + Math.PI/2.0);
	var tempcos90pre = Math.cos(angle + Math.PI/2.0);
	var atanpre;
	var atanpowpre;
	
	if (this.child1)
	{
		atanpre = Math.atan2((this.child1).richness_val,(this.child2).richness_val);
		atanpowpre = Math.atan2(Math.pow((this.child1).richness_val,0.5),Math.pow(((this.child2).richness_val),0.5));
	}
	
	var thisangleleft = 0.46;
	var thisangleright = 0.22;
	var thisratio1 = 1/1.3;;
	var thisratio2 = 1/2.25;
	
	var tempsin2 = Math.sin(angle + Math.PI*thisangleright);
	var tempcos2 = Math.cos(angle + Math.PI*thisangleright);
	var tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
	var tempcos3 = Math.cos(angle - Math.PI*thisangleleft);
	
	if (this.child1)
	{
		
		if ((this.child1.richness_val) >= (this.child2.richness_val))
		{
			
			this.nextr1 = thisratio1; // r (scale) reference for child 1
			this.nextr2 = thisratio2; // r (scale) reference for child 2
			
			(this.child1).bezsx = -(0.3)*(tempcospre)/thisratio1;
			(this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio1;
			(this.child1).bezex = tempcos2;
			(this.child1).bezey = tempsin2;
			(this.child1).bezc1x = -0.3*(tempcospre)/thisratio1;
			(this.child1).bezc1y = -0.3*(tempsinpre)/thisratio1;
			(this.child1).bezc2x = 0.15*(tempcospre)/thisratio1;
			(this.child1).bezc2y = 0.15*(tempsinpre)/thisratio1;
			(this.child1).bezr = partl1;
			
			(this.child2).bezsx = -(0.3)*(tempcospre)/thisratio2;
			(this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio2;
			(this.child2).bezex = tempcos3;
			(this.child2).bezey = tempsin3;
			(this.child2).bezc1x = 0.1*(tempcospre)/thisratio2;
			(this.child2).bezc1y = 0.1*(tempsinpre)/thisratio2;
			(this.child2).bezc2x = 0.9*tempcos3;
			(this.child2).bezc2y = 0.9*tempsin3;
			(this.child2).bezr = partl1;
			
			this.nextx1 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty1 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
			this.nextx2 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty2 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
		}
		else
		{
			this.nextr2 = thisratio1; // r (scale) reference for child 1
			this.nextr1 = thisratio2; // r (scale) reference for child 2
			
			(this.child2).bezsx = -(0.3)*(tempcospre)/thisratio1;
			(this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio1;
			(this.child2).bezex = tempcos2;
			(this.child2).bezey = tempsin2;
			(this.child2).bezc1x = -0.2*(tempcospre)/thisratio1;
			(this.child2).bezc1y = -0.2*(tempsinpre)/thisratio1;
			(this.child2).bezc2x = 0.15*(tempcospre)/thisratio1;
			(this.child2).bezc2y = 0.15*(tempsinpre)/thisratio1;
			(this.child2).bezr = partl1;
			
			(this.child1).bezsx = -(0.3)*(tempcospre)/thisratio2;
			(this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio2;
			(this.child1).bezex = tempcos3;
			(this.child1).bezey = tempsin3;
			(this.child1).bezc1x = 0.1*(tempcospre)/thisratio2;
			(this.child1).bezc1y = 0.1*(tempsinpre)/thisratio2;
			(this.child1).bezc2x = 0.9*tempcos3;
			(this.child1).bezc2y = 0.9*tempsin3;
			(this.child1).bezr = partl1;
			
			this.nextx2 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty2 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
			this.nextx1 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty1 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
		}
		
		this.arcx = this.bezex;
		this.arcy = this.bezey;
		this.arcr = (this.bezr)/2;
		
		if (this.child1)
		{
			if ((this.child1.richness_val) >= (this.child2.richness_val))
			{
				this.child1.precalc (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio1,angle + Math.PI*thisangleright);
				this.child2.precalc (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio2,angle - Math.PI*thisangleleft);
			}
			else
			{
				this.child2.precalc (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio1,angle + Math.PI*thisangleright);
				this.child1.precalc (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio2,angle - Math.PI*thisangleleft);
			}
		}
	}
	else
	{
		this.arcx = this.bezex+posmult*(tempcospre);
		this.arcy = this.bezey+posmult*(tempsinpre);
		this.arcr = leafmult*0.4*1;
	}
	
}


midnode.prototype.precalc2 = function(x,y,r,angle)
{
	this.arca = angle;
	var tempsinpre = Math.sin(angle);
	var tempcospre = Math.cos(angle);
	var tempsin90pre = Math.sin(angle + Math.PI/2.0);
	var tempcos90pre = Math.cos(angle + Math.PI/2.0);
	var atanpre;
	var atanpowpre;
	
	if (this.child1)
	{
		atanpre = Math.atan2((this.child1).richness_val,(this.child2).richness_val);
		atanpowpre = Math.atan2(Math.pow((this.child1).richness_val,0.5),Math.pow(((this.child2).richness_val),0.5));
	}
	
	var thisangleleft = 0.5;
	var thisangleright = 0.2;
	var thisratio1 = 0.77;
	var thisratio2 = 0.47;
	var thislinewidth1;
	var thislinewidth2;
	if ((this.richness_val > 1)&&((this.child1)&&(this.child2)))
	{
		if ((this.child1.richness_val) >= (this.child2.richness_val))
		{
			thisangleright = 0.45-(atanpre)/Math.PI/0.5*0.449;
			thisangleleft = 0.45-(0.5-(atanpre)/Math.PI)/0.5*0.449;
			thisratio1 = 0.3+(atanpowpre)/Math.PI/0.5*0.5;
			thisratio2 = 0.3+(0.5-(atanpowpre)/Math.PI)/0.5*0.5;
		}
		else
		{
			thisangleleft = 0.45-(atanpre)/Math.PI/0.5*0.449;
			thisangleright = 0.45-(0.5-(atanpre)/Math.PI)/0.5*0.449;
			thisratio2 = 0.3+(atanpowpre)/Math.PI/0.5*0.5;
			thisratio1 = 0.3+(0.5-(atanpowpre)/Math.PI)/0.5*0.5;
		}
	}
	
	if (this.child1)
	{
		thislinewidth1 = (this.child1.richness_val)/((this.child1.richness_val)+(this.child2.richness_val));
		thislinewidth2 = (this.child2.richness_val)/((this.child1.richness_val)+(this.child2.richness_val));
	}
	
	var tempsin2 = Math.sin(angle + Math.PI*thisangleright);
	var tempcos2 = Math.cos(angle + Math.PI*thisangleright);
	var tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
	var tempcos3 = Math.cos(angle - Math.PI*thisangleleft);
	
	if (this.child1)
	{
		if ((this.child1.richness_val) >= (this.child2.richness_val))
		{
			this.nextr1 = thisratio1; // r (scale) reference for child 1
			this.nextr2 = thisratio2; // r (scale) reference for child 2
			
			(this.child1).bezsx = -(0.3)*(tempcospre)/thisratio1;
			(this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio1;
			(this.child1).bezex = tempcos2;
			(this.child1).bezey = tempsin2;
			(this.child1).bezc1x = 0;
			(this.child1).bezc1y = 0;
			(this.child1).bezc2x = 0.9*tempcos2;
			(this.child1).bezc2y = 0.9*tempsin2;
			(this.child1).bezr = partl1;
			
			(this.child2).bezsx = -(0.3)*(tempcospre)/thisratio2;
			(this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio2;
			(this.child2).bezex = tempcos3;
			(this.child2).bezey = tempsin3;
			(this.child2).bezc1x = 0;
			(this.child2).bezc1y = 0;
			(this.child2).bezc2x = 0.3*tempcos3;
			(this.child2).bezc2y = 0.3*tempsin3;
			(this.child2).bezr = partl1;
			
			this.nextx1 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty1 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
			this.nextx2 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty2 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
		}
		else
		{
			this.nextr2 = thisratio1; // r (scale) reference for child 1
			this.nextr1 = thisratio2; // r (scale) reference for child 2
			
			(this.child2).bezsx = -(0.3)*(tempcospre)/thisratio1;
			(this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio1;
			(this.child2).bezex = tempcos2;
			(this.child2).bezey = tempsin2;
			(this.child2).bezc1x = 0;
			(this.child2).bezc1y = 0;
			(this.child2).bezc2x = 0.9*tempcos2;
			(this.child2).bezc2y = 0.9*tempsin2;
			(this.child2).bezr = partl1;
			
			(this.child1).bezsx = -(0.3)*(tempcospre)/thisratio2;
			(this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio2;
			(this.child1).bezex = tempcos3;
			(this.child1).bezey = tempsin3;
			(this.child1).bezc1x = 0;
			(this.child1).bezc1y = 0;
			(this.child1).bezc2x = 0.9*tempcos3;
			(this.child1).bezc2y = 0.9*tempsin3;
			(this.child1).bezr = partl1;
			
			this.nextx2 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty2 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
			this.nextx1 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
			this.nexty1 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
        }
        
        this.arcx = this.bezex;
        this.arcy = this.bezey;
        this.arcr = (this.bezr)/2;
        
        if (this.child1)
        {
            if ((this.child1.richness_val) >= (this.child2.richness_val))
            {
                this.child1.precalc2 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio1,angle + Math.PI*thisangleright);
                this.child2.precalc2 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio2,angle - Math.PI*thisangleleft);
            }
            else
            {
                this.child2.precalc2 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio1,angle + Math.PI*thisangleright);
                this.child1.precalc2 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio2,angle - Math.PI*thisangleleft);
            }
        }
    }
    else
    {
        this.arcx = this.bezex+posmult*(tempcospre);
        this.arcy = this.bezey+posmult*(tempsinpre);
        this.arcr = leafmult*0.4;
    }
    
}

midnode.prototype.precalc4 = function(x,y,r,angle)
{
    this.arca = angle;
    var tempsinpre = Math.sin(angle);
    var tempcospre = Math.cos(angle);
    var tempsin90pre = Math.sin(angle + Math.PI/2.0);
    var tempcos90pre = Math.cos(angle + Math.PI/2.0);
    var atanpre;
    var atanpowpre;
    
    if (this.child1)
    {
        atanpre = Math.atan2((this.child1).richness_val,(this.child2).richness_val);
        atanpowpre = Math.atan2(Math.pow((this.child1).richness_val,0.5),Math.pow(((this.child2).richness_val),0.5));
    }
    
    var thisangleleft = 0.33;
    var thisangleright = 0.33;
    var thisratio1 = 0.61;
    var thisratio2 = 0.61;
    
    var tempsin2 = Math.sin(angle + Math.PI*thisangleright);
    var tempcos2 = Math.cos(angle + Math.PI*thisangleright);
    var tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
    var tempcos3 = Math.cos(angle - Math.PI*thisangleleft);
    
    if (this.child1)
    {
        
        if ((this.child1.richness_val) >= (this.child2.richness_val))
        {
            
            this.nextr1 = thisratio1; // r (scale) reference for child 1
            this.nextr2 = thisratio2; // r (scale) reference for child 2
            
            (this.child1).bezsx = -(0.3)*(tempcospre)/thisratio1;
            (this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio1;
            (this.child1).bezex = tempcos2;
            (this.child1).bezey = tempsin2;
            (this.child1).bezc1x = -0.3*(tempcospre)/thisratio1;
            (this.child1).bezc1y = -0.3*(tempsinpre)/thisratio1;
            (this.child1).bezc2x = 0.15*(tempcospre)/thisratio1;
            (this.child1).bezc2y = 0.15*(tempsinpre)/thisratio1;
            (this.child1).bezr = partl1;
            
            (this.child2).bezsx = -(0.3)*(tempcospre)/thisratio2;
            (this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio2;
            (this.child2).bezex = tempcos3;
            (this.child2).bezey = tempsin3;
            (this.child2).bezc1x = 0.1*(tempcospre)/thisratio2;
            (this.child2).bezc1y = 0.1*(tempsinpre)/thisratio2;
            (this.child2).bezc2x = 0.9*tempcos3;
            (this.child2).bezc2y = 0.9*tempsin3;
            (this.child2).bezr = partl1;
            
            this.nextx1 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty1 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
            this.nextx2 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty2 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
        }
        else
        {
            this.nextr2 = thisratio1; // r (scale) reference for child 1
            this.nextr1 = thisratio2; // r (scale) reference for child 2
            
            (this.child2).bezsx = -(0.3)*(tempcospre)/thisratio1;
            (this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio1;
            (this.child2).bezex = tempcos2;
            (this.child2).bezey = tempsin2;
            (this.child2).bezc1x = -0.2*(tempcospre)/thisratio1;
            (this.child2).bezc1y = -0.2*(tempsinpre)/thisratio1;
            (this.child2).bezc2x = 0.15*(tempcospre)/thisratio1;
            (this.child2).bezc2y = 0.15*(tempsinpre)/thisratio1;
            (this.child2).bezr = partl1;
            
            (this.child1).bezsx = -(0.3)*(tempcospre)/thisratio2;
            (this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio2;
            (this.child1).bezex = tempcos3;
            (this.child1).bezey = tempsin3;
            (this.child1).bezc1x = 0.1*(tempcospre)/thisratio2;
            (this.child1).bezc1y = 0.1*(tempsinpre)/thisratio2;
            (this.child1).bezc2x = 0.9*tempcos3;
            (this.child1).bezc2y = 0.9*tempsin3;
            (this.child1).bezr = partl1;
            
            this.nextx2 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty2 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
            this.nextx1 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty1 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
        }
        
        this.arcx = this.bezex;
        this.arcy = this.bezey;
        this.arcr = (this.bezr)/2;
        
        if (this.child1)
        {
            if ((this.child1.richness_val) >= (this.child2.richness_val))
            {
                this.child1.precalc4 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio1,angle + Math.PI*thisangleright);
                this.child2.precalc4 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio2,angle - Math.PI*thisangleleft);
            }
            else
            {
                this.child2.precalc4 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio1,angle + Math.PI*thisangleright);
                this.child1.precalc4 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio2,angle - Math.PI*thisangleleft);
            }
        }
    }
    else
    {
        this.arcx = this.bezex+posmult*(tempcospre);
        this.arcy = this.bezey+posmult*(tempsinpre);
        this.arcr = leafmult*0.4;
    }
    
}



midnode.prototype.precalc3 = function(x,y,r,angle,dir)
{
	this.arca = angle;
	var tempsinpre = Math.sin(angle);
	var tempcospre = Math.cos(angle);
	var tempsin90pre = Math.sin(angle + Math.PI/2.0);
	var tempcos90pre = Math.cos(angle + Math.PI/2.0);
	var atanpre;
	var atanpowpre;
	
	var thisangleleft = 0.2;
	var thisangleright = 0.1;
	var thisratio1 = 0.85;
	var thisratio2 = 0.42;
	var child1right = false;
	
	if (!dir)
	{
		var thisangleleft = 0.1;
		var thisangleright = 0.2;
		var thisratio1 = 0.42;
		var thisratio2 = 0.85;
		if (this.child1)
		{
			if ((this.child1.richness_val) < (this.child2.richness_val))
			{
				child1right = true;
			}
		}
	}
	else
	{
		if (this.child1)
		{
			if ((this.child1.richness_val) >= (this.child2.richness_val))
			{
				child1right = true;
			}
		}
	}
	
	var partl1a = partl1;
	var partl1b = partl1;
	var tempsin2 = Math.sin(angle + Math.PI*thisangleright);
	var tempcos2 = Math.cos(angle + Math.PI*thisangleright);
	var tempsin3 = Math.sin(angle - Math.PI*thisangleleft);
	var tempcos3 = Math.cos(angle - Math.PI*thisangleleft);
	
	if (this.child1)
	{
		
		if (child1right)
		{
			
			this.nextr1 = thisratio1; // r (scale) reference for child 1
            this.nextr2 = thisratio2; // r (scale) reference for child 2
            
            (this.child1).bezsx = -(0.3)*(tempcospre)/thisratio1;
            (this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio1;
            (this.child1).bezex = tempcos2;
            (this.child1).bezey = tempsin2;
            (this.child1).bezc1x = -0.3*(tempcospre)/thisratio1;
            (this.child1).bezc1y = -0.3*(tempsinpre)/thisratio1;
            (this.child1).bezc2x = 0.15*(tempcospre)/thisratio1;
            (this.child1).bezc2y = 0.15*(tempsinpre)/thisratio1;
            (this.child1).bezr = partl1;
            
            (this.child2).bezsx = -(0.3)*(tempcospre)/thisratio2;
            (this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio2;
            (this.child2).bezex = tempcos3;
            (this.child2).bezey = tempsin3;
            (this.child2).bezc1x = 0.1*(tempcospre)/thisratio2;
            (this.child2).bezc1y = 0.1*(tempsinpre)/thisratio2;
            (this.child2).bezc2x = 0.9*tempcos3;
            (this.child2).bezc2y = 0.9*tempsin3;
            (this.child2).bezr = partl1;
            
            this.nextx1 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1a*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty1 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1a*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
            this.nextx2 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1b*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty2 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1b*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
        }
        else
        {
            this.nextr2 = thisratio1; // r (scale) reference for child 1
            this.nextr1 = thisratio2; // r (scale) reference for child 2
            
            (this.child2).bezsx = -(0.3)*(tempcospre)/thisratio1;
            (this.child2).bezsy = -(0.3)*(tempsinpre)/thisratio1;
            (this.child2).bezex = tempcos2;
            (this.child2).bezey = tempsin2;
            (this.child2).bezc1x = -0.2*(tempcospre)/thisratio1;
            (this.child2).bezc1y = -0.2*(tempsinpre)/thisratio1;
            (this.child2).bezc2x = 0.15*(tempcospre)/thisratio1;
            (this.child2).bezc2y = 0.15*(tempsinpre)/thisratio1;
            (this.child2).bezr = partl1;
            
            (this.child1).bezsx = -(0.3)*(tempcospre)/thisratio2;
            (this.child1).bezsy = -(0.3)*(tempsinpre)/thisratio2;
            (this.child1).bezex = tempcos3;
            (this.child1).bezey = tempsin3;
            (this.child1).bezc1x = 0.1*(tempcospre)/thisratio2;
            (this.child1).bezc1y = 0.1*(tempsinpre)/thisratio2;
            (this.child1).bezc2x = 0.9*tempcos3;
            (this.child1).bezc2y = 0.9*tempsin3;
            (this.child1).bezr = partl1;
            
            this.nextx2 = (1.3*Math.cos(angle))+(((this.bezr)-(partl1a*thisratio1))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty2 = (1.3*Math.sin(angle))+(((this.bezr)-(partl1a*thisratio1))/2.0)*tempsin90pre; // y reference point for both children
            this.nextx1 = (1.3*Math.cos(angle))-(((this.bezr)-(partl1b*thisratio2))/2.0)*tempcos90pre; // x refernece point for both children
            this.nexty1 = (1.3*Math.sin(angle))-(((this.bezr)-(partl1b*thisratio2))/2.0)*tempsin90pre; // y reference point for both children
		}
		
		this.arcx = this.bezex;
		this.arcy = this.bezey;
		this.arcr = (this.bezr)/2;
		
		if (this.child1)
		{
			if (child1right)
			{
				this.child1.precalc3 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio1,angle + Math.PI*thisangleright,!dir);
				this.child2.precalc3 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio2,angle - Math.PI*thisangleleft,!dir);
			}
			else
			{
				this.child2.precalc3 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*thisratio1,angle + Math.PI*thisangleright,!dir);
				this.child1.precalc3 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*thisratio2,angle - Math.PI*thisangleleft,!dir);
			}
		}
	}
	else
	{
		this.arcx = this.bezex+posmult*0.9*(tempcospre);
		this.arcy = this.bezey+posmult*0.9*(tempsinpre);
		this.arcr = leafmult*0.4*0.9; 
	}
};

//FRACTAL FORM ALGORITHMS AND PRECALCULATIONS

function update_form()
{
	// updates the view and all variables to match the current viewtype
	//fulltree.clearroute();
	fulltree.drawreg(xp,yp,220*ws);
	fulltree.move2();
	
	fulltree.bezsx = 0; // start x position
	fulltree.bezsy = 0; // start y position
	fulltree.bezex = 0; // end x position
	fulltree.bezey = -1; // end y position
	fulltree.bezc1x = 0; // control point 1 x position
	fulltree.bezc1y = -0.05; // control point 2 y position
	fulltree.bezc2x = 0; // control point 2 x position
	fulltree.bezc2y = -0.95; // control point 2 y position
	fulltree.bezr = partl1; // line width
	
	if (viewtype == 2)
	{
		fulltree.precalc2(xp,yp,220*ws,Math.PI*3/2);
	}
	else
	{
		if (viewtype == 3)
		{
			fulltree.bezsx = -Math.sin(Math.PI*0.05); // start x position
			fulltree.bezsy = 0; // start y position
			fulltree.bezex = -Math.sin(Math.PI*0.05); // end x position
			fulltree.bezey = -Math.cos(Math.PI*0.05); // end y position
			fulltree.bezc1x = -Math.sin(Math.PI*0.05); // control point 1 x position
			fulltree.bezc1y = -0.05; // control point 2 y position
			fulltree.bezc2x = -Math.sin(Math.PI*0.05); // control point 2 x position
			fulltree.bezc2y = -0.95; // control point 2 y position
			fulltree.bezr = partl1; // line width
			fulltree.precalc3(xp,yp,220*ws,Math.PI*(3/2-0.05),true,true);
		}
		else
		{
            if (viewtype == 4)
            {
                fulltree.precalc4(xp,yp,220*ws,Math.PI*3/2);
            }
            else
            {
                fulltree.precalc(xp,yp,220*ws,Math.PI*3/2);
                
            }
		}
	}
	fulltree.calchorizon();
	fulltree.graphref = true;
	fulltree.reref();
	//fulltree.clearsearch();
	Resize_only();
	fulltree.deanchor();
	fulltree.reref();
	fulltree.move3(40,widthres-40,40,heightres-40);		
	draw2();
}


/**********************************************\
 *
 *      Block : Parameter Calc and reanchor
 *
 \**********************************************/

// NODE OBJECT BASIC CALCULATIONS

midnode.prototype.richness_calc = function()
{
	if (this.child1)
	{
		this.richness_val =  (((this.child1).richness_calc())+((this.child2).richness_calc()));
	}
	else
	{
		if (this.richness_val <= 0)
		{
			this.richness_val = 1;
		}
	}
	return (this.richness_val);
}

midnode.prototype.name_calc = function()
{
	if (this.child1)
	{
		if (((this.child1).name_calc())==((this.child2).name_calc()))
		{
			this.name2 = ((this.child1).name2);
		}
	}
	return (this.name2);
};

midnode.prototype.phylogeneticdiv_calc = function()
{
	this.phylogenetic_diversity = 0;
	if (this.child1)
	{
		this.phylogenetic_diversity += (this.child2).phylogeneticdiv_calc();
		this.phylogenetic_diversity += (this.child1).phylogeneticdiv_calc();
	}
	return (this.phylogenetic_diversity + this.lengthbr);
};

midnode.prototype.age_calc = function()
{
	if ((this.lengthbr == 0)&&(this.child1))
	{
		this.npolyt = false;
	}
	else
	{
		this.npolyt = true;
	}
	var length_temp;
	length_temp = (this.lengthbr);
	if (this.child1)
	{
		(this.lengthbr) = (this.child2).age_calc();
		(this.lengthbr) = (this.child1).age_calc();
		return ((length_temp)+(this.lengthbr));
	}
	else
	{
		(this.lengthbr) = 0;
		return (length_temp);
	}
};

midnode.prototype.inlabel_calc = function(testname)
{
    
    if (this.child1)
    {
        if ((this.name2)&&(this.name2 != testname))
        {
            this.name1 = this.name2;
            this.child1.inlabel_calc(this.name1);
            this.child2.inlabel_calc(this.name1);
        }
        else
        {
            this.name2 = null;
            this.child1.inlabel_calc(testname);
            this.child2.inlabel_calc(testname);
        }
        
    }
    
    
}


// DEEP ZOOM REREFERENCING METHODS (COMPLEX)

// returns the product of all scaling factors so as to find out the total scaling difference
midnode.prototype.mult = function ()
{
	var multreturn;
	if (this.child1)
	{
		if (this.child1.graphref)
		{
			multreturn = (this.nextr1)*(this.child1.mult());
		}
		else
		{
			if (this.child2.graphref)
			{
				multreturn = (this.nextr2)*(this.child2.mult());
			}
			else
			{
				multreturn = 1;
			}
		}
	}
	else
	{
		multreturn = 1;
	}
	return multreturn;
}

midnode.prototype.reref = function()
{
	if (this.onroute)
	{
		this.graphref = true;
		if (this.child1)
		{
			if (this.child1.onroute)
			{
				this.child1.reref();
			}
			else
			{
				this.child1.graphref = false;
			}
			if (this.child2.onroute)
			{
				this.child2.reref();
			}
			else
			{
				this.child2.graphref = false;
			}
		}
	}
}

midnode.prototype.calchorizon = function()
{
	// find the bounding box for the bezier curve
	this.hxmax = this.bezsx;
	this.hxmin = this.bezsx;
	this.hymax = this.bezsy;
	this.hymin = this.bezsy;
	if (this.hxmax < this.bezc1x) { this.hxmax = this.bezc1x; }
	if (this.hxmin > this.bezc1x) { this.hxmin = this.bezc1x; }
	if (this.hymax < this.bezc1y) { this.hymax = this.bezc1y; }
	if (this.hymin > this.bezc1y) { this.hymin = this.bezc1y; }
	if (this.hxmax < this.bezc2x) { this.hxmax = this.bezc2x; }
	if (this.hxmin > this.bezc2x) { this.hxmin = this.bezc2x; }
	if (this.hymax < this.bezc2y) { this.hymax = this.bezc2y; }
	if (this.hymin > this.bezc2y) { this.hymin = this.bezc2y; }
	if (this.hxmax < this.bezex) { this.hxmax = this.bezex; }
	if (this.hxmin > this.bezex) { this.hxmin = this.bezex; }
	if (this.hymax < this.bezey) { this.hymax = this.bezey; }
	if (this.hymin > this.bezey) { this.hymin = this.bezey; }
	this.hxmax += this.bezr/2;
	this.hxmin -= this.bezr/2;
	this.hymax += this.bezr/2;
	this.hymin -= this.bezr/2;
	
	//expand the bounding box to include the arc if necessary
	if (this.hxmax < (this.arcx+this.arcr)) { this.hxmax = (this.arcx+this.arcr); }
	if (this.hxmin > (this.arcx-this.arcr)) { this.hxmin = (this.arcx-this.arcr); }
	if (this.hymax < (this.arcy+this.arcr)) { this.hymax = (this.arcy+this.arcr); }
	if (this.hymin > (this.arcy-this.arcr)) { this.hymin = (this.arcy-this.arcr); }
	// set the graphics bounding box before the horizon is expanded for children
	this.gxmax = this.hxmax;
	this.gxmin = this.hxmin;
	this.gymax = this.hymax;
	this.gymin = this.hymin;
	
	// check for children
	if(this.child1)
	{
		// if children calculate their horizons
		this.child1.calchorizon ();
		this.child2.calchorizon ();
		// and expand the bounding box if necessary
		if (this.hxmax < (this.nextx1+this.nextr1*this.child1.hxmax)) { this.hxmax = (this.nextx1+this.nextr1*this.child1.hxmax); }
		if (this.hxmin > (this.nextx1+this.nextr1*this.child1.hxmin)) { this.hxmin = (this.nextx1+this.nextr1*this.child1.hxmin); }
		if (this.hymax < (this.nexty1+this.nextr1*this.child1.hymax)) { this.hymax = (this.nexty1+this.nextr1*this.child1.hymax); }
		if (this.hymin > (this.nexty1+this.nextr1*this.child1.hymin)) { this.hymin = (this.nexty1+this.nextr1*this.child1.hymin); }
		if (this.hxmax < (this.nextx2+this.nextr2*this.child2.hxmax)) { this.hxmax = (this.nextx2+this.nextr2*this.child2.hxmax); }
		if (this.hxmin > (this.nextx2+this.nextr2*this.child2.hxmin)) { this.hxmin = (this.nextx2+this.nextr2*this.child2.hxmin); }
		if (this.hymax < (this.nexty2+this.nextr2*this.child2.hymax)) { this.hymax = (this.nexty2+this.nextr2*this.child2.hymax); }
		if (this.hymin > (this.nexty2+this.nextr2*this.child2.hymin)) { this.hymin = (this.nexty2+this.nextr2*this.child2.hymin); }
	}
}

midnode.prototype.reanchor = function ()
{
	if (this.dvar)
	{
		this.graphref = true;
		if (((this.gvar)||(!(this.child1)))||((this.rvar/220>0.01)&&(this.rvar/220<100)))
		{
			// reanchor here
			xp = this.xvar;
			yp = this.yvar;
			ws = this.rvar/220;
			if (this.child1)
			{
				this.child2.deanchor();
				this.child1.deanchor();
			}
		}
		else
		{
			// reanchor somewhere down the line
			if (this.child1.dvar)
			{
				this.child1.reanchor();
				this.child2.deanchor();
				
			}
			else
			{
				this.child2.reanchor();
				this.child1.deanchor();
			}
		}
	}
	// else not possible to reanchor
}

midnode.prototype.deanchor = function ()
{
	if (this.graphref)
	{
		if (this.child1)
		{
			this.child1.deanchor();
			this.child2.deanchor();
		}
		this.graphref = false;
	}
}

midnode.prototype.drawreg = function(x,y,r)
{
	// we assume that only those for whom graphref is true will call this routine
	if (this.child1)
	{
		// we are not a leaf and we are referencing - check children
		if (this.child1.graphref)
		{
			// child 1 leads to (or is) the referencing node
			this.child1.drawreg(x,y,r);
			this.rvar = this.child1.rvar/this.nextr1;
			this.xvar = this.child1.xvar-this.rvar*this.nextx1;
			this.yvar = this.child1.yvar-this.rvar*this.nexty1;
			this.dvar = false;
			this.child2.gvar = false;
			this.child2.dvar = false;
			
			if(((!((((this.xvar+(this.rvar*this.hxmax))<0)||((this.xvar+(this.rvar*this.hxmin))>widthres))||(((this.yvar+(this.rvar*this.hymax))<0)||((this.yvar+(this.rvar*this.hymin))>heightres))))))
			{
				if (this.rvar > threshold)
				{
					
					this.child2.drawreg2 (this.xvar+((this.rvar)*(this.nextx2)),this.yvar+(this.rvar)*(this.nexty2),this.rvar*this.nextr2);
				}
				
				if(((((this.xvar+(this.rvar*this.gxmax))<0)||((this.xvar+(this.rvar*this.gxmin))>widthres))||(((this.yvar+(this.rvar*this.gymax))<0)||((this.yvar+(this.rvar*this.gymin))>heightres))))
				{
					this.gvar = false;
				}
				else
				{
					this.gvar = true;
					this.dvar = true;
				}
				if (this.rvar <= threshold)
				{
					this.child1.gvar = false;
					this.child2.gvar = false;
					this.child1.dvar = false;
					this.child2.dvar = false;
				}
			}
			else
			{
				this.gvar = false;
			}
			
			if ((this.child1.dvar)||(this.child2.dvar))
			{
				this.dvar = true;
			}
			
		}
		else
		{
			if (this.child2.graphref)
			{
				// child 2 leads to (or is) the referencing node
				this.child2.drawreg(x,y,r);
				this.rvar = this.child2.rvar/this.nextr2;
				this.xvar = this.child2.xvar-this.rvar*this.nextx2;
				this.yvar = this.child2.yvar-this.rvar*this.nexty2;
				this.dvar = false;
				this.child1.gvar = false;
				this.child1.dvar = false;
				
				if(((!((((this.xvar+(this.rvar*this.hxmax))<0)||((this.xvar+(this.rvar*this.hxmin))>widthres))||(((this.yvar+(this.rvar*this.hymax))<0)||((this.yvar+(this.rvar*this.hymin))>heightres))))))
				{
					if (this.rvar > threshold)
					{
						this.child1.drawreg2 (this.xvar+((this.rvar)*(this.nextx1)),this.yvar+(this.rvar)*(this.nexty1),this.rvar*this.nextr1);
					}
					
					if(((((this.xvar+(this.rvar*this.gxmax))<0)||((this.xvar+(this.rvar*this.gxmin))>widthres))||(((this.yvar+(this.rvar*this.gymax))<0)||((this.yvar+(this.rvar*this.gymin))>heightres))))
					{
						this.gvar = false;
					}
					else
					{
						this.gvar = true;
						
						this.dvar = true;
					}
					
					if (this.rvar <= threshold)
					{
						this.child1.gvar = false;
						this.child2.gvar = false;
						this.child1.dvar = false;
						this.child2.dvar = false;
					}
				}
				else
				{
					this.gvar = false;
				}
				
				if ((this.child1.dvar)||(this.child2.dvar))
				{
					this.dvar = true;
				}
			}
			else
			{
				// we are the referencing node so call drawreg2
				this.drawreg2(x,y,r);
			}
		}
	}
	else
	{
		// we are a leaf and we are referencing - we are the referencing node so record x,y,r
		this.drawreg2(x,y,r); //does all we need and will automatically skip any child commands
	}
}

midnode.prototype.drawreg2 = function(x,y,r)
{
	this.xvar = x;
	this.yvar = y;
	this.rvar = r;
	this.dvar = false;
	if(((!((((x+(r*this.hxmax))<0)||((x+(r*this.hxmin))>widthres))||(((y+(r*this.hymax))<0)||((y+(r*this.hymin))>heightres))))))
	{
		if (this.child1)
		{
			if (r > threshold)
			{
				this.child1.drawreg2 (x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*this.nextr1);
				this.child2.drawreg2 (x+((r)*(this.nextx2)),y+(r)*(this.nexty2),r*this.nextr2);
			}
			else
			{
				this.child1.gvar = false;
				this.child1.dvar = false;
				this.child2.gavr = false;
				this.child2.dvar = false;
			}
			
			if ((this.child1.dvar)||(this.child2.dvar))
			{
				this.dvar = true;
			}
		}
		if(((((x+(r*this.gxmax))<0)||((x+(r*this.gxmin))>widthres))||(((y+(r*this.gymax))<0)||((y+(r*this.gymin))>heightres))))
		{
			this.gvar = false;
		}
		else
		{
			this.gvar = true;
			this.dvar = true;
		}
	}
	else
	{
		this.gvar = false;
	}
};


/**********************************************\
 *
 *       Block: Growth animation code
 *
 \**********************************************/

// GROW OPTIONS

midnode.prototype.oldest = function()
{
	var oldestreturn = 0.0;
	if(this.dvar)
	{
		if(this.gvar)
		{
			if (this.lengthbr)
			{
				if ( this.lengthbr > oldestreturn )
				{
					oldestreturn = this.lengthbr;
				}
			}
		}
		if (this.child1)
		{
			var oldestc1 = this.child1.oldest ();
			var oldestc2 = this.child2.oldest ();
			if (oldestc1 > oldestreturn)
			{
				oldestreturn = oldestc1;
			}
			if (oldestc2 > oldestreturn)
			{
				oldestreturn = oldestc2;
			}
		}
	}
	return oldestreturn;
};

function growstart()
{
	timelim = fulltree.oldest();
	clearTimeout(t2);
	growingpause = true;
	growing = false;
	Resize();
}

function growrev()
{
	if (timelim >= fulltree.oldest())
	{
		timelim = -0.001;
	}
	clearTimeout(t2);
	growingpause = false;
	growing = true;
	Resize();
	timeinc = fulltree.lengthbr/(growthtimetot*10);
	grow3();
}

function growpause()
{
	clearTimeout(t2);
	growingpause = true;
	growing = false;
	Resize();
}

function growplay()
{
	if (timelim <= 0)
	{
		timelim = fulltree.oldest();
	}
	clearTimeout(t2);
	growingpause = false;
	growing = true;
	Resize();
	timeinc = fulltree.oldest()/(growthtimetot*10);
	grow2();
}

function growend()
{
	clearTimeout(t2);
	timelim = -1;
	clearTimeout(t2);
	growingpause = false;
	growing = false;
    if (buttonoptions != 2)
	{
        clearbuttons();
        reopenbuttons();
    }
    Resize();
}

function grow2()
{
	if (timelim >= 0)
	{
		timelim -= timeinc;
		draw2();
		t2 = setTimeout('grow2()',100);
	}
	else
	{
		clearTimeout(t2);
		draw2();
		t2 = setTimeout('Resize()',500);
		growing = false;
		growingpause = false;
	}
}

function grow3()
{
	if (timelim <= fulltree.lengthbr)
	{
		timelim += timeinc;
		draw2();
		t2 = setTimeout('grow3()',100);
	}
	else
	{
		clearTimeout(t2);
		draw2();
		t2 = setTimeout('Resize()',500);
		growing = false;
		growingpause = true;
	}
}


/**********************************************\
 *
 *       Block: Search code
 *
 \**********************************************/
// SEARCH UTILITIES

midnode.prototype.search = function()
{
	
	// initialize the search variables to the default (wipe previous searches)
	this.startscore = 0;
	this.targeted = false;
	this.searchinpast = 0;
	this.flysofarA = false;
	this.flysofarB = false;
	var temphitsa = 0;
	var i;
    if (this.child1)
    {
        temphitsa += (this.child1).search();
        temphitsa += (this.child2).search();
    }
    if (temphitsa == 0)
    {
        
        var thishit = true;
        for (i = 0 ; i < searchinparts.length ; i ++)
        {
            if (!(this.searchone(searchinparts[i],false)))
            {
                thishit = false;
            }
        }
        if (thishit)
        {
            temphitsa += this.richness_val;
        }
	}
	
	
	this.searchin = temphitsa;
	return temphitsa;
};

midnode.prototype.search_URLinit = function()
{
    // initialize the search variables to the default (wipe previous searches)
	this.targeted = false;
    
	var temphitsa = 0;
    if (this.child1)
    {
        var c1temphitsa = (this.child1).search_URLinit();
        var c2temphitsa = (this.child2).search_URLinit();
        if (c1temphitsa > 0)
        {
            if (c2temphitsa > 0)
            {
                this.targeted = true;
                temphitsa += c1temphitsa;
                temphitsa += c2temphitsa;
                this.child2.targeted = false;
                this.child1.targeted = false;
            }
            else
            {
                this.targeted = true;
                temphitsa += c1temphitsa;
            }
        }
        else
        {
            if (c2temphitsa > 0)
            {
                this.targeted = true;
                temphitsa += c2temphitsa;
            }
            else if (!(species_URL))
            {
                if ((this.name1)&&((this.name1.toLowerCase()) == (genus_URL)))
                {
                    temphitsa += this.richness_val;
                    this.targeted = true;
                }
                else
                {
                    if ((this.name1)&&((this.name1.toLowerCase()) == (taxa_URL)))
                    {
                        temphitsa += this.richness_val;
                        this.targeted = true;
                    }
                }
            }
        }
    }
    else
    {
        if ((this.name2)&&((this.name2.toLowerCase()) == (genus_URL) ))
        {
            if ((this.name1)&&((this.name1.toLowerCase()) == (species_URL) ))
            {
                temphitsa += 1.0;
                this.targeted = true;
            }else if (!species_URL){
                temphitsa += 1.0;
                this.targeted = true;
            }
        }
    }
    
	this.searchin = temphitsa;
    return(temphitsa);
};


midnode.prototype.search_URLinit2 = function()
{
    // initialize the search variables to the default (wipe previous searches)
    
	var temphitsa = 0;
    if (this.child1)
    {
        var c1temphitsa = (this.child1).search_URLinit2();
        var c2temphitsa = (this.child2).search_URLinit2();
        if (c1temphitsa > 0)
        {
            if (c2temphitsa > 0)
            {
                this.targeted = true;
                temphitsa += c1temphitsa;
                temphitsa += c2temphitsa;
            }
            else
            {
                this.targeted = true;
                temphitsa += c1temphitsa;
            }
        }
        else
        {
            if (c2temphitsa > 0)
            {
                this.targeted = true;
                temphitsa += c2temphitsa;
            }
            else
            {
                if ((this.name1)&&((this.name1.toLowerCase()) == (genus2_URL)))
                {
                    temphitsa += this.richness_val;
                    this.targeted = true;
                }
                else
                {
                    if ((this.name1)&&((this.name1.toLowerCase()) == (taxa2_URL)))
                    {
                        temphitsa += this.richness_val;
                        this.targeted = true;
                    }
                }
            }
        }
        
        if (this.child2.targeted&&this.child1.targeted)
        {
            this.child2.targeted = false;
            this.child1.targeted = false;
            this.targeted = true;
        }
        
    }
    else
    {
        if ((this.name2)&&((this.name2.toLowerCase()) == (genus2_URL) ))
        {
            if ((this.name1)&&((this.name1.toLowerCase()) == (species2_URL) ))
            {
                temphitsa += 1.0;
                this.targeted = true;
            }else if (!species_URL){
                temphitsa += 1.0;
                this.targeted = true;
            }
        }
    }
    
	this.searchin2 = temphitsa;
    return(temphitsa);
};


midnode.prototype.searchtarget = function()
{
	// go down richerside and then use density as decider
	// keep going until density reaches threshold
	var searchresult = -1;
	if ((this.searchin-this.searchinpast)>0)
	{
		if (((this.searchin-this.searchinpast) / (this.richness_val))>0.7)
		{
			this.targeted = true;
			if ((this.child1)&&(((this.child1).searchin > 0)||((this.child2).searchin > 0)))
			{
				if ((((this.child1).searchin)-((this.child1).searchinpast)) <= 0)
				{
					var returned = (this.child2).searchtarget();
					
					searchresult = returned;
				}
				else
				{
					if ((((this.child2).searchin)-((this.child2).searchinpast)) <= 0)
					{
						var returned = (this.child1).searchtarget();
						
						searchresult = returned;
					}
					else
					{
						searchresult = this.searchin;
					}
				}
			}
			else
			{
				searchresult = this.searchin;
			}
		}
		else
		{
			if (this.child1)
			{
				var searchresult1 = this.child1.searchtarget();
				var searchresult2 = this.child2.searchtarget();
			}
			if (searchresult1 > searchresult2)
			{
				this.child1.targeted = true;
				this.child2.targeted = false;
				searchresult = searchresult1;
			}
			else
			{
				this.child2.targeted = true;
				this.child1.targeted = false;
				searchresult = searchresult2;
			}
		}
	}
	return (searchresult);
};

midnode.prototype.searchtargetmark = function()
{
	var searchresult = -1;
	if (this.targeted)
	{
		searchresult = this.searchin;
		if (this.child1)
		{
			if (this.child1.targeted)
			{
				searchresult = this.child1.searchtargetmark();
			}
			else
			{
				if (this.child2.targeted)
				{
					searchresult = this.child2.searchtargetmark();
				}
			}
		}
		this.searchinpast += searchresult;
	}
	return (searchresult);
};

midnode.prototype.clearsearch = function ()
{
	(this.searchin) = 0;
    (this.searchin2) = 0;
	this.targeted = false;
	this.searchinpast = 0;
	this.flysofarA = false;
	this.flysofarB = false;
	if (this.child1)
	{
		(this.child1).clearsearch();
		(this.child2).clearsearch();
	}
};

midnode.prototype.clearroute = function ()
{
	this.onroute = false;
	if (this.child1)
	{
		(this.child1).clearroute();
		(this.child2).clearroute();
	}
};

midnode.prototype.semiclearsearch = function ()
{
	this.targeted = false;
	this.flysofarA = false;
	this.flysofarB = false;
	if (this.child1)
	{
		(this.child1).semiclearsearch();
		(this.child2).semiclearsearch();
	}
};


function performsearch2(toclear)
{
    searchinteriornodes = false;
    var changedvar = false;
    var stringin = document.forms["myform"]["tosearchfor"].value;
    
    stringin = search_substitutions(stringin);
    
    var i;
    var searchinpartsnew = stringin.split(" ");
    
    if (searchinpartsnew.length == searchinparts.length)
    {
        for (i = 0 ; i < searchinpartsnew.length ; i ++)
        {
            if (searchinpartsnew[i] != searchinparts[i])
            {
                changedvar = true;
            }
        }
    }
    else
    {
        changedvar = true;
    }
    
    if (latin_search != (document.forms["myform"]["latinsearch"].checked))
    {
        changedvar = true;
        latin_search = (document.forms["myform"]["latinsearch"].checked);
    }
    if (common_search != (document.forms["myform"]["commonsearch"].checked))
    {
        changedvar = true;
        common_search = (document.forms["myform"]["commonsearch"].checked);
    }
    if (trait_search != (document.forms["myform"]["traitsearch"].checked))
    {
        changedvar = true;
        trait_search = (document.forms["myform"]["traitsearch"].checked);
    }
    
    if (!changedvar)
    {
        if (toclear)
        {
            fulltree.semiclearsearch();
        }
        changedvar = false;
    }
    else
    {
        fulltree.clearsearch();
        searchinparts = searchinpartsnew;
        numhits = fulltree.search();
        changedvar = true;
    }
    return changedvar;
}

midnode.prototype.searchone = function(stringin,leafonly)
{
    var foundstr = 0;
    
    if (document.forms["myform"]["traitsearch"].checked)
    {
        if (this.dotraitsearch(stringin) == 1)
        {
            foundstr += this.richness_val;
        }
    }
    if (foundstr == 0 && (document.forms["myform"]["latinsearch"].checked))
    {
        
        if ((stringin.toLowerCase()) == stringin)
        {
            if (!((leafonly)&&(this.child1)))
            {
                if ((this.name1)&&((this.name1.toLowerCase()).search(stringin) != -1))
                {
                    foundstr += this.richness_val;
                }
                else
                {
                    if (((this.name2)&&((this.name2.toLowerCase()).search(stringin) != -1))&&(!this.child1))
                    {
                        foundstr +=this.richness_val;
                    }
                    
                }
                
            }
        }
        else
        {
            if (!((leafonly)&&(this.child1)))
            {
                if ((this.name1)&&((this.name1).search(stringin) != -1))
                {
                    foundstr += this.richness_val;
                }
                else
                {
                    if (((this.name2)&&((this.name2).search(stringin) != -1))&&(!this.child1))
                    {
                        foundstr +=this.richness_val;
                    }
                    
                }
            }
        }
        
    }
    
    if (foundstr == 0 && (document.forms["myform"]["commonsearch"].checked))
    {
        if (!((leafonly)&&(this.child1)))
        {
            if ((stringin.toLowerCase()) == stringin)
            {
                if (this.child1)
                {
                    if ((metadata.node_meta[this.metacode][metadata_cnp_node-1])&&((metadata.node_meta[this.metacode][metadata_cnp_node-1].toLowerCase()).search(stringin) != -1))
                    {
                        foundstr +=this.richness_val;
                    }
                }
                else
                {
                    if ((metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1])&&((metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1].toLowerCase()).search(stringin) != -1))
                    {
                        foundstr +=this.richness_val;
                    }
                }
            }
            else
            {
                if (this.child1)
                {
                    if ((metadata.node_meta[this.metacode][metadata_cnp_node-1])&&((metadata.node_meta[this.metacode][metadata_cnp_node-1]).search(stringin) != -1))
                    {
                        foundstr +=this.richness_val;
                    }
                }
                else
                {
                    if ((metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1])&&((metadata.leaf_meta[this.metacode][metadata_cnp_leaf-1]).search(stringin) != -1))
                    {
                        foundstr +=this.richness_val;
                    }
                }
                
            }
        }
    }
    return foundstr;
};

function performleap()
{
	clearTimeout(t);
	flying = false;
	//performsearch2(false);
	if (fulltree.searchtarget() == -1)
	{
		searchinparts = [];
		performsearch2(true);
		fulltree.searchtarget()
	}
	fulltree.targeted = true;
	fulltree.searchtargetmark();
	fulltree.deanchor();
	fulltree.move(40,widthres-40,40,heightres-40);
	draw2();
}

function marksearch()
{
    if ((! flying) && (document.getElementById("searchtf").value!=""))
    {
        performsearch2(false);
        highlight_search = (document.forms["myform"]["domarksearch"].checked);
        if(fulltree.searchin == 1)
        {
            document.getElementById("numhittxt").innerHTML= ('1 hit');
        }
        else
        {
            if(fulltree.searchin <= 0)
            {
                document.getElementById("numhittxt").innerHTML= ('no hits');
            }
            else
            {
                document.getElementById("numhittxt").innerHTML= ((fulltree.searchin).toString() + ' hits');
            }
        }
        document.getElementById("numhittxt").style.display = '';
        if ((document.forms["myform"]["flightsearch"].checked))
        {
            performfly();
        }
        else
        {
            performleap();
        }
		draw2();
    }
}

function skip_intro()
{
    clearTimeout(t);
    clearbuttons();
    buttonoptions = 0;
    reopenbuttons();
    
    highlight_search = true;
    fulltree.search_URLinit();
    
    if(genus2_URL||taxa2_URL)
    {
        fulltree.search_URLinit2();
    }
    
	fulltree.targeted = true;
    fulltree.deanchor();
    fulltree.move(40,widthres-40,40,heightres-40);
	draw2();
    
    search_init_end();
    Resize();
    introlock = false;
    
}

function stop_intro()
{
    clearTimeout(t);
    clearbuttons();
    buttonoptions = 0;
    reopenbuttons();
    
    search_init_end();
    Resize();
    introlock = false;
    
}

function replay_intro()
{
    if ((animation_status != 0)&&(animation_status!= -1))
    {
        popup_out();
        clearTimeout(t);
        animation_status = 1;
        init();
    }
}

function search_init()
{
    highlight_search = true;
    fulltree.search_URLinit();
    
    if(genus2_URL||taxa2_URL)
    {
        fulltree.search_URLinit2();
    }
    
    if (fulltree.searchin >0)
    {
        if (init_URL == 1){
//            init_bar();
            Resize();
            if (viewtype == 2)
            {
                performflyC();
            }
            else
            {
                performflyB();
            }
        } else if (init_URL != 5) {
            fulltree.deanchor();
            fulltree.move(40,widthres-40,40,heightres-40);
            if (init_URL == 3)
            {
                search_init_end();
                
            }
            else if (init_URL == 2)
            {
                introlock = true;
                click2zoomnum = Math.min(length_init_zoom2,Math.round(Math.log(0.6*ws/wsinit/fulltree.mult())/Math.log(init_zoom_speed)));
                var wsover = Math.pow(init_zoom_speed,click2zoomnum+1);
                ws = ws/wsover;
                xp = widthres/2 + (xp-widthres/2)/wsover;
                yp = heightres/2 + (yp-heightres/2)/wsover;
                init_zoom();
            } else if (init_URL == 4)
            {
                justopened = true;
                animation_status = 2;
                draw2();
                buttonoptions = 2;
                document.getElementById("closebutton").style.display = '';
                document.getElementById("growtitle").style.display = '';
                document.getElementById("growtxt").style.display = '';
                document.getElementById("revgbutton").style.display = '';
                document.getElementById("pausegbutton").style.display = '';
                document.getElementById("playgbutton").style.display = '';
                document.getElementById("endgbutton").style.display = '';
                growplay();
                Resize();
                setTimeout('cancelfirstuse()',10000);
            }
        } else
        {
            search_init_end();
            draw2();
        }
    }
}

// zoom in function
function init_zoom()
{
    clearTimeout(t);
    ws = ws*init_zoom_speed;
    xp = widthres/2 + (xp-widthres/2)*init_zoom_speed;
    yp = heightres/2 + (yp-heightres/2)*init_zoom_speed;
    draw2();
    click2zoomnum --;
    if (click2zoomnum >= 0)
    {
        t = setTimeout('init_zoom()',33);
    }
    else
    {
        introlock = false;
        search_init_end();
    }
}

function marksearchchange()
{
    highlight_search = (document.forms["myform"]["domarksearch"].checked);
    draw2();
}

function unmarksearch()
{
    if (highlight_search)
    {
		highlight_search = false;
    }
    else
    {
        highlight_search = true;
    }
    draw2();
}

function performclear()
{
    highlight_search = false;
    searchinparts = [];
    context.clearRect(0,0, widthres,heightres);
    draw2();
}



/**********************************************\
 *
 *       Block: Fly code
 *
 \**********************************************/

// Fly Animation
midnode.prototype.setxyr = function(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,movement,propmove)
{
	var vxmax;
	var vxmin;
	var vymax;
	var vymin;
	if (this.child1)
	{
		if (movement != 2)
		{
			vxmax = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmax;
			
			vxmin = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmin;
			
			vymax = y+r*this.nexty1 + r*this.nextr1*this.child1.hymax;
			
			vymin = y+r*this.nexty1 + r*this.nextr1*this.child1.hymin;
			if (movement != 1)
			{
				
				if (vxmax < (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax))
				{
					vxmax = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax);
				}
				if (vxmin > (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin))
				{
					vxmin = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin);
				}
				if (vymax < (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax))
				{
					vymax = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax);
				}
				if (vymin > (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin))
				{
					vymin = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin);
				}
			}
		}
		else
		{
			vxmax = x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax;
			vxmin = x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin;
			vymax = y+r*this.nexty2 + r*this.nextr2*this.child2.hymax;
			vymin = y+r*this.nexty2 + r*this.nextr2*this.child2.hymin;
		}
	}
	else
	{
		vxmax = (x+r*(this.arcx+this.arcr));
		vxmin = (x+r*(this.arcx-this.arcr));
		vymax = (y+r*(this.arcy+this.arcr));
		vymin = (y+r*(this.arcy-this.arcr));
	}
	
	if (vxmax < (x+r*(this.bezsx+this.bezex)/2)) { vxmax = (x+r*(this.bezsx+this.bezex)/2); }
	if (vxmin > (x+r*(this.bezsx+this.bezex)/2)) { vxmin = (x+r*(this.bezsx+this.bezex)/2); }
	if (vymax < (y+r*(this.bezsy+this.bezey)/2)) { vymax = (y+r*(this.bezsy+this.bezey)/2); }
	if (vymin > (y+r*(this.bezsy+this.bezey)/2)) { vymin = (y+r*(this.bezsy+this.bezey)/2); }
	
	var ywsmult = ((ytargmax-ytargmin)/(vymax-vymin));//propmove;
	// the number we need to multply ws by to get the right size for a vertical fit
	var xwsmult = ((xtargmax-xtargmin)/(vxmax-vxmin));//propmove;
	// the number we need to multply ws by to get the right size for a horizontal fit
	var wsmult;
	if (ywsmult > xwsmult)
	{
		// we use xwsmult - the smaller
		wsmult = xwsmult;
	}
	else
	{
		// we use ywsmult - the smaller
		wsmult = ywsmult;
	}
	xp += (((xtargmax+xtargmin)/2.0)-((vxmax+vxmin)/2.0));
	yp += (((ytargmax+ytargmin)/2.0)-((vymax+vymin)/2.0));
	ws = ws*wsmult;
	xp = widthres/2 + (xp-widthres/2)*wsmult;
	yp = heightres/2 + (yp-heightres/2)*wsmult;
}

midnode.prototype.setxyr3r = function(xtargmin,xtargmax,ytargmin,ytargmax)
{
	
	ws = 1;
	xp = widthres/2;
	yp = heightres;
	var x = xp;
	var y = yp;
	var r = 220*ws;
	
	var vxmax;
	var vxmin;
	var vymax;
	var vymin;
	
	if (this.child1)
	{
		vxmax = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmax;
		vxmin = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmin;
		vymax = y+r*this.nexty1 + r*this.nextr1*this.child1.hymax;
		vymin = y+r*this.nexty1 + r*this.nextr1*this.child1.hymin;
		if (vxmax < (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax))
		{
			vxmax = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax);
		}
		if (vxmin > (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin))
		{
			vxmin = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin);
		}
		if (vymax < (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax))
		{
			vymax = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax);
		}
		if (vymin > (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin))
		{
			vymin = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin);
		}
	}
	else
	{
		vxmax = (x+r*(this.arcx+this.arcr));
		vxmin = (x+r*(this.arcx-this.arcr));
		vymax = (y+r*(this.arcy+this.arcr));
		vymin = (y+r*(this.arcy-this.arcr));
	}
	if (vxmax < (x+r*(this.bezsx+this.bezex)/2)) { vxmax = (x+r*(this.bezsx+this.bezex)/2); }
	if (vxmin > (x+r*(this.bezsx+this.bezex)/2)) { vxmin = (x+r*(this.bezsx+this.bezex)/2); }
	if (vymax < (y+r*(this.bezsy+this.bezey)/2)) { vymax = (y+r*(this.bezsy+this.bezey)/2); }
	if (vymin > (y+r*(this.bezsy+this.bezey)/2)) { vymin = (y+r*(this.bezsy+this.bezey)/2); }
	
	var ywsmult = ((ytargmax-ytargmin)/(vymax-vymin));//propmove;
	// the number we need to multply ws by to get the right size for a vertical fit
	var xwsmult = ((xtargmax-xtargmin)/(vxmax-vxmin));//propmove;
	// the number we need to multply ws by to get the right size for a horizontal fit
	var wsmult;
	if (ywsmult > xwsmult)
	{
		// we use xwsmult - the smaller
		wsmult = xwsmult;
	}
	else
	{
		// we use ywsmult - the smaller
		wsmult = ywsmult;
	}
	
	xp += (((xtargmax+xtargmin)/2.0)-((vxmax+vxmin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
	yp += (((ytargmax+ytargmin)/2.0)-((vymax+vymin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
	
	ws = ws*wsmult;
	xp = widthres/2 + (xp-widthres/2)*wsmult;
	yp = heightres/2 + (yp-heightres/2)*wsmult;
}

midnode.prototype.setxyr2 = function(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,movement,propmove,flynum)
{
	var vxmax;
	var vxmin;
	var vymax;
	var vymin;
	if (movement != 3)
	{
		vxmax = (x+r*(this.fxmax));//(x+r*(this.arcx+this.arcr));
		vxmin = (x+r*(this.fxmin));
		vymax = (y+r*(this.fymax));
		vymin = (y+r*(this.fymin));
	}
	else
	{
		if (this.child1)
		{
			vxmax = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmax;
			vxmin = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmin;
			vymax = y+r*this.nexty1 + r*this.nextr1*this.child1.hymax;
			vymin = y+r*this.nexty1 + r*this.nextr1*this.child1.hymin;
			if (vxmax < (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax))
			{
				vxmax = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax);
			}
			if (vxmin > (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin))
			{
				vxmin = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin);
			}
			if (vymax < (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax))
			{
				vymax = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax);
			}
			if (vymin > (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin))
			{
				vymin = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin);
			}
		}
		else
		{
			vxmax = (x+r*(this.arcx+this.arcr));
			vxmin = (x+r*(this.arcx-this.arcr));
			vymax = (y+r*(this.arcy+this.arcr));
			vymin = (y+r*(this.arcy-this.arcr));
		}
		if (vxmax < (x+r*(this.bezsx+this.bezex)/2)) { vxmax = (x+r*(this.bezsx+this.bezex)/2); }
		if (vxmin > (x+r*(this.bezsx+this.bezex)/2)) { vxmin = (x+r*(this.bezsx+this.bezex)/2); }
		if (vymax < (y+r*(this.bezsy+this.bezey)/2)) { vymax = (y+r*(this.bezsy+this.bezey)/2); }
		if (vymin > (y+r*(this.bezsy+this.bezey)/2)) { vymin = (y+r*(this.bezsy+this.bezey)/2); }
	}
	
	var ywsmult = ((ytargmax-ytargmin)/(vymax-vymin));//propmove;
	// the number we need to multply ws by to get the right size for a vertical fit
	var xwsmult = ((xtargmax-xtargmin)/(vxmax-vxmin));//propmove;
	// the number we need to multply ws by to get the right size for a horizontal fit
	var wsmult;
	if (ywsmult > xwsmult)
	{
		// we use xwsmult - the smaller
		wsmult = xwsmult;
	}
	else
	{
		// we use ywsmult - the smaller
		wsmult = ywsmult;
	}
	
	wsmult =Math.pow(wsmult,(1.0/propmove));
	var xpadd;
	var ypadd;
	
	if (Math.abs(wsmult-1) < 0.000001)
	{
		xpadd = (((xtargmax+xtargmin)/2.0)-((vxmax+vxmin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
		ypadd = (((ytargmax+ytargmin)/2.0)-((vymax+vymin)/2.0));//*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
	}
	else
	{
		xpadd = (((xtargmax+xtargmin)/2.0)-((vxmax+vxmin)/2.0))*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
		ypadd = (((ytargmax+ytargmin)/2.0)-((vymax+vymin)/2.0))*((1-(1/wsmult))/(1-(Math.pow((1/wsmult),propmove))));
	}
	xp+= xpadd;
	yp+= ypadd;
	ws = ws*wsmult;
	xp = widthres/2 + (xp-widthres/2)*wsmult;
	yp = heightres/2 + (yp-heightres/2)*wsmult;
}

midnode.prototype.move = function(xtargmin,xtargmax,ytargmin,ytargmax)
{
	if (this.targeted)
	{
		this.graphref = true;
		if (this.child1)
		{
			if (this.child1.targeted)
			{
				this.child1.move(xtargmin,xtargmax,ytargmin,ytargmax);
			}
			else
			{
				if (this.child2.targeted)
				{
					this.child2.move(xtargmin,xtargmax,ytargmin,ytargmax);
				}
				else
				{
					this.setxyr3r(40,widthres-40,40,heightres-40);
					this.setxyr3r(40,widthres-40,40,heightres-40);
				}
			}
		}
		else
		{
			this.setxyr3r(40,widthres-40,40,heightres-40);
			this.setxyr3r(40,widthres-40,40,heightres-40);
		}
	}
}

midnode.prototype.move3 = function(xtargmin,xtargmax,ytargmin,ytargmax)
{
	if (this.onroute)
	{
		if (this.child1)
		{
			if (this.child1.onroute)
			{
				this.child1.move3(xtargmin,xtargmax,ytargmin,ytargmax);
			}
			else
			{
				if (this.child2.onroute)
				{
					this.child2.move3(xtargmin,xtargmax,ytargmin,ytargmax);
				}
				else
				{
					this.setxyr3r(40,widthres-40,40,heightres-40);
					this.setxyr3r(40,widthres-40,40,heightres-40);
				}
			}
		}
		else
		{
			this.setxyr3r(40,widthres-40,40,heightres-40);
			this.setxyr3r(40,widthres-40,40,heightres-40);
		}
	}
}

midnode.prototype.move2 = function()
{
	if (this.dvar)
	{
		this.onroute = true;
		if ((!(this.gvar))&&(this.child1))
		{
			if (!((this.child1.dvar)&&(this.child2.dvar)))
			{
				if (this.child1.dvar)
				{
					this.child1.move2();
				}
				else
				{
					if (this.child2.dvar)
					{
						this.child2.move2();
					}
				}
			}
		}
	}
}

midnode.prototype.clearonroute = function()
{
	this.onroute = false;
	if (this.child1)
	{
		(this.child1).clearonroute();
		(this.child2).clearonroute();
	}
}

midnode.prototype.flyFB = function(xtargmin,xtargmax,ytargmin,ytargmax)
{
	var x = this.xvar;
	var y = this.yvar;
	var r = this.rvar;
	if (this.targeted)
	{
		if (this.flysofarB)
		{
			if (this.child1)
			{
				if (this.child1.targeted)
				{
					this.child1.flyFB(xtargmin,xtargmax,ytargmin,ytargmax);
				}
				else
				{
					if (this.child2.targeted)
					{
						this.child2.flyFB(xtargmin,xtargmax,ytargmin,ytargmax);
					}
					else
					{
						if (this.flysofarB )
						{
							if (flying)
							{
								clearTimeout(t);
								fulltree.searchtargetmark();
								flying = false;
							}
						}
						else
						{
							this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,3,countdownB,2);
							if (countdownB <= 1)
							{
								this.flysofarB = true;
								
								countdownB = length_intro_in2;
								
							}
							else
							{
								countdownB --;
							}
						}
					}
				}
			}
			else
			{
				if (this.flysofarB )
				{
					if (flying)
					{
						clearTimeout(t);
						fulltree.searchtargetmark();
						flying = false;
					}
				}
				else
				{
					this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,3,countdownB,2);
					if (countdownB <= 1)
					{
						this.flysofarB = true;
						
						countdownB = length_intro_in2;
						
					}
					else
					{
						countdownB --;
					}
				}
			}
		}
		else
		{
			if (this.child1)
			{
				if (this.child1.targeted)
				{
					this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,1,countdownB,2);
					if (countdownB <= 1)
					{
						this.flysofarB = true;
						countdownB = length_intro_in2;
						
					}
					else
					{
						countdownB --;
					}
				}
				else
				{
					if (this.child2.targeted)
					{
						this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,2,countdownB,2);
						if (countdownB <= 1)
						{
							this.flysofarB = true;
							
							countdownB = length_intro_in2;
							
						}
						else
						{
							countdownB --;
						}
					}
					else
					{
                        
						if (this.flysofarB )
						{
							if (flying)
							{
								clearTimeout(t);
								fulltree.searchtargetmark();
								flying = false;
							}
						}
						else
						{
							this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,3,countdownB,2);
							if (countdownB <= 1)
							{
								this.flysofarB = true;
								
								countdownB = length_intro_in2;
								
							}
							else
							{
								countdownB --;
							}
						}
					}
				}
			}
			else
			{
				if (this.flysofarB )
				{
					if (flying)
					{
						clearTimeout(t);
						fulltree.searchtargetmark();
						flying = false;
					}
				}
				else
				{
					this.setxyr2(x,y,r,xtargmin,xtargmax,ytargmin,ytargmax,3,countdownB,2);
					if (countdownB <= 1)
					{
						this.flysofarB = true;
						
						countdownB = length_intro_in2;
					}
					else
					{
						countdownB --;
					}
				}
			}
		}
	}
}

midnode.prototype.prepfly = function(x,y,r)
{
	if (this.targeted)
	{
		this.fxmax = this.gxmax;
		this.fxmin = this.gxmin;
		this.fymax = this.gymax;
		this.fymin = this.gymin;
		
		// nothing to do otherwise
		if (this.child1)
		{
			if (this.child1.targeted)
			{
				this.child1.prepfly(x+r*this.nextx1,y+r*this.nexty1,r*this.nextr1);
				if (this.fxmax < (this.nextx1+this.nextr1*this.child1.fxmax)) { this.fxmax = (this.nextx1+this.nextr1*this.child1.fxmax) }
				if (this.fxmin > (this.nextx1+this.nextr1*this.child1.fxmin)) { this.fxmin = (this.nextx1+this.nextr1*this.child1.fxmin) }
				if (this.fymax < (this.nexty1+this.nextr1*this.child1.fymax)) { this.fymax = (this.nexty1+this.nextr1*this.child1.fymax) }
				if (this.fymin > (this.nexty1+this.nextr1*this.child1.fymin)) { this.fymin = (this.nexty1+this.nextr1*this.child1.fymin) }
				
			}
			else
			{
				if (this.child2.targeted)
				{
					this.child2.prepfly(x+r*this.nextx2,y+r*this.nexty2,r*this.nextr2);
					if (this.fxmax < (this.nextx2+this.nextr2*this.child2.fxmax)) { this.fxmax = (this.nextx2+this.nextr2*this.child2.fxmax) }
					if (this.fxmin > (this.nextx2+this.nextr2*this.child2.fxmin)) { this.fxmin = (this.nextx2+this.nextr2*this.child2.fxmin) }
					if (this.fymax < (this.nexty2+this.nextr2*this.child2.fymax)) { this.fymax = (this.nexty2+this.nextr2*this.child2.fymax) }
					if (this.fymin > (this.nexty2+this.nextr2*this.child2.fymin)) { this.fymin = (this.nexty2+this.nextr2*this.child2.fymin) }
					
				}
				else
				{
					this.fxmax = this.hxmax;
					this.fxmin = this.hxmin;
					this.fymax = this.hymax;
					this.fymin = this.hymin;
				}
			}
		}
		else
		{
			this.fxmax = this.hxmax;
			this.fxmin = this.hxmin;
			this.fymax = this.hymax;
			this.fymin = this.hymin;
		}
	}
}



function performfly() {
	if (!flying) {
        if (viewtype == 2)
        {
            fulltree.deanchor();
            fulltree.graphref = true;
            fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
            fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
            wsinit = ws;
            draw2();
            fulltree.semiclearsearch();
            
            flying = true;
            
            performsearch2(false);
            
            if (fulltree.searchtarget() == -1) {
                searchinparts = [];
                performsearch2(false);
                fulltree.searchtarget()
            }
            fulltree.targeted = true;
            // fulltree.searchtargetmark();
            countdownB = length_intro_in2*2;
            fulltree.flysofarB = true;
            if (fulltree.child1) {
                if (fulltree.child1.targeted) {
                    if (((fulltree.child1).child1)
						&& ((fulltree.child1).child1.targeted || (fulltree.child1).child2.targeted)) {
                        fulltree.child1.flysofarB = true;
                    }
                }
                if (fulltree.child2.targeted) {
                    if (((fulltree.child2).child1)
						&& ((fulltree.child2).child1.targeted || (fulltree.child2).child2.targeted)) {
                        fulltree.child2.flysofarB = true;
                    }
                }
            }
            fulltree.prepfly(xp, yp, 220 * ws, 5);
            performfly2();
        }
        else
        {
            
            fulltree.clear_xyr_var(); // because otherwise the fly gets confused
            // in the place where null xvar, yvar and rvar indicate beyond scope
            // of drawing so extrapolate x, y and r based on current anchor
            fulltree.deanchor();
            fulltree.graphref = true;
            
            fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
            fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
            wsinit = ws;
            draw2();
            fulltree.semiclearsearch();
            
            flying = true;
            
            performsearch2(false);
            
            if (fulltree.searchtarget() == -1) {
                searchinparts = [];
                performsearch2(false);
                fulltree.searchtarget()
            }
            fulltree.targeted = true;
            // fulltree.searchtargetmark();
            
            fulltree.drawreg(xp,yp,220*ws);
            fulltree.get_xyr_target(xp,yp,220*ws);
            
            pre_xp = xp;
            pre_yp = yp;
            pre_ws = ws;
            
            intro_step_num = 0;
            intro_sec_step_num = 0;
            length_intro = Math.log(r_mult)*length_intro_in;
            num_intro_steps = length_intro;
            draw2();
            
            t = setTimeout('performflyB2()',100);
        }
	}
}

midnode.prototype.clear_xyr_var = function()
{
    if (this.child1)
    {
        this.child1.clear_xyr_var();
        this.child2.clear_xyr_var();
    }
    this.xvar = null;
    this.yvar = null;
    this.rvar = null;
}

function performfly2()
{
	fulltree.drawreg(xp,yp,220*ws);
	fulltree.flyFB(40,widthres-40,40,heightres-40);
	draw2();
	if (flying)
	{
		t = setTimeout('performfly2()',100);
	}
    else
    {
        if (introlock)
        {
            introlock = false;
            search_init_end();
            animation_status = 2;
            draw2();
        }
        else if (flying)
        {
            fulltree.searchtargetmark();
            flying = false;
        }
    }
}


function performflyC() {
    introlock = true;
    flying = true;
	fulltree.deanchor();
    fulltree.graphref = true;
    fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
    fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
    wsinit = ws;
    fulltree.drawreg(xp,yp,220*ws);
    
    fulltree.get_xyr_target(xp,yp,220*ws);
    
    countdownB = length_intro_in2*2;
    fulltree.flysofarB = true;
    if (fulltree.child1) {
        if (fulltree.child1.targeted) {
            if (((fulltree.child1).child1)
                && ((fulltree.child1).child1.targeted || (fulltree.child1).child2.targeted)) {
                fulltree.child1.flysofarB = true;
            }
        }
        if (fulltree.child2.targeted) {
            if (((fulltree.child2).child1)
                && ((fulltree.child2).child1.targeted || (fulltree.child2).child2.targeted)) {
                fulltree.child2.flysofarB = true;
            }
        }
    }
    fulltree.prepfly(xp, yp, 220 * ws, 5);
    performfly2();
    
}

// targets (global variables but not paramters to be set
var x_add;
var y_add;
var r_mult;
var pre_xp;
var pre_yp;
var pre_ws;

var length_intro;
var num_intro_steps; // total animation steps
var intro_step_num; // number of steps into animation overall
var intro_sec_step_num; // number of steps in this section of the animation (each time we reroot the tree we're in a new section)

function performflyB() {
    introlock = true;
	fulltree.deanchor();
    fulltree.graphref = true;
    fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
    fulltree.setxyr(xp, yp, 220 * ws, 20, widthres - 2, 20, heightres, 0, 1);
    wsinit = ws;
    fulltree.drawreg(xp,yp,220*ws);
    
    fulltree.get_xyr_target(xp,yp,220*ws);
    pre_xp = xp;
    pre_yp = yp;
    pre_ws = ws;
    
    intro_step_num = 0;
    intro_sec_step_num = 0;
    length_intro = Math.log(r_mult)*length_intro_in;
    num_intro_steps = length_intro;
    
    
    draw2();
    t = setTimeout('performflyB2()',100);
}


function continue_flyB() {
    clearTimeout(t);
    intro_sec_step_num = 0;
    num_intro_steps = length_intro-intro_step_num;
    
    fulltree.get_xyr_target(xp,yp,220*ws);
    pre_xp = xp;
    pre_yp = yp;
    pre_ws = ws;
    
    t = setTimeout('performflyB2()',100);
}


function performflyB2() {
    
    if ((intro_step_num <= length_intro)&&(introlock||flying))
    {
        auto_pan_zoom(intro_sec_step_num/num_intro_steps,intro_sec_step_num/num_intro_steps);
        draw2();
        intro_step_num ++;
        intro_sec_step_num ++;
        clearTimeout(t);
        t = setTimeout('performflyB2()',100);
    }
    else
    {
        if (introlock)
        {
            introlock = false;
            search_init_end();
            animation_status = 2;
            draw2();
        }
        else if (flying)
        {
            fulltree.searchtargetmark();
            flying = false;
        }
    }
}

search_init_end = function()
{
    animation_status = 2;
    justopened = true;
    draw2();
    if ($('#myCanvas').attr('data_status') != 'embedded' 
    	&& $('#myCanvas').attr('data_status') != 'embedded_front')
    	document.getElementById("closebutton").style.display = '';
    setTimeout('cancelfirstuse()',5000);
}

midnode.prototype.get_xyr_target = function(x2,y2,r2)
{
    var border = Math.max(40*2/heightres,40*2/widthres); // portion of view reserved for border left and right
    
    var x,y,r;
    if(this.rvar)
    {
        x = this.xvar;
        y = this.yvar;
        r = this.rvar;
    }
    else
    {
        x=x2;
        y=y2;
        r=r2;
    }
    
    var target_this = false;
    
    if (this.targeted)
	{
		// nothing to do otherwise
		if (this.child1)
		{
			if (this.child1.targeted)
			{
				this.child1.get_xyr_target(x+r*this.nextx1,y+r*this.nexty1,r*this.nextr1);
			}
			else
			{
				if (this.child2.targeted)
				{
					this.child2.get_xyr_target(x+r*this.nextx2,y+r*this.nexty2,r*this.nextr2);
				}
				else
				{
                    target_this = true;
				}
			}
		}
		else
		{
            target_this = true;
		}
	}
    
    if (target_this)
    {
        /* this vx part is copied from move routines above*/
        var vxmax;
        var vxmin;
        var vymax;
        var vymin;
        
        if (this.child1)
        {
            vxmax = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmax;
            vxmin = x+r*this.nextx1 + r*this.nextr1*this.child1.hxmin;
            vymax = y+r*this.nexty1 + r*this.nextr1*this.child1.hymax;
            vymin = y+r*this.nexty1 + r*this.nextr1*this.child1.hymin;
            if (vxmax < (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax))
            {
                vxmax = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmax);
            }
            if (vxmin > (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin))
            {
                vxmin = (x+r*this.nextx2 + r*this.nextr2*this.child2.hxmin);
            }
            if (vymax < (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax))
            {
                vymax = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymax);
            }
            if (vymin > (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin))
            {
                vymin = (y+r*this.nexty2 + r*this.nextr2*this.child2.hymin);
            }
        }
        else
        {
            vxmax = (x+r*(this.arcx+this.arcr));
            vxmin = (x+r*(this.arcx-this.arcr));
            vymax = (y+r*(this.arcy+this.arcr));
            vymin = (y+r*(this.arcy-this.arcr));
        }
        if (vxmax < (x+r*(this.bezsx+this.bezex)/2)) { vxmax = (x+r*(this.bezsx+this.bezex)/2); }
        if (vxmin > (x+r*(this.bezsx+this.bezex)/2)) { vxmin = (x+r*(this.bezsx+this.bezex)/2); }
        if (vymax < (y+r*(this.bezsy+this.bezey)/2)) { vymax = (y+r*(this.bezsy+this.bezey)/2); }
        if (vymin > (y+r*(this.bezsy+this.bezey)/2)) { vymin = (y+r*(this.bezsy+this.bezey)/2); }
        
        var x_targ_max = vxmax;
        var x_targ_min = vxmin;
        var y_targ_max = vymax;
        var y_targ_min = vymin;
        
        // find out if new target area is constained by x or y axis compared to current view
        if ((widthres/heightres)>((x_targ_max-x_targ_min)/(y_targ_max-y_targ_min)))
        {
            // height controls size
            r_mult = heightres/(y_targ_max-y_targ_min)/(1+2*border);
        } else {
            // width controls size
            r_mult = widthres/(x_targ_max-x_targ_min)/(1+2*border);
        }
        x_add = (x_targ_max+x_targ_min-widthres)/2;
        y_add = (y_targ_max+y_targ_min-heightres)/2;
        
    }
};

auto_pan_zoom = function(prop_p,prop_z)
{
    
    var centreY = y_add+heightres/2;
    var centreX = x_add+widthres/2;
	ws = pre_ws*(Math.pow(r_mult,prop_z));
	xp = centreX + (pre_xp-centreX)*(Math.pow(r_mult,prop_z)) - x_add*prop_p;
	yp = centreY + (pre_yp-centreY)*(Math.pow(r_mult,prop_z)) - y_add*prop_p;
};


/**********************************************\
 *
 *       Block: Popup code
 *
 \**********************************************/

// *** THIS IS PART OF THE UI WRAPPER ***

// Purpose: manages the pop up messages at the top of the screen called when people mouseover and removed on mouseout

// Use of global variables read here:
// buttonoptions tells us which search bar is open at the bottom of the page

// use of global variables written here:
// popuptext is drawn on the top right hand side of the screen when set
// popuptext2 is drawn on the top left hand side of the screen when set
// justopened tells us if the page was just opened and the user has not interacted yet

// use of global functions:
// draw2() redraws the page taking into account the new settings for popuptext and popuptext2

// notes: in user settings I've added functions for adding organisation specific logos here

function popup_search()
{
    if (!introlock)
    {
        justopened = false;
        if (buttonoptions == 1)
        {
            popuptext = "Close search bar";
        }
        else
        {
            popuptext = "Open search bar";
        }
        draw2();
    }
};

function popup_grow()
{
    if (!introlock)
    {
        justopened = false;
        if (buttonoptions == 2)
        {
            popuptext = "Close growth animation bar";
        }
        else
        {
            popuptext = "Open growth animation bar";
        }
        
        draw2();
    }
};

function popup_view()
{
    if (!introlock)
    {
        justopened = false;
        if (buttonoptions == 3)
        {
            popuptext = "Close view options bar";
        }
        else
        {
            popuptext = "Open view options bar";
        }
        
        draw2();
    }
};

function popup_reset()
{
    if (!introlock)
    {
        var text;
        if ($('#myCanvas').attr('data_status') == 'embedded'
            && (animation_status != -1)
            && (animation_status != -3)) {
            text = "Replay animation";
        } else
            text = "Reset";
        
        if ($('#myCanvas').attr('data_status') == 'embedded'
            && (animation_status == 0)) {
            text = null;
        }
        
        justopened = false;
        popuptext = text;
        draw2();
    }
};

function popup_fullscreen()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Open in full screen";
        draw2();
    }
};

function popup_tutorial()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Open tutorial window";
        draw2();
    }
};

function popup_more()
{
    if (!introlock)
    {
        justopened = false;
        if (buttonoptions == 5)
        {
            popuptext = "Close more options bar";
        }
        else
        {
            popuptext = "Open more options bar";
        }
        draw2();
    }
};

function popup_twitter()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Follow us on Twitter";
        draw2();
    }
};

function popup_shape()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Change fractal shape";
        draw2();
    }
};

function popup_facebook()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Like us on Facebook";
        draw2();
    }
};

function popup_OZsite()
{
    if (!introlock)
    {
        justopened = false;
        popuptext2 = "See more trees on OneZoom";
        draw2();
    }
};

function popup_Logo1()
{
    if (!introlock)
    {
        justopened = false;
        popuptext2 = text_URL;
        draw2();
    }
};

function popup_AboutOZ()
{
    if (!introlock)
    {
        justopened = false;
        popuptext2 = "Read more about this page";
        draw2();
    }
};

function popup_Zoomin()
{
    if (!introlock)
    {
        justopened = false;
        if (zoominnum >0)
        {
            popuptext = "Click or scroll up to zoom in";
            draw2();
        }
    }
};

function popup_Zoomout()
{
    if (!introlock)
    {
        justopened = false;
        if(zoomoutnum >0)
        {
            popuptext = "Click or scroll down to zoom out";
            draw2();
        }
    }
};

function popup_home()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = "Goto OneZoom, see more trees";
        draw2();
    }
};

function popup_out()
{
    if (!introlock)
    {
        justopened = false;
        popuptext = null;
        popuptext2 = null;
        draw2();
    }
};


/**********************************************\
 *
 *       Block: Button Control
 *
 \**********************************************/


// BUTTON CONTROL

function clearbuttons()
{
	document.getElementById("growtxt").style.display = 'none';
	document.getElementById("viewtxt").style.display = 'none';
	document.getElementById("viewtxt2").style.display = 'none';
	document.getElementById("searchtxt").style.display = 'none';
    document.getElementById("moretxt").style.display = 'none';
    
	document.getElementById("detailincbutton").style.display = 'none';
	document.getElementById("detaildecbutton").style.display = 'none';
	document.getElementById("info button").style.display = 'none';
	document.getElementById("formbutton").style.display = 'none';
	document.getElementById("colourbutton").style.display = 'none';
    document.getElementById("spbutton").style.display = 'none';
    document.getElementById("namebutton").style.display = 'none';
	document.getElementById("polybutton").style.display = 'none';
	
    document.getElementById("growtitle").style.display = 'none';
	document.getElementById("revgbutton").style.display = 'none';
	document.getElementById("pausegbutton").style.display = 'none';
	document.getElementById("playgbutton").style.display = 'none';
	document.getElementById("startgbutton").style.display = 'none';
	document.getElementById("endgbutton").style.display = 'none';
	
	document.getElementById("searchtf").style.display = 'none';
	document.getElementById("searchbutton").style.display = 'none';
	document.getElementById("searchbutton2").style.display = 'none';
	document.getElementById("leapbutton").style.display = 'none';
	document.getElementById("flybutton").style.display = 'none';
	document.getElementById("latincheckbox").style.display = 'none';
	document.getElementById("latintxt").style.display = 'none';
	document.getElementById("commoncheckbox").style.display = 'none';
	document.getElementById("commontxt").style.display = 'none';
	document.getElementById("traitcheckbox").style.display = 'none';
	document.getElementById("traittxt").style.display = 'none';
	document.getElementById("flightcheckbox").style.display = 'none';
	document.getElementById("flighttxt").style.display = 'none';
    document.getElementById("markingscheckbox").style.display = 'none';
	document.getElementById("markingstxt").style.display = 'none';
    document.getElementById("numhittxt").style.display = 'none';
    document.getElementById("searchclearbutton").style.display = 'none';
    
    document.getElementById("skip_into_button").style.display = 'none';
    document.getElementById("replay_into_button").style.display = 'none';
    document.getElementById("stop_into_button").style.display = 'none';
    
	document.getElementById("datatxt").style.display = 'none';
	document.getElementById("datatxtin").style.display = 'none';
	document.getElementById("databutton").style.display = 'none';
    
    document.getElementById("closebutton").style.display = 'none';
}

function reopenbuttons()
{
    if (((growing)||(growingpause))&&(buttonoptions == 0))
    {
        document.getElementById("endgbutton").style.display = '';
    }
    else
    {
        if (( buttonoptions == 0)&&(infotype != 0))
        {
            document.getElementById("closebutton").style.display = '';
        }
    }
}

function Closebar()
{
    if (!introlock)
    {
        // allow this when intro lock is on because we may wish to close the intro bar
        if (( buttonoptions == 0)&&(infotype != 0))
        {
            infotype = 0
            document.getElementById("viewtxt2").style.display = 'none';
            widthofcontrols -= 100;
        }
        clearbuttons();
        buttonoptions = 0;
        reopenbuttons();
        Resize();
    }
}

function init_bar()
{
    buttonoptions = 7;
    document.getElementById("skip_into_button").style.display = '';
    document.getElementById("stop_into_button").style.display = '';
    document.getElementById("replay_into_button").style.display = '';
    
}

function searchoptions()
{
    if (!introlock)
    {
        justopened = false;
        clearbuttons();
        if (buttonoptions == 1)
        {
            buttonoptions = 0;
            popuptext = "Open search bar";
            reopenbuttons();
        }
        else
        {
            buttonoptions = 1;
            document.getElementById("closebutton").style.display = '';
            document.getElementById("searchtxt").style.display = '';
            document.getElementById("searchtf").style.display = '';
            document.getElementById("searchbutton").style.display = '';
            document.getElementById("flightcheckbox").style.display = '';
            document.getElementById("flighttxt").style.display = '';
            //document.getElementById("markingscheckbox").style.display = '';
            //document.getElementById("markingstxt").style.display = '';
            document.getElementById("numhittxt").style.display = '';
            document.getElementById("latincheckbox").style.display = '';
            document.getElementById("latintxt").style.display = '';
            document.getElementById("searchclearbutton").style.display = '';
            document.getElementById("commoncheckbox").style.display = '';
            document.getElementById("commontxt").style.display = '';
            //document.getElementById("traitcheckbox").style.display = '';
            //document.getElementById("traittxt").style.display = '';
            popuptext = "Close search bar";
        }
        Resize();
    }
}

function growoptions()
{
    if (!introlock)
    {
        justopened = false;
        clearbuttons();
        if (buttonoptions == 2)
        {
            buttonoptions = 0;
            popuptext = "Open growth animation bar";
            reopenbuttons();
        }
        else
        {
            buttonoptions = 2;
            document.getElementById("closebutton").style.display = '';
            document.getElementById("growtitle").style.display = '';
            document.getElementById("growtxt").style.display = '';
            document.getElementById("revgbutton").style.display = '';
            document.getElementById("pausegbutton").style.display = '';
            document.getElementById("playgbutton").style.display = '';
            document.getElementById("endgbutton").style.display = '';
            if ((!growingpause) && (!growing))
            {
                growplay();
            }
            popuptext = "Close growth animation bar";
        }
        Resize();
    }
}

function viewoptions()
{
    if (!introlock)
    {
        justopened = false;
        clearbuttons();
        if (buttonoptions == 3)
        {
            buttonoptions = 0;
            popuptext = "Open view options bar";
            reopenbuttons();
        }
        else
        {
            buttonoptions = 3;
            document.getElementById("viewtxt").style.display = '';
            document.getElementById("closebutton").style.display = '';
            document.getElementById("formbutton").style.display = '';
            document.getElementById("colourbutton").style.display = '';
            document.getElementById("spbutton").style.display = '';
            document.getElementById("namebutton").style.display = '';
            popuptext = "Close view options bar";
        }
        Resize();
    }
}

function moreoptions()
{
    if (!introlock)
    {
        justopened = false;
        clearbuttons();
        if (buttonoptions == 5)
        {
            buttonoptions = 0;
            popuptext = "Open more options bar";
            reopenbuttons();
        }
        else
        {
            buttonoptions = 5;
            document.getElementById("moretxt").style.display = '';
            document.getElementById("closebutton").style.display = '';
            document.getElementById("info button").style.display = '';
            document.getElementById("detailincbutton").style.display = '';
            document.getElementById("detaildecbutton").style.display = '';
            document.getElementById("polybutton").style.display = '';
            if (infotype != 0)
            {
                document.getElementById("viewtxt2").style.display = '';
            }
            popuptext = "Close more options bar";
        }
        Resize();
    }
}

function dataoptions()
{
    if (!introlock)
    {
        justopened = false;
        clearbuttons();
        if (buttonoptions == 4)
        {
            buttonoptions = 0;
            reopenbuttons();
        }
        else
        {
            document.getElementById("closebutton").style.display = '';
            document.getElementById("datatxt").style.display = '';
            document.getElementById("datatxtin").style.display = '';
            document.getElementById("databutton").style.display = '';
            buttonoptions = 4;
        }
        Resize();
    }
}

// change use of info display
function toggledisplay()
{
    
	if (infotype == 0)
	{
		widthofcontrols += 100;
		infotype = 3
		document.getElementById("viewtxt2").style.display = '';
	}
	else
	{
		if (infotype == 3)
		{
			infotype = 4
			document.getElementById("viewtxt2").style.display = '';
		}
		else
		{
			infotype = 0
			document.getElementById("viewtxt2").style.display = 'none';
			widthofcontrols -= 100;
		}
	}
	Resize();
}

// change level of detail in display
function detailup()
{
	if (threshold > 0.6)
	{
		threshold = threshold / 2.0;
	}
	draw2();
}

function detaildown()
{
	if (threshold < 3.9)
	{
		threshold = threshold*2.0;
	}
	draw2();
}

// change fractal form of display
function form_change()
{
    if (!introlock)
    {
        shapechanged = true;
        clearTimeout(t);
        flying = false;
        if (viewtype == 1)
        {
            viewtype = 2;
        }
        else
        {
            if (viewtype == 2)
            {
                viewtype = 3;
            }
            else
            {
                if (viewtype == 3)
                {
                    viewtype = 4;
                }
                else
                {
                    viewtype = 1;
                }
            }
        }
        draw_loading();
        setTimeout('form_change2()',1);
    }
}

function form_change2()
{
    if (!introlock)
    {
        update_form();
        Resize();
        Reset();
        if((genus_URL||taxa_URL))
        {
            highlight_search = true;
            fulltree.search_URLinit();
            if(genus2_URL||taxa2_URL)
            {
                fulltree.search_URLinit2();
            }
            draw2();
        }
    }
}

// change the way polytomies are displayed
function polyt_change()
{
	if (polytype == total_num_polyt)
	{
		polytype = 1;
	}
	else
	{
		polytype ++;
	}
	draw2();
}

// change colour scheme
function colour_change()
{
	if (colourtype == total_num_cols)
	{
		colourtype = 1;
	}
	else
	{
		colourtype ++;
	}
	draw2();
}

function name_change()
{
    if (commonlabels == true)
    {
        commonlabels = false;
    }
    else
    {
        commonlabels = true;
    }
    draw2();
}

function signpost_change()
{
    if (drawsignposts == true)
    {
        drawsignposts = false;
        thresholdtxt =1.5;
    }
    else
    {
        drawsignposts = true;
        thresholdtxt =2;
    }
    
    draw2();
}

function Link2OZ()
{
    if (!introlock)
    {
        justopened = false;
//        window.location.href = "http://www.onezoom.org";
        window.location.href = "./index.htm";
    }
}

function Link2Facebook()
{
    if (!introlock)
    {
        justopened = false;
        mywindow = window.open("http://www.facebook.com/OneZoomTree");
    }
}

function Link2Twitter()
{
    if (!introlock)
    {
        justopened = false;
        mywindow = window.open("https://twitter.com/OneZoomTree");
    }
}

function Link2Logo1()
{
    if (!introlock)
    {
        justopened = false;
        if (url_URL.indexOf('http') == 0)	
        	window.location.href = url_URL;
        else
        	window.location.href = "https://" + url_URL;
    }
}

function tutorialstart()
{
    if (!introlock)
    {
        justopened = false;
        mywindow = window.open("http://www.onezoom.org/tutorial2.htm");
        popup_out();
    }
}

function button_zoomin() {	
	if (typeof use_image_before_loading != 'undefined') 
		use_image_before_loading = false;
		
	if (animation_status == -1) animation_status = -3;
    else if (animation_status == 2) animation_status = -2;
	else if (animation_status == 0) animation_status = 1;
	else if (animation_status == 1) return;
	
	if (draft_only == true) {
		draft_only = false;
		init();
		return;
	}
	
	CZoomin();
}

function button_zoomout() {	
	if (typeof use_image_before_loading != 'undefined') 
		use_image_before_loading = false;
		
	if (animation_status == -1) animation_status = -3;
    else if (animation_status == 2) animation_status = -2;
	else if (animation_status == 0) animation_status = 1;
	else if (animation_status == 1) return;
	
	if (draft_only == true) {
		draft_only = false;
		init();
		return;
	}
	
	CZoomout();
}

function open_another_window() {
	var search;
	if( window.location.search.length > 1)
		search = window.location.search;
	else
		search = window.location.hash;
	window.open(file_name + '.htm' + search);
}