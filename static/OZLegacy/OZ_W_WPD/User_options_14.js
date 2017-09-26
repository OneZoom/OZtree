
// this will indicate pop up text

// colour codes for redlist
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

// definition of geological periods
function gpmapper(datein)
{
    //Devonian
    if (datein > 419.2)
    {
        return("pre Devonian");
    }
    else
    {
        if (datein > 359.2)
        {
            return("Devonian");
        }
        else
        {
            if (datein > 298.9)
            {
                return("Carboniferous");
            }
            else
            {
                if (datein > 252.2)
                {
                    return("Permian");
                }
                else
                {
                    if (datein > 203.6)
                    {
                        return("Triassic");
                    }
                    else
                    {
                        if (datein > 150.8)
                        {
                            return("Jurassic");
                        }
                        else
                        {
                            if (datein > 70.6)
                            {
                                return("Cretaceous");
                            }
                            else
                            {
                                if (datein > 28.4)
                                {
                                    return("Paleogene");
                                }
                                else
                                {
                                    if (datein > 3.6)
                                    {
                                        return("Neogene");
                                    }
                                    else
                                    {
                                        return("Quaternary");
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

midnode.prototype.leafcolor1 = function()
{
    // for the leaf fill
    if ((this.redlist)&&(colourtype == 3))
    {
        return(redlistcolor(this.redlist));
    }
    else
    {
        if (colourtype == 3)
        {
            return (this.branchcolor());
        }
        else
        {
            return ('rgb(0,100,0)');
        }
    }
}


midnode.prototype.leafcolor2 = function()
{
    // for the leaf outline
    if ((this.redlist)&&(colourtype == 3))
    {
        return(redlistcolor(this.redlist));
    }
    else
    {
        if (colourtype == 3)
        {
            return (this.branchcolor());
        }
        else
        {
            return ('rgb(0,150,30)');
        }
    }
}

midnode.prototype.leafcolor3 = function()
{
    return ('rgb(255,255,255)'); // for the leaf text
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

midnode.prototype.branchcolor = function() // branch colour logic
{
    // this script sets the colours of the branches
    var colortoreturn = 'rgb(100,75,50)';
    if (colourtype == 2) // there are two different color schemes in this version described by the colourtype variable
    {
        // this.lengthbr is the date of the node
        // timelim is the cut of date beyond which the tree is not drawn (when using growth animation functions
        if ((this.lengthbr<150.8)&&(timelim<150.8))
        {
            colortoreturn =  'rgb(180,50,25)';
        }
        if ((this.lengthbr<70.6)&&(timelim<70.6))
        {
            colortoreturn =  'rgb(50,25,50)';
        }
    }
    else
    {
        
        var conservation = (4*(this.num_CR) + 3*(this.num_EN) + 2*(this.num_VU) + this.num_NT);
        var num_surveyed = (this.num_CR + this.num_EN + this.num_VU + this.num_NT + this.num_LC);
        if (colourtype == 3)
        {
            if (num_surveyed == 0)
            {
                if (((this.num_NE >= this.num_DD)&&(this.num_NE >= this.num_EW))&&(this.num_NE >= this.num_EX))
                {
                    colortoreturn = redlistcolor("NE");
                }
                else
                {
                    if ((this.num_DD >= this.num_EX)&&(this.num_DD >= this.num_EW))
                    {
                        colortoreturn = redlistcolor("DD");
                    }
                    else
                    {
                        if (this.num_EW >= this.num_EX)
                        {
                            colortoreturn = redlistcolor("EW");
                        }
                        else
                        {
                            colortoreturn = redlistcolor("EX");
                        }
                    }
                }
            }
            else
            {
                if ((conservation/num_surveyed)>3.5)
                {
                    colortoreturn = redlistcolor("CR");
                }
                else
                {
                    if ((conservation/num_surveyed)>2.5)
                    {
                        colortoreturn = redlistcolor("EN");
                    }
                    else
                    {
                        if ((conservation/num_surveyed)>1.5)
                        {
                            colortoreturn = redlistcolor("VU");
                        }
                        else
                        {
                            if ((conservation/num_surveyed)>0.5)
                            {
                                colortoreturn = redlistcolor("NT");
                            }
                            else
                            {
                                colortoreturn = redlistcolor("LC");
                            }
                        }
                    }
                }
            }
        }
    }
    // the current logic uses different colorschemes for pre, post and during the Cretaceous period, if color type = 2
    // otherwise it uses a fixed brown color for the branches
    // when the tree is growing it only allows branches to be coloured for a certain period if the tree has already growed up to that period.
    return colortoreturn;
}

midnode.prototype.barccolor = function() // branch outline colour logic
{
    // this script sets the color for the outline of the branches
    var colortoreturn = 'rgba(50,37,25,0.3)';
    if (colourtype == 2)
    {
        if((this.lengthbr<70.6)&&(timelim<70.6))
        {
            colortoreturn = 'rgba(200,200,200,0.3)';
        }
    }
    if (colourtype == 3)
    {
        colortoreturn = 'rgba(0,0,0,0.3)';
    }
    return colortoreturn;
}

midnode.prototype.highlightcolor = function() // highlight colour logic
{
    return 'rgba(255,255,255,0.5)';
    /*
    // this logic defines the stripe colors that indicate search results, but could be edited to indicate other features such as traits
    return 'rgba('+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+',0.6)';
    //*/
}

// SFU highlights
midnode.prototype.highlightcolor2 = function() // highlight colour logic
{
    if ((!this.child1)&&(this.redlist == "NE"))
    {
        return 'rgba(255,255,255,1)';
    }
    else
    {
        return 'rgba(0,0,0,1)';
    }
    
    /*
     // this logic defines the stripe colors that indicate search results, but could be edited to indicate other features such as traits
     return 'rgba('+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+','+(Math.round(255-254*this.searchin/numhits)).toString()+',0.6)';
     //*/
}

midnode.prototype.datetextcolor = function() // date text colour logic
{
    var colortoreturn = 'rgb(255,255,255)';
    if (colourtype == 2)
    {
        if ((this.lengthbr<150.8)&&(this.lengthbr>70.6))
        {
            colortoreturn = 'rgb(255,255,255)';
        }
    }
    if (colourtype == 3)
    {
        colortoreturn = 'rgb(255,255,255)';
    }
    return colortoreturn;
}

midnode.prototype.richnesstextcolor = function() // richness text colour logic
{
    var colortoreturn = 'rgb(255,255,255)';
    if (colourtype == 2)
    {
        if ((this.lengthbr<150.8)&&(this.lengthbr>70.6))
        {
            colortoreturn = 'rgb(255,255,250)';
        }
    }
    if (colourtype == 3)
    {
        colortoreturn = 'rgb(255,255,255)';
    }
    return colortoreturn;
}

// it is not advisable to edit below this point unless you are trying to sort out the display of custom trait data

// *** there are three types of leaves that are drawn by the code
// *** 1.) Fake leaf: where the tree continues but is smaller than the size threshold it is sometimes
// *** asthetically pleasing to draw a leaf there, especially if the threshold is a few pixels wide.  If the threshold is much smaller it does not matter if the facke leaf is drawn or not.
// *** 2.) Growth leaf: where growing animations are taking place there should be leaves on the tips of the branches
// *** 3.) Tip leaf: these are the classic leaves in which species names are put - these are the tips of the complete tree.
// *** all leaf classes can be defined with custom logic in the three scripts below

midnode.prototype.fakeleaflogic = function(x,y,r,angle)
{
    context.strokeStyle = this.leafcolor2();
    context.fillStyle = this.leafcolor1();
    if (leaftype == 1)
    {
        drawleaf1(x,y,r);
    }
    else
    {
        drawleaf2(x,y,r,angle);
    }
}

midnode.prototype.growthleaflogic = function(x,y,r,angle)
{
    context.strokeStyle = this.leafcolor2();
    context.fillStyle = this.leafcolor1();
    if (leaftype == 1)
    {
        drawleaf1(x,y,r);
    }
    else
    {
        drawleaf2(x,y,r,angle);
    }
}

midnode.prototype.tipleaflogic = function(x,y,r,angle)
{
    context.strokeStyle = this.leafcolor2();
    context.fillStyle = this.leafcolor1();
    if (leaftype == 1)
    {
        drawleaf1(x,y,r);
    }
    else
    {
        drawleaf2(x,y,r,angle);
    }
}




midnode.prototype.datepart = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() + " Mya";
    }
    else
    {
        if (this.lengthbr >1)
        {
            return (Math.round((this.lengthbr)*100)/100.0).toString()  + " Mya";
        }
        else
        {
            return (Math.round((this.lengthbr)*10000)/10.0).toString()  + " Kya";
        }
    }
}


midnode.prototype.datemed = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() + " Million years ago";
    }
    else
    {
        if (this.lengthbr >1)
        {
            return (Math.round((this.lengthbr)*100)/100.0).toString()  + " Million years ago";
        }
        else
        {
            return (Math.round((this.lengthbr)*10000)/10.0).toString()  + " Thousand years ago";
        }
    }
}

midnode.prototype.datefull = function()
{
    if (this.lengthbr >10)
    {
        return (Math.round((this.lengthbr)*10)/10.0).toString() + " Million years ago (" + gpmapper(this.lengthbr) + ")";
    }
    else
    {
        if (this.lengthbr >1)
        {
            return (Math.round((this.lengthbr)*100)/100.0).toString()  + " Million years ago (" + gpmapper(this.lengthbr) + ")";
        }
        else
        {
            return (Math.round((this.lengthbr)*10000)/10.0).toString()  + " Thousand years ago (" + gpmapper(this.lengthbr) + ")";
        }
    }
}

midnode.prototype.specnumfull = function()
{
    var num_threatened = (this.num_CR + this.num_EN + this.num_VU);
    if (num_threatened > 0)
    {
        return (this.richness_val).toString() + " species ( " + (num_threatened).toString() +" threatened - " + (Math.round((num_threatened)/(this.richness_val)*1000.0)/10.0).toString() + "% )";
    }
    else
    {
        return (this.richness_val).toString() + " species, none threatened";
    }
}

midnode.prototype.iprimaryname = function()
{
    if (commonlabels)
    {
        return(this.cname);
    }
    else
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
}

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
        if (this.cname)
        {
            if ((this.name2)&&(!auto_interior_node_labels))
            {
                return(this.cname + " (" + this.name2 + ")");
            }
            else
            {
                return(this.cname);
            }
        }
        else
        {
            return null;
        }
    }
}


midnode.prototype.draw_sp_back = function()
{
    // draw sign posts
    var signdrawn = false;
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if (this.richness_val > 1)
        {
            
            if (drawsignposts)
            {
                if (this.child1)
                {
                    
                    if (((thresholdtxt*35 < r*(this.hxmax-this.hxmin))&&(r <=thresholdtxt*50))||(this.lengthbr <= timelim))
                    {
                        if (this.name1&&(!commonlabels)) // white signposts
                        {
                            
                            context.fillStyle = 'rgba(255,255,255,0.5)';
                            context.beginPath();
                            context.arc(x+r*(this.hxmax+this.hxmin)/2,y+r*(this.hymax+this.hymin)/2,r*((this.hxmax-this.hxmin)*0.35),0,Math.PI*2,true);
                            context.fill();
                            signdrawn = true;
                            
                        }
                        if (this.cname&&(commonlabels)) // white signposts
                        {
                            
                            context.fillStyle = 'rgba(255,255,255,0.5)';
                            context.beginPath();
                            context.arc(x+r*(this.hxmax+this.hxmin)/2,y+r*(this.hymax+this.hymin)/2,r*((this.hxmax-this.hxmin)*0.35),0,Math.PI*2,true);
                            context.fill();
                            signdrawn = true;
                            
                        }
                    }
                    if (!signdrawn)
                    {
                        if (this.lengthbr > timelim)
                        {
                            
                            this.child1.draw_sp_back ()
                            this.child2.draw_sp_back ()
                        }
                    }
                }
                
            }
        }
    }
}

midnode.prototype.draw_sp_txt = function()
{
    // draw sign posts
    var signdrawn = false;
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if (this.richness_val > 1)
        {
            
            if (drawsignposts)
            {
                if (this.child1)
                {
                    
                    
                    if (((thresholdtxt*35 < r*(this.hxmax-this.hxmin))&&(r <=thresholdtxt*50))||(this.lengthbr <= timelim))
                    {
                        if (this.name1&&(!commonlabels)) // white signposts
                        {
                            
                            context.fillStyle = 'rgb(0,0,0)';
                            autotext3(true,this.name1 ,x+r*(this.hxmax+this.hxmin)/2,y+r*(this.hymax+this.hymin)/2,r*(this.hxmax-this.hxmin)*0.65,r*((this.hxmax-this.hxmin)/5));
                            signdrawn = true;
                            
                        }
                        if (this.cname&&(commonlabels)) // white signposts
                        {
                            
                            context.fillStyle = 'rgb(0,0,0)';
                            autotext3(true,this.cname ,x+r*(this.hxmax+this.hxmin)/2,y+r*(this.hymax+this.hymin)/2,r*(this.hxmax-this.hxmin)*0.65,r*((this.hxmax-this.hxmin)/5));
                            signdrawn = true;
                            
                        }
                    }
                    if (!signdrawn)
                    {
                        if (this.lengthbr > timelim)
                        {
                            this.child1.draw_sp_txt ()
                            this.child2.draw_sp_txt ()
                        }
                    }
                }
                
            }
        }
    }
}



// drawing the tree
midnode.prototype.draw = function()
{
    var signdone = false;
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if ((this.child1)&&(this.lengthbr > timelim))
        {
            if ((this.child1.richness_val) >= (this.child2.richness_val))
            {
                signdone = this.child1.draw () || signdone;
                signdone = this.child2.draw () || signdone;
            }
            else
            {
                signdone = this.child2.draw () || signdone;
                signdone = this.child1.draw () || signdone;
            }
        }
        var ing = false; // if we are in the region where graphics need to be drawn
        if((this.gvar)&&((polytype!=2)||(this.npolyt)))
        {
            
            ing = true;
            context.lineCap = "round";
            context.lineWidth = r*(this.bezr);
            context.beginPath();
            context.moveTo(x+r*(this.bezsx),y+r*this.bezsy);
            context.bezierCurveTo(x+r*(this.bezc1x),y+r*(this.bezc1y),x+r*(this.bezc2x),y+r*(this.bezc2y),x+r*(this.bezex),y+r*(this.bezey));
            context.strokeStyle = this.branchcolor();
            context.stroke();
            if ((highlight_search)&&(this.searchin > 0))
            {
               
                context.strokeStyle = this.highlightcolor();
                context.lineWidth = r*(this.bezr)/3.0;
                context.beginPath();
                context.moveTo(x+r*(this.bezsx),y+r*this.bezsy);
                context.bezierCurveTo(x+r*(this.bezc1x),y+r*(this.bezc1y),x+r*(this.bezc2x),y+r*(this.bezc2y),x+r*(this.bezex),y+r*(this.bezey));
                context.stroke();
            }
            
            if (this.num_academic >0)
            {
                context.strokeStyle = this.highlightcolor2();
                context.lineWidth = r*(this.bezr)/6.5;
                context.beginPath();
                context.moveTo(x+r*(this.bezsx),y+r*this.bezsy);
                context.bezierCurveTo(x+r*(this.bezc1x),y+r*(this.bezc1y),x+r*(this.bezc2x),y+r*(this.bezc2y),x+r*(this.bezex),y+r*(this.bezey));
                context.stroke();
            }
            
        }
        if (this.lengthbr > timelim)
        {
            if (((this.richness_val > 1)&&(r<=threshold))&&(timelim <= 0))
            {
                // we are drawing a fake leaf - ing is irrelevant as this is instead of drawing the children
                this.fakeleaflogic(x+((r)*(this.nextx1)),y+(r)*(this.nexty1),r*leafmult*0.75*partc,this.arca);
            }
            else
            {
                if (ing)
                {
                    if (this.richness_val > 1)
                    {
                        if (this.lengthbr > timelim)
                        {
                            // interior node drawing starts here
                            // first set up the variables that decide text size
                            var temp_twidth = (r*partc-r*partl2)*Twidth;
                            var temp_theight = (r*partc-r*partl2)*Tsize/2.0;
                            var temp_theight_2 = (r*partc-r*partl2)*Tsize/3.0;
                            // this piece of logic draws the arc background if needed (no text)
                            if (((highlight_search)&&(this.searchin > 0))||(this.num_academic >0))
                            {
                                context.beginPath();
                                context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr,0,Math.PI*2,true);
                                context.fillStyle = this.branchcolor();
                                context.fill();
                                if (!((this.npolyt)||(polytype == 3)))
                                {
                                    context.beginPath();
                                    context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr*0.5,0,Math.PI*2,true);
                                    context.fillStyle = this.highlightcolor();
                                    context.fill();
                                }
                                
                            }
                            if (((this.npolyt)||((highlight_search)&&(this.searchin > 0)))||(polytype == 3))
                            {
                                // we are drawing an internal circle
                                if(((r > thresholdtxt*50)))
                                {
                                    if (intcircdraw)
                                    {
                                        context.beginPath();
                                        context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr*(1-partl2/2.0),0,Math.PI*2,true);
                                        context.lineWidth = r*this.arcr*partl2;
                                        if ((highlight_search)&&(this.searchin > 0))
                                        {
                                            context.strokeStyle = this.highlightcolor();
                                        }
                                        else
                                        {
                                            context.strokeStyle = this.barccolor();
                                        }
                                        context.stroke();
                                    }
                                }
                                else
                                {
                                    if (intcircdraw)
                                    {
                                        if (((highlight_search)&&(this.searchin > 0))&&((r*this.arcr*partl2*2)>0.3))
                                        {
                                            context.beginPath();
                                            context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr*0.5,0,Math.PI*2,true);
                                            context.fillStyle = this.highlightcolor();
                                            context.fill();
                                        }
                                        
                                        if (this.num_academic >0)
                                        {
                                            context.beginPath();
                                            context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr*0.25,0,Math.PI*2,true);
                                            context.fillStyle = this.highlightcolor2();
                                            context.fill();
                                        }
                                        
                                    }
                                }
                            }
                            // internal text drawing starts here *****
                            if (((this.npolyt)||(polytype == 3))&&(!(drawsignposts&&(((thresholdtxt*35 < r*(this.hxmax-this.hxmin))&&(r <=thresholdtxt*50))||(this.lengthbr <= timelim)))))
                            {
                                    
                                    if (this.name1)
                                    {
                                        if ( r > threshold*50)
                                        {
                                            var linkpos = temp_theight/2.0;
                                            
                                            if ((this.linkclick_e)&&((!this.child1.linkclick_e)&&(!this.child2.linkclick_e)))
                                            {
                                                context.fillStyle = 'rgb(0,0,0)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.35,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = 'rgb(255,255,255)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.3,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = intnodetextcolor;
                                                context.fillStyle = 'rgb(0,0,0)';
                                                
                                                autotext(true,"Genbank", x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.5,temp_theight_2/3.0);
                                            }
                                            else
                                            {
                                                context.fillStyle = 'rgb(255,255,255)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.35,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = this.branchcolor();
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.3,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = intnodetextcolor;
                                                context.fillStyle = 'rgb(255,255,255)';
                                                
                                                autotext(true,"Genbank", x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.5,temp_theight_2/3.0);
                                            }
                                            
                                            linkpos = -temp_theight/2.0;
                                            
                                            if ((this.linkclick_w)&&((!this.child1.linkclick_w)&&(!this.child2.linkclick_w)))
                                            {
                                                context.fillStyle = 'rgb(0,0,0)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.35,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = 'rgb(255,255,255)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.3,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = intnodetextcolor;
                                                context.fillStyle = 'rgb(0,0,0)';
                                                
                                                autotext(true,"WPD", x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.8,temp_theight_2/3.0);
                                            }
                                            else
                                            {
                                                context.fillStyle = 'rgb(255,255,255)';
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.35,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = this.branchcolor();
                                                context.beginPath();
                                                context.arc(x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.3,0,Math.PI*2,true);
                                                context.fill();
                                                context.fillStyle = intnodetextcolor;
                                                context.fillStyle = 'rgb(255,255,255)';
                                                
                                                autotext(true,"WPD", x+r*this.arcx+linkpos,y+r*this.arcy-temp_theight_2*1.3,temp_theight*0.8,temp_theight_2/3.0);
                                            }
                                        }
                                        
                                        context.fillStyle = intnodetextcolor;
                                        autotext(false,(this.richness_val).toString() + " species" ,  x+r*this.arcx,y+r*this.arcy+temp_theight_2*0.90,temp_twidth,temp_theight_2/2.0);
                                        
                                        autotext3(true,this.name1 , x+r*this.arcx,y+r*this.arcy,1.75*r*this.arcr*(1-partl2/2.0),temp_theight_2*1.2);
                                        
                                        if ((highlight_search)&&(this.searchin > 0))
                                        {
                                            if (this.searchin > 1)
                                            {
                                                autotext(false,(this.searchin).toString() + " hits" ,  x+r*this.arcx,y+r*this.arcy+temp_theight_2*1.65,temp_twidth,temp_theight_2*0.6);
                                            }
                                            else
                                            {
                                                autotext(false,"1 hit" ,  x+r*this.arcx,y+r*this.arcy+temp_theight_2*1.65,temp_twidth,temp_theight_2*0.6);
                                            }
                                        }
                                    }
                                    else
                                    {
                                        context.fillStyle = intnodetextcolor;
                                        
                                        autotext2(false,(this.richness_val).toString() + " species", x+r*this.arcx,y+r*this.arcy-temp_theight_2*0.1,1.75*r*this.arcr*(1-partl2/2.0),temp_theight_2);
                                        
                                        if ((highlight_search)&&(this.searchin > 0))
                                        {
                                            if (this.searchin > 1)
                                            {
                                                autotext(false,(this.searchin).toString() + " hits" ,  x+r*this.arcx,y+r*this.arcy+temp_theight_2*1.45,temp_twidth,temp_theight_2*0.6);
                                            }
                                            else
                                            {
                                                autotext(false,"1 hit" ,  x+r*this.arcx,y+r*this.arcy+temp_theight_2*1.45,temp_twidth,temp_theight_2*0.6);
                                            }
                                        }
                                        
                                    }
                            }
                            else
                            {
                                // polytomy node filling
                                if (polytype ==1)
                                {
                                    context.beginPath();
                                    context.arc(x+r*(this.arcx),y+r*this.arcy,r*this.arcr,0,Math.PI*2,true);
                                    context.fillStyle = this.barccolor();
                                    context.fill();
                                }
                            } // polytomies
                        }
                    }
                    else
                    {
                        // we are drawing a leaf
                        this.tipleaflogic(x+((r)*this.arcx),y+(r)*this.arcy,r*this.arcr,this.arca);
                        if ( (r*leafmult) > threshold*10)
                        {
                            this.leafdetail(x,y,r,leafmult,partc,partl2,Twidth,Tsize);
                        }
                    }
                }
            }
        }
        if (this.lengthbr <= timelim)
        {
            if (this.richness_val > 1)
            {
                this.growthleaflogic(x+((r)*(this.arcx)),y+(r)*(this.arcy),r*leafmult*0.5*partc,this.arca);
            }
            else
            {
                this.tipleaflogic(x+((r)*this.arcx),y+(r)*this.arcy,r*this.arcr,this.arca);
                if ( (r*leafmult) > threshold*10)
                {
                    this.leafdetail(x,y,r,leafmult,partc,partl2,Twidth,Tsize);
                }
            }
        }
    }
    return signdone;
}

midnode.prototype.leafdetail = function(x,y,r,leafmult,partc,partl2,Twidth,Tsize)
{
    var temp_twidth = (r*leafmult*partc-r*leafmult*partl2)*Twidth;
    var temp_theight = ((r*leafmult*partc-r*leafmult*partl2)*Tsize/3.0);

 
        if (this.linkclick_w)
        {
            context.fillStyle = 'rgb(0,0,0)';
            context.beginPath();
            context.arc(x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.6,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = 'rgb(255,255,255)';
            context.beginPath();
            context.arc(x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.5,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = 'rgb(0,0,0)';
            autotext3(true, "WPD", x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_twidth*0.19,temp_theight*0.2);
        }
        else
        {
            context.fillStyle = 'rgb(255,255,255)';
            context.beginPath();
            context.arc(x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.6,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = this.leafcolor2();
            context.beginPath();
            context.arc(x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.5,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = this.leafcolor3();
            autotext3(true, "WPD", x+r*this.arcx-temp_theight,y+r*this.arcy-temp_theight*1.75,temp_twidth*0.19,temp_theight*0.2);
        }
        
        if (this.linkclick_e)
        {
            context.fillStyle = 'rgb(0,0,0)';
            context.beginPath();
            context.arc(x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.6,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = 'rgb(255,255,255)';
            context.beginPath();
            context.arc(x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.5,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = 'rgb(0,0,0)';
            autotext3(true,  "Genbank"  , x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_twidth*0.19,temp_theight*0.2);
        }
        else
        {
            context.fillStyle = 'rgb(255,255,255)';
            context.beginPath();
            context.arc(x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.6,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = this.leafcolor2();
            context.beginPath();
            context.arc(x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_theight*0.5,0,Math.PI*2,true);
            context.fill();
            context.fillStyle = this.leafcolor3();
            autotext3(true,  "Genbank" , x+r*this.arcx+temp_theight,y+r*this.arcy-temp_theight*1.75,temp_twidth*0.19,temp_theight*0.2);
        }
        
        
        
        context.fillStyle = this.leafcolor3();
        
            if (this.name2)
            {
                autotext3(true,this.name2 + " " + this.name1,x+r*this.arcx,y+r*this.arcy+temp_twidth*0.1,temp_twidth*1.6,temp_theight*0.75);
            }
            else
            {
                autotext3(true,this.name1,x+r*this.arcx,y+r*this.arcy+temp_twidth*0.1,temp_twidth*1.6,temp_theight*0.75);
            }

 
}

function performsearch2(toclear)
{
    searchinteriornodes = false;
    var changedvar = false;
    var stringin = document.forms["myform"]["tosearchfor"].value;
    
    stringin = stringin.replace("extinct in the wild", "EW");
    stringin = stringin.replace("extinct", "EX");
    stringin = stringin.replace("critically endangered", "CR");
    stringin = stringin.replace("endangered", "EN");
    stringin = stringin.replace("vulnerable", "VU");
    stringin = stringin.replace("near threatened", "NT");
    stringin = stringin.replace("least concern", "LC");
    stringin = stringin.replace("data deficient", "DD");
    stringin = stringin.replace("not evaluated", "NE");
  
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
        latin_search = (document.forms["myform"]["latinsearch"].checked)
    }
    if (common_search != (document.forms["myform"]["commonsearch"].checked))
    {
        changedvar = true;
        common_search = (document.forms["myform"]["commonsearch"].checked)
    }
    if (trait_search != (document.forms["myform"]["traitsearch"].checked))
    {
        changedvar = true;
        trait_search = (document.forms["myform"]["traitsearch"].checked)
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
        //if (numhits == 0)
       // {
        //    searchinteriornodes = true;
        //    fulltree.clearsearch();
        //    numhits = fulltree.search();
        //
        //}
        changedvar = true;
    }
    return changedvar;
}


midnode.prototype.searchone = function(stringin,leafonly)
{
    var foundstr = 0;
    
    if (document.forms["myform"]["traitsearch"].checked)
    {
        if ((((stringin == "EX")||(stringin == "EW"))||(((stringin == "EN")||(stringin == "CR"))||((stringin == "VU")||(stringin == "NT"))))||(((stringin == "DD")||(stringin == "LC"))||(stringin == "NE")))
        {
            if (!(this.child1))
            {
                if ((this.redlist)&&(this.redlist == stringin))
                {
                    foundstr +=this.richness_val;
                }
            }
        }
        else
        {
            if (((stringin.toLowerCase() == "increasing")&&(this.popstab))&&(this.popstab == "I"))
            {
                foundstr +=this.richness_val;
            }
            else
            {
                if (((stringin.toLowerCase() == "decreasing")&&(this.popstab))&&(this.popstab == "D"))
                {
                    foundstr +=this.richness_val;
                }
                else
                {
                    if (((stringin.toLowerCase() == "stable")&&(this.popstab))&&(this.popstab == "S"))
                    {
                        foundstr +=this.richness_val;
                    }
                    else
                    {
                        if ((stringin.toLowerCase() == "threatened")&&((this.redlist)&&(((this.redlist == "CR")||(this.redlist == "EN"))||(this.redlist == "VU"))))
                        {
                            foundstr +=this.richness_val;
                        }
                    }
                }
            }
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
                if ((this.cname)&&((this.cname.toLowerCase()).search(stringin) != -1))
                {
                    foundstr +=this.richness_val;
                }
            }
            else
            {
                if ((this.cname)&&((this.cname).search(stringin) != -1))
                {
                    foundstr +=this.richness_val;
                }
            }
        }
    }
    
    if ((foundstr == 0)&&(this.academic_name))
    {
        if ((   (((this.academic_name).toLowerCase()).search(stringin.toLowerCase())) != -1)||(stringin == "SFU"))
        foundstr +=this.richness_val;
        
    }
    
    return foundstr;
}



midnode.prototype.searchtwo = function(stringin,leafonly)
{
    var foundstr = 0;
    
    if (document.forms["myform"]["traitsearch"].checked)
    {
        if ((((stringin == "EX")||(stringin == "EW"))||(((stringin == "EN")||(stringin == "CR"))||((stringin == "VU")||(stringin == "NT"))))||(((stringin == "DD")||(stringin == "LC"))||(stringin == "NE")))
        {
            if (!(this.child1))
            {
                if ((this.redlist)&&(this.redlist == stringin))
                {
                    foundstr +=this.richness_val;
                }
            }
        }
        else
        {
            if (((stringin.toLowerCase() == "increasing")&&(this.popstab))&&(this.popstab == "I"))
            {
                foundstr +=this.richness_val;
            }
            else
            {
                if (((stringin.toLowerCase() == "decreasing")&&(this.popstab))&&(this.popstab == "D"))
                {
                    foundstr +=this.richness_val;
                }
                else
                {
                    if (((stringin.toLowerCase() == "stable")&&(this.popstab))&&(this.popstab == "S"))
                    {
                        foundstr +=this.richness_val;
                    }
                    else
                    {
                        if ((stringin.toLowerCase() == "threatened")&&((this.redlist)&&(((this.redlist == "CR")||(this.redlist == "EN"))||(this.redlist == "VU"))))
                        {
                            foundstr +=this.richness_val;
                        }
                    }
                }
            }
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
        if ((this.child1)&&(foundstr == 0))
        {
            if ((fullsearchstring.toLowerCase()) == fullsearchstring)
            {
                if ((this.name1)&&((this.name1.toLowerCase()) == fullsearchstring))
                {
                    foundstr +=this.richness_val;
                }
            }
            else
            {
                if ((this.name1)&&((this.name1) == fullsearchstring))
                {
                    foundstr +=this.richness_val;
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
                if ((this.cname)&&((this.cname.toLowerCase()).search(stringin) != -1))
                {
                    foundstr +=this.richness_val;
                }
            }
            else
            {
                if ((this.cname)&&((this.cname).search(stringin) != -1))
                {
                    foundstr +=this.richness_val;
                }
            }
        }
        
    }
    return foundstr;
}






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
    var searchin = 0;
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
    this.linkclick_w = false; // tells if a link has been clicked (website)
    this.linkclick_e = false; // tells if a link has been clicked (email)

    
    this.phylogenetic_diversity = 0.0;
    
    // This part of the code initialises the mode from newick format
    var bracketscount = 0;
    var cut;
    var end;
    
    // this is the name of the academic working on this species
    var academic_name = null;
    var num_academic = 0;
    var weblink = null;
    var maillink = null;
    
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
        
        if ((cutname.length > 0)&&((cutname!=((parseFloat(cutname)).toString()))||innode_label_help))
        {
            
            //this.name2 = null;
            //this.name1 = cutname;
            
            lengthcut = -1;
            
            for (i = 0; i < cutname.length ; i++)
            {
                if (cutname.charAt(i) == '{')
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
                
                this.cname = cutname.substr(lengthcut+1,(cutname.length)-lengthcut-2);
                if (lengthcut != 1)
                {
                    this.name1 = cutname.substr(0,lengthcut);
                }
                else
                {
                    this.name1 = null;
                }
                
                // now we need to split [] out of cname and replace "*" with ","
                
                lengthcut = -1;
                //*
                for (i = 0; i < (this.cname).length ; i++)
                {
                    if ((this.cname).charAt(i) == '[')
                    {
                        lengthcut = i;
                        i = (this.cname).length;
                    }
                }
                //*/
                
                
                if (lengthcut == -1)
                {
                    this.name2 = null;
                }
                else
                {
                    this.name2 = (this.cname).substr(lengthcut+1,((this.cname).length)-lengthcut-2);
                    this.cname = (this.cname).substr(0,lengthcut);
                    
                }
                
                
                for (i = 0; i < (this.cname).length ; i++)
                {
                    if ((this.cname).charAt(i) == '*')
                    {
                        (this.cname) = (this.cname).substr(0, i) + "," + (this.cname).substr(i+1,(this.cname).length-1);
                    }
                }
                
                /*
                 lengthcut = -1;
                 for (i = 0; i < this.cname.length ; i++)
                 {
                 if (this.cname.charAt(i) == '_')
                 {
                 lengthcut = i;
                 i = this.cname.length;
                 }
                 }
                 if (lengthcut == -1)
                 {
                 // no conservationdata
                 this.popstab = "U";
                 this.redlist = "NE";
                 }
                 else
                 {
                 this.redlist = this.cname.substr(lengthcut+1,(this.cname.length)-lengthcut-3);
                 this.popstab = this.cname.substr((this.cname.length)-1,1);
                 this.cname = this.cname.substr(0,lengthcut);
                 }
                 */
                
                
            }
        }
        else
        {
            
            this.name2 = null;
            this.name1 = null;
            this.cname = null;
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
        
        if (x.length > 0)
        {
            lengthcut = -1;
            for (i = 0; i < x.length ; i++)
            {
                if (x.charAt(i) == '{')
                {
                    lengthcut = i;
                    i = x.length;
                }
            }
            if (lengthcut == -1)
            {
                // no metadata
                datahastraits = false;
            }
            else
            {
                // metadata
                
                /// ***** LEAF NODE SORT START
                
                this.cname = x.substr(lengthcut+1,(x.length)-lengthcut-2)
                x = x.substr(0,lengthcut);
                
                //*
                lengthcut = -1;
                for (i = 0; i < this.cname.length ; i++)
                {
                    if (this.cname.charAt(i) == '_')
                    {
                        lengthcut = i;
                        i = this.cname.length;
                    }
                }
                if (lengthcut == -1)
                {
                    // no conservationdata
                    this.popstab = "U";
                    this.redlist = "NE";
                }
                else
                {
                    this.redlist = this.cname.substr(lengthcut+1,(this.cname.length)-lengthcut-3);
                    this.popstab = this.cname.substr((this.cname.length)-1,1);
                    this.cname = this.cname.substr(0,lengthcut);
                }
            }
            
            
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
        else
        {
            this.name2 = null;
            this.name1 = null;
            datahastraits = false;
        }
    }
}

// SORTING OUT THE LINKS TO OUTSIDE THE PAGE

midnode.prototype.links2 = function()
{
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if ((this.child1)&&(this.lengthbr > timelim))
        {
            if ((this.child1.links2())||(this.child2.links2()))
            {
                this.linkclick = true;
            }
        }
        if (this.lengthbr > timelim)
        {
            if (!(((this.richness_val > 1)&&(r<=threshold))&&(timelim <= 0)))
            {
                if (this.richness_val > 1)
                {
                    if (this.lengthbr > timelim)
                    {
                        var temp_twidth = (r*partc-r*partl2)*Twidth;
                        var temp_theight = (r*partc-r*partl2)*Tsize/2.0;
                        var temp_theight_2 = (r*partc-r*partl2)*Tsize/3.0;
                        if ((this.npolyt)||(polytype == 3))
                        {
                            
                            if ( r > threshold*50)
                            {
                                var linkpos = 0;
                                
                                
                          
                                
                                linkpos = -temp_theight/2.0;
                                
                                if ((      ((mouseX-(x+r*this.arcx+linkpos))*(mouseX-(x+r*this.arcx+linkpos)))+  ((mouseY-(y+r*this.arcy-temp_theight_2*1.3))*(mouseY-(y+r*this.arcy-temp_theight_2*1.3)))    ) <= ((temp_theight*0.35)*(temp_theight*0.35)))
                                {
                                    this.linkclick_w = true;
                                }
                                
                                linkpos = temp_theight/2.0;
                                
                                if ((      ((mouseX-(x+r*this.arcx+linkpos))*(mouseX-(x+r*this.arcx+linkpos)))+  ((mouseY-(y+r*this.arcy-temp_theight_2*1.3))*(mouseY-(y+r*this.arcy-temp_theight_2*1.3)))    ) <= ((temp_theight*0.35)*(temp_theight*0.35)))
                                {
                                    this.linkclick_e = true;
                                }
                            }
                        }
                    }
                }
                else
                {
                    if ( (r*leafmult) > threshold*10)
                    {
                        if(this.leaflink(x,y,r,leafmult,partc,partl2,Twidth,Tsize))
                        {
                            
                            this.linkclick = true;
                            
                        }
                    }
                }
            }
        }
    }
    return this.linkclick;

}

midnode.prototype.links2_w = function()
{
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if ((this.child1)&&(this.lengthbr > timelim))
        {
            if ((this.child1.links2_w())||(this.child2.links2_w()))
            {
                this.linkclick_w = true;
            }
        }
        if (this.lengthbr > timelim)
        {
            if (!((r<=threshold)&&(timelim <= 0)))
            {
                if (this.richness_val == 1)
                {
                    if ( (r*leafmult) > threshold*10)
                    {
                        if(this.leaflink_w(x,y,r,leafmult,partc,partl2,Twidth,Tsize))
                        {
                            
                            this.linkclick_w = true;
                            
                        }
                    }
                }
            }
        }
    }
    return this.linkclick_w;
    
}


midnode.prototype.links2_e = function()
{
    //*
    var x ;
    var y ;
    var r ;
    if(this.dvar)
    {
        if (this.rvar)
        {
            x = this.xvar;
            y = this.yvar;
            r = this.rvar;
        }
        if ((this.child1)&&(this.lengthbr > timelim))
        {
            if ((this.child1.links2_e())||(this.child2.links2_e()))
            {
                this.linkclick_e = true;
            }
        }
        if (this.lengthbr > timelim)
        {
            if (!((r<=threshold)&&(timelim <= 0)))
            {
                if (this.richness_val == 1)
                {
                    if ( (r*leafmult) > threshold*10)
                    {
                        if(this.leaflink_e(x,y,r,leafmult,partc,partl2,Twidth,Tsize))
                        {
                            
                            this.linkclick_e = true;
                            
                        }
                    }
                }
            }
        }
    }
    return this.linkclick_e;
    // */
    
}


midnode.prototype.leaflink = function(x,y,r,leafmult,partc,partl2,Twidth,Tsize)
{
    
    return false; // fully disable wiki links
}

midnode.prototype.leaflink_e = function(x,y,r,leafmult,partc,partl2,Twidth,Tsize)
{
    if ( r > threshold*6)
    {
        var temp_twidth = (r*leafmult*partc-r*leafmult*partl2)*Twidth;
        var temp_theight = ((r*leafmult*partc-r*leafmult*partl2)*Tsize/3.0);
        if (temp_theight*0.2 > threshold/2.5)
        {
            if (((mouseX-(x+r*this.arcx+temp_theight))*(mouseX-(x+r*this.arcx+temp_theight)))+((mouseY-(y+r*this.arcy-temp_theight*1.75))*(mouseY-(y+r*this.arcy-temp_theight*1.75))) <= ((temp_theight*0.6)*(temp_theight*0.6)))
            {
                this.linkclick_e = true;
            }
        }
    }
    return this.linkclick_e;
}

midnode.prototype.leaflink_w = function(x,y,r,leafmult,partc,partl2,Twidth,Tsize)
{
    if ( r > threshold*6)
    {

            var temp_twidth = (r*leafmult*partc-r*leafmult*partl2)*Twidth;
            var temp_theight = ((r*leafmult*partc-r*leafmult*partl2)*Tsize/3.0);
            if (temp_theight*0.2 > threshold/2.5)
            {
                if (((mouseX-(x+r*this.arcx-temp_theight))*(mouseX-(x+r*this.arcx-temp_theight)))+((mouseY-(y+r*this.arcy-temp_theight*1.75))*(mouseY-(y+r*this.arcy-temp_theight*1.75))) <= ((temp_theight*0.6)*(temp_theight*0.6)))
                {
                    this.linkclick_w = true;
                }
            }

    }
    return this.linkclick_w;
}



midnode.prototype.clearlinks = function()
{
    this.linkclick = false;
    this.linkclick_w = false;
    this.linkclick_e = false;
    if (this.child1)
    {
        this.child1.clearlinks();
        this.child2.clearlinks();
    }
}

midnode.prototype.wikilink = function()
{

}

midnode.prototype.weblinkgo = function()
{
    if (this.linkclick_w)
    {
        if (this.child1)
        {
            if (this.child1.linkclick_w)
            {
                this.child1.weblinkgo();
            }
            else
            {
                if (this.child2.linkclick_w)
                {
                    this.child2.weblinkgo();
                }
                else
                {
                    mywindow = window.open("http://www.marinespecies.org/porifera/porifera.php?p=taxdetails&id="+this.cname);
                }
            }
        }
        else
        {
            mywindow = window.open("http://www.marinespecies.org/porifera/porifera.php?p=taxdetails&id="+this.cname);
        }
    }
}

midnode.prototype.emailgo = function()
{
    if (this.linkclick_e)
    {
        if (this.child1)
        {
            if (this.child1.linkclick_e)
            {
                this.child1.emailgo();
            }
            else
            {
                if (this.child2.linkclick_e)
                {
                    this.child2.emailgo();
                }
                else
                {
                    mywindow = window.open("http://www.ncbi.nlm.nih.gov/nuccore/?term="+ this.name1);
                }
            }
        }
        else
        {
            mywindow = window.open("http://www.ncbi.nlm.nih.gov/nuccore/?term="+ this.name2+"%20"+this.name1);
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

midnode.prototype.poptxt = function() // returns text for redlist status
{
    if (this.popstab)
    {
        switch(this.popstab)
        {
            case "D":
				return ("decreasing");
            case "I":
				return ("increasing");
            case "S":
				return ("stable");
            case "U":
            {
                if ((this.redlist == "EX")||(this.redlist == "EW"))
                {
                    return ("extinct");
                }
                else
                {
                    return ("stability unknown");
                }
            }
            default:
				if ((this.redlist == "EX")||(this.redlist == "EW"))
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
        if ((this.redlist == "EX")||(this.redlist == "EW"))
        {
            return ("extinct");
        }
        else
        {
            return ("stability unknown");
        }
    }
}

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




