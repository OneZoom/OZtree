Projection
--------

This module does two things. First of all, it pre calculates the shapes of each node and leaf on the tree. Second, it updates the position of each visible shape when tree is moving due to the following reasons:

  * User interacts with the canvas
  * User click on interaction buttons(plus, minus, up)
  * User click on record in location dropdown list
  * User click on record in search dropdown list
  * User click on 'enter' while searching
  * User click on forward or backward to another position
  * While page loads, jump or fly to specified position

<br>

Module Interface: 

  1. init_projection
    * Canvas -> Null
    * Setup working environment for this module. e.g. width and height of the canvas. Initial position of the tree(xp, yp, ws)
  1. pre_calculation
    * Midnode -> Null
    * pre-calculate the shapes of each node or leaf descending from the given midnode(normally root of the tree). After pre-calculation, a midnode will have a shapes array which contains the shapes that the midnode consists of. The first shape would also be used to draw text and images of the node or leaf.  
    The pre calculation kind will be determined by viewtype parameter. 
  1. change_viewtype
    * Number or String -> Boolean
    * Return true if given viewtype is different from current viewtype. call pre_calculation again to change shape of the tree when current viewtype is different from given viewtype. 
    * Example Input: (1,2,3,4 or "spiral", "fern", "natural", "balanced")
  1. drawreg
    * Float, Float, Float, Midnode -> Null
    * Given the x, y and r position of node, calculate the x, y and r position of each shapes in node. 
    Then calculate the descendants of node until descendants branch is invisible from screen.  
  1. fly_to_node
    * Number -> Null
    * Perfrom fly animation given node metacode(+ for node and - for leaf)
  1. jump_to_node
    * Number -> Null
    * Perform leap animation given node metacode(+ for node and - for leaf)
  1. icon_zoom_in
    * Null -> Null
    * zoom in from center of the screen
  1. icon_zoom_out
    * Null -> Null
    * zoom out from center of the screen
  1. icon_move_up
    * Null -> Null
    * move to one generation up.
    
    
    