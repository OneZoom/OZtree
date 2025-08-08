
The OneZoom Tree of Life Explorer (the "tree visualiser") is written in ECMAscript 6.0, which is then compiled into javascript. A OneZoom object can be created using javascript, and manipulated using various built in methods, as documented below.

## Creating the OneZoom object

### Introduction

The primary use of the OneZoom tree visualiser is to draw large evolutionary trees on an HTML5 canvas. That means that most of the publicly accessible methods for a OneZoom object are only useful if the OneZoom object has been created with an HTML5 canvas on which to draw the tree, and data associated with a tree such as a OneZoom reduced newick file, cut positions, and so on. However, some functionality (e.g. searching for species, listing common names for taxa) can take place without a tree being present. This is used e.g. on the OneZoom website front page, to provide search functionality. Hence we also allow a OneZoom object to be created without tree data.

### Prerequisites

When calling the entry function, you may want to have already defined

1. A set of URLs that can be used for API calls, see API section
2. UI callbacks
3. The html id of the canvas used to hold the OneZoom visualization
4. Initial tree config (see 
5. Pagetitle function

### Basic use

Assuming the prerequisites above have been defined, a OneZoom object can be created as follows:

```
onezoom = OZentry.default(
	server_urls, 
	UI_callbacks, 
	pagetitle_func,
	'OneZoomCanvasID', 
	tree_config);
onezoom.run()
onezoom.controller.button_zoom_in()
```

### Entry function

The OneZoom explorer functionality can be invoked from a web page by including the `OZentry.js` javascript file, then using the entry function below to create a OneZoom instance.

{{src/OZentry.md}}


## Using the OneZoom object

### onezoom.controller

The main way of manipulating the onezoom canvas is via the controller object, calling methods on it (e.g. `onezoom.controller.zoom_in()`) or accessing properties (e.g. `var r = onezoom.controller.root`).

{{src/controller/controller_dom.md}}

### onezoom.utils

1. onezoom.utils.process_taxon_list(list, callback)
2. onezoom.utils.process_taxon_list


### onezoom.data_repo:

This contains all the data stored in an instance (e.g. id2ott mapping, tree?)

### onezoom.config
{{src/global_config.md}}

##Prerequisites

The data fed into the 

###tree_config

###pagetitle_func

