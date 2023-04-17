import data_repo from './data_repo';
import * as utils from './utils';
import config from '../global_config';
import {capitalizeFirstLetter} from '../util/index';

/**
 * This object stores the main tree of the visualisation
 *
 */
class Midnode {
  constructor() {
    // general tree structure objects
    this._detail_fetched = false;
    this.children = []; // array of child notes
    this.upnode = null;  // This node's parent node
    this.start = null;
    this.end = null;
    this.richness_val = 0;
    this.metacode = 0;
    this.type = null;
  
    // metadata information
    this._cname = null;
    this._latin_name = null;
    this._sponsor_name = null;
    this._sponsor_kind = null;
    this._sponsor_extra = null;
    this._age = null;
    this._spec_num_full = null;
    this._picset_len = null;
    this._picset_codes = null;
    this._signpost_common = false;
    this._threatened_branch = null;
    this._redlist = null;
    this._pic_filename = null;
    this._picID_credit = null;
    this._picID_src = null;
    this._date = null;
    this._popularity = null;
    this._is_polytomy = null;
    
    // precalculated parameterss for OneZoom graphics
    this._ott = null;
    this._region = null;
    this.arca = 1.0;
    this.arcr = 1.0;
    this.arcx = 1.0;
    this.arcy = 1.0;
    this.nextr = new Array(config.factory.child_num);
    this.nextx = new Array(config.factory.child_num);
    this.nexty = new Array(config.factory.child_num);
    this.gxmin = 1.0;  // Node bounding box
    this.gymin = 1.0;  // Node bounding box
    this.hxmin = 1.0;  // Node-and-descendants bounding box
    this.hymin = 1.0;  // Node-and-descendants bounding box
    this.gxmax = 1.0;  // Node bounding box
    this.gymax = 1.0;  // Node bounding box
    this.hxmax = 1.0;  // Node-and-descendants bounding box
    this.hymax = 1.0;  // Node-and-descendants bounding box
    
    this.xvar = 1.0;
    this.yvar = 1.0;
    this.rvar = 1.0;
    this.gvar = false;  // dvar is true if this node (or a descendent node) needs to be drawn on the screen
    this.dvar = false;  // gvar is true if this node itself needs to be drawn on screen
    this.graphref = false;
    this.targeted = false;
    
    this.child_leaf_meta_start = new Array(config.factory.child_num);
    this.child_leaf_meta_end = new Array(config.factory.child_num);
    this.child_node_meta_start = new Array(config.factory.child_num);
    this.child_node_meta_end = new Array(config.factory.child_num);
    this.child_start_pos = new Array(config.factory.child_num);
    this.child_end_pos = new Array(config.factory.child_num);
    
    this.full_children_length = 0;
      
    this.markings = [];
  }
  static create(obj) {
    return this.obj_pool.get();
  }
  free() {
    this.constructor.obj_pool.release(this);
  }
  release() {
    this.children = [];
    this._detail_fetched = false;
    this._cname = null;
    this._latin_name = null;
    this._sponsor_name = null;
    this._sponsor_kind = null;
    this._sponsor_extra = null;
    this._age = null;
    this._spec_num_full = null;
    this._picset_len = null;
    this._picset_codes = null;
    this._signpost_common = false;
    this._threatened_branch = null;
    this._redlist = null;
    this._pic_filename = null;
    this._picID_credit = null;
    this._picID_src = null;
    this._ott = null;
    this._region = null;
    this._date = null;
    this._popularity = null;
    this._is_polytomy = null;
    this.markings = [];
  }
    
  // called initially with
  // this.root.init(0, data_repo.raw_data.length-1, 1, 1, null, 20);
  init(start, end, node_metacode, leaf_metacode, parent_node, dl_level) {
    this._detail_fetched = false;
    this.upnode = parent_node;
    this.start = start;
    this.end = end;
    calc_richness_of_node(this);
    calc_polytomyness_of_node(data_repo,this);
    
    if (this.richness_val > 1) {
      // initialise children
      this.calc_start_metacode_of_children(node_metacode, leaf_metacode);
      if (dl_level > 0) {
        this.develop_children(dl_level-1);
      } 
      // initialise interior node variables
      this.metacode = node_metacode;
      this.type = "interiorNode";
    } else {
      this.metacode = leaf_metacode;
      this.type = "leafNode";
    }
  }
    
  update_attribute() {
    this._detail_fetched = true;
  }
  
  /**
   * Develop children of this node recursively, down to (depths) below next child
   */
  develop_children(default_depth) {
    for (let i=0; i<this.full_children_length; i++) {
      let depth = default_depth;

      if (this.children[i]) {
        // This child already exists, give it the chance to develop it's own children
        if (default_depth > 1) {
          this.children[i].develop_children(default_depth - 1);
        }
      } else {
        this.children[i] = this.constructor.create();
        this.children[i].init(this.child_start_pos[i], this.child_end_pos[i], this.child_node_meta_start[i], this.child_leaf_meta_start[i], this, depth);
      }
    }
  }

  /**
   * Develop offshoots from the path from this node to the root
   * @param depth The depth to develop offshoot's children
   */
  develop_branches(depth) {
    // Hit root, nothing more to do
    if (!this.upnode) return;

    // For all sibling nodes, develop their children by depth
    for (let i=0; i<this.upnode.full_children_length; i++) {
      if (this.upnode.children[i] !== this) {
        this.upnode.children[i].develop_children(depth)
      }
    }

    // recurse towards root
    this.upnode.develop_branches(depth)
  }

  /**
   * Return the index of the child descending towards OZid, or null if not a descendant
   *
   * Children do not have to be developed for this to work
   */
  child_index_towards(OZid) {
    if (this.is_leaf) {
      // No point trying to find children of a leaf node
      return null
    }
    if (OZid < 0) {
      // full_children_length is the length of children regardless they are developed or not.
      for (let index=0; index<this.full_children_length; index++) {
        if (this.child_leaf_meta_start[index] <= -OZid && this.child_leaf_meta_end[index] >= -OZid) {
          return index;
        }
      }
    } else {
      for (let index=0; index<this.full_children_length; index++) {
        if (this.child_node_meta_start[index] <= OZid && this.child_node_meta_end[index] >= OZid) {
          return index;
        }
      }
    }
    // Nothing found
    return null;
  }

  /**
   * Get cut index for children of node. 
   * If node string length < cut_threshold, then force search the cut index,
   * otherwise look up cut_map.
   */
  get_cuts(data_repo) {
    let start = this.start;
    let end = this.end;
    let cut;
    if ((end - start) < data_repo.cut_threshold || !data_repo.cut_map[end]) {
      let bracketscount = 0;
      for (let i=end; i>=start; i--) {
        if (data_repo.raw_data.charAt(i) === ')' || data_repo.raw_data.charAt(i) === "}") {
          bracketscount++;
        } else {
          bracketscount--;
          if (bracketscount === 1) {
            cut = i-1;
            break;
          }
        }
      }
    } else {
      cut = data_repo.cut_map[end];  
    }
    return [start+1, cut, cut+1, end-1];
  }

  /**
   * This function calculates the start and end metacode (OZid) of both nodes and leaves for every one of a node's descendants.
   * @param {Midnode} node to perform the calculation on
   * @param {integer} node_metacode start metacode of all interior nodes descendants of [node]
   * @param {integer} leaf_metacode start metacode of all leaf nodes descendants of [node]
   */
  calc_start_metacode_of_children(node_metacode, leaf_metacode) {
    // first get a cutmap showing chunks of the underlying tree string that correspond to each child
    let cuts = this.get_cuts(data_repo);
    // cuts come in pairs of type (start,end) so in a birfucating tree there are two of such pairs whilst in a polytomy tree there are many more of such pairs.
    // now initialise arrays for storing the number of leaves and nodes in each child node
    let leaves_in_children = [];
    let nodes_in_children = [];
    for (let i=0; i<cuts.length; i+=2) {
      // loop over all child nodes (remember that the cutmap comes in pairs
      let child_index = i/2; // we can recover the child index by dividing by two since there is a pair of values for each index
    
      if (cuts[i+1] - cuts[i] <= 0) {
        leaves_in_children[child_index] = 1; // we are a leaf node
      } else {        
        let temp = (cuts[i+1] - cuts[i] + 1)/2+1; // formula to calculate number of leaves
        leaves_in_children[child_index] = isNaN(temp) ? 1 : temp;  
      }
      nodes_in_children[child_index] = leaves_in_children[child_index] - 1;
    }
    this.full_children_length = cuts.length/2; // store number of children as part of the routine
    let tot_bracket_offset = node_metacode + get_bracket_offset(this.start , cuts[0]); // keep a running total of the number of open brackets which will also correspond to the number of nodes in the bifurcating tree.
    this.child_node_meta_start[0] = tot_bracket_offset; // set the first value for node
    this.child_leaf_meta_start[0] = leaf_metacode; // set the first value for leaf
    for (let i=0; i<cuts.length; i+=2) {
      let child_index = i/2;
      // loop across all child nodes of this node
      this.child_start_pos[child_index] = cuts[i];
      this.child_end_pos[child_index] = cuts[i+1];
      // store the start and end position from the cut map for use later (possibly redundant, but not checked)
      if (child_index > 0) {
        // only do for nodes which are not the first node
          tot_bracket_offset += get_bracket_offset(cuts[i-2], cuts[i]); // update the bracket offset by adding to the total
        this.child_node_meta_start[child_index] = tot_bracket_offset; // bracket offset running total now gives the new metacode
        this.child_leaf_meta_start[child_index] = this.child_leaf_meta_end[child_index-1]+1; // set leaf meta data
      }
      // set ends to match the starts
      this.child_node_meta_end[child_index] = this.child_node_meta_start[child_index]+nodes_in_children[child_index]-1;
      this.child_leaf_meta_end[child_index] = this.child_leaf_meta_start[child_index]+leaves_in_children[child_index]-1;
    }
  }

  
  /**
   * Get attribute of node by key name. Use this function to fetch metadata of node only.
   */
  get_attribute(key_name) {
    if (this.detail_fetched && this.is_leaf) {
      let col = data_repo.mc_key_l[key_name];
      if (data_repo.metadata.leaf_meta[this.metacode] && data_repo.metadata.leaf_meta[this.metacode][col] !== undefined) {
        return data_repo.metadata.leaf_meta[this.metacode][col];
      }
    } else if (this.detail_fetched && this.is_interior_node) {
      let col = data_repo.mc_key_n[key_name];
      if (data_repo.metadata.node_meta[this.metacode] && data_repo.metadata.node_meta[this.metacode][col] !== undefined) {
        return data_repo.metadata.node_meta[this.metacode][col];
      }
    }
    return undefined;
  }
  
  clear_pics() {
    this._pic_filename = null;
    this._picID_src = null;
    this._picset_len = null;
    this._picset_codes = null;
    this._picID_credit = null;
    this._detail_fetched = false;
  }
  
  /**
   * Returns the OZid
   * i.e. negative metacode for leaf, positive metacode for interior node
   */
  get ozid() {
    return (this.is_leaf ? -1 : 1) * this.metacode
  }
  get is_root() {
    return !this.upnode;
  }
  get is_leaf() {
    return this.type === "leafNode";
  }
  get is_interior_node() {
    return this.type === "interiorNode";
  }
  // if we want to recache everything we just need to set this to be false for every midnode in the tree. ***todo***
  get detail_fetched() {
    return this._detail_fetched;
    // return data_repo.has_meta(this);
  }
  set detail_fetched(value) {
      this._detail_fetched = value;
  }
  get cname() {
    if (this._cname !== null) return this._cname;
    let _cname = this.get_attribute("common_en");
    if (!_cname && this.ott && data_repo.ott_name_map[this.ott]) _cname = data_repo.ott_name_map[this.ott][1];
    if (this.detail_fetched) {
      _cname = capitalizeFirstLetter(_cname);
      this._cname = _cname;
    }
    return _cname;
  }
  get latin_name() {
    if (this._latin_name !== null) return this._latin_name;
    let _latin_name = this.get_attribute("scientificName");
    if (!_latin_name && this.ott && data_repo.ott_name_map[this.ott]) _latin_name = data_repo.ott_name_map[this.ott][0];
    if (_latin_name && _latin_name.charAt(_latin_name.length-1) === "_") {
      _latin_name = null;
    } else if (_latin_name) {
      _latin_name = _latin_name.split("_").join(" ");
    }
    if (this.detail_fetched) {
      this._latin_name = _latin_name;
    }
    return _latin_name;
  }
  get sponsor_name() {
    if (this._sponsor_name !== null) return this._sponsor_name;
    let _sponsor_name = this.get_attribute("sponsor_name");
    if (this.detail_fetched) {
      this._sponsor_name = _sponsor_name;
    }
    return _sponsor_name
  }
  get sponsor_kind() {
    if (this._sponsor_kind !== null) return this._sponsor_kind;
    let _sponsor_kind = this.get_attribute("sponsor_kind");
    if (this.detail_fetched) {
      this._sponsor_kind = _sponsor_kind;
    }
    return _sponsor_kind;
  }
  get sponsor_extra() {
    if (this._sponsor_extra !== null) return this._sponsor_extra;
    let _sponsor_extra = this.get_attribute("sponsor_extra");
    if (this.detail_fetched) {
      this._sponsor_extra = _sponsor_extra;
    }
    return _sponsor_extra;
  }
  get lengthbr() {
    if (this._age !== null) return this._age;
    let age = this.get_attribute("lengthbr");
    age = isNaN(age) ? 0 : age;
    if (this.detail_fetched) {
      this._age = age;
    }
    return age;
  }
  get spec_num_full() {
    if (this._spec_num_full !== null) return this._spec_num_full;
    let _spec_num_full = utils.spec_num_full(this);
    if (this.detail_fetched) {
      this._spec_num_full = _spec_num_full;
    }
    return _spec_num_full;
  }
  get num_pics() {
    if (this._picset_len !== null) return this._picset_len;
    let _picset_len = this.picset_code.length;
    if (this.detail_fetched) {
      this._picset_len = _picset_len;
    }
    return _picset_len;
  }
  get picset_code() {
    if (this._picset_codes !== null) return this._picset_codes;
    let codes = [];
    let keys = ["sp1", "sp2", "sp3", "sp4", "sp5", "sp6", "sp7", "sp8"];
    for (let i=0; i<keys.length; i++) {
      let key = keys[i];
      let col = data_repo.mc_key_n[key];
      let ott = data_repo.metadata.node_meta[this.metacode] ? data_repo.metadata.node_meta[this.metacode][col] : null;
      if (ott && data_repo.ott_id_map[ott]) {
        let code = -data_repo.ott_id_map[ott];
        codes.push(code);
      }
    }
    if (this.detail_fetched) {
      this._picset_codes = codes;
    }
    return codes;
  } 
  get draw_signpost_common() {
    if (!this._signpost_common) {
      if (this.cname && this.richness_val > 5) {
        this._signpost_common = true;
      } else if (this.richness_val < 10) {
        this._signpost_common = false;
      } else if (this.num_pics > 0 && this.upnode && !this.upnode.draw_signpost_common) {
        this._signpost_common = true;
      }
    }
    return this._signpost_common;
  }
  get threatened_branch() {
    if (this._threatened_branch !== null) return this._threatened_branch;
    let num_threatened = 0;
    if (this.richness_val > 1 && this.detail_fetched) {
      num_threatened += this.get_attribute("iucnVU");
      num_threatened += this.get_attribute("iucnEN");
      num_threatened += this.get_attribute("iucnCR");
    }
    if (this.detail_fetched) {
      this._threatened_branch = (num_threatened > this.richness_val * 0.5);
    }
    return num_threatened > this.richness_val * 0.5;
  }
  get redlist() {
    if (this._redlist !== null) return this._redlist;
    let _redlist = this.get_attribute("IUCN");
    if (this.detail_fetched) {
      this._redlist = _redlist;
    }
    return _redlist;
  }
  get pic_filename() {
    if (this._pic_filename !== null) return this._pic_filename;
    let _pic_filename = this.get_attribute("picID");
    if (this.detail_fetched) {
      this._pic_filename = _pic_filename;
    }
    return _pic_filename;
  }
  get pic_credit() {
    if (this._picID_credit !== null) return this._picID_credit;
    let _picID_credit = this.get_attribute("picID_credit");
    if (this._picID_credit) {  //This attribute is not updated when node detail get fetched.
      this._picID_credit = _picID_credit;
    }
    return _picID_credit;
  }
  get pic_src() {
    if (this._picID_src !== null) return this._picID_src;
    let _picID_src = this.get_attribute("picID_src");
    if (this.detail_fetched) {
      this._picID_src = _picID_src;
    }
    return _picID_src;
  }
  get ott() {
    if (this._ott !== null) return this._ott;
    let ott = this.get_attribute("OTTid");
    if (!ott && this.is_interior_node && data_repo.id_ott_map[this.metacode]) ott = data_repo.id_ott_map[this.metacode];
    else if (!ott && this.is_leaf && data_repo.id_ott_map[-this.metacode]) ott = data_repo.id_ott_map[-this.metacode];
    if (this.detail_fetched || ott) {
      this._ott = ott;
    }
    return ott;
  }
  /**
    * Return a string identifying the area, or undefined if data is not loaded yet
    * For example values, see data_repo.ott_region_map
    */
  get region() {
    if (this._region) {
        // Have a valid cached value, nothing to do
    } else if (!this.detail_fetched) {
        // No detail yet, so can't set region
        this._region = undefined;
    } else if (data_repo.ott_region_map[this.ott]) {
        // This node is the start of a new region
        this._region = data_repo.ott_region_map[this.ott];
    } else if (!this.upnode) {
        // Top node
        this._region = 'default';
    } else {
        // Recurse up the tree as required, populating _region
        // NB: If OTT isn't populated, this will just fill with undefined
        this._region = this.upnode.region;
    }
    return this._region;
  }
  get popularity() {
    if (this._popularity !== null) return this._popularity;
    let _popularity = this.get_attribute("popularity");
    if (this.detail_fetched) {
      this._popularity = _popularity;
    }
    return _popularity;
  }
  /* The following functions return information about the 4x2 set of pictures on an internal node
   *
   */
  get_picset_code(index) {
    return this.picset_code[index];
  }
  /* Return the src and ID for the specified picture
   */
  
  get_picset_src_info(index) {
    let code = this.picset_code[index];
    if (code) {
      let srcID_col = data_repo.mc_key_l["picID"];
      let src_col = data_repo.mc_key_l["picID_src"];
      let credit = data_repo.mc_key_l["picID_credit"];
      return [data_repo.metadata.leaf_meta[code][src_col], data_repo.metadata.leaf_meta[code][srcID_col], data_repo.metadata.leaf_meta[code][credit]];
    }
  }
  get_picset_common(index) {
    let code = this.picset_code[index];
    if (code) {
      let col = data_repo.mc_key_l["common_en"];
      let common = data_repo.metadata.leaf_meta[code][col];
      if (common && common.length > 0) common = common[0].toUpperCase() + common.slice(1);
      return common;
    }
  }
  get_picset_latin(index) {
    let code = this.picset_code[index];
    if (code) {
      let col = data_repo.mc_key_l["scientificName"];
      let latin = data_repo.metadata.leaf_meta[code][col];
      if (latin && latin.length > 0) latin = latin.split("_").join(" ");
      return latin;
    }
  }
  get has_child() {
    return this.children.length > 0;
  }
  get date() {
    if (this.is_interior_node) {
      return data_repo.tree_date.nodes[this.metacode];
    } else {
      return data_repo.tree_date.leaves[this.metacode];
    }    
  }
}

function calc_richness_of_node(node) {
  let start = node.start, end = node.end;
  if (start >= end || isNaN(start) || isNaN(end) || start === null || end === null || start === undefined || end === undefined) {
    node.richness_val = 1;
  } else {
    node.richness_val = (end-start+1)/2+1;
  }
}

function calc_polytomyness_of_node(data_repo,node) {
    // ****** TODO JAMES ****** ///
    
    let start = node.start;
    let end = node.end;
    
    node._is_polytomy = null
    if (data_repo.raw_data.charAt(end) === '}') {
        if (data_repo.raw_data.charAt(start) === '{') {
             node._is_polytomy = true;
        }
    } else {
        if (data_repo.raw_data.charAt(end) === ')') {
            if (data_repo.raw_data.charAt(start) === '(') {
                node._is_polytomy = false;
            }
        }
    }
}

/**
 * get_bracket_offset would return the amount of open bracket from raw_data[prev_end] -> raw_data[next_start-1]
 */
function get_bracket_offset(prev_end, next_start) {
  let offset_count = 0;
  for (let i=prev_end; i<next_start; i++) {
    let ch = data_repo.raw_data.charAt(i);
    if (ch == '{' || ch == '(') offset_count++;
  }
  return offset_count;
}

export default Midnode;
