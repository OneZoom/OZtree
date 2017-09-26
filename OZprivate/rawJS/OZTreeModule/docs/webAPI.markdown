In order to fill out information on a OneZoom tree, the client needs to get information from the server, such as scientific and common names for nodes, image locations, IUCN status, etc.

For this, OneZoom provides a server API that returns JSON data (currently implemented in web2py, with details in the controller file `API.py`). However, when using the OneZoom tree visualiser, you should not make AJAX calls to this server API directly. This is because the OneZoom explorer is constantly making AJAX calls to update the tree, and many modern browsers will stall if multiple simultaneous AJAX requests are made.

Hence the OneZoom javascript instance provides a queued way of making API requests. This is how all API requests are made. Details of the possible API calls are below

## API functions

{{src/api/api_manager.md}}
