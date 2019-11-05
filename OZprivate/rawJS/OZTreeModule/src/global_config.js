/** @namespace config
 */
let config = {};

/**
  * @property {object}  factory                - 
  * @property {number}  factory.child_num      - The number of children per node.
  */
config.factory = {
  child_num: 2
}

config.threshold = {
  default: 3,
  dynamic_adjust: true //set true to adjust threshold according to last frame rendering time cost
}

/** @property {number}  sensitivity - Etc.
 */
config.sensitivity = 0.84;

/** @property {number}  minimum_ratio_for_zoom - Etc.
 */
config.minimum_ratio_for_zoom = 0.002176;

/** @property {number}  generation_on_subbranch_during_fly - generations to develop on subbranch when doing fly animation.
 */
config.generation_on_subbranch_during_fly = 7;

/** @property {number}  generation_at_searched_node - generation to develop on the searched node if the searched node is an interior node.
 */
config.generation_at_searched_node = 9;

/** @property {string}  search_jump_mode - How to move to a new node: "flight" or "jump"
 */
config.search_jump_mode = "flight";

/** @property {number} home_ott_id - default focusing place when reset
 */
config.home_ott_id = null

config.api = {
  /* These configure how API calls are made, and to where.
     Those ending in _api are mostly null and will be set
     to the appropriate URL when the api manager is initialised */

  node_details_api: null,
  node_details_node_num: 400,
  node_details_interval_when_idle: 1000,
  node_details_interval_when_busy: 200,

  update_visit_count_api: null,
  update_visit_count_interval: 240000,  //update_visit_count_api every 4 mins
  update_visit_count_upload_num_threshold: 100,

  search_api: null,
  search_sponsor_api: null,
  ott2id_arry_api: null,
  otts2vns_api: null,

  search_init_api: null,

  abort_request_threshold: 30000, //timeout for ajax call
  max_concurrent_request: 3,

  image_details_api: null,

  tourstop_page: null,

  //The following are functions which take an OTT or a OneZoom id
  OZ_leaf_json_url_func: null,
  OZ_node_json_url_func: null,

}

config.lang = ''; //two letter language code. If empty, try to use the browser default, which will need to be passed in by the server (not visible to js)

config.default_setting = ''; //a place to save the default settings string passed in via the URL (anything starting d_)

config.custom_querystring_params = []; // If a project requires extra querystring params, set them here so they are preserved when URLs are modified

config.ui = {
  /* These are functions where the OneZoom javascript code needs to interact
     with the user interface (e.g. to pop up a window when a link in the
     canvas is clicked. They should be overridden when initializing the 
     OneZoom code */
  closeAll: function () {/* by default, do nothing */ },
  loadingMessage: function (active) {
    console.log(active ? "Page loading..." : "Finished loading.");
  },
  badOTT: function (ott) {
    alert('You have passed in a bad name or number, so we have\n' +
      'simply taken you to the root of the tree');
  },
  openCopyright: function (pic_src, pic_filename) {
    /* called when a copyright symbol is clicked on the onezoom canvas */
  },
  openLinkouts: function () {/* called as soon as the linkouts button is clicked (i.e. before the AJAX request is returned). By default, do nothing */ },
  populateLinkouts: function () { /* called once the API result for linkouts is returned */
    alert('Something’s not quite right: OneZoom can’t fill in any linkouts.' +
      '\n(the populateLinkouts function in config.ui has not been set)' +
      '\nPlease email mail@onezoom.org and let us know.');
  }
}

config.title_func = function (taxonname) { return (taxonname) ? "OneZoom: " + taxonname : "OneZoom Tree of Life Explorer" }

config.anim = {
  zoom_sensitivity: 0.84
}

//garbage collection
config.gc = {
  detach_level: 2,
}

config.marked_area_color_map = []
// this will store all the colour map for all marked areas in the tree
// it could later be edited by special functions or by the end users, but for now we'll automatically manage addition and subtraction from the array
// the array defines the order and colour of drawing paths to marked areas

config.projection = {
  partl2: 0.1,
  interior_circle_draw: true,
  draw_all_details: true,
  draw_sponsors: true,
  node_low_res_thres: 70,
  node_high_res_thres: 450,
  partc: 0.4,
  Twidth: 1,
  Tsize: 1.1,

  threshold_txt: 1.2,
  sign_thres: 70,
  draw_signpost: true,

  leafmult: 3.2
}

config.render = {
  font_type: "Helvetica"
}

config.pic = {
  data_path_pics: null, //will be set as a function f(src, src_id, preferred_res, square) later
  max_allowed_pic_map_size: 800,
  clear_image_cache_interval: 240000
}

/** @property {boolean} disable_record_url - Don't update the page URL as the tree moves
 */
config.disable_record_url = false;


export default config;
