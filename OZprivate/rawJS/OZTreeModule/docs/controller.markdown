Controller
------

Controller is the hub of the app. It defines methods that would be used in other modules and possibly delegates these functions to its components, like factory, renderer, etc.

  1. calls factory to create the tree
  2. pre calculations node and leaf shapes
  3. parse current url and decide if jump/zoom/partial zoom to node or leaf
  4. setups interactor to bind listener with canvas
  5. provides functions for the browser to manipulate the canvas, such as zoom in, zoom out and up icon
  6. provides functions for search to manipulate the canvas
  7. binds location functionality.
  8. binds tree shape change icons with projection module's viewtype_change function
  9. binds image source change icons with factory module's image_source_change function
  
Module Interface:

  1. run
    * Canvas, rawData, cut_position_map_json_str, metadata
    * Setup the app based on the descriptions above.

  2.