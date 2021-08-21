import {color_theme} from '../../themes/color_theme';
import ArcShape from '../shapes/arc_shape';
import ArcTextShape from '../shapes/arc_text_shape';
import TextShape from '../shapes/text_shape';
import PathShape from '../shapes/path_shape';
import ImageShape from '../shapes/image_shape';
import BezierShape from '../shapes/bezier_shape';
import MoveToShape from '../shapes/move_to_shape';
import LineToShape from '../shapes/line_to_shape';
import tree_state from '../../tree_state';
import {get_abs_x, get_abs_y, get_abs_r} from './utils';
import {global_button_action} from '../../button_manager';
import {live_area_config} from '../live_area_config';
import {add_mr} from '../move_restriction';
import {get_image, image_ready} from '../../image_cache';
import {extxt, spec_num_full} from '../../factory/utils';
import config from '../../global_config';

class LeafLayoutBase {
  get_shapes(node, shapes) {
    this.reset_hover_state();
    this.get_fake_leaf_shapes(node, shapes);
    this.get_tip_leaf_shapes(node, shapes);
  }

  get_fake_leaf_shapes(node, shapes) {
    if (node.richness_val > 1) {
      if (node.rvar < tree_state.threshold && node.full_children_length > 0) {
        this.fullLeafBase(
          node.xvar + node.rvar * node.nextx[0],
          node.yvar + node.rvar * node.nexty[0],
          node.rvar * config.projection.leafmult * 0.75 * config.projection.partc,
          node.arca,
          node,
          shapes
        );
      }
    }
  }

  get_tip_leaf_shapes(node, shapes) {
    if(node.richness_val <= 1 || node.full_children_length === 0) {
      if (node.richness_val > 1) {
        this.undeveloped_temp_leaf_shapes(node, shapes);
      } else {
          if (node.redlist == "EX") {
              // this is an extinct species to do a different kind of leaf
              this.extinct_leaf_shapes(node, shapes);
          } else {
              this.full_leaf_shapes(node, shapes);
          }
      }
      this.tip_leaf_text_image_shapes(node, shapes);
    }
  }

  tip_leaf_text_image_shapes(node, shapes) {
    /* because the horizon which decides what parts should be drawn is for a whole node,
    the area covered can get large because it includes a bezier curve and circle
    this is a problem as it can result in large leaves being drawn that are off the screen resulting in efficiency losses
    the easiest way to fix this is test again if a leaf is on screen or not before drawing.
    */
    if (!node.under_signpost) {
      if (node.richness_val > 1) {
        add_mr(this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node));
        this.loadingLeaf(node.arcx, node.arcy, node.arcr, node.cname, node.latin_name, spec_num_full(node), node, shapes);
      } else {
        let leafpic_drawn = false;
        let imageObject = get_image(node.pic_src, node.pic_filename); //here we could use preferred_px to get a higher-res photo
        imageObject = image_ready(imageObject) ? imageObject : null;
        let imageCredit = node.pic_credit;
        let [sponsorText, extraText, sponsored] = this.get_sponsor_text(node);
        // figure out if there are slight changes to leaf size or color depending on style
        // sort out color object to pass
        this.fullLeaf(shapes, this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node), node.arca,
            sponsored,[tree_state.button_x, tree_state.button_y],
            sponsorText,extraText,node.cname,node.latin_name,this.get_conservation_text(node),imageCredit,imageObject,node.pic_filename, node);
      }  
    }
  }

  undeveloped_temp_leaf_shapes(node, shapes) {
    add_mr(this.get_leaf_x(node), this.get_leaf_y(node), this.get_leaf_radius(node) * 0.8);
    let arc_shape = ArcShape.create();
    arc_shape.x = node.xvar + node.rvar * node.arcx;
    arc_shape.y = node.yvar + node.rvar * node.arcy;
    arc_shape.r = node.rvar * node.arcr * 0.65;
    arc_shape.circle = true;
    arc_shape.height = 2;
    arc_shape.do_fill = true;
    arc_shape.fill.color = color_theme.get_color("leaf.inside.fill", node);
    shapes.push(arc_shape);
  }
    
  extinct_leaf_shapes(node, shapes) {
    
      let arc_shape = ArcShape.create();
      arc_shape.x = node.xvar + node.rvar * node.arcx;
      arc_shape.y = node.yvar + node.rvar * node.arcy;
      arc_shape.r = node.rvar * node.arcr * 0.92;
      arc_shape.circle = true;
      arc_shape.height = 2;
      arc_shape.do_fill = true;
      arc_shape.fill.color = color_theme.get_color("leaf.bg.fill", node);
      shapes.push(arc_shape);
      
    this.circularLeafBase(this.get_leaf_x(node), this.get_leaf_y(node),this.get_leaf_radius(node)*0.9,0,node,shapes)
      
  }

  full_leaf_shapes(node, shapes) {
    add_mr(this.get_leaf_x(node), this.get_leaf_y(node), this.get_fullleaf_r(node) * 0.9);
    this.fullLeafBase(
      node.xvar + node.rvar * node.arcx,
      node.yvar + node.rvar * node.arcy,
      node.rvar * node.arcr * 0.9,
      node.arca,
      node,
      shapes
    );
  }

  get_sponsor_text(node) {
    let sponsor_text, sponsor_extra, sponsored;
    if (node.sponsor_name) {
      sponsored = 1; // to get rid of sponsor link
      if (node.sponsor_name=="leaf_sponsored") {
        sponsor_text = OZstrings["leaf_sponsored"]
        sponsor_extra = OZstrings["leaf_sponsored_extra"]
      } else {
        //There is sponsorship text
        sponsor_text = node.sponsor_kind ? OZstrings["Sponsored " + node.sponsor_kind] + " "+ node.sponsor_name : node.sponsor_name;
        if (node.sponsor_extra) {
          // only include ',' in sponsorship text when first character is not a (
          let tempSponsorExtra = node.sponsor_extra;
          if (tempSponsorExtra.charAt(0)=="(") {
            sponsor_extra = " " + tempSponsorExtra;
          } else {
            sponsor_extra = ", " + tempSponsorExtra;
          }
        } else {
          sponsor_extra = "";
        }
      }
      sponsor_text = sponsor_text.toUpperCase();
      sponsor_extra = sponsor_extra.toUpperCase()
    } else {
      // find out if there is an open tree ID and a space in the species name
      if (node.ott && node.ott > 0 && node.latin_name) {
        // I Put some temporary code here to produce sponsorship scenarios for testing.
        let pseudor = Math.abs(Math.floor(node.arca*111232425)%(OZstrings['sponsor_text']['leaf'].length));
        sponsor_text  = OZstrings['sponsor_text']['leaf'][pseudor][0];
        sponsor_extra = OZstrings['sponsor_text']['leaf'][pseudor][1];
      } else {
        sponsored = 1; // to get rid of sponsor link
        sponsor_extra = "";
        sponsor_text = " "; // display nothing
      }
    }
    return [sponsor_text, sponsor_extra, sponsored];
  }

  get_fullleaf_r(node) {
     return this.get_leaf_radius(node) * 0.9;
  }

  get_leaf_x(node) {
    return node.xvar + node.rvar * node.arcx;
  }

  get_leaf_y(node) {
    return node.yvar + node.rvar * node.arcy;
  }

  get_leaf_radius(node) {
    return node.rvar * node.arcr;
  }
  
  get_conservation_text(node) {
    if (node.redlist === "EX" 
    ||node.redlist === "EW"
    ||node.redlist === "CR"
    ||node.redlist === "EN"
    ||node.redlist === "VU"
    ||node.redlist === "NT"
    ||node.redlist === "LC") {
      return [OZstrings["Conservation"], OZstrings["IUCN Red List status:"], extxt(node)]
    } else {
      return [];
    }
  }

  reset_hover_state() {
    this.hovered = global_button_action.action != null;
    this.hovering = false;
  }

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
  * x,y are the coordinate of the leaf centre
  * r is the radius of the circle
  * outlineThickness is the thickness of the outline
  * insideColor is the colour of the inside
  * outlineColor is the colour of the outside
  *
  * returns: nothing
  */
  circularOutlinedLeaf(x,y,r,outlineThickness,node,shapes) {
    let arc_shape = ArcShape.create();
    if (this.hovering) {
      arc_shape.stroke.color = color_theme.get_color("leaf.outline_hover.fill", node);
    } else {
      arc_shape.stroke.color = color_theme.get_color("leaf.outline.stroke", node);
    }
    arc_shape.fill.color = color_theme.get_color("leaf.inside.fill", node);
    arc_shape.x = x;
    arc_shape.y = y;
    arc_shape.circle = true;
    arc_shape.do_fill = true;
    arc_shape.height = 2;
    arc_shape.do_stroke = true;
    arc_shape.stroke.line_width = outlineThickness;
    arc_shape.order = "fill_first";
    if (outlineThickness >= 1) {
      arc_shape.r = r - outlineThickness*0.5;
    } else {
      arc_shape.r = r;
    }
    shapes.push(arc_shape);
  }

  /*
  * this routine draws a basic circular leaf with a dotted outline
  *
  * inputs:
  * x,y are the coordinate of the leaf centre
  * r is the radius of the circle
  * insideColor is the colour of the inside
  * outlineColor is the colour of the outside
  *
  * returns: nothing
  */
  circularDottedLeaf(x,y,r,node,shapes) {
    //TODO
    // leafContext.setLineDash([0, r*0.292]);
    let arc_shape = ArcShape.create();
    arc_shape.x = x;
    arc_shape.y = y;
    arc_shape.r = r * 0.927;
    arc_shape.circle = true;
    arc_shape.height = 2;
    arc_shape.do_stroke = true;
    arc_shape.stroke.linw_width = r * 0.146;
    arc_shape.stroke.color = color_theme.get_color("leaf.outline.stroke");
    arc_shape.do_fill = true;
    arc_shape.fill.color = color_theme.get_color("leaf.inside.fill");
    shapes.push(arc_shape);
  }

  /*
  * this routine draws a natural looking leaf with a circular base
  * constructed from an arc and two bezier curves joining at a point
  * there are some 'magic numbers' in here which correspond to reasonable artistic choices
  *
  * inputs:
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
  naturalLeaf(x,y,r,angle,xtip,ytip,tipd,tipa,node,shapes) {  
    // precalculate x and y components of movement from leaf perspective
    let tempsinpre = Math.sin(angle); // add for y in line with leaf length
    let tempcospre = Math.cos(angle); // add for x in line with leaf length
    let tempsin90pre = Math.sin(angle + Math.PI/2.0); // add for y in line with leaf width
    let tempcos90pre = Math.cos(angle + Math.PI/2.0); // add for x in line with leaf width
    
    // precalculate the start and end positions for the arc
    let arcendx = x + Math.cos(angle-Math.PI*0.2) * r;
    let arcendy = y + Math.sin(angle-Math.PI*0.2) * r;
    let arcstartx = x + Math.cos(angle+Math.PI*0.2) * r;
    let arcstarty = y + Math.sin(angle+Math.PI*0.2) * r;
    
    // precalculate x and y components of movement from perspective of the leaf edge at the start and end of the arc
    let tempsinpreae = Math.sin(angle-Math.PI*0.2+ Math.PI/2.0); // add for y in line with end of arc
    let tempcospreae = Math.cos(angle-Math.PI*0.2+ Math.PI/2.0); // add for x in line with end of arc
    let tempsinpreas = Math.sin(angle+Math.PI*0.2+ Math.PI/2.0); // add for y in line with start of arc
    let tempcospreas = Math.cos(angle+Math.PI*0.2+ Math.PI/2.0); // add for x in line with start of arc
    
    // precalculate x and y components of movement from perspective of the leaf edge at the left and right edges of the leaf tip
    let tempsinpretip1 = Math.sin(angle+tipd+tipa*0.5); // add for y in line with leaf length
    let tempcospretip1 = Math.cos(angle+tipd+tipa*0.5); // add for x in line with leaf length
    let tempsinpretip2 = Math.sin(angle+tipd-tipa*0.5); // add for y in line with leaf length
    let tempcospretip2 = Math.cos(angle+tipd-tipa*0.5); // add for x in line with leaf length
    
    // precalculate the tip position
    let endx = x+r*(1.0+xtip)*tempcospre+r*ytip*tempcos90pre;
    let endy = y+r*(1.0+xtip)*tempsinpre+r*ytip*tempsin90pre;
    
    let arc_shape = ArcShape.create();
    arc_shape.x = x;
    arc_shape.y = y;
    arc_shape.r = r;
    arc_shape.start_angle = angle+Math.PI*0.2;
    arc_shape.end_angle = angle-Math.PI*0.2;
    arc_shape.counter_wise = false;
    let bezier_shape1 = BezierShape.create();
    bezier_shape1.c1x = arcendx+r*0.3*tempcospreae;
    bezier_shape1.c1y = arcendy+r*0.3*tempsinpreae;
    bezier_shape1.c2x = endx-r*0.15*tempcospretip1;
    bezier_shape1.c2y = endy-r*0.15*tempsinpretip1;
    bezier_shape1.ex = endx;
    bezier_shape1.ey = endy;
    let bezier_shape2 = BezierShape.create();
    bezier_shape2.c1x = endx-r*0.15*tempcospretip2;
    bezier_shape2.c1y = endy-r*0.15*tempsinpretip2;
    bezier_shape2.c2x = arcstartx-r*0.3*tempcospreas;
    bezier_shape2.c2y = arcstarty-r*0.3*tempsinpreas;
    bezier_shape2.ex = arcstartx;
    bezier_shape2.ey = arcstarty;
    let path_shape = PathShape.create();
    if (this.hovering) {
      path_shape.fill.color = color_theme.get_color("leaf.outline_hover.fill", node);
    } else {
      path_shape.fill.color = color_theme.get_color("leaf.outline.fill", node);    
    }
    path_shape.path_length = 3;
    path_shape.path[0] = arc_shape;
    path_shape.path[1] = bezier_shape1;
    path_shape.path[2] = bezier_shape2;
    path_shape.do_fill = true;
    path_shape.height = 3;
    
    shapes.push(path_shape);
    
    let insidesize = 0.88;
    if (r < 20) {
      insidesize = 0.80;
    } else if (r < 50) {
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
    
    arc_shape = ArcShape.create();
    arc_shape.x = x;
    arc_shape.y = y;
    arc_shape.r = r * insidesize;
    arc_shape.start_angle = angle+Math.PI*0.2;
    arc_shape.end_angle = angle-Math.PI*0.2;
    arc_shape.counter_wise = false;
    bezier_shape1 = BezierShape.create();
    bezier_shape1.c1x = arcendx+r*0.3*tempcospreae;
    bezier_shape1.c1y = arcendy+r*0.3*tempsinpreae;
    bezier_shape1.c2x = endx-r*0.15*tempcospretip1;
    bezier_shape1.c2y = endy-r*0.15*tempsinpretip1;
    bezier_shape1.ex = endx;
    bezier_shape1.ey = endy;
    bezier_shape2 = BezierShape.create();
    bezier_shape2.c1x = endx-r*0.15*tempcospretip2;
    bezier_shape2.c1y = endy-r*0.15*tempsinpretip2;
    bezier_shape2.c2x = arcstartx-r*0.3*tempcospreas;
    bezier_shape2.c2y = arcstarty-r*0.3*tempsinpreas;
    bezier_shape2.ex = arcstartx;
    bezier_shape2.ey = arcstarty;
    path_shape = PathShape.create();
    if (this.hovering) {
      path_shape.fill.color = color_theme.get_color("leaf.inside_hover.fill", node);  
    } else {
      path_shape.fill.color = color_theme.get_color("leaf.inside.fill", node);  
    }
    path_shape.path_length = 3;
    path_shape.path[0] = arc_shape;
    path_shape.path[1] = bezier_shape1;
    path_shape.path[2] = bezier_shape2;
    path_shape.do_fill = true;
    path_shape.height = 4;
    shapes.push(path_shape);
  }

  /*
  * this routine draws one of a collection of natural looking leaves
  * chosen with a basic pseudo random number generator which uses the leaf angle as a seed
  *
  * inputs:
  * x,y are the coordinate of the leaf centre
  * r is the radius of the circle
  * angle is the orientation of the leaf (in radians)
  * insideColor is the colour of the inside
  * outlineColor is the colour of the outside
  *
  * returns: nothing
  */
  randomNaturalLeaf(x,y,r,angle,node,shapes) {
    // choose a pseudo random number from the angle
    let pseudor = Math.floor(angle*112345) % 4;
    // call naturalLeaf with an appropriate set of numbers for slightly different leaf looks
    switch (pseudor) {
      case 0:
        this.naturalLeaf(x,y,r,angle,0.45,0.25,Math.PI*0.4,Math.PI*0.4,node,shapes);
        break;
      case 1:
        this.naturalLeaf(x,y,r,angle,0.45,-0.15,0,0.1,node,shapes);
        break;  
      case 2:
        this.naturalLeaf(x,y,r,angle,0.4,-0.25,-Math.PI*0.4,Math.PI*0.2,node,shapes);
        break;
      case 3:
        this.naturalLeaf(x,y,r,angle,0.45,0.15,0,0.2,node,shapes);
        break;
      default:
        this.naturalLeaf(x,y,r,angle,0.45,0.25,Math.PI*0.4,Math.PI*0.4,node,shapes);
    }
  }

  liveAreaTest(x,y,r) {
    return this.mouse_over_circle( x, y, r);
  }

  liveCircleTest(x,y,r) {
    return this.mouse_over_circle(x,y,r) && !this.mouse_over_circle(x,y,r*0.88);
  }
  
  liveSquareAreaTest(sx,ex,sy,ey) {
    let mx = tree_state.button_x;
    let my = tree_state.button_y;
    return (mx > sx) && (mx < ex) && (my > sy) && (my < ey); 
  }

  // leaf drawing (without details)
  ghostLeafBase(x,y,r,angle,node,shapes) {
    if (!this.hovered && this.liveAreaTest(x,y,r)) {
      this.hovered = true;
      this.hovering = true;
      live_area_config.leaf_low_res_leafbase.register_button_event(node);
    }
    let detail_level = 0;
    if (r > 90) {
      detail_level = 3;
    }
    
    this.circularDottedLeaf(x,y,r,node,shapes);
    this.hovering = false;
  }

  leafBaseLiveAreaTest(x,y,r,node) {
    let base_mouse_over = this.liveAreaTest(x,y,r) && r<90;
    if (!this.hovered && !node.under_signpost && base_mouse_over) {
      this.hovered = true;
      this.hovering = true;
      live_area_config.leaf_low_res_leafbase.register_button_event(node);
    }
  }

  circularLeafBase(x,y,r,angle,node,shapes) {

    add_mr(x,y,r);
    this.leafBaseLiveAreaTest(x,y,r,node);
    this.circularOutlinedLeaf(x,y,r,r*0.12,node,shapes);
    this.hovering = false;
  }

  fullLeafBase(x,y,r,angle,node,shapes) {
    this.leafBaseLiveAreaTest(x,y,r,node);
    // DRAW MAIN LEAF PARTS
    // this clips out the circle for the leaf if needed to create the break
    if (r > 20) {
      let arc_shape = ArcShape.create();
      arc_shape.x = x;
      arc_shape.y = y;
      arc_shape.r = r* 1.038;
      arc_shape.circle = true;
      arc_shape.do_fill = true;
      arc_shape.fill.color = color_theme.get_color("leaf.bg.fill", node);
      arc_shape.height = 2;
      shapes.push(arc_shape);
    }
    this.randomNaturalLeaf(x,y,r,angle,node,shapes);
    this.hovering = false;
  }

  fill_loading_leaf(text_shape, node, x) {
    text_shape.x = x;
    text_shape.height = 5;
    text_shape.min_text_size_extra = 3;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color("leaf.text.fill", node);
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


  */
  loadingLeaf(x,y,r,commonText,latinText,lineText,node,shapes) {
    // DETERMINE DETAIL LEVEL
    // level 0 - basic leaf
    // level 1 - break from branch, circular thumbnail, one name
    // level 2 - name and thumbnail if both available
    // level 3 - full details on leaf including leaf text and basic sponsorship
    let detail_level = 0;
    if (r > 90) {
      detail_level = 3;
    } else if (r > 50) {
      detail_level = 2;
    } else if (r > 20) {
      detail_level = 1;
    }
    
    let text_shape;
    // DRAW THE IMAGE AND TEXT
    if (detail_level > 0) {
      // draw some text
      if (detail_level < 3) {
        text_shape = TextShape.create();
        this.fill_loading_leaf(text_shape, node, x);
        text_shape.y = y;
        text_shape.text = commonText ? commonText : (latinText ? latinText : lineText);
        text_shape.line = (commonText || latinText) ? 3 : 2;
        text_shape.width = r * 1.25;
        text_shape.defpt = r * 0.3;
        shapes.push(text_shape);
      } else {
        // full text and link but with no image
        if (commonText)
        {
          if (latinText) {
            text_shape = TextShape.create();
            this.fill_loading_leaf(text_shape, node, x);
            text_shape.y = y-r*0.45;
            text_shape.text = OZstrings["sciname"] + latinText;
            text_shape.width = r;
            text_shape.defpt = r * 0.12;
            text_shape.line = 1;
            shapes.push(text_shape);
          }
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y;
          text_shape.text = commonText;
          text_shape.width = r * 1.35;
          text_shape.defpt = r * 0.25;
          text_shape.line = 2;
          shapes.push(text_shape);
          
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y + r * 0.45;
          text_shape.text = lineText;
          text_shape.width = r * 0.9;
          text_shape.defpt = r * 0.12;
          text_shape.line = 1;
          shapes.push(text_shape);
        }
        else if (latinText)
        {
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y-r*0.45;
          text_shape.text = OZstrings["No common name"];
          text_shape.width = r;
          text_shape.defpt = r * 0.12;
          text_shape.line = 1;
          shapes.push(text_shape);
          
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y;
          text_shape.text = latinText;
          text_shape.width = r * 1.35;
          text_shape.defpt = r * 0.25;
          text_shape.line = 2;
          shapes.push(text_shape);

          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y + r * 0.45;
          text_shape.text = lineText;
          text_shape.width = r * 0.9;
          text_shape.defpt = r * 0.12;
          text_shape.line = 1;
          shapes.push(text_shape);
        }
        else
        {
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y-r*0.4;
          text_shape.text = "No known name";
          text_shape.width = r;
          text_shape.defpt = r * 0.12;
          text_shape.line = 1;
          shapes.push(text_shape);
          
          text_shape = TextShape.create();
          this.fill_loading_leaf(text_shape, node, x);
          text_shape.y = y + r * 0.2;
          text_shape.text = lineText;
          text_shape.width = r * 1.35;
          text_shape.defpt = r * 0.25;
          text_shape.line = 2;
          shapes.push(text_shape);
        }
      }
    }
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
  * imageObject is the image to be drawn (might be null). We might want to use a higher-res image when fully
  *   zoomed in
  *
  * insideColor is the colour of the inside
  * outlineColor is the colour of the outside
  * textColor is the colour of the text
  * BGColor us the background colour (needed for erasure of parts)
  * highlightColor used for buttons on mouseover and click

  * returns:
  * a string indicating what to do on click with mouse and touch in their given locations
  * "z" means zoom in to the leaf (it was clicked from a distance)
  * "c" means picture credit link
  * "s" means sponsorship link
  * "d" means details punchout link
  *
  */
  fullLeaf(shapes, x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop) {
    // HACK ALERT: cropMult,cropLeft,cropTop WERE PUT IN LAST MINUTE TO SOLVE THE SPONSOR LEAF PAGE IT NEEDS TO BE ROLLED OUT FOR THE ENTIRE FILE LATER - FOR NOW IT'S ONLY IN THE PLACES WHERE IT SAYS "HACK ALERT"
    
    // DETERMINE DETAIL LEVEL
    // level 0 - basic leaf
    // level 1 - break from branch, circular thumbnail, one name
    // level 2 - name and thumbnail if both available
    // level 3 - full details on leaf including leaf text and basic sponsorship
    // level 4 - further sponsorship text appears
    let detail_level = 0;
    if (r > 200) {
      detail_level = 4;
    } else if (r > 90) {
      detail_level = 3;
    } else if (r > 50) {
      detail_level = 2;
    } else if (r > 20) {
      detail_level = 1;
    }
    // these levels are defined but don't seem to be used later on. the leaf details functions below check again whether the value of r is at different detail levels.
      
    this.fullLeaf_sponsor(shapes, x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop);
    // this draws the sponsorship text.
    
    // Draw leaf at either detail level 1, 2 or 3
    this.fullLeaf_detail1(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop);
    this.fullLeaf_detail2(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop);
    this.fullLeaf_detail3(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop);
  }

  get_sponsor_text_direction(angle) {
    // set to -1 if text is below
    const TWO_PI = Math.PI*2.0;
    if ((angle%TWO_PI)>Math.PI) {
      return -1;
    } else {
      return 1;
    }
  }


  fullLeaf_sponsor(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop) {
    if (!config.projection.draw_sponsors) return;
    if (r > 90) { // global variable hack to turn off sponsorship text
      let shortenedSponsorText = (sponsorText + extraText).substr(0,76);
      if (r > 90 && r <= 200) {
        sponsorText = shortenedSponsorText.length > 44 ? sponsorText.substr(0,44) : sponsorText;
      } else if (r > 200) {
        sponsorText = shortenedSponsorText;
      }
      let text_above = 1;
      text_above = this.get_sponsor_text_direction(angle);
      // text under leaf
      let sponsor_highlight = color_theme.get_color("leaf.sponsor_hover.fill", node);
      let sponsor_color = color_theme.get_color("leaf.sponsor.fill", node);
      let arc_text_shape = new ArcTextShape();
      if (!this.hovered && this.liveCircleTest(x,y,r)) {
        this.hovered = true;
        this.hovering = true;
        live_area_config.leaf_sponsor_text.register_button_event(node);
      }
      if (this.hovering) {
        arc_text_shape.fill.color = sponsor_highlight;
        arc_text_shape.font_style = 'bold';
      } else {
        arc_text_shape.fill.color = sponsored ? sponsor_highlight : sponsor_color;      
        arc_text_shape.font_style = sponsored ? 'bold' : null;
      }
      arc_text_shape.x = x;
      arc_text_shape.y = y;
      arc_text_shape.r = r * (1 - 0.06);
      arc_text_shape.text_direction = text_above;
      arc_text_shape.do_fill = true;
      arc_text_shape.height = 5;
      // calculate text size
      let textWidth = 2.5/Math.max(32.0,sponsorText.length);
      // calculate gap between characters (in radians)
      let tempgap = Math.PI*2/(Math.max(32.0,sponsorText.length))*0.38;
      // calculate the offset needed to centralise the text
      let tempadd = (Math.PI-(sponsorText.length)*(tempgap))/2.0;
      arc_text_shape.text = sponsorText;
      arc_text_shape.start_angle = -Math.PI*(0.5)+text_above*tempadd;
      arc_text_shape.gap_angle = tempgap;
      arc_text_shape.width = r * textWidth;
      this.hovering = false;
      shapes.push(arc_text_shape);
    }
  }


  /**
   * Render image/text for level 1
   */
  fullLeaf_detail1(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop) {
    if (r > 20 && r <= 50) {
      if (imageObject) {
        this.circle_cut_image(shapes,imageObject, x, y, r*0.85, color_theme.get_color("leaf.inside.fill",node), null, node);
      } else {
        let text_shape = TextShape.create();
        text_shape.height = 5;
        text_shape.line = 3;
        text_shape.text = commonText ? commonText : latinText;
        text_shape.font_style = commonText ? null : 'italic';
        text_shape.x = x;
        text_shape.y = y;
        text_shape.width = r * 1.25;
        text_shape.defpt = r * 0.3;
        text_shape.min_text_size_extra = 3;
        text_shape.do_fill = true;
        text_shape.fill.color = color_theme.get_color("leaf.text.fill", node);
        shapes.push(text_shape);
      }  
    }
  }

  /**
   * Render image/text for level 2
   */
  fullLeaf_detail2(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop) {
    if (r > 50 && r <= 90) {
      if (imageObject) {
        this.rounded_image(shapes,imageObject, x, y+r*0.2,r*0.95,
          color_theme.get_color("leaf.inside.fill",node),
          undefined,
          requiresCrop,cropMult,cropLeft,cropTop, node);
      }

      let text_shape = TextShape.create();
      text_shape.height = 5;
      text_shape.min_text_size_extra = 3;
      text_shape.x = x;
      text_shape.do_fill = true;
      text_shape.fill.color = color_theme.get_color("leaf.text.fill",node);
      if (imageObject) {
        text_shape.text = commonText ? commonText : latinText;
        text_shape.font_style = commonText ? null : 'italic';
        text_shape.y = y - r * 0.55;
        text_shape.width = r * 1.1;
        text_shape.defpt = r * 0.15;
        text_shape.line = 2;
        shapes.push(text_shape);
      } else {
        text_shape.text = commonText ? commonText : latinText;
        text_shape.font_style = commonText ? null : 'italic';
        text_shape.y = y;
        text_shape.width = r * 1.25;
        text_shape.defpt = r * 0.3;
        text_shape.line = 3;
        shapes.push(text_shape);
      }  
    }
  }

  fill_fullleaf_detail3(text_shape, node, r, x) {
    if (this.hovering) {
      text_shape.stroke.color = color_theme.get_color("leaf.text_hover.stroke", node);
      text_shape.stroke.line_cap = 'round';
      text_shape.stroke.line_width = Math.min(17, r*0.06);
      text_shape.do_stroke = true;
    }
    text_shape.height = 5;
    text_shape.min_text_size_extra = 3;
    text_shape.x = x;
    text_shape.do_fill = true;
    text_shape.fill.color = color_theme.get_color("leaf.text.fill", node);
  }

  fullLeaf_detail3(shapes,x,y,r,angle,sponsored,mouseTouch,sponsorText,extraText,commonText,latinText,conservation_text,copyText,imageObject,hasImage,node,requiresCrop,cropMult,cropLeft,cropTop) {
    this.fullLeaf_detail3_pics(shapes,x,y,r,conservation_text,imageObject,requiresCrop,cropMult,cropLeft,cropTop,node)
    this.fullLeaf_detail3_imagecopyright(shapes,x,y,r,conservation_text,imageObject,copyText,node);
    this.fullLeaf_detail3_conservation(shapes,x,y,r,conservation_text,imageObject,node);
    this.fullLeaf_detail3_names(shapes,x,y,r,commonText,latinText,conservation_text,imageObject,node);
  }
  
  /**
   * Add a copyright symbol to shapes if there is an image
   */
  fullLeaf_detail3_imagecopyright(shapes,x,y,r,conservation_text,imageObject,copyText,node) {
    if (imageObject) {
      if (r > 90 && r * 0.035 > 6) {
        let button_pos = (conservation_text.length > 0) ? (y+r*0.34) : (y+r*0.39); // find position for the copyright symbol
        this.copyright(shapes,x+r*0.43,button_pos,r*0.035,
          [node.pic_src, node.pic_filename, copyText],
          color_theme.get_color("leaf.copyright.text.fill", node),
          color_theme.get_color("leaf.copyright.stroke", node),
          color_theme.get_color("leaf.copyright.fill", node),
          color_theme.get_color("leaf.copyright.text_hover.fill", node),
          color_theme.get_color("leaf.copyright_hover.stroke", node),
          color_theme.get_color("leaf.copyright_hover.fill", node)
        ); // draw copyright sympbol
      }
    }
  }

  fullLeaf_detail3_names(shapes,x,y,r,commonText,latinText,conservation_text,imageObject,node) {
    if (r > 90) {
      if (!this.hovered && this.liveAreaTest(x,y,r*0.88)) {
        this.hovered = true;
        this.hovering = true;
        live_area_config.leaf_high_res_text.register_button_event(node);
      }
      let index = 3;
      index -= imageObject ? 2 : 0;
      index -= (conservation_text.length > 0) ? 1 : 0;
      let cl1_y_arr = [0.47, 0.63, -0.5, -0.45];
      let cl2_y_arr = [-0.6, -0.55, 0, 0.2];
      let cl1_line_arr = [1, 2, 2, 2];
      let cl2_line_arr = [2, 2, 2, 3];
      let cl1_width_arr = [1, 1.1, 1.1, 1.1];
      let cl2_width_arr = [1.2, 1.2, 1.5, 1.4];
      let cl1_defpt_arr = [0.1, 0.12, 0.15, 0.15];
      let cl2_defpt_arr = [0.12, 0.15, 0.25, 0.2];
      
      let text_shape = TextShape.create();
      this.fill_fullleaf_detail3(text_shape, node, r, x);
      text_shape.text = commonText ? latinText : OZstrings["No common name"];
      text_shape.font_style = commonText ? 'italic' : null;
      text_shape.y = y + r * cl1_y_arr[index];
      text_shape.width = r * cl1_width_arr[index];
      text_shape.defpt = r * cl1_defpt_arr[index];
      text_shape.line = cl1_line_arr[index];
      shapes.push(text_shape);

      text_shape = TextShape.create();
      this.fill_fullleaf_detail3(text_shape, node, r, x);
      text_shape.text = commonText ? commonText : latinText;
      text_shape.font_style = commonText ? null : 'italic';
      text_shape.y = y + r * cl2_y_arr[index];
      text_shape.width = r * cl2_width_arr[index];
      text_shape.defpt = r * cl2_defpt_arr[index];
      text_shape.line = cl2_line_arr[index];
      shapes.push(text_shape);
      this.hovering = false;
    }
  }
  
  fullLeaf_detail3_conservation(shapes,x,y,r,conservation_text,imageObject,node) {
    if (r > 90 && conservation_text.length > 0) {
      let conservation_hover_test1 = !this.hovered && imageObject && this.liveSquareAreaTest(x-r/2,x+r/2,y+r*0.51,y+r*0.83);
      let conservation_hover_test2 = !this.hovered && !imageObject && this.liveSquareAreaTest(x-r/2,x+r/2,y+r*0.37,y+r*0.71);
      if (conservation_hover_test1 || conservation_hover_test2) {
        this.hovered = true;
        this.hovering = true;
        live_area_config.leaf_conservation_text.register_button_event(node);
      }
      let text_y = imageObject ? [0.575, 0.665, 0.775] : [0.39, 0.515, 0.64];
      let text_pt = imageObject ? 0.07 : 0.1;

      for (let i = 0; i < conservation_text.length; i++) {
        let text_shape = TextShape.create();
        this.fill_fullleaf_detail3(text_shape, node, r, x);
        text_shape.text = conservation_text[i];
        text_shape.y = y + r * text_y[i];
        text_shape.width = r;
        text_shape.defpt = r * text_pt;
        shapes.push(text_shape);
      }

      this.hovering = false;
    }
  }

  /**
   * Add image to shapes if available
   */
  fullLeaf_detail3_pics(shapes,x,y,r,conservation_text,imageObject,requiresCrop,cropMult,cropLeft,cropTop, node) {
    if (r > 90) {
      if (imageObject && (conservation_text.length > 0)) {
        this.rounded_image(shapes,imageObject,x,y,r*0.75,
          color_theme.get_color("leaf.inside.fill",node),
          undefined,
          requiresCrop,cropMult,cropLeft,cropTop, node);
      } else if (imageObject) {
        this.rounded_image(shapes,imageObject,x,y+r*0.05,r*0.75,
          color_theme.get_color("leaf.inside.fill",node),
          undefined,
          requiresCrop,cropMult,cropLeft,cropTop, node);
      } 
    }
  }

  /* drawing of images */

  /*
  * this routine:
  *
  * draws an image in a circle, used for nodes when viewed at a distance
  *
  * inputs:
  *
  * context_in is the canvas context on which the image will be drawn
  * imageObject is the image to be drawn (assumed to be square)
  * centerpointx,centerpointy,radiusr show where the image will be drawn (in a circle)
  * borderColor is the immediate border around the image
  * highlightColor could be null but if not is a second border around the image highlighting it further (typically used on touch or mouseover)
  *
  * returns: none
  *
  */
  circle_cut_image(shapes,imageObject,centerpointx,centerpointy,radiusr,borderColor,highlightColor, node) {
    if (imageObject) {
      if (highlightColor) {
        let arc_shape = ArcShape.create();
        arc_shape.x = centerpointx;
        arc_shape.y = centerpointy;
        arc_shape.r = radiusr * 1.05;
        arc_shape.circle = true;
        arc_shape.do_fill = true;
        arc_shape.fill.color = highlightColor;
        shapes.push(arc_shape);
      }
      
      let arc_shape = ArcShape.create();
      arc_shape.x = centerpointx;
      arc_shape.y = centerpointy;
      arc_shape.r = radiusr * 0.975;
      arc_shape.circle = true;
      
      let image_shape = ImageShape.create();
      image_shape.img = imageObject;
      image_shape.x = centerpointx - radiusr;
      image_shape.y = centerpointy - radiusr;
      image_shape.w = radiusr * 2;
      image_shape.h = radiusr * 2;
      image_shape.clip = arc_shape; 
      image_shape.height= 5;
      shapes.push(image_shape);
    }
  }



  /*
   * this function: draws a copyright symbol and handles zooming in as well as clicking
   * picinfo should contain src, src_id, text_to_write
   */
  copyright(shapes,x,y,r, picinfo, textColor, strokeColor, fillColor, textHighlightColor, strokeHighlightColor, fillHighlightColor) {
    let text = picinfo[2];
    if (!this.hovered && this.liveAreaTest(x,y,r)) {
      this.hovered = true;
      this.hovering = true;
        live_area_config.copyright.register_button_event(picinfo[0], picinfo[1]);
        
    };
    add_mr(x,y,r*3);
    let arc_shape = ArcShape.create();
    if (this.hovering) {
      arc_shape.stroke.color = strokeHighlightColor;
      arc_shape.fill.color = fillHighlightColor;
    } else {
      arc_shape.stroke.color = strokeColor;
      arc_shape.fill.color = fillColor;    
    }
    arc_shape.height = 6;
    arc_shape.x = x;
    arc_shape.y = y;
    arc_shape.r = r;
    arc_shape.circle = true;
    arc_shape.do_stroke = true;
    arc_shape.stroke.line_width = r * 0.05;
    arc_shape.do_fill = true;
    shapes.push(arc_shape);
    
    let text_shape = TextShape.create();
    text_shape.x = x;
    text_shape.y = y;
    text_shape.min_text_size_extra = 0;
    text_shape.height = 7;
    text_shape.do_fill = true;
    if (this.hovering) {
      text_shape.font_style = 'bold';  
      text_shape.fill.color = textHighlightColor;
    } else {
      text_shape.fill.color = textColor;
    }
    if (text && r > 160) {
      text_shape.width = r * 1.8;
      text_shape.defpt = r;
      text_shape.text = text;
      text_shape.line = 3;
    } else if (text && r <= 160 && r > 40) {
      text_shape.width = r * 1.5;
      text_shape.defpt = r;
      text_shape.text = text.substr(0,30) + " ...";
      text_shape.line = 2;
    } else {
      text_shape.width = r;
      text_shape.defpt = r * 2;
      text_shape.text = "C";
    }
    shapes.push(text_shape);
    this.hovering = false;
  }



  /**
   * Draw an image with rounded corners, used as a centerpiece for full nodes
   */
  rounded_image(shapes,imageObject,x,y,w,borderColor,highlightColor,requiresCrop,cropMult,cropLeft,cropTop,node) {
    if (imageObject) {
      let path_shape;
      
      if (highlightColor) {
        path_shape = PathShape.create();
        this.draw_src(x-w/2,y-w/2,w,w,w*0.03,node,path_shape);
        path_shape.do_fill = true;
        path_shape.fill.color = highlightColor;
        shapes.push(path_shape);
      }
      
      path_shape = PathShape.create();
      this.draw_src(x-w/2,y-w/2,w,w,w*0.03,node,path_shape);
      let image_shape = ImageShape.create();
      image_shape.clip = path_shape;
      image_shape.img = imageObject;
      image_shape.x = x-w/2.0;
      image_shape.y = y-w/2.0; 
      image_shape.w = w;
      image_shape.h = w;
      image_shape.height = 5;
      
      if ((requiresCrop)&&(requiresCrop == true)) {
        let thisCropMult;
        let thisCropLeft;
        let thisCropTop;
        // sort out the case that crop info is missing
        if (!cropMult) {
          // as wide as it can be
          let minDim = Math.min(imageObject.width,imageObject.height)
          thisCropMult = imageObject.width*w/minDim;
          // default to top left then default to 0
          thisCropLeft = 0;
          thisCropTop = 0;
        } else {
          thisCropMult = cropMult*w;
          thisCropLeft = cropLeft*w;
          thisCropTop = cropTop*w;
        }
        image_shape.sx = -imageObject.width*thisCropLeft/thisCropMult; 
        image_shape.sy = -imageObject.width*thisCropTop/thisCropMult;
        image_shape.sw = imageObject.width*w/thisCropMult; 
        image_shape.sh = imageObject.width*w/thisCropMult;
      }
      shapes.push(image_shape);
    }
  }



  // rectangle with rounded corners
  draw_src(x,y,rx,ry,corner,node,path_shape) {
    path_shape.path_length = 9;
    let move_to_shape = MoveToShape.create();
    move_to_shape.x = x + corner;
    move_to_shape.y = y;
    path_shape.path[0] = move_to_shape;
    
    let arc_shape = ArcShape.create();
    arc_shape.x = x + corner;
    arc_shape.y = y + corner;
    arc_shape.r = corner;
    arc_shape.start_angle = -Math.PI/2;
    arc_shape.end_angle = Math.PI;
    arc_shape.counter_wise = true;
    path_shape.path[1] = arc_shape;
    let line_to_shape = LineToShape.create();
    line_to_shape.x = x;
    line_to_shape.y = y + ry - corner;
    path_shape.path[2] = line_to_shape;
        
    arc_shape = ArcShape.create();
    arc_shape.x = x + corner;
    arc_shape.y = y + ry - corner;
    arc_shape.r = corner;
    arc_shape.start_angle = Math.PI;
    arc_shape.end_angle = Math.PI/2;
    arc_shape.counter_wise = true;  
    path_shape.path[3] = arc_shape;
    line_to_shape = LineToShape.create();
    line_to_shape.x = x + rx - corner;
    line_to_shape.y = y + ry;
    path_shape.path[4] = line_to_shape;
    
    arc_shape = ArcShape.create();
    arc_shape.x = x + rx - corner;
    arc_shape.y = y + ry - corner;
    arc_shape.r = corner;
    arc_shape.start_angle = Math.PI/2;
    arc_shape.end_angle= 0;
    arc_shape.counter_wise = true;
    path_shape.path[5] = arc_shape;
    line_to_shape = LineToShape.create();
    line_to_shape.x = x + rx;
    line_to_shape.y = y + ry - corner;
    path_shape.path[6] = line_to_shape;
    
    arc_shape = ArcShape.create();
    arc_shape.type = "arc";
    arc_shape.x = x + rx - corner;
    arc_shape.y = y + corner;
    arc_shape.r = corner;
    arc_shape.start_angle = 0;
    arc_shape.end_angle = -Math.PI/2;
    arc_shape.counter_wise = true;
    path_shape.path[7] = arc_shape;
    line_to_shape = LineToShape.create();
    line_to_shape.x = x + corner;
    line_to_shape.y = y;
    path_shape.path[8] = line_to_shape;
  }

  mouse_over_circle(x,y,r) {
    let mx = tree_state.button_x;
    let my = tree_state.button_y;
    return mx && my && (this.dist_sqr_to_center(x,y,mx,my) <= r * r);
  }

  dist_sqr_to_center(x,y,mx,my) {
    if (mx && my) {
      return (mx-x) * (mx-x) + (my-y) * (my-y);
    } else {
      return 0;
    }
  }
}


export default LeafLayoutBase;

