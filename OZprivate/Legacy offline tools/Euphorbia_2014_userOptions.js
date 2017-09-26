
/* setting basic code variables - note there are defaults elsewhere so this is all optional */

var draft_only = false;
var metadata_cnp_leaf = 2; // the column of metadata where common names are found for leaves
var metadata_cnp_node = 2; // the column of metadata where common names are found for nodes
// both offset by one so put 1 for the first column which will be indexed as 0

var UserOptions = {
    
    // h1 col / hrcol combo good is rgb(130,190,220) and white
    'polytype': 3,
    'viewtype': 2,
    'colourtype' : 4,
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
    'total_num_cols' : 1,
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
 'profilename' : 'Euphorbia',
 
 'init' : 1,
 'url' : 'http://app.tolkin.org/projects/72',
 'text' : 'Link to Euphorbia PBI',
 'name' : 'Euphorbia PBI',
 
 'logo' : 'logos/Euphorbia_logo.png',

 
 'leaf_link_priority': 2,
 'node_link_priority': 1,
 }
 
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
     [-2,true,"Euphorbia PBI","||URL for Species Page||"],
     [-1,true,"EOL","http://www.eol.org/search?q=||genus||+||species||"]
     ],
    
    'node':
    [
     [-1,true,"Wikipedia","http://en.wikipedia.org/wiki/||name||"],
     [-1,true,"Discover Life","http://www.discoverlife.org/mp/20q?search=||name||&burl=www.onezoom.org&btxt=Back+to+OneZoom&bi=www.onezoom.org/logos/OZ_logo.png"],
     [-1,true,"EOL","http://www.eol.org/search?q=||name||"],
     [-1,true,"ARKive","http://www.arkive.org/explore/species?q=||name||"]
     ],
    
    /*
     'leaf':
    [
     [-2,true,"Euphorbia PBI","||URL for Species Page||"]

     ],
    
    'node':
    [
    [5,true,"Wikipedia","http://en.wikipedia.org/wiki/||genus||_||species||"]
     ]
     */
    
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
 [2,"Duncan Gillies , Yan Wong , Jess Peirson "],
 
 [2,],
 
 [3,"Data sources"],
 [1,],
 [2.2,"Jess Peirson, Euphorbia PBI"],
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
    if ((colourtype == total_num_cols)&&(l1col_URL)){
        return (l1col_URL);
    } else {
        return (leaf_fill_def); // leaf default fill color
    }
};

midnode.prototype.leafcolor2 = function(){
    if ((colourtype == total_num_cols)&&(l2col_URL)){
        return (l2col_URL);
    }
    else {
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
    if ((colourtype == total_num_cols)&&(b1col_URL))
    {
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
    if (metadata.leaf_meta[this.metacode][2] && (metadata.leaf_meta[this.metacode][2] != ""))
    {
        return conconvert(metadata.leaf_meta[this.metacode][2]);
    }
    else
    {
        return ("Not Evaluated");
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
            if ((metadata.leaf_meta[this.metacode][2])&&(metadata.leaf_meta[this.metacode][2] == stringin))
            {
                toret = 1;
            }
        }
    }
    else
    {
        if ((stringin.toLowerCase() == "threatened")&&((metadata.leaf_meta[this.metacode][2])&&(((metadata.leaf_meta[this.metacode][2] == "CR")||(metadata.leaf_meta[this.metacode][2] == "EN"))||(metadata.leaf_meta[this.metacode][2] == "VU"))))
        {
            toret = 1;
        }
    }
    return toret;
    
};

/* precalculations for traits */

midnode.prototype.traitprecalc = function()
{
    if (draft_only)
    {
        if (this.child1)
        {
            this.richness_val = metadata.node_meta[this.metacode][3];
            
        }
        else
        {
            this.richness_val = metadata.leaf_meta[this.metacode][2];
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
	
    this.num_W = 0;
    this.num_H = 0;
    this.num_U = 0;
    this.num_V = 0;
	
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
		
        this.num_W = ((this.child1).num_W) + ((this.child2).num_W);
        this.num_H = ((this.child1).num_H) + ((this.child2).num_H);
        this.num_U = ((this.child1).num_U) + ((this.child2).num_U);
        this.num_V = ((this.child1).num_V) + ((this.child2).num_V);
		
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
        
		this.num_W = 0;
        this.num_H = 0;
        this.num_U = 0;
        this.num_V = 0;
		
		if (metadata.leaf_meta[this.metacode][2])
		{
			switch(metadata.leaf_meta[this.metacode][2])
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
		
        this.num_U = 1;
		if (metadata.leaf_meta[this.metacode][3])
		{
			switch(metadata.leaf_meta[this.metacode][3])
			{
				case "W":
				{
					this.num_W = 1;
                    this.num_U = 0;
					break;
				}
				case "H":
				{
					this.num_H = 1;
                    this.num_U = 0;
					break;
				}
				case "variable":
				{
					this.num_V = 1;
                    this.num_U = 0;
					break;
				}
            }
		}
		else
		{
			this.num_NE = 1;
		}
    }
}

/* user adjustable text */

midnode.prototype.drawInternalTextRough = function(x,y,r) {
   
        // draw the text in a circle of radius r in position (x,y)
        // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
        
        context.fillStyle = this.nodetextcol();
    
        var species_textemp = this.richness_val.toString()
    
        // draw hits counter
        if ((highlight_search) && (this.searchin > 0)) {
            var tempnumhits =this.searchin;
            if (this.searchin2)
            {
                tempnumhits += this.searchin2;
            }
            if (tempnumhits > 1) {
                species_textemp =  (tempnumhits).toString() + " hits / " + species_textemp;
            } else {
                species_textemp =  "1 hit / " + species_textemp;
            }
        }
        else
        {
            species_textemp += " species"
        }
        
        // draw name and date and number of species
        if (this.name1) {
            context.fillStyle = this.nodetextcol();
            autotext(false, species_textemp, x , y - r * 0.5, r * 1.2, r * 0.2666);
            autotext2(true, this.name1, x , y , r * 1.5, r * 0.3111);
            autotext(false, this.datepart(), x , y + r * 0.5 , r * 1, r * 0.2666);
        } else {
            
            context.fillStyle = this.nodetextcol();
            autotext(false, this.datepart(), x , y + r * 0.08888 , r * 1.847 , r * 0.4444);
            autotext(false, species_textemp, x , y - r * 0.5, r * 1.2, r * 0.2666);
        }
    

};

midnode.prototype.drawLeafTextRough = function(x,y,r){
    
    
        // draw the text in a circle of radius r in position (x,y)
        // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
    
    if (r > 80) {this.drawLinkSet( x , y - r * 0.67 , r * 0.3 , r * 0.9)};

    
        context.fillStyle = this.leafcolor3();
    autotext3(false,this.iprimaryname() , x , y , r * 1.6558 , r * 0.286);
};

midnode.prototype.drawInternalTextDetail = function(x,y,r) {
   
        
        // draw the text in a circle of radius r in position (x,y)
        // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
        
    // draw the text in a circle of radius r in position (x,y)
    // drawArc(x,y,r,0,2*Math.PI,true,'rgba(0,0,255,0.75)'); // uncomment to see text areas
    
    context.fillStyle = this.nodetextcol();
    
    var species_textemp = this.richness_val.toString()
    
    // draw hits counter
    if ((highlight_search) && (this.searchin > 0)) {
        var tempnumhits =this.searchin;
        if (this.searchin2)
        {
            tempnumhits += this.searchin2;
        }
        if (tempnumhits > 1) {
            species_textemp =  (tempnumhits).toString() + " hits / " + species_textemp;
        } else {
            species_textemp =  "1 hit / " + species_textemp;
        }
    }
    else
    {
        species_textemp += " species"
    }
    
    // draw name and date and number of species
    if (this.name1) {
        context.fillStyle = this.nodetextcol();
        autotext(false, species_textemp, x , y - r * 0.5, r * 1.2, r * 0.2666);
        autotext2(true, this.name1, x , y , r * 1.5, r * 0.3111);
    } else {
        
        context.fillStyle = this.nodetextcol();
        autotext(false, species_textemp, x , y - r * 0.5, r * 1.2, r * 0.2666);
        autotext(true, this.metacode.toString(), x , y , r * 1.5, r * 0.3111);
    }
    
    

    
        // draw name and date and number of species
                  context.fillStyle = this.nodetextcol();
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
                autotext(false, agetxt, x ,y + r * 0.511 , r * 1.212121 , r * 0.296);
                autotext(false, gpmapper(this.lengthbr) + " Period", x , y + r * 0.6888 , r * 1.212121 , r * 0.08888 );
            } else {
                autotext(false, "Date unknown", x , y + r * 0.511 , r * 1.212121 ,r * 0.296);
            }
};

midnode.prototype.drawLeafTextDetail = function(x,y,r){
    
    
        // draw the text in a circle of radius r in position (x,y)
        //drawArc(x,y,r,0,2*Math.PI,true,'rgba(255,0,255,0.75)'); // uncomment to see text areas
        

    this.drawLeafTextRough(x,y,r);
    
};





