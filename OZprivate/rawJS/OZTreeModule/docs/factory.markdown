Factory
-------

This module creates the tree when program loads. When the size of the tree is over certain size, it frees memory from unused branches. This module also implements dynamic loading: when user is exploring the tree, this module automatically develops the tree. or when jump or fly to a node or leaf which has not been created yet, this module could create that node or leaf and several more depth further of that node.

* No server-side components
* No build process needed
* Deployable via GitHub Pages
* Can fetch GitHub Readme files
* Gorgeous default theme (and it's responsive)
* Just create an HTML file and deploy!

Module Interface:

* build_tree:
  * rawData, cut_position_map_json_str, metadata -> null
  * build the tree  
* get_root:
  * null -> Midnode
  * get root midnode of the tree
* dynamic_loading:
  * null -> null
  * dynamic loading parts of the tree according to current view position. When there are nodes not fully developed and are visible, develop sub branches of the nodes.
* dynamic_loading_by_metacode:
  * Number -> null
  * dynamic loading the tree to the given node or leaf. Develop 3 generations further on sub branches. If the specified node is a node, develop 9 generations further from that node.
    
  
