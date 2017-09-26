import tree_state from '../tree_state';
import config from '../global_config';

let fonttype = config.render.font_type;

export function auto_text(do_stroke,font_style,text,textx,texty,textw,defpt,context,mintextsize_extra, stroke_style, fill_style)
{
  if (!text || text.length === 0) return;
  let mintextsize = tree_state.min_text_size;  
  let drawntext = false;
  
  if (defpt > mintextsize) {
    // draws text within a bounding width but only if possible with font size > 1
    // if possible uses the defpt font size and centres the text in the box
    // otherwise fills the box
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    if (font_style) {
      context.font = font_style + ' ' + (Math.floor(defpt+0.5)).toString() + 'px '+fonttype;
    } else {
      context.font = (Math.floor(defpt+0.5)).toString() + 'px '+ fonttype;
    }
    let testw = context.measureText(text).width;
    if (testw > textw)
    {
      if (((defpt*textw/testw) > mintextsize)&&((defpt*textw/testw) > mintextsize_extra))
      {
        if (font_style)
        {
          context.font = font_style + ' ' + (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
        }
        else
        {
          context.font = (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
        }
        if (do_stroke)
        {
          context.lineJoin = 'round';
          context.strokeText  (text , textx - textw/2.0,texty);
        }
        context.fillText  (text , textx - textw/2.0,texty);
        drawntext = true;
      }
    }
    else
    {
      if (do_stroke)
      {
        context.lineJoin = 'round';
        context.strokeText  (text , textx - (testw)/2.0,texty);
      }
      context.fillText  (text , textx - (testw)/2.0,texty);
      drawntext = true;
    }
  }
  return drawntext;
}

export function auto_text2(do_stroke,font_style,text,textx,texty,textw,defpt,context,mintextsize_extra, stroke_style, fill_style)
{
  if (!text || text.length === 0) return;
  let mintextsize = tree_state.min_text_size;
  let drawntext = false;
  // x and y are the centres
  
  if (defpt >mintextsize)
  {
    // draws text within a bounding width but only if possible with font size > 1
    // if possible uses the defpt font size and centres the text in the box
    // otherwise fills the box
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    if (font_style)
    {
      context.font = font_style + ' ' + (Math.floor(defpt+0.5)).toString() + 'px '+fonttype;
    }
    else
    {
      context.font = (Math.floor(defpt+0.5)).toString() + 'px '+ fonttype;
    }
    
    let centerpoint = (text.length)/3;
    let splitstr = text.split(" ");
    let print1 = " ";
    let print2 = " ";
    if (splitstr.length == 1)
    {
      drawntext = auto_text(do_stroke,font_style,text,textx,texty,textw,defpt*1.5,context,mintextsize_extra);
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
        for (let ii = (splitstr.length -1) ; ii >= 0 ; ii--)
        {
          if ((print2.length)>centerpoint)
          {
            print1  = (" " + splitstr[ii] + print1);
          }
          else
          {
            print2 = (" " + splitstr[ii] + print2);
          }
        }
      }
      let testw = context.measureText(print2).width;
      if (testw < (context.measureText(print1).width))
      {
        testw = context.measureText(print1).width;
      }
      if (testw > textw)
      {
        if ((defpt*textw/testw) > mintextsize)
        {
          
          if(mintextsize_extra<(defpt*textw/testw))
          {
            
            if (font_style)
            {
              context.font = font_style + ' ' + (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
            }
            else
            {
              context.font = (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
            }
            if (do_stroke)
            {
              context.lineJoin = 'round';
              context.strokeText  (print1 , textx ,texty-defpt*textw/testw/1.7);
              context.strokeText  (print2 , textx ,texty+defpt*textw/testw/1.7);
              
            }
            context.fillText  (print1 , textx ,texty-defpt*textw/testw/1.7);
            context.fillText  (print2 , textx ,texty+defpt*textw/testw/1.7);
            drawntext = true;
          }
        }
      }
      else
      {
        if(mintextsize_extra<(defpt*textw/testw))
        {
          if (do_stroke)
          {
            context.lineJoin = 'round';
            context.strokeText  (print1 , textx ,texty-defpt/1.7);
            context.strokeText  (print2 , textx ,texty+defpt/1.7);
          }
          context.fillText  (print1 , textx ,texty-defpt/1.7);
          context.fillText  (print2 , textx ,texty+defpt/1.7);
          drawntext = true;
        }
      }
    }
  }
  return drawntext;
}


export function auto_text3(do_stroke,font_style,text,textx,texty,textw,defpt,context)
{
  if (!text || text.length === 0) return;
  let mintextsize = tree_state.min_text_size;
  let drawntext = false;
    // x and y are the centres
    if (defpt >mintextsize)
    {
        // draws text within a bounding width but only if possible with font size > 1
        // if possible uses the defpt font size and centres the text in the box
        // otherwise fills the box
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        if (font_style)
        {
            context.font = font_style + ' ' + (Math.floor(defpt+0.5)).toString() + 'px '+fonttype;
        }
        else
        {
            context.font = (Math.floor(defpt+0.5)).toString() + 'px '+ fonttype;
        }
        
        let centerpoint = (text.length)/4;
        let splitstr = text.split(" ");
        let print1 = " ";
        let print2 = " ";
        let print3 = " ";
        
        if (splitstr.length == 1)
        {
            drawntext = auto_text(do_stroke,font_style,text,textx,texty,textw,defpt*1.5,context,0);
        }
        else
        {
            if (splitstr.length == 2)
            {
                drawntext = auto_text2(do_stroke,font_style,text,textx,texty,textw,defpt*1.2,context,0);
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
                    for (let ii = (splitstr.length -1) ; ii >= 0 ; ii--)
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
                drawntext = auto_text2(do_stroke,font_style,text,textx,texty,textw,defpt,context,0);
            }
            else
            {
                
                let testw = context.measureText(print2).width;
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
                        
                        if (font_style)
                        {
                            context.font = font_style + ' ' + (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
                        }
                        else
                        {
                            context.font = (Math.floor(defpt*textw/testw+0.5)).toString() + 'px '+fonttype;
                        }
                        if (do_stroke)
                        {
                            context.lineJoin = 'round';
                            context.strokeText  (print1 , textx ,texty-defpt*textw/testw*1.2);
                            context.strokeText  (print2 , textx ,texty);
                            context.strokeText  (print3 , textx ,texty+defpt*textw/testw*1.2);
                        }
                        context.fillText  (print1 , textx ,texty-defpt*textw/testw*1.2);
                        context.fillText  (print2 , textx ,texty);
                        context.fillText  (print3 , textx ,texty+defpt*textw/testw*1.2);
                        drawntext = true;
                    }
                }
                else
                {
                    if (do_stroke)
                    {
                        context.lineJoin = 'round';
                        context.strokeText  (print1 , textx ,texty-defpt*1.2);
                        context.strokeText  (print2 , textx ,texty);
                        context.strokeText  (print3 , textx ,texty+defpt*1.2);
                    }
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


