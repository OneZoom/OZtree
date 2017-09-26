
/******************************************************
 *
 * This file contains a set of leaf drawing routines
 * suitable for use anywhere in the OneZoom codebase
 * free of dependencies on any global variables
 *
 ******************************************************/

/*
 * this routine draws a basic circular leaf with an outline
 *
 * inputs:
 * leafContext is the canvas context on which the leaf will be drawn
 * x,y are the coordinate of the leaf centre
 * r is the radius of the circle
 * outlineThickness is the thickness of the outline
 * insideColor is the colour of the inside
 * outlineColor is the colour of the outside
 *
 * returns: nothing
 */
function circularOutlinedLeaf(leafContext,x,y,r,outlineThickness,insideColor,outlineColor)
{
    
    // save the context state so we don't mess it up
    leafContext.save();
    
    // draw the circle
    leafContext.beginPath();
    // deduct the line thickness from the radius so that the final complete circle fills an area of the correct size.
    
    if (outlineThickness >= 1)
    {
    
    leafContext.arc(x,y,r-outlineThickness*0.5,0,Math.PI*2,true);
    
    // fill centre
    leafContext.fillStyle = insideColor;
    leafContext.fill();
    
    // draw outline
    leafContext.strokeStyle = outlineColor;
    leafContext.lineWidth = outlineThickness;
    leafContext.stroke();
    }
    else
    {
        leafContext.arc(x,y,r,0,Math.PI*2,true);
        
        // fill centre
        leafContext.fillStyle = insideColor;
        leafContext.fill();
        
        // draw outline
        leafContext.lineWidth = outlineThickness;
    }
    // restore the context
    leafContext.restore();
}

/*
 * this routine draws a basic circular leaf with a dotted outline
 *
 * inputs:
 * leafContext is the canvas context on which the leaf will be drawn
 * x,y are the coordinate of the leaf centre
 * r is the radius of the circle
 * insideColor is the colour of the inside
 * outlineColor is the colour of the outside
 *
 * returns: nothing
 */
function circularDottedLeaf(leafContext,x,y,r,insideColor,outlineColor)
{
    // gap
    // circularOutlinedLeaf(leafContext,x,y,r*0.8,0,'rgb(255,255,255)','rgb(255,255,255)');
    
    // save the context state so we don't mess it up
    leafContext.save();
    
    // draw the circle
    leafContext.beginPath();
    // 0.927 = 1-(0.146/2)
    leafContext.arc(x,y,r*0.927,0,Math.PI*2,true);
    
    // outline
    leafContext.strokeStyle = outlineColor;
    leafContext.lineWidth = r*0.146;
    // 0.292 = 0.146*2
    leafContext.setLineDash([0, r*0.292]);
    leafContext.stroke();
    
    // fill centre
    leafContext.fillStyle = insideColor;
    leafContext.fill();
    
    // restore the context
    leafContext.restore();
}

/*
 * this routine draws a natural looking leaf with a circular base
 * constructed from an arc and two bezier curves joining at a point
 * there are some 'magic numbers' in here which correspond to reasonable artistic choices
 *
 * inputs:
 * leafContext is the canvas context on which the leaf will be drawn
 * x,y are the coordinate of the leaf centre
 * r is the radius of the circle
 * angle is the orientation of the leaf (in radians)
 * xtip gives the position of the leaf tip in the x axis (along the length of the leaf)
 * ytip gives the position of the leaf tip in the y axis (along the width of the leaf)
 * tipd is the direction the tip is facing (0 is in line with the leaf)
 * tipa is the angle of the tip (where 0 means a very sharp point)
 * insideColor is the colour of the inside
 * outlineColor is the colour of the outside
 *
 * returns: nothing
 */
function naturalLeaf(leafContext,x,y,r,angle,xtip,ytip,tipd,tipa,insideColor,outlineColor)
{
    // save the context state so we don't mess it up
    leafContext.save();
    
    // precalculate x and y components of movement from leaf perspective
    var tempsinpre = Math.sin(angle); // add for y in line with leaf length
    var tempcospre = Math.cos(angle); // add for x in line with leaf length
    var tempsin90pre = Math.sin(angle + Math.PI/2.0); // add for y in line with leaf width
    var tempcos90pre = Math.cos(angle + Math.PI/2.0); // add for x in line with leaf width
    
    // precalculate the start and end positions for the arc
    var arcendx = x + Math.cos(angle-Math.PI*0.2) * r;
    var arcendy = y + Math.sin(angle-Math.PI*0.2) * r;
    var arcstartx = x + Math.cos(angle+Math.PI*0.2) * r;
    var arcstarty = y + Math.sin(angle+Math.PI*0.2) * r;
    
    // precalculate x and y components of movement from perspective of the leaf edge at the start and end of the arc
    var tempsinpreae = Math.sin(angle-Math.PI*0.2+ Math.PI/2.0); // add for y in line with end of arc
    var tempcospreae = Math.cos(angle-Math.PI*0.2+ Math.PI/2.0); // add for x in line with end of arc
    var tempsinpreas = Math.sin(angle+Math.PI*0.2+ Math.PI/2.0); // add for y in line with start of arc
    var tempcospreas = Math.cos(angle+Math.PI*0.2+ Math.PI/2.0); // add for x in line with start of arc
    
    // precalculate x and y components of movement from perspective of the leaf edge at the left and right edges of the leaf tip
    var tempsinpretip1 = Math.sin(angle+tipd+tipa*0.5); // add for y in line with leaf length
    var tempcospretip1 = Math.cos(angle+tipd+tipa*0.5); // add for x in line with leaf length
    var tempsinpretip2 = Math.sin(angle+tipd-tipa*0.5); // add for y in line with leaf length
    var tempcospretip2 = Math.cos(angle+tipd-tipa*0.5); // add for x in line with leaf length
    
    // precalculate the tip position
    var endx = x+r*(1.0+xtip)*tempcospre+r*ytip*tempcos90pre;
    var endy = y+r*(1.0+xtip)*tempsinpre+r*ytip*tempsin90pre;
    
    // draw the arc
    leafContext.beginPath();
    leafContext.arc(x,y,r,angle+Math.PI*0.2,angle-Math.PI*0.2,false);
    
    // draw the bezier curves
    // there are no start positions but there are two control points
    leafContext.bezierCurveTo(arcendx+r*0.3*tempcospreae,arcendy+r*0.3*tempsinpreae,endx-r*0.15*tempcospretip1,endy-r*0.15*tempsinpretip1,endx,endy);
    leafContext.bezierCurveTo(endx-r*0.15*tempcospretip2,endy-r*0.15*tempsinpretip2,arcstartx-r*0.3*tempcospreas,arcstarty-r*0.3*tempsinpreas,arcstartx,arcstarty);
    
    // fill the outside of the leaf
    leafContext.fillStyle = outlineColor;
    leafContext.fill();
    
    var insidesize = 0.88;
    if (r < 20)
    {
        insidesize = 0.80;
    }
    else if (r < 50)
    {
        insidesize = 0.80+0.08*(r-20)/(20);
    }
    
    // now move on to do the innder part of the leaf
    // change the start and end positions for the arc
    arcendx = x + Math.cos(angle-Math.PI*0.2) * r*insidesize;
    arcendy = y + Math.sin(angle-Math.PI*0.2) * r*insidesize;
    arcstartx = x + Math.cos(angle+Math.PI*0.2) * r*insidesize;
    arcstarty = y + Math.sin(angle+Math.PI*0.2) * r*insidesize;
    
    // change the x and y components of movement from perspective of the leaf edge at the left and right edges of the leaf tip
    tempsinpretip1 = Math.sin(angle+tipd+tipa*0.2); // add for y in line with leaf length
    tempcospretip1 = Math.cos(angle+tipd+tipa*0.2); // add for x in line with leaf length
    tempsinpretip2 = Math.sin(angle+tipd-tipa*0.2); // add for y in line with leaf length
    tempcospretip2 = Math.cos(angle+tipd-tipa*0.2); // add for x in line with leaf length
    
    // draw the arc
    leafContext.beginPath();
    leafContext.arc(x,y,r*insidesize,angle+Math.PI*0.2,angle-Math.PI*0.2,false);
    
    // draw the bezier curves
    leafContext.bezierCurveTo(arcendx+r*0.3*tempcospreae,arcendy+r*0.3*tempsinpreae,endx-r*0.15*tempcospretip1,endy-r*0.15*tempsinpretip1,endx,endy);
    leafContext.bezierCurveTo(endx-r*0.15*tempcospretip2,endy-r*0.15*tempsinpretip2,arcstartx-r*0.3*tempcospreas,arcstarty-r*0.3*tempsinpreas,arcstartx,arcstarty);
    
    // fill the inside of the leaf
    leafContext.fillStyle = insideColor;
    leafContext.fill();
    
    // restore the context
    leafContext.restore();
}

/*
 * this routine draws one of a collection of natural looking leaves
 * chosen with a basic pseudo random number generator which uses the leaf angle as a seed
 *
 * inputs:
 * leafContext is the canvas context on which the leaf will be drawn
 * x,y are the coordinate of the leaf centre
 * r is the radius of the circle
 * angle is the orientation of the leaf (in radians)
 * insideColor is the colour of the inside
 * outlineColor is the colour of the outside
 *
 * returns: nothing
 */
function randomNaturalLeaf(leafContext,x,y,r,angle,insideColor,outlineColor)
{
    // choose a pseudo random number from the angle
    var pseudor = Math.floor(angle*112345)%4;
    // call naturalLeaf with an appropriate set of numbers for slightly different leaf looks
    if (pseudor == 0)
    {
        naturalLeaf(leafContext,x,y,r,angle,0.45,0.25,Math.PI*0.4,Math.PI*0.4, insideColor,outlineColor);
    }
    if (pseudor == 1)
    {
        naturalLeaf(leafContext,x,y,r,angle,0.45,-0.15,0,0.1, insideColor,outlineColor);
    }
    if (pseudor == 2)
    {
        naturalLeaf(leafContext,x,y,r,angle,0.4,-0.25,-Math.PI*0.4,Math.PI*0.2, insideColor,outlineColor);
    }
    if (pseudor == 3)
    {
        naturalLeaf(leafContext,x,y,r,angle,0.45,0.15,0,0.2, insideColor,outlineColor);
    }
}

/*
 * this routine prints arced text around a circle
 *
 * inputs:
 * textContext is the canvas context on which the text will be drawn
 * x,y are the coordinates of the leaf centre
 * r is the radius of the circle inside which text should be drawn
 * stringText is the text that should be shown
 * textDirection should be +1 (for clockwise) or -1 (for anticlockwise)
 * startAngle is angle orientation of the start point of the text (0 is top of the circle)
 * gapAngle is the angle between each character
 * textWidth is the text size in points (note there is nothing to stop silly values being chosen)
 * textColor is the colour of the text
 *
 * returns: nothing
 */
function arcText(textContext,x,y,r,stringText,textDirection,startAngle,gapAngle,textWidth,textColor,textStyle)
{
    // save the context state so we don't mess it up
    textContext.save();
    
    // we need a monospaced font in order for this not to look rubbish
    if (textStyle)
    {
        textContext.font = textStyle + ' ' + ((Math.floor(textWidth)).toString() + 'px courier');
    }
    else
    {
        textContext.font = ((Math.floor(textWidth)).toString() + 'px courier');
    }
    textContext.fillStyle = textColor;
    textContext.translate(x,y)
    textContext.rotate(startAngle)
    if (textDirection == -1)
    {
        textContext.rotate(Math.PI)
    }
    
    // loop around each character
    for (var i = 0 ; i < stringText.length ; i ++)
    {
        // push context onto context state stack
        textContext.save();
        // move from centre to edge of circle
        textContext.translate(0,textDirection*(-r));
        // fill text
        textContext.fillText(stringText[i],0,0);
        // restore context by popping back from context state stack
        textContext.restore();
        // rotate ready for next position
        textContext.rotate(textDirection*gapAngle);
    }
    
    // restore the context
    textContext.restore();
}

// leaf drawing (without details)
function ghostLeafBase(leafContext,x,y,r,angle,leafCol)
{
    var detail_level = 0;
    if (r > 90)
    {
        detail_level = 3;
    }
    
    // DRAW MAIN LEAF PARTS
    if ((detail_level > 2)&&(!((typeof(drawsponsors) !== 'undefined')&&drawsponsors == false))) // global variable hack to turn off sponsorship text
    {
        circularOutlinedLeaf(leafContext,x,y,r*0.935,r*0.015,leafCol.insideColor,leafCol.outlineColor)
        //circularDottedLeaf(leafContext,x,y,r,leafCol.insideColor,leafCol.BGColor);
    }
    else
    {
        circularDottedLeaf(leafContext,x,y,r,leafCol.insideColor,leafCol.outlineColor);
    }
}

function fullLeafBase(leafContext,x,y,r,angle,type,leafCol)
{
    var detail_level = 0;
    if (r > 20)
    {
        detail_level = 1;
    }
    
    // DRAW MAIN LEAF PARTS
    if (type == 1)
    {
        circularOutlinedLeaf(leafContext,x,y,r,r*0.12,leafCol.insideColor,leafCol.outlineColor);
    }
    else
    {
        // this clips out the circle for the leaf if needed to create the break
        if (detail_level > 0)
        {
            // draw the circle
            leafContext.beginPath();
            var clearrad = r*1.038;
            leafContext.arc(x,y,clearrad,0,Math.PI*2,true);
            leafContext.fillStyle = leafCol.BGColor;
            leafContext.fill();
        }
        randomNaturalLeaf(leafContext,x,y,r,angle,leafCol.insideColor,leafCol.outlineColor)
    }
}

/*
 * this routine:
 *
 * draws a ghost leaf
 * manages the sponsorship text
 * manages the internal text
 * manages the internal image
 * manages mouse / touch of buttons
 * deals with semantic zooming of leaf
 *
 * inputs:
 *
 * leafContext is the canvas context on which the text will be drawn
 *
 * x,y are the coordinates of the leaf centre
 * r is the radius of the circle that will form the leaf
 * angle is the orientation of the leaf (radians)
 *
 * mouseTouch [x,y] is an array with the mouse/touch x and y coordinates for testing if something is clicked,
 *
 * commonText is the common name (might be null)
 * latinText is the latin name (might be null)
 * lineText is an extra line of text (might be null) probably relates to conservation status
 *
 * hasImage is true if there is going to be an image (which might not be loaded if imageObject is null)
 * imageObject is the image to be drawn (might be null)
 *
 *
 leafCol = {
 "insideColor" : this.leafcolor1()
 "outlineColor" : this.leafcolor2()
 "BGColor" : backgroundcolor
 "textColor" : this.leafcolor3()
 "highlightColor" : 'rgb(255,255,255)'
 "imageLineColor" : 'rgb(110,110,110)'
 }
 
 * returns:
 * a string indicating what to do on click with mouse and touch in their given locations
 * "z" means zoom in to the leaf (it was clicked from a distance)
 * "c" means picture credit link
 * "s" means sponsorship link
 * "d" means details punchout link
 *
 */
function ghostLeaf(leafContext,x,y,r,angle,mouseTouch,commonText,latinText,lineText,copyText,imageObject,hasImage,hasOTT,leafCol)
{
    // DETERMINE DETAIL LEVEL
    // level 0 - basic leaf
    // level 1 - break from branch, circular thumbnail, one name
    // level 2 - name and thumbnail if both available
    // level 3 - full details on leaf including leaf text and basic sponsorship
    // level 4 - further sponsorship text appears
    var detail_level = 0;
    if (r > 200)
    {
        detail_level = 4;
    }
    else if (r > 90)
    {
        detail_level = 3;
    }
    else if (r > 50)
    {
        detail_level = 2;
    }
    else if (r > 20)
    {
        detail_level = 1;
    }
    
    // SET UP VARIABLE TO RETURN BASED ON CLICKING
    
    var leaf_clicking = null;
    if ((detail_level >= 0)&&(detail_level <3))
    {
        // test for mouse / touch over the signpost of the leaf and draw the circular image accordingly
        if(mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))<=(r*r))))
        {
            leaf_clicking = "z";
            circularDottedLeaf(leafContext,x,y,r,leafCol.insideColor,'rgb(0,0,0)');
            //circularDottedLeaf(leafContext,x,y,r*0.935,r*0.015,leafCol.insideColor,'rgb(0,0,255)')
        }
    }
    
    var doStroke = false;
    
    if ((detail_level > 2)&&(!((typeof(drawsponsors) !== 'undefined')&&drawsponsors == false))) // global variable hack to turn off sponsorship text
    {
        if(mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))<=(r*0.935*r*0.935))))
        {
            if(mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))>=(r*0.78*r*0.78))))
            {
                leaf_clicking = "s";
            }
            else //if (hasOTT == true)
            {
                leaf_clicking = "d";
            }
        }
    }
    
    
    // slightly annoyingly we have to decide up front where the (c) goes so that touch / click regions of the leaf are defined before any drawing takes place.
    if ((imageObject)&&(detail_level > 2))
    {
        var button_pos = y+r*0.34;// 0.75/2 -0.05
        
        if (r*0.035>6)
        {
            // draw copyright symbol
            
            // copyright symbol colors
            if (copyright(leafContext,x+r*0.43,button_pos,r*0.035,copyText,mouseTouch,leafCol.copyrightInside,leafCol.copyrightText,leafCol.copyrightTextHighlight,leafCol.copyrightInsideHighlight))
            {
                leaf_clicking = "c";
            }
        }
    }
    
    
   
    
    
    /*
     // DRAW MAIN LEAF PARTS
     if (detail_level > 2)
     {
     circularOutlinedLeaf(leafContext,x,y,r*0.935,r*0.015,leafCol.insideColor,leafCol.outlineColor)
     //circularDottedLeaf(leafContext,x,y,r,leafCol.insideColor,leafCol.BGColor);
     }
     else
     {
     circularDottedLeaf(leafContext,x,y,r,leafCol.insideColor,leafCol.outlineColor);
     }
     */
    
    if (!((typeof(drawsponsors) !== 'undefined')&&drawsponsors == false)) // global variable hack to turn off sponsorship text
    {
        
        // DRAW SPONSORSHIP TEXT PARTS
        // test if the leaf is large enough to do text
        if (detail_level > 2)
        {
            
            // draw the circle
            leafContext.beginPath();
            leafContext.arc(x,y,r*0.78,0,Math.PI*2,true);
            
            // draw outline
            leafContext.strokeStyle = leafCol.waterMark;
            leafContext.lineWidth = r*0.01;
            leafContext.stroke();
            
            var shortenedSponsorText = ("THIS PART OF THE TREE CAN GROW");
            
            // calculate text size
            var textWidth = 2.5/Math.max(32.0,shortenedSponsorText.length);
            // calculate gap between characters (in radians)
            var tempgap = Math.PI*2/(Math.max(32.0,shortenedSponsorText.length))*0.38;
            // calculate the offset needed to centralise the text
            var tempadd = (Math.PI-(shortenedSponsorText.length)*(tempgap))/2.0;
            var text_above = 1;
            
            // text under leaf
            
            if (leaf_clicking == "s")
            {
                // bold and highlighted because mouse over link
                arcText(leafContext,x,y,r*(0.85),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.textColor,'bold');
            }
            else
            {
                // standard text
                arcText(leafContext,x,y,r*(0.85),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.sponsorColor,null);
            }
            
            shortenedSponsorText = ("SPONSOR A SPECIES AND WE'LL ADD IT");
            
            // calculate text size
            textWidth = 2.5/Math.max(32.0,shortenedSponsorText.length);
            // calculate gap between characters (in radians)
            tempgap = Math.PI*2/(Math.max(32.0,shortenedSponsorText.length))*0.38;
            // calculate the offset needed to centralise the text
            tempadd = (Math.PI-(shortenedSponsorText.length)*(tempgap))/2.0;
            text_above = -1;
            
            
            // text under leaf
            if (leaf_clicking == "s")
            {
                // bold and highlighted because mouse over link
                arcText(leafContext,x,y,r*(0.85),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.sponsorHighlight,'bold');
            }
            else
            {
                // standard text
                arcText(leafContext,x,y,r*(0.85),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.sponsorColor,null);
            }
        }
        
    }
    
    if ( leaf_clicking == "d")
    {
        doStroke = true;
        context.strokeStyle = leafCol.textOutline;
        context.lineCap="round";
        context.lineWidth = Math.min(r*0.06,17) ;
    }
    
    // DRAW THE IMAGE AND TEXT
    if (detail_level > 0)
    {
        if (imageObject)
            //((hasImage)&&(!((!imageObject)&&(detail_level==1)))) // note I went for a simpler option here in case any images never load
        {
            // we have an image - note that if we're waiting for it to load and are at detail level 1 we escape and assume there is no image
            if (detail_level < 2)
            {
                //if (leaf_clicking == "z")
                //{
                //    circle_cut_image(leafContext,imageObject,x,y,r*0.85,'rgb(255,255,255)','rgb(255,255,255)');
               // }
                //else
                //{
                    circle_cut_image(leafContext,imageObject,x,y,r*0.85,leafCol.insideColor,null);
                //}
            }
            else
            {
                
                leafContext.fillStyle = leafCol.textColor;
                if (detail_level > 2)
                {
                    
                    rounded_image(leafContext,imageObject,x,y,r*0.75,leafCol.insideColor,leafCol.highlightColor)
                    
                    
                    // full text and link but with no image
                    if (commonText)
                    {
                        if (latinText)
                        {
                            //autotext(false,null,"•"+ latinText+ "•",x,y+r*0.5,r*1,r*0.1,leafContext,3);
                            autotext(doStroke,null,OZstrings["sciname"]+ latinText,x,y+r*0.5,r*1,r*0.1,leafContext,3);
                        }
                        autotext2(doStroke,null,commonText,x,y-r*0.55,r*1,r*0.12,leafContext,3);
                        autotext(doStroke,null,lineText , x,y+r*0.625,r,r*0.1,leafContext,3);
                    }
                    else if (latinText)
                    {
                        autotext(doStroke,null,OZstrings['No common name'],x,y+r*0.5,r*1,r*0.1,leafContext,3);
                        autotext2(doStroke,null,latinText,x,y-r*0.55,r*1,r*0.1,leafContext,3);
                        autotext(doStroke,null,lineText , x,y+r*0.65,r,r*0.1,leafContext,3);
                    }
                    else
                    {
                        autotext(doStroke,null,OZstrings['No known name'],x,y-r*0.55,r*1,r*0.1,leafContext,3);
                        autotext2(doStroke,null,lineText,x,y+r*0.55,r*1,r*0.12,leafContext,3);
                    }
                    

                }
                else
                {
                    if (commonText)
                    {
                        autotext2(doStroke,null,commonText,x,y-r*0.55,r*1.1,r*0.15,leafContext,3);
                    }
                    else if (latinText)
                    {
                        autotext2(doStroke,null,latinText,x,y-r*0.55,r*1.1,r*0.15,leafContext,3);
                    }
                    else
                    {
                        autotext2(doStroke,null,lineText,x,y-r*0.55,r*1.1,r*0.15,leafContext,3);
                    }
                    rounded_image(leafContext,imageObject,x,y+r*0.2,r*0.95,leafCol.insideColor,leafCol.highlightColor)
                }
            }
        }
        else
        {
            leafContext.fillStyle = leafCol.textColor;
            // draw some text
            if (detail_level < 3)
            {
                if (commonText)
                {
                    autotext3(doStroke,null,commonText,x,y,r*1.25,r*0.3,leafContext,3);
                }
                else if (latinText)
                {
                    autotext3(doStroke,null,latinText,x,y,r*1.25,r*0.3,leafContext,3);
                }
                else
                {
                    autotext2(doStroke,null,lineText,x,y,r*1.25,r*0.3,leafContext,3);
                }
            }
            else
            {
                // full text and link but with no image
                if (commonText)
                {
                    if (latinText)
                    {
                        //autotext(false,null,"•"+latinText+"•",x,y-r*0.45,r*1,r*0.15,leafContext,3);
                        autotext(doStroke,null,OZstrings['sciname']+latinText,x,y-r*0.45,r*1,r*0.12,leafContext,3);
                    }
                    autotext2(doStroke,null,commonText,x,y,r*1.35,r*0.25,leafContext,3);
                    autotext(doStroke,null,lineText , x,y+r*0.45,r*0.9,r*0.12,leafContext,3);
                }
                else if (latinText)
                {
                    autotext(doStroke,null,OZstrings['No common name'],x,y-r*0.45,r*1,r*0.12,leafContext,3);
                    autotext2(doStroke,null,latinText,x,y,r*1.35,r*0.25,leafContext,3);
                    autotext(doStroke,null,lineText , x,y+r*0.45,r*0.9,r*0.12,leafContext,3);
                }
                else
                {
                    autotext(doStroke,null,OZstrings['No known name'],x,y-r*0.4,r*1,r*0.12,leafContext,3);
                    autotext2(doStroke,null,lineText,x,y+r*0.2,r*1.35,r*0.25,leafContext,3);
                }
            }
        }
    }
    
    return leaf_clicking;
}





/*
 * this routine:
 *
 * draws a loading leaf
 * manages the internal text
 *
 * inputs:
 *
 * leafContext is the canvas context on which the text will be drawn
 *
 * x,y are the coordinates of the leaf centre
 * r is the radius of the circle that will form the leaf
 * angle is the orientation of the leaf (radians)
 *
 * mouseTouch [x,y] is an array with the mouse/touch x and y coordinates for testing if something is clicked,
 *
 * commonText is the common name (might be null)
 * latinText is the latin name (might be null)
 * lineText is an extra line of text (might be null) probably relates to conservation status
 *
 * hasImage is true if there is going to be an image (which might not be loaded if imageObject is null)
 * imageObject is the image to be drawn (might be null)
 *
 *
 leafCol = {
 "insideColor" : this.leafcolor1()
 "outlineColor" : this.leafcolor2()
 "BGColor" : backgroundcolor
 "textColor" : this.leafcolor3()
 "highlightColor" : 'rgb(255,255,255)'
 "imageLineColor" : 'rgb(110,110,110)'
 }
 
 */
function loadingLeaf(leafContext,x,y,r,commonText,latinText,lineText,leafCol)
{
    // DETERMINE DETAIL LEVEL
    // level 0 - basic leaf
    // level 1 - break from branch, circular thumbnail, one name
    // level 2 - name and thumbnail if both available
    // level 3 - full details on leaf including leaf text and basic sponsorship
    var detail_level = 0;
    if (r > 90)
    {
        detail_level = 3;
    }
    else if (r > 50)
    {
        detail_level = 2;
    }
    else if (r > 20)
    {
        detail_level = 1;
    }
    
    
    // DRAW THE IMAGE AND TEXT
    if (detail_level > 0)
    {
        
        leafContext.fillStyle = leafCol.textColor;
        // draw some text
        if (detail_level < 3)
        {
            if (commonText)
            {
                autotext3(false,null,commonText,x,y,r*1.25,r*0.3,leafContext,3);
            }
            else if (latinText)
            {
                autotext3(false,null,latinText,x,y,r*1.25,r*0.3,leafContext,3);
            }
            else
            {
                autotext2(false,null,lineText,x,y,r*1.25,r*0.3,leafContext,3);
            }
        }
        else
        {
            // full text and link but with no image
            if (commonText)
            {
                if (latinText)
                {
                    autotext(false,null,OZstrings['sciname']+latinText,x,y-r*0.45,r*1,r*0.12,leafContext,3);
                }
                autotext2(false,null,commonText,x,y,r*1.35,r*0.25,leafContext,3);
                autotext(false,null,lineText , x,y+r*0.45,r*0.9,r*0.12,leafContext,3);
            }
            else if (latinText)
            {
                autotext(false,null,OZstrings['No common name'],x,y-r*0.45,r*1,r*0.12,leafContext,3);
                autotext2(false,null,latinText,x,y,r*1.35,r*0.25,leafContext,3);
                autotext(false,null,lineText , x,y+r*0.45,r*0.9,r*0.12,leafContext,3);
            }
            else
            {
                autotext(false,null,OZstrings['No known name'],x,y-r*0.4,r*1,r*0.12,leafContext,3);
                autotext2(false,null,lineText,x,y+r*0.2,r*1.35,r*0.25,leafContext,3);
            }
        }
        
    }
    
    return null;
}



/*
 * this routine:
 *
 * draws a circular or natural leaf
 * manages the sponsorship text
 * manages the internal text
 * manages the internal image
 * manages mouse / touch of buttons
 * deals with semantic zooming of leaf
 *
 * inputs:
 *
 * leafContext is the canvas context on which the text will be drawn
 *
 * x,y are the coordinates of the leaf centre
 * r is the radius of the circle that will form the leaf
 * angle is the orientation of the leaf (radians)
 * type 2 = natural 1 = circle
 * sponsored tells us if the leaf is sponsored or not
 *
 * mouseTouch [x,y] is an array with the mouse/touch x and y coordinates for testing if something is clicked,
 *
 * sponsorText is the text that should be shown for sponsorship (leave blank or null if none) 44 chars max
 * extraText is the additional text that should appear for sponsorship if there is space 32 chars max (might be null)
 * commonText is the common name (might be null)
 * latinText is the latin name (might be null)
 * line1Text is an extra line of text (might be null) probably relates to conservation status
 * line2Text is an second extra line of text (might be null) probably relates to conservation status
 *
 * hasImage is true if there is going to be an image (which might not be loaded if imageObject is null)
 * imageObject is the image to be drawn (might be null)
 *
 * insideColor is the colour of the inside
 * outlineColor is the colour of the outside
 * textColor is the colour of the text
 * BGColor us the background colour (needed for erasure of parts)
 * highlightColor used for buttons on mouseover and click
 *
 leafCol = {
 "insideColor" : this.leafcolor1()
 "outlineColor" : this.leafcolor2()
 "BGColor" : backgroundcolor
 "sponsorColor" : sponsorTextCol
 "textColor" : this.leafcolor3()
 "highlightColor" : 'rgb(255,255,255)'
 "imageLineColor" : 'rgb(110,110,110)'
 "textOverColor" : 'rgb(255,255,255)'
 }
 
 * returns:
 * a string indicating what to do on click with mouse and touch in their given locations
 * "z" means zoom in to the leaf (it was clicked from a distance)
 * "c" means picture credit link
 * "s" means sponsorship link
 * "d" means details punchout link
 *
 */
function fullLeaf(leafContext,x,y,r,angle,type,sponsored,mouseTouch,
                  sponsorText,extraText,commonText,latinText,line1Text,line2Text,copyText,imageObject,hasImage,
                  leafCol,requiresCrop,cropMult,cropLeft,cropTop)
{
    
    // HACK ALERT: cropMult,cropLeft,cropTop WERE PUT IN LAST MINUTE TO SOLVE THE SPONSOR LEAF PAGE IT NEEDS TO BE ROLLED OUT FOR THE ENTIRE FILE LATER - FOR NOW IT'S ONLY IN THE PLACES WHERE IT SAYS "HACK ALERT"
    
    // DETERMINE DETAIL LEVEL
    // level 0 - basic leaf
    // level 1 - break from branch, circular thumbnail, one name
    // level 2 - name and thumbnail if both available
    // level 3 - full details on leaf including leaf text and basic sponsorship
    // level 4 - further sponsorship text appears
    var detail_level = 0;
    if (r > 200)
    {
        detail_level = 4;
    }
    else if (r > 90)
    {
        detail_level = 3;
    }
    else if (r > 50)
    {
        detail_level = 2;
    }
    else if (r > 20)
    {
        detail_level = 1;
    }
    
    // SET UP VARIABLE TO RETURN BASED ON CLICKING
    var leaf_clicking = null;
    if ((detail_level >= 0 )&&(detail_level<3))
    {
        // test for mouse / touch over the signpost of the leaf and draw the circular image accordingly
        if(mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))<=(r*r))))
        {
            leaf_clicking = "z";
            if (type == 1)
            {
                circularOutlinedLeaf(leafContext,x,y,r,r*0.12,leafCol.insideHighlight,leafCol.outlineHighlight);
            }
            else
            {
                randomNaturalLeaf(leafContext,x,y,r,angle,leafCol.insideHighlight,leafCol.outlineHighlight)
            }
            
        }
    }
    
    var doStroke = false;
    
    //console.log("click test");
    
    if (detail_level > 2) // global variable hack to turn off sponsorship text
    {
        if(mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))<=(r*r))))
        {
            if((mouseTouch&&(((((mouseTouch[0]-x)*(mouseTouch[0]-x))+((mouseTouch[1]-y)*(mouseTouch[1]-y)))>=(r*0.88*r*0.88))))&&((   !((typeof(drawsponsors) !== 'undefined')&&drawsponsors == false)  ))&&(!sponsored))
            {
                leaf_clicking = "s";
                //console.log("s click");
            }
            else
            {
                leaf_clicking = "d";

            }
        }
    }

    // slightly annoyingly we have to decide up front where the (c) goes so that touch / click regions of the leaf are defined before any drawing takes place.
    if ((imageObject)&&(detail_level > 2))
    {
        if (r*0.035>6)
        {
            var button_pos = 0;
            
            if (line1Text||line2Text)
                {
                    button_pos = y+r*0.34;// 0.75/2 -0.05
                }
                else
                {
                    button_pos = y+r*0.39//r*0.75/2+r*0.05-r*0.05
                }
            
            // draw copyright symbol
            if (copyright(leafContext,x+r*0.43,button_pos,r*0.035,copyText,mouseTouch,leafCol.copyrightInside,leafCol.copyrightText,leafCol.copyrightTextHighlight,leafCol.copyrightInsideHighlight))
            {
                leaf_clicking = "c";
            }
        }
    }

    if ( leaf_clicking == "d")
    {
        doStroke = true;
        context.strokeStyle = leafCol.textOutline;
        context.lineCap="round";
        context.lineWidth = Math.min(r*0.06,17) ;
    }
    
    /*
     // DRAW MAIN LEAF PARTS
     if (type == 1)
     {
     circularOutlinedLeaf(leafContext,x,y,r,r*0.12,leafCol.insideColor,leafCol.outlineColor);
     }
     else
     {
     // this clips out the circle for the leaf if needed to create the break
     if (detail_level > 0)
     {
     // draw the circle
     leafContext.beginPath();
     var clearrad = r*1.038;
     leafContext.arc(x,y,clearrad,0,Math.PI*2,true);
     leafContext.fillStyle = leafCol.BGColor;
     leafContext.fill();
     }
     randomNaturalLeaf(leafContext,x,y,r,angle,leafCol.insideColor,leafCol.outlineColor)
     }
     */
    
    if (!((typeof(drawsponsors) !== 'undefined')&&drawsponsors == false)) // global variable hack to turn off sponsorship text
    {
        // DRAW SPONSORSHIP TEXT PARTS
        // test if the leaf is large enough to do text
        if (detail_level > 2)
        {
            // build complete sponsorship text string
            var shortenedSponsorText = (sponsorText + extraText).substr(0,76);
            if (detail_level < 4)
            {
                if(shortenedSponsorText.length > 44)
                {
                    // shorter text needed
                    shortenedSponsorText = (sponsorText).substr(0,44);
                }
                else
                {
                    shortenedSponsorText = sponsorText;
                }
            }
            
            // calculate text size
            var textWidth = 2.5/Math.max(32.0,shortenedSponsorText.length);
            // calculate gap between characters (in radians)
            var tempgap = Math.PI*2/(Math.max(32.0,shortenedSponsorText.length))*0.38;
            // calculate the offset needed to centralise the text
            var tempadd = (Math.PI-(shortenedSponsorText.length)*(tempgap))/2.0;
            var text_above = 1;
            // set to -1 if text is below
            if ((((angle)%(Math.PI*2.0))>(Math.PI))||(type == 1))
            {
                text_above = -1;
            }
            // text under leaf
            if ((leaf_clicking == "s")||(sponsored))
            {
                // bold and highlighted because mouse over link
                arcText(leafContext,x,y,r*(1-0.06),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.sponsorHighlight,'bold');
            }
            else
            {
                // standard text
                arcText(leafContext,x,y,r*(1-0.06),shortenedSponsorText,text_above,-Math.PI*(0.5)+text_above*tempadd,tempgap,r*textWidth,leafCol.sponsorColor,null);
            }
        }
    }
    
    // DRAW THE IMAGE AND TEXT
    if (detail_level > 0)
    {
        if (imageObject)//((hasImage)&&(!((!imageObject)&&(detail_level==1)))) // note I went for a simpler option here in case any images never load
        {
            // we have an image - note that if we're waiting for it to load and are at detail level 1 we escape and assume there is no image
            if (detail_level < 2)
            {
                //if (leaf_clicking == "z")
                //{
                //    circle_cut_image(leafContext,imageObject,x,y,r*0.85,leafCol.highlightColor,leafCol.highlightColor);
                //}
                //else
                //{
                    circle_cut_image(leafContext,imageObject,x,y,r*0.85,leafCol.insideColor,null);
                //}
            }
            else
            {
             
                /*
                 
                 context.fillStyle = 'rgb(85,85,85)';
                 context.lineCap="round";
                 context.lineWidth = Math.min(radiusr*0.08,6) ;
                 autotext2(true,null,commonText,x,y-r*0.6,r*1.2,r*0.12,leafContext,3);
                 */
                
                
                //var button_pos = 0;
                
                leafContext.fillStyle = leafCol.textColor;
                if (detail_level > 2)
                {
                    if (line1Text||line2Text)
                    {
                        // no extra text
                        if (commonText)
                        {
                            autotext(doStroke,'italic',latinText,x,y+r*0.5,r*1,r*0.1,leafContext,3);
                            autotext2(doStroke,null,commonText,x,y-r*0.6,r*1.2,r*0.12,leafContext,3);
                        }
                        else
                        {
                            autotext(doStroke,null,OZstrings['No common name'],x,y+r*0.5,r*1,r*0.1,leafContext,3);
                            autotext2(doStroke,'italic',latinText,x,y-r*0.6,r*1.2,r*0.12,leafContext,3);
                        }
                        
                        rounded_image(leafContext,imageObject,x,y,r*0.75,leafCol.insideColor,leafCol.highlightColor,requiresCrop,cropMult,cropLeft,cropTop)
                        //button_pos = y+r*0.34;// 0.75/2 -0.05
                        
                        autotext(doStroke,null,line1Text , x,y+r*0.625,r,r*0.07,leafContext,3);
                        autotext(doStroke,null,line2Text , x,y+r*0.725,r,r*0.07,leafContext,3);
                    }
                    else
                    {
                        // no extra text
                        if (commonText)
                        {
                            autotext2(doStroke,'italic',latinText,x,y+r*0.63,r*1.1,r*0.12,leafContext,3);
                            autotext2(doStroke,null,commonText,x,y-r*0.55,r*1.2,r*0.15,leafContext,3);
                        }
                        else
                        {
                            autotext2(doStroke,null,OZstrings['No common name'],x,y+r*0.63,r*1.1,r*0.12,leafContext,3);
                            autotext2(doStroke,'italic',latinText,x,y-r*0.55,r*1.2,r*0.15,leafContext,3);
                        }
                        
                        rounded_image(leafContext,imageObject,x,y+r*0.05,r*0.75,leafCol.insideColor,leafCol.highlightColor,requiresCrop,cropMult,cropLeft,cropTop)
                        //button_pos = y+r*0.39//r*0.75/2+r*0.05-r*0.05
                    }
                    /*
                    if (r*0.035>6)
                    {
                        // draw copyright symbol
                        if (copyright(leafContext,x+r*0.43,button_pos,r*0.035,copyText,mouseTouch,leafCol.outlineColor,leafCol.insideColor,leafCol.highlightColor))
                        {
                            leaf_clicking = "c";
                        }
                    }
                    */
                }
                else
                {
                    if (commonText)
                    {
                        autotext2(doStroke,null,commonText,x,y-r*0.55,r*1.1,r*0.15,leafContext,3);
                    }
                    else
                    {
                        autotext2(doStroke,'italic',latinText,x,y-r*0.55,r*1.1,r*0.15,leafContext,3);
                    }
                    rounded_image(leafContext,imageObject,x,y+r*0.2,r*0.95,leafCol.insideColor,leafCol.highlightColor,requiresCrop,cropMult,cropLeft,cropTop)
                }
            }
        }
        else
        {
            leafContext.fillStyle = leafCol.textColor;
            // draw some text
            if (detail_level < 3)
            {
                if (commonText)
                {
                    autotext3(doStroke,null,commonText,x,y,r*1.25,r*0.3,leafContext,3);
                }
                else
                {
                    autotext3(doStroke,'italic',latinText,x,y,r*1.25,r*0.3,leafContext,3);
                }
            }
            else
            {
                // full text and link but with no image
                if (line1Text||line2Text)
                {
                    // there is extra text
                    if (commonText)
                    {
                        autotext2(doStroke,'italic',latinText,x,y-r*0.5,r*1.1,r*0.15,leafContext,3);
                        autotext2(doStroke,null,commonText,x,y,r*1.5,r*0.25,leafContext,3);
                    }
                    else
                    {
                        autotext2(doStroke,null,OZstrings['No common name'],x,y-r*0.5,r*1.1,r*0.15,leafContext,3);
                        autotext2(doStroke,'italic',latinText,x,y,r*1.5,r*0.25,leafContext,3);
                    }
                    
                    autotext(doStroke,null,line1Text , x,y+r*0.45,r,r*0.1,leafContext,3);
                    autotext(doStroke,null,line2Text , x,y+r*0.6,r,r*0.1,leafContext,3);
                }
                else
                {
                    // no extra text
                    if (commonText)
                    {
                        autotext2(doStroke,'italic',latinText,x,y-r*0.45,r*1.1,r*0.15,leafContext,3);
                        autotext3(doStroke,null,commonText,x,y+r*0.2,r*1.4,r*0.2,leafContext,3);
                    }
                    else
                    {
                        autotext2(doStroke,null,OZstrings['No common name'],x,y-r*0.45,r*1.1,r*0.15,leafContext,3);
                        autotext3(doStroke,'italic',latinText,x,y+r*0.2,r*1.4,r*0.2,leafContext,3);
                    }
                }
            }
        }
    }
    
    return leaf_clicking;
}

