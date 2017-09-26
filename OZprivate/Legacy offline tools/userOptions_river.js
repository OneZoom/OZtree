
/* setting basic code variables - note there are defaults elsewhere so this is all optional */

var draft_only = false;
var metadata_cnp_leaf = 1; // the column of metadata where common names are found for leaves
var metadata_cnp_node = 1; // the column of metadata where common names are found for nodes
// both offset by one so put 1 for the first column which will be indexed as 0

var UserOptions = {
    
    // h1 col / hrcol combo good is rgb(130,190,220) and white
    
    
    'polytype': 3,
    'viewtype': 1,
    'colourtype' : 1,
    'commonlabels' : 'false',
    'drawsignposts' : 'true',
    'leaftype' : 2,
    'int_highlight_type' : 2,
    'fonttype' : 'Helvetica',
    'intcircdraw' : 'true',
    'sign_background_size' : 0.35,
    'sign_text_size' : 0.265,
    'pieborder' : 0.12,
    'partl2' : 0.1,
    'total_num_polyt' : 3,
    'total_num_cols' : 3,
    'sensitivity' : 0.84,
    'sensitivity3' : 0.9,
    'sensitivity2' : 0.88,
    'mintextsize' : 4,
    'threshold' :2,
    'thresholdtxt' :2,
    'growthtimetot' : 30,
    'allowurlparse' : 'true',
    'length_init_zoom2' : 30,
    'init_zoom_speed' : 1.1,
    'length_intro_in' : 15,
    'length_intro_in2' : 8,
    
    'leaf_outline_def' : 'rgb(0,150,30)',
    'leaf_fill_def' : 'rgb(0,100,0)',
    'leaf_text_col_def' : 'rgb(255,255,255)',
    'brown_branch_def' : 'rgb(100,75,50)',
    'signpost_col_def' : 'rgba(255,255,255,0.5)',
    'signpost_txtcol_def' : 'rgb(0,0,0)',
    'popupbox_col' : 'rgba(0,0,0,0.85)',
    'popupbox_txtcol' : 'rgb(255,255,255)',
    'loading_txtcol' : 'rgb(0,0,0)',
    'pie_background_color' : 'rgb(255,255,255)',
    'link_background_color' : 'rgb(255,255,255)',
    'link_highlight_color' : 'rgb(0,0,0)',
    'intnodetextcolor' : 'rgb(255,255,255)',
    'backgroundcolor' : 'rgb(220,235,255)',
    'outlineboxcolor' : 'rgb(0,0,0)',
    'highlightcolor1' : 'rgba(255,255,255,0.6)',
    'highlightcolor2' : 'rgb(190,140,70)',
};

/* set partner profiles for easy URL linking */

var PartnerProfiles =
[,
 
 {
    'profilename' : 'DL',
 
    'init' : 1,
    'url' : 'http://www.DiscoverLife.org',
    'text' : 'Link to Discover Life',
    'name' : 'Discover Life',
 
    'logo' : 'logos/DL_logo.png',
 
    'leaf_link_priority': 2,
    'node_link_priority': 2,
  },
 
 {
    'profilename' : 'EOL',
 
    'init' : 1,
    'url' : 'http://www.EOL.org',
    'text' : 'Link to EOL',
    'name' : 'EOL',
 
    'leaf_link_priority': 3,
    'node_link_priority': 3,

 },
 
 {
    'profilename' : 'Wiki',

    'init' : 1,
    'url' : 'http://www.wikipedia.org',
    'text' : 'Link to Wikipedia',
    'name' : 'Wikipedia',

 
    'leaf_link_priority': 1,
    'node_link_priority': 1,
 },
 
 {
    'profilename' : '4Apes',
 
    'logo' : 'logos/4apes_logo.png',
 
    'init' : 1,
    'url' : 'http://www.4apes.com',
    'text' : 'Link to Ape Alliance',
    'name' : 'Ape Alliance',

 },
 
 {
 'profilename' : 'MOL',
 

 'init' : 1,
 'url' : 'http://www.mol.org',
 'text' : 'Link to Map of Life',
 'name' : 'Map of Life',
 'logo' : 'http://www.mol.org/sites/all/themes/mol_beep_edition/logo.png',
 'leaf_link_priority': 4,
 },
 
];

/* linking to other sites */

// 1.) link condition - data that must be present to draw the link
// 2.) in new window?
// 3.) name
// 4.) link location leaf in format
// http://en.wikipedia.org/wiki/||genus||_||species||
// link location node in format
// http://en.wikipedia.org/wiki/||name||_||IUCN|| (where iucn is in the header of the metadata file)
// note: blank indicates no link

var linkSet = {
    
    // use -1 to indicate no priority
    
    // codes for column 1:
    // -1 means needs genus/species (if leaf) needs name (if node)
    // -2 means no condition at all
    // 0-n means condition is that element of the metacode for the appropriate leaf / node
    
    // note that because js confuses 0 and null I use indexing of 1-n
    // to refer to these arrays in the link priority ranks above
    
    'leaf':
    [
     [-1,true,"Wikipedia","http://en.wikipedia.org/wiki/||genus||_||species||"],

     [-1,true,"Discover Life","http://www.discoverlife.org/mp/20q?search=||genus||+||species||&burl=www.onezoom.org&btxt=Back+to+OneZoom&bi=www.onezoom.org/logos/OZ_logo.png"],
      [-1,true,"EOL","http://www.eol.org/search?q=||genus||+||species||"],
      [-1,true,"Map of Life","http://map.mol.org/maps/||genus||_||species||"],
     [-1,true,"ARKive","http://www.arkive.org/explore/species?q=||genus||%20||species||"]
     ],
    
    'node':
    [
     [-1,true,"Wikipedia","http://en.wikipedia.org/wiki/||name||"],
     [-1,true,"Discover Life","http://www.discoverlife.org/mp/20q?search=||name||&burl=www.onezoom.org&btxt=Back+to+OneZoom&bi=www.onezoom.org/logos/OZ_logo.png"],
     [-1,true,"EOL","http://www.eol.org/search?q=||name||"],
     [-1,true,"ARKive","http://www.arkive.org/explore/species?q=||name||"]
     
     ],
    
    //http://species.wikimedia.org/wiki/Sarracenia_minor
    
};

var creditsText =
[
                   
     [3,"OneZoom Tree of Life Explorer"],
     [2,"www.OneZoom.org"],
     [2,"Online code version 1.2 (2013)"],

     [2,],
 
     [2,"A project based at Imperial College London"],
     [1,],
     [2,"Funded by the Natural Environment Reseach Council"],
 
     [2,],
 
     [2,"Created and developed by"],
     [2,"James Rosindell"],
     [1,],
     [2,"With scientific advice from"],
     [2,"Luke Harmon"],
     [1,],
     [2,"With software development assistance from"],
     [2,"Kai Zhong"],
 [1,],
 [2,"Special thanks to"],
 [1,],
 [2,"Duncan Gillies  ,  Laura Nunes  and  Yan Wong"],
 
     [2,],
 
     [3,"Data sources"],
  [1,],
 [2.2,"Conservation status data"],
 [1.8,"The IUCN Red List of Threatened Species. Version 2012.1."],
 [1.8,"IUCN, Available from http://www.iucnredlist.org. (2012)"],
  [1,],
 [2.2,"Mammal data"],
 [1.8,"Bininda-Emonds OR, Cardillo M, Jones KE, MacPhee RD, Beck RM, et al."],
 [1.8,"The delayed rise of present-day mammals."],
 [1.8,"Nature 446: 507-512. (2007)"],
 [1,],
 [2.2,"Bird data"],
 [1.8,"Jetz W, Thomas GH, Joy JB, Hartmann K, Mooers AO"],
 [1.8,"The global diversity of birds in space and time"],
 [1.8,"Nature 491: 444-448 (2012)"],
 [1.8,"Also see www.birdtree.org"],
 [1,],
 [2.2,"Amphibian data"],
 [1.8,"Isaac NJB, Redding DW, Meredith HM and Safi K"],
 [1.8,"Phylogenetically-Informed Priorities for Amphibian Conservation"],
 [1.8,"PLoS One (2012)"],
  [1,],
 [2.2,"Squamate data (excluding snakes)"],
 [1.8,"Bergmann PJ, Irschick, DJ"],
 [1.8,"Vertebral Evolution and the Diversification of Squamate Reptiles"],
 [1.8,"Evolution 66(4) (2012)"],
  [1,],
 [2.2,"Snake data"],
 [1.8,"Pyron RA, Kandambi HKD, Hendry CR, Pushpamal V, Burbrink FT and Somaweera R."],
 [1.8,"Genus-level molecular phylogeny of snakes reveals"],
  [1.8,"the origins of species richness in Sri Lanka."],
 [1.8,"Molecular Phylogenetics and Evolution 66: 969-978 (2013)"],
  [1,],
 [2.2,"Testudine data"],
 [1.8,"Jaffe AL, Slater GJ and Alfaro ME"],
 [1.8,"The evolution of island gigantism and body size variation in tortoises and turtles."],
 [1.8,"Biology Letters (7) doi: 10.1098/rsbl.2010.1084 (2011)"],
  [1,],
 [2.2,"Crocodilian data"],
 [1.8,"Oaks JR"],
 [1.8,"A time-calibrated species tree of crocodylia"],
[1.8,"reveals a recent radiation of the true crocodiles"],
 [1.8,"Evolution doi:10.1111/j.1558-5646.2011.01373.x (2011)"],
 [1,],
 [2.2,"Dates of common ancestry between clades"],
 [1.8,"Hedges SB, Dudley J and Kumar S"],
 [1.8,"TimeTree: A public knowledge-base of divergence times among organisms."],
 [1.8,"Bioinformatics 22: 2971-2972 (2006)"],
 [1.8,"Also see www.timetree.org"],
 [1,],
 
 [2.2,"Original OneZoom publication reference"],
 [1.8,"Rosindell J and Harmon LJ"],
 [1.8,"OneZoom: A Fractal Explorer for the Tree of Life"],
 [1.8,"PLoS Biology DOI: 10.1371/journal.pbio.1001406 (2012)"],
 
  [2,],
    [2,"Please go to www.OneZoom.org/about.htm for further details"],
    [1,],
    [3,"Thank you for using OneZoom"],
];

/* colour functions */

midnode.prototype.leafcolor1 = function(){
    // for the leaf fill

	if (colourtype == 3){
        return (this.branchcolor());
    }
    else if ((colourtype == total_num_cols)&&(l1col_URL)){
        return (l1col_URL);
    } else {
        return (leaf_fill_def); // leaf default fill color
    }
};

midnode.prototype.leafcolor2 = function(){
    // for the leaf outline
    if (colourtype == 3){
        return (this.branchcolor());
    }
    else if ((colourtype == total_num_cols)&&(l2col_URL)){
        return (l2col_URL);
    } else {
        return (leaf_outline_def); // leaf default outline color
    }
};

midnode.prototype.leafcolor3 = function(){
    if ((colourtype == total_num_cols)&&(txtcol_URL)){
        return (txtcol_URL);
    } else {
        return (leaf_text_col_def); // for the leaf text
    }
};

midnode.prototype.nodetextcol = function(){
    if ((colourtype == total_num_cols)&&(txtcol_URL)){
        return (txtcol_URL);
    } else {
        return (intnodetextcolor); // for the leaf text
    }
};

midnode.prototype.branchcolor = function(){
    // this script sets the colours of the branches
    var colortoreturn = brown_branch_def;
    if (colourtype == 2) // there are two different color schemes in this version described by the colourtype variable
    {
        // this.lengthbr is the date of the node
        // timelim is the cut of date beyond which the tree is not drawn (when using growth animation functions
        if ((this.lengthbr<150.8)&&(timelim<150.8)){
            colortoreturn =  'rgb(180,50,25)';
        }
        if ((this.lengthbr<70.6)&&(timelim<70.6)){
            colortoreturn =  'rgb(50,25,50)';
        }
    }
    else if (colourtype == 3)
    {
        if (draft_only)
        {
            if (this.child1)
            {
                colortoreturn =  redlistcolor(metadata.node_meta[this.metacode][1]);
            }
            else
            {
                colortoreturn =  redlistcolor(metadata.leaf_meta[this.metacode][1]);
            }
        }
        else
        {
            var conservation = (4*(this.num_CR) + 3*(this.num_EN) + 2*(this.num_VU) + this.num_NT);
            var num_surveyed = (this.num_CR + this.num_EN + this.num_VU + this.num_NT + this.num_LC);
            
            if (num_surveyed == 0)
            {
                if (((this.num_NE >= this.num_DD) && (this.num_NE >= this.num_EW))
                    && (this.num_NE >= this.num_EX)){
                    colortoreturn = redlistcolor("NE");
                }
                else if ((this.num_DD >= this.num_EX) && (this.num_DD >= this.num_EW)){
                    colortoreturn = redlistcolor("DD");
                }
                else if (this.num_EW >= this.num_EX){
                    colortoreturn = redlistcolor("EW");
                }
                else{
                    colortoreturn = redlistcolor("EX");
                }
            }
            else if (num_surveyed != 0)
            {
                if ((conservation/num_surveyed)>3.5){
                    colortoreturn = redlistcolor("CR");
                }
                else if ((conservation / num_surveyed) > 2.5){
                    colortoreturn = redlistcolor("EN");
                }
                else if ((conservation / num_surveyed) > 1.5){
                    colortoreturn = redlistcolor("VU");
                }
                else if ((conservation / num_surveyed) > 0.5){
                    colortoreturn = redlistcolor("NT");
                }
                else{
                    colortoreturn = redlistcolor("LC");
                }
            }
        }
    } else if ((colourtype == total_num_cols)&&(b1col_URL)){
        colortoreturn = (b1col_URL);
    }
    
    // the current logic uses different colorschemes for pre, post and during
	// the Cretaceous period, if color type = 2
    // otherwise it uses a fixed brown color for the branches
    // when the tree is growing it only allows branches to be coloured for a
	// certain period if the tree has already growed up to that period.
    return colortoreturn;
};

midnode.prototype.barccolor = function() // branch outline colour logic
{
    // this script sets the color for the outline of the branches
    if (draft_only)
    {
        return 'rgba(0,0,0,0)';
    }
    var colortoreturn = 'rgba(50,37,25,0.3)';
    if (colourtype == 2){
        if((this.lengthbr < 70.6) && (timelim < 70.6)){
            colortoreturn = 'rgba(200,200,200,0.3)';
        }
    }
    if (colourtype == 3){
        colortoreturn = 'rgba(0,0,0,0.3)';
    }
    if ((colourtype == total_num_cols)&&(b2col_URL)){
        colortoreturn = (b2col_URL);
    }
    return colortoreturn;
};

midnode.prototype.highlightcolor = function() // highlight colour logic
{
    return highlightcolor1;
}

midnode.prototype.highlightcolor2 = function() // highlight colour logic
{
    return highlightcolor2;
}

midnode.prototype.should_highlight1 = function(){
    return(highlight_search && (this.searchin > 0));
}

midnode.prototype.should_highlight2 = function(){
    return(highlight_search && (this.searchin2 > 0));
}

// todo later - custom highlighting?

/* custom trait colourings */

function redlistcolor(codein)
{
    switch(codein)
    {
        case "EX":
			return ('rgb(0,0,180)');
        case "EW":
			return ('rgb(60,50,135)');
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
        case "NE":
			return ('rgb(0,0,0)');
        default:
			return ('rgb(0,0,0)');
    }
}

/* custom shortcuts for trait text */

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
};

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
};

midnode.prototype.extxt = function() // returns text for redlist status
{
    if (metadata.leaf_meta[this.metacode][1] && (metadata.leaf_meta[this.metacode][1] != ""))
    {
        return conconvert(metadata.leaf_meta[this.metacode][1]);
    }
    else
    {
        return ("Not Evaluated");
    }
};


midnode.prototype.poptxt = function() // returns text for redlist status
{
    if (metadata.leaf_meta[this.metacode][2])
    {
        switch(metadata.leaf_meta[this.metacode][2])
        {
            case "D":
				return ("decreasing");
            case "I":
				return ("increasing");
            case "S":
				return ("stable");
            case "U":
            {
                if ((metadata.leaf_meta[this.metacode][1] == "EX")||(metadata.leaf_meta[this.metacode][1] == "EW"))
                {
                    return ("extinct");
                }
                else
                {
                    return ("stability unknown");
                }
            }
            default:
				if ((metadata.leaf_meta[this.metacode][1] == "EX")||(metadata.leaf_meta[this.metacode][1] == "EW"))
				{
					return ("extinct");
				}
				else
				{
					return ("stability unknown");
				}
        }
        
    }
    else
    {
        if ((metadata.leaf_meta[this.metacode][1] == "EX")||(metadata.leaf_meta[this.metacode][1] == "EW"))
        {
            return ("extinct");
        }
        else
        {
            return ("stability unknown");
        }
    }
};

/* search normalisation and logic for traits */

function search_substitutions(stringin2)
{
    var stringin = stringin2;
    stringin = stringin.replace("extinct in the wild", "EW");
    stringin = stringin.replace("extinct", "EX");
    stringin = stringin.replace("critically endangered", "CR");
    stringin = stringin.replace("endangered", "EN");
    stringin = stringin.replace("vulnerable", "VU");
    stringin = stringin.replace("near threatened", "NT");
    stringin = stringin.replace("least concern", "LC");
    stringin = stringin.replace("data deficient", "DD");
    stringin = stringin.replace("not evaluated", "NE");
    return stringin;
};

midnode.prototype.dotraitsearch = function(stringin)
{
    var toret = 0;
    if ((((stringin == "EX")||(stringin == "EW"))||(((stringin == "EN")||(stringin == "CR"))||((stringin == "VU")||(stringin == "NT"))))||(((stringin == "DD")||(stringin == "LC"))||(stringin == "NE")))
    {
        if (!(this.child1))
        {
            if ((metadata.leaf_meta[this.metacode][1])&&(metadata.leaf_meta[this.metacode][1] == stringin))
            {
                toret = 1;
            }
        }
    }
    else
    {
        if (((stringin.toLowerCase() == "increasing")&&(metadata.leaf_meta[this.metacode][2]))&&(metadata.leaf_meta[this.metacode][2] == "I"))
        {
            toret = 1;
        }
        else
        {
            if (((stringin.toLowerCase() == "decreasing")&&(metadata.leaf_meta[this.metacode][2]))&&(metadata.leaf_meta[this.metacode][2] == "D"))
            {
                toret = 1;
            }
            else
            {
                if (((stringin.toLowerCase() == "stable")&&(metadata.leaf_meta[this.metacode][2]))&&(metadata.leaf_meta[this.metacode][2] == "S"))
                {
                    toret = 1;
                }
                else
                {
                    if ((stringin.toLowerCase() == "threatened")&&((metadata.leaf_meta[this.metacode][1])&&(((metadata.leaf_meta[this.metacode][1] == "CR")||(metadata.leaf_meta[this.metacode][1] == "EN"))||(metadata.leaf_meta[this.metacode][1] == "VU"))))
                    {
                        toret = 1;
                    }
                }
            }
        }
    }
    return toret;
    
};

/* precalculations for traits */

midnode.prototype.traitprecalc = function()
{
    this.metacode = 0;
    
    if (draft_only)
    {
        if (this.child1)
        {
            this.richness_val = metadata.node_meta[this.metacode][2];

        }
        else
        {
            this.richness_val = metadata.leaf_meta[this.metacode][3];

        }
        intcircdraw = false;
    }
    
    // done as part of the data reading in routine
    // defines variables for the traits and sets them going up the tree
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
		(this.child1).traitprecalc();
		(this.child2).traitprecalc();
		
		
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
		
		if (metadata.leaf_meta[this.metacode][1])
		{
			switch(metadata.leaf_meta[this.metacode][1])
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
		
		if (metadata.leaf_meta[this.metacode][2])
		{
			switch(metadata.leaf_meta[this.metacode][2])
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

/* user adjustable text */

midnode.prototype.drawInternalTextRough = function(x,y,r) {
    if (!draft_only)
    {
        
        // draw the text in a circle of radius r in position (x,y)
        // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
        
        context.fillStyle = this.nodetextcol();
        
        // draw hits counter
        if ((highlight_search) && (this.searchin > 0)) {
            var tempnumhits =this.searchin;
            if (this.searchin2)
            {
                tempnumhits += this.searchin2;
            }
            if (tempnumhits > 1) {
                autotext(false, (tempnumhits).toString() + " hits", x , y  + r * 0.7333, r * 1.2121, r * 0.2666);
            } else {
                autotext(false, "1 hit", x , y + r * 0.7333, r * 1.2121, r * 0.2666);
            }
        }
        
        // draw name and date and number of species
        if (this.name1 && (!commonlabels)) {
            context.fillStyle = this.nodetextcol();
            autotext(false, (this.richness_val).toString(), x , y - r * 0.7333, r * 1.2121, r * 0.2666);
            autotext3(true, this.name1, x , y , r * 1.6161, r * 0.3111);
        } else {
            if ((metadata.node_meta[this.metacode][0]) && (commonlabels)) {
                context.fillStyle = this.nodetextcol();
                autotext(false, (this.richness_val).toString(), x , y - r * 0.73334 , r * 1.2121 , r * 0.2666);
               // autotext3(true, metadata.node_meta[this.metacode][0], x , y , r * 1.6161 , r * 0.31111);
            } else {
                context.fillStyle = this.nodetextcol();
                if (this.lengthbr > 0) {
                    autotext(false, this.datepart(), x , y + r * 0.08888 , r * 1.847 , r * 0.4444);
                    autotext(false, (this.richness_val).toString() + " species", x ,y - r * 0.4444 ,r*1.2121 * 1.1, r * 0.4444 * 0.8);
                } else {
                    autotext(false, (this.richness_val).toString() + " species", x, y + r * 0.08888 , r * 1.847 , r * 0.4444);
                    autotext(false, "Date unknown", x , y - r * 0.4444 , r * 1.333 , r * 0.3555);
                }
            }
        }
    }
    else
    {
        if (this.name1 && (!commonlabels)) {
            context.fillStyle = this.nodetextcol();
            autotext3(true, this.name1, x , y , r * 1.6161, r * 0.3111);
        } else {
            if ((metadata.node_meta[this.metacode][0]) && (commonlabels)) {
                context.fillStyle = this.nodetextcol();
                autotext3(true, metadata.node_meta[this.metacode][0], x , y , r * 1.6161 , r * 0.31111);
            }
        }
    }
};

midnode.prototype.drawLeafTextRough = function(x,y,r){
    
    if (!draft_only)
    {
    // draw the text in a circle of radius r in position (x,y)
    // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
    
    context.fillStyle = this.leafcolor3();
    if (this.iprimaryname())
    {
        autotext3(false,this.iprimaryname() , x , y , r * 1.6558 , r * 0.286);
    }
    else
    {
        if (this.isecondaryname())
        {
            autotext3(false,this.isecondaryname() , x , y , r * 1.6558 , r * 0.286);
        }
    }
    }
};

midnode.prototype.drawInternalTextDetail = function(x,y,r) {
    
    if(!draft_only) {
    
    // draw the text in a circle of radius r in position (x,y)
    // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
    
	// DRAW PIECHARTS
    
    // prepare data
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
    drawPie(x , y + r * 0.7555 , r * 0.1852 ,piedata,piecolors,this.richness_val);
    drawPieKey(x , y + r * 0.4844 , r * 0.033333 , r * 0.9, piedata,piecolors,this.richness_val,pietext1,pietext2,piekey,this.leafcolor3(),"species");
    
    // DO THE TEXT
    
    context.fillStyle = this.nodetextcol();
    
    // draw chart title
    autotext(false, "conservation status pie chart", x , y + r * 0.37777 , r * 0.909 , r * 0.0635);
    
    // age text
    if ((this.lengthbr) && (this.lengthbr > 0)) {
        var agetxt;
        if (this.lengthbr > 10) {
            agetxt = (Math.round((this.lengthbr) * 10) / 10.0) .toString() + " Million years ago";
        } else if (this.lengthbr > 1) {
            agetxt = (Math.round((this.lengthbr) * 100) / 100.0).toString() + " Million years ago";
        } else {
            agetxt = (Math.round((this.lengthbr) * 10000) / 10.0).toString() + " Thousand years ago";
        }
        autotext(false, agetxt, x ,y - r * 0.511 , r * 1.212121 , r * 0.296);
        autotext(false, gpmapper(this.lengthbr) + " Period", x , y - r * 0.6888 , r * 1.212121 , r * 0.08888 );
    } else {
        autotext(false, "Date unknown", x , y - r * 0.511 , r * 1.212121 ,r * 0.296);
    }
    
    // phylogenetic diversity text
    if (this.lengthbr > 0) {
        var pdtxt;
        if (this.phylogenetic_diversity > 1000.0) {
            pdtxt = (Math.round(this.phylogenetic_diversity / 100) / 10.0).toString() + " billion years total phylogenetic diversity"
        } else {
            pdtxt = (Math.round(this.phylogenetic_diversity)).toString() + " million years total phylogenetic diversity"
        }
        autotext(false, pdtxt, x , y + r * 0.2888 , r * 1.212121 , r * 0.0635);
    }
    
    // species numbers text
    var spnumtxt;
    var num_threatened = (this.num_CR + this.num_EN + this.num_VU);
    if ((this.iprimaryname()) || (this.isecondaryname())) {
        if (num_threatened > 0) {
			spnumtxt = (this.richness_val).toString() + " species , " + (num_threatened).toString() + " threatened ( " + (Math.round((num_threatened) / (this.richness_val) * 1000.0) / 10.0).toString() + "% )";
		} else {
			spnumtxt = (this.richness_val).toString() + " species, none threatened";
		}
    } else {
        if (num_threatened > 0) {
			if (num_threatened > 1) {
				spnumtxt = (num_threatened).toString()
                + " of "
                + (this.richness_val).toString()
                + " species are threatened ( "
                + (Math.round((num_threatened) / (this.richness_val) * 1000.0) / 10.0).toString()
                + "% )";
			} else {
				spnumtxt = (num_threatened).toString()
                + " of "
                + (this.richness_val).toString()
                + " species is threatened ( "
                + (Math.round((num_threatened) / (this.richness_val)* 1000.0) / 10.0).toString()
                + "% )";
			}
		} else {
			spnumtxt = "no threatened species";
		}
    }
    if ((highlight_search) && (this.searchin > 0)) {
        if (this.searchin > 1) {
            spnumtxt = spnumtxt + " , " + (this.searchin).toString() + " hits";
        } else {
            spnumtxt = spnumtxt + " , 1 hit";
        }
    }
    autotext(false, spnumtxt, x , y + r * 0.2 , r * 1.4 , r * 0.0635);
    
    // main headline name
	if ((this.iprimaryname()) || (this.isecondaryname())) {
        // node is named
        if (!this.isecondaryname()) {
			autotext2(true, this.iprimaryname(), x , y  - r * 0.14 , r * 1.636 , r * 0.296);
		} else {
			if (this.iprimaryname()) {
				autotext(true, this.iprimaryname(), x , y , r * 1.636 ,r * 0.2222222);
				autotext(true, this.isecondaryname(), x , y - r * 0.2666 , r * 1.636 , r * 0.1777);
			} else {
				autotext2(true, this.isecondaryname(), x , y - r * 0.14 ,r * 1.636 , r * 0.296);
			}
		}
	} else {
        // node is not named
        autotext(false, (this.richness_val).toString() + " species", x , y - r * 0.14 , r * 1.636 , r * 0.296);
	}
    
    // link - note this routine may change the fill colour for text
    this.drawLinkSet( x , y - r * 0.8666 , r * 0.08 , r * 0.7);
    //if (this.should_draw_link(linkSet.node_priority))
    //{
    //    this.draw_link(x , y - r * 0.98 , r * 0.1, linkSet.node_priority , this.branchcolor());
    //}
}
    else{
        this.drawLeafTextRough(x,y,r);
    }
};

midnode.prototype.drawLeafTextDetail = function(x,y,r){
    
    if (!draft_only)
    {
    
    // draw the text in a circle of radius r in position (x,y)
     //drawArc(x,y,r,0,2*Math.PI,true,'rgba(255,0,255,0.75)'); // uncomment to see text areas
    
    this.drawLinkSet( x , y - r * 0.67 , r * 0.12 , r * 0.9);
    
   // if (this.should_draw_link(linkSet.leaf_priority))
    //{
    //    this.draw_link(x , y - r * 0.825 , r * 0.1 , linkSet.leaf_priority , this.leafcolor2());
   // }
    
    context.fillStyle = this.leafcolor3();
    
    if (metadata.leaf_meta[this.metacode][0]){
        if (commonlabels){
            if (this.name2){
                autotext(true,this.name2 + " " + this.name1, x , y - r * 0.357 , r * 0.974 , r * 0.179);
            } else {
                autotext(true,this.name1, x , y - r * 0.357 , r * 0.974 ,r * 0.179);
            }
            autotext2(false,metadata.leaf_meta[this.metacode][0], x , y , r * 1.36 , r * 0.268);
        }
        else{
            if (this.name2){
                autotext(true,this.name2 + " " + this.name1 , x , y + r * 0.0893 , r * 1.36 , r * 0.268);
            }
            else{
                autotext(true,this.name1 , x , y + r * 0.0893 , r * 1.36 , r * 0.268);
            }
            autotext2(false,metadata.leaf_meta[this.metacode][0] , x , y - r * 0.25 , r * 1.071 , r * 0.143);
        }
    }
    else{
        autotext(false,"No common name", x , y - r * 0.428 , r * 0.974 , r * 0.179);
        if (this.name2){
            autotext2(true,this.name2 + " " + this.name1 , x , y , r * 1.56 , r * 0.268);
        }
        else{
            autotext2(true,this.name1, x , y , r * 1.59 , r * 0.268);
        }
    }
    autotext(false,"Conservation status: " + this.extxt() , x , y + r * 0.428 , r * 1.364 , r * 0.0893);
    autotext(false,"Population " + this.poptxt() , x , y + r * 0.589 , r * 1.17 , r * 0.0893);
    }
};





