import {call_hook} from '../util/index';
import node_details_api from '../api/node_details';
import {pic_src_order} from '../tree_settings';
/**
 * A class to store all tree data, metadata and metadata related information. It also provides interface to update metadata.
 */
class DataRepo {
  constructor() {
    this.ott_id_map = {};
    this.id_ott_map = {};
    this.name_id_map = {};
    this.ott_name_map = {};
    this.ott_region_map = {
        229560: 'land',  // amniotes = mammals + reptiles + birds
        244265: 'land',  // mammals
        632179: 'land',  // arthropods
        195672: 'reptile',  // Crocodylia
        639666: 'reptile',  // Turtles
        81461:  'birds',  // Birds
        698424: 'sea',  // Cetacea
        5268475: 'plants',
        1062253: 'insects',
        1012685: 'mushrooms',
        844192:  'bacteria',
    };
    this.image_source = "best_any";
    this.leaf_col_len = 15;
    this.node_col_len = 31;
  }
  /**
   * Place all the data in the passed-in object into the this object
   * This is called when setting up the controller
   * @param {Object} data_obj
   */
  setup(data_obj) {
    for (let key of Object.keys(data_obj)) {
      this[key] = data_obj[key];
    }
    this.mc_key_l = {};
    this.mc_key_n = {};
    for (let i = 0 ; i < (this.metadata.leaf_meta[0].length) ; i ++) {
        this.mc_key_l[this.metadata.leaf_meta[0][i]] = i;
    }  
    for (let i = 0 ; i < (this.metadata.node_meta[0].length) ; i ++) {
        this.mc_key_n[this.metadata.node_meta[0][i]] = i;
    }
  }
  
  /**
   * Add information for nodes and/or leaves to the data repository from the API
   * @param {Object} res - the return result from an API call to node_details.json
   */
  
  update_metadata(res) {
    this.populate_id_ott_map(res);
    this.populate_id_name_map(res);
    parse_ordered_leaves(this, res.leaves, node_details_api);
    parse_ordered_nodes(this, res.nodes, node_details_api);
    parse_iucn(this, res.leafIucn);
    parse_pics(this, res.leafPic, pic_src_order, node_details_api);
    parse_vernacular_by_ott(this, res.vernacular_by_ott);
    parse_vernacular_by_name(this, res.vernacular_by_name);
    parse_sponsorship(this, res.reservations, node_details_api);
  }
  update_image_metadata(metacode, rights, licence) {
    this.metadata.leaf_meta[metacode][this.mc_key_l["picID_credit"]] = rights +  " / " + licence;
  }
  has_meta(node) {
    if (node.is_interior_node) {
      return this.metadata.node_meta.hasOwnProperty(node.metacode);
    } else if (node.is_leaf) {
      return this.metadata.leaf_meta.hasOwnProperty(node.metacode);
    }
  }
  
  clear_cached_vernaculars() {
    for (let arr of Object.values(this.metadata.leaf_meta)) {
      delete arr[data_repo.mc_key_l["common_en"]];
    }
    for (let arr of Object.values(this.metadata.node_meta)) {
      delete arr[data_repo.mc_key_n["common_en"]];
    }
    this.ott_name_map = {};
  }

  get raw_data() {
    if (!this._raw_data) throw new Error("raw_data has not been defined");
    else return this._raw_data;
  }
  set raw_data(value) {
    this._raw_data = value;
  }
  get cut_map() {
    if (!this._cut_map) throw new Error("cut_map has not been defined");
    else return this._cut_map;
  }
  set cut_map(value) {
    this._cut_map = value;
  }
  get cut_threshold() {
    if (!this._cut_threshold) throw new Error("cut_threshold has not been defined");
    else return this._cut_threshold;
  }
  set cut_threshold(value) {
    this._cut_threshold = value;
  }
  get metadata() {
    if (!this._metadata) throw new Error("metadata has not been defined");
    else return this._metadata;
  }
  set metadata(value) {
    this._metadata = value;
  }
  get mc_key_l() {
    if (!this._mc_key_l) throw new Error("mc_key_l has not been defined");
    else return this._mc_key_l;
  }
  set mc_key_l(value) {
    this._mc_key_l = value;
  }
  get mc_key_n() {
    if (!this._mc_key_n) throw new Error("mc_key_n has not been defined");
    else return this._mc_key_n;
  }
  set mc_key_n(value) {
    this._mc_key_n = value;
  }

  /**
   * Keep track of which OTT ids map to which OneZoom leaf or node ids. 
   * OneZoom ids will change when the tree is updated, OTT ids should be semi-permanent
   * @private 
   * @param {Object} res - the API JSON return result from node_details.json
   */
  populate_id_ott_map(res) {
    let nodes = res.nodes;
    let leaves = res.leaves;
    for (let i=0; i<nodes.length; i++) {
      let ott = nodes[i][node_details_api.node_cols["ott"]];
      let id = nodes[i][node_details_api.node_cols["id"]];
      if (ott) {
        this.ott_id_map[ott] = id;
        this.id_ott_map[id] = ott;
      }
    }
    for (let i=0; i<leaves.length; i++) {
      let ott = leaves[i][node_details_api.leaf_cols["ott"]];
      let id = leaves[i][node_details_api.leaf_cols["id"]];
      if (ott) {
        this.ott_id_map[ott] = -id;
        this.id_ott_map[-id] = ott;
      }
    }
  }
  
  populate_id_name_map(res) {
    let nodes = res.nodes;
    let leaves = res.leaves;
    for (let i=0; i<nodes.length; i++) {
      let id = nodes[i][node_details_api.node_cols["id"]];
      let name = nodes[i][node_details_api.node_cols["name"]];
      if (name) {
        this.name_id_map[name] = id;
      }
    }
    for (let i=0; i<leaves.length; i++) {
      let id = leaves[i][node_details_api.leaf_cols["id"]];
      let name = leaves[i][node_details_api.leaf_cols["name"]];
      if (name) {
        this.name_id_map[name] = -id;
      }
    }
  }
}
  
  
function parse_ordered_leaves(data_repo, leaves, node_details) {
  for (let i=0; i<leaves.length; i++) {
    let id = leaves[i][node_details.leaf_cols["id"]];
    let ott = leaves[i][node_details.leaf_cols["ott"]];
    if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new   Array(data_repo.leaf_col_len);
    let leaf_meta_entry = data_repo.metadata.leaf_meta[id];
    leaf_meta_entry[data_repo.mc_key_l["OTTid"]] = ott;
    leaf_meta_entry[data_repo.mc_key_l["scientificName"]] =leaves[i][node_details.leaf_cols["name"]];
    leaf_meta_entry[data_repo.mc_key_l["popularity"]] = leaves[i][node_details.leaf_cols["popularity"]];
  }
}

function parse_ordered_nodes(data_repo, nodes, node_details) {
  for (let i=0; i<nodes.length; i++) {
    let id = nodes[i][node_details.node_cols["id"]];
    let ott = nodes[i][node_details.node_cols["ott"]];
    if (!data_repo.metadata.node_meta[id]) data_repo.metadata.node_meta[id] = new Array(data_repo.node_col_len);
    let node_meta_entry = data_repo.metadata.node_meta[id];
    node_meta_entry[data_repo.mc_key_n["OTTid"]] = ott;
    node_meta_entry[data_repo.mc_key_n["scientificName"]] = nodes[i][node_details.node_cols["name"]];
    node_meta_entry[data_repo.mc_key_n["popularity"]] = nodes[i][node_details.node_cols["popularity"]];
    node_meta_entry[data_repo.mc_key_n["lengthbr"]] = Math.abs(nodes[i][node_details.node_cols["age"]]);
    
    node_meta_entry[data_repo.mc_key_n["sp1"]] = nodes[i][node_details.node_cols["{pic}1"]];
    node_meta_entry[data_repo.mc_key_n["sp2"]] = nodes[i][node_details.node_cols["{pic}2"]];
    node_meta_entry[data_repo.mc_key_n["sp3"]] = nodes[i][node_details.node_cols["{pic}3"]];
    node_meta_entry[data_repo.mc_key_n["sp4"]] = nodes[i][node_details.node_cols["{pic}4"]];
    node_meta_entry[data_repo.mc_key_n["sp5"]] = nodes[i][node_details.node_cols["{pic}5"]];
    node_meta_entry[data_repo.mc_key_n["sp6"]] = nodes[i][node_details.node_cols["{pic}6"]];
    node_meta_entry[data_repo.mc_key_n["sp7"]] = nodes[i][node_details.node_cols["{pic}7"]];
    node_meta_entry[data_repo.mc_key_n["sp8"]] = nodes[i][node_details.node_cols["{pic}8"]];
    
    node_meta_entry[data_repo.mc_key_n["iucnDD"]] = nodes[i][node_details.node_cols["iucnDD"]];
    node_meta_entry[data_repo.mc_key_n["iucnNE"]] = nodes[i][node_details.node_cols["iucnNE"]];
    node_meta_entry[data_repo.mc_key_n["iucnLC"]] = nodes[i][node_details.node_cols["iucnLC"]];
    node_meta_entry[data_repo.mc_key_n["iucnNT"]] = nodes[i][node_details.node_cols["iucnNT"]];
    node_meta_entry[data_repo.mc_key_n["iucnVU"]] = nodes[i][node_details.node_cols["iucnVU"]];
    node_meta_entry[data_repo.mc_key_n["iucnEN"]] = nodes[i][node_details.node_cols["iucnEN"]];
    node_meta_entry[data_repo.mc_key_n["iucnCR"]] = nodes[i][node_details.node_cols["iucnCR"]];
    node_meta_entry[data_repo.mc_key_n["iucnEW"]] = nodes[i][node_details.node_cols["iucnEW"]];
    node_meta_entry[data_repo.mc_key_n["iucnEX"]] = nodes[i][node_details.node_cols["iucnEX"]];
  }
}

function parse_iucn(data_repo, iucn) {
  for (let i=0; i<iucn.length; i++) {
    let ott = iucn[i][0];
    let status_code = iucn[i][1];
    let id = -data_repo.ott_id_map[ott];
    if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new Array(data_repo.leaf_col_len);
    data_repo.metadata.leaf_meta[id][data_repo.mc_key_l["IUCN"]] = status_code;
  }
}

function parse_pics(data_repo, pics, order, node_details) {
  /* Here we have a set of pictures for otts. We have up to one pic per ott/source_id (OZ, Eol, Kew, LinnSoc etc.) combo
     So there could be more than one pic per species if a species has e.g. an Eol, a OneZoom, and a LinnSoc image 
     
     If 'order' is defined, it is an mapping of src -> priority giving the priority of which src to use first, given that there is a choice.
     Note that this may result in sub-optimal pictures being displayed on signposts, as
     the code which chooses pictures to percolate up always uses the default order: e.g. 
     if a species has a fantastic EoL picture but a poor Linn Soc picture, the Linn Soc 
     tree may end up with a poor signpost picture high up in the tree. It is difficult to 
     know how to resolve this without providing new database columns containing e.g. 
     Linn-Soc-specific signpost recommendations (something that we may need to do eventually)
     */
  for (let i=0; i<pics.length; i++) {
    let ott = pics[i][node_details.pic_cols["ott"]];
    let id = -data_repo.ott_id_map[ott];
    if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new Array(data_repo.leaf_col_len);
    //pick the image with the smallest src number
    let src = order ? order[pics[i][node_details.pic_cols["src"]]] : pics[i][node_details.pic_cols["src"]].toString();
    let pic_entry = data_repo.metadata.leaf_meta[id];
    if (pic_entry[data_repo.mc_key_l["picID_src"]] < src) {
      //don't save this image: we have one already
      //NB: this never happens if metadata.leaf_meta[id] has no info
    } else {
      pic_entry[data_repo.mc_key_l["picID_src"]]    = pics[i][node_details.pic_cols["src"]].toString();
      pic_entry[data_repo.mc_key_l["picID"]]        = pics[i][node_details.pic_cols["src_id"]].toString();
      pic_entry[data_repo.mc_key_l["picID_rating"]] = pics[i][node_details.pic_cols["rating"]];
      /** 
       * this attribute would be fetched by image_details api call. 
       * set credit to null to force it being fetched by image_details API call. Otherwise if user change image source, the image credit
       * might refer to previous image source.
       */
      pic_entry[data_repo.mc_key_l["picID_credit"]] = null;
      // metadata.leaf_meta[id][data_repo.mc_key_l["picID_credit"]] = leaf_pics[i][pic_cols["rights"]] + " / "+ leaf_pics[i][pic_cols["licence"]];
    }
  }
}

function parse_vernacular_by_ott(data_repo, vernacular_by_ott) {
  //pick the first vernacular returned by the array
  for (let i=0; i<vernacular_by_ott.length; i++) {
    let ott = vernacular_by_ott[i][0];
    let vernacular = vernacular_by_ott[i][1];
    let id = data_repo.ott_id_map[ott];
    if (id && id>0) {
      if (!data_repo.metadata.node_meta[id]) data_repo.metadata.node_meta[id] = new Array(data_repo.node_col_len);
      if (!data_repo.metadata.node_meta[id][data_repo.mc_key_n["common_en"]])
        data_repo.metadata.node_meta[id][data_repo.mc_key_n["common_en"]] = vernacular;
    } else if (id && id<0) {
      id = -id;
      if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new Array(data_repo.leaf_col_len);
      if (!data_repo.metadata.leaf_meta[id][data_repo.mc_key_l["common_en"]])
        data_repo.metadata.leaf_meta[id][data_repo.mc_key_l["common_en"]] = vernacular;
    }
    
    //data_repo.ott_name_map[ott] = [scientificName, vernacular]
    if (!data_repo.ott_name_map[ott]) data_repo.ott_name_map[ott] = [];
    if (!data_repo.ott_name_map[ott][1])
      data_repo.ott_name_map[ott][1] = vernacular;
  }
}

function parse_vernacular_by_name(data_repo, vernacular_by_name) {
  for (let i=0; i<vernacular_by_name.length; i++) {
    let name = vernacular_by_name[i][0];
    let vernacular = vernacular_by_name[i][1];
    let id = data_repo.name_id_map[name];
    if (id && id>0) {
      if (!data_repo.metadata.node_meta[id]) data_repo.metadata.node_meta[id] = new Array(data_repo.node_col_len);
      if (!data_repo.metadata.node_meta[id][data_repo.mc_key_n["common_en"]])
        data_repo.metadata.node_meta[id][data_repo.mc_key_n["common_en"]] = vernacular;
    } else if (id && id<0) {
      id = -id;
      if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new Array(data_repo.leaf_col_len);
      if (!data_repo.metadata.leaf_meta[id][data_repo.mc_key_l["common_en"]])
        data_repo.metadata.leaf_meta[id][data_repo.mc_key_l["common_en"]] = vernacular;
    }
  }
}

function parse_sponsorship(data_repo, reservations, node_details) {
  for (let i=0; i<reservations.length; i++) {
    let ott = reservations[i][node_details.res_cols["OTT_ID"]];
    if (data_repo.ott_id_map[ott] && data_repo.ott_id_map[ott] > 0) {  //node
      let id = data_repo.ott_id_map[ott];
      if (!data_repo.metadata.node_meta[id]) data_repo.metadata.node_meta[id] = new Array(data_repo.node_col_len);
      let node_meta_entry = data_repo.metadata.node_meta[id];
      node_meta_entry[data_repo.mc_key_n["sponsor_name"]] = reservations[i][node_details.res_cols["verified_name"]];
      node_meta_entry[data_repo.mc_key_n["sponsor_kind"]] = reservations[i][node_details.res_cols["verified_kind"]];
      node_meta_entry[data_repo.mc_key_n["sponsor_extra"]] = reservations[i][node_details.res_cols["verified_more_info"]];
      node_meta_entry[data_repo.mc_key_n["sponsor_url"]] = reservations[i][node_details.res_cols["verified_url"]];
      
      //only replace scientificName and common_en if scientificName or common_name is not present.
      if (!node_meta_entry[data_repo.mc_key_n["scientificName"]]) {
        node_meta_entry[data_repo.mc_key_n["scientificName"]] = reservations[i][node_details.res_cols["name"]];
      }      
      if (!node_meta_entry[data_repo.mc_key_n["common_en"]]) {
        node_meta_entry[data_repo.mc_key_n["common_en"]] = reservations[i][node_details.res_cols["common_name"]];
      }      
    } else if (data_repo.ott_id_map[ott] && data_repo.ott_id_map[ott] < 0) {  //leaf
      let id = -data_repo.ott_id_map[ott];
      if (!data_repo.metadata.leaf_meta[id]) data_repo.metadata.leaf_meta[id] = new Array(data_repo.leaf_col_len);
      let leaf_meta_entry = data_repo.metadata.leaf_meta[id];
      leaf_meta_entry[data_repo.mc_key_l["sponsor_name"]] = reservations[i][node_details.res_cols["verified_name"]];
      leaf_meta_entry[data_repo.mc_key_l["sponsor_kind"]] = reservations[i][node_details.res_cols["verified_kind"]];
      leaf_meta_entry[data_repo.mc_key_l["sponsor_extra"]] = reservations[i][node_details.res_cols["verified_more_info"]];
      leaf_meta_entry[data_repo.mc_key_l["sponsor_url"]] = reservations[i][node_details.res_cols["verified_url"]];
      
      //only replace scientificName and common_en if scientificName or common_name is not present.
      if (!leaf_meta_entry[data_repo.mc_key_l["scientificName"]]) {
        leaf_meta_entry[data_repo.mc_key_l["scientificName"]] = reservations[i][node_details.res_cols["name"]];
      }      
      if (!leaf_meta_entry[data_repo.mc_key_l["common_en"]]) {
        leaf_meta_entry[data_repo.mc_key_l["common_en"]] = reservations[i][node_details.res_cols["common_name"]];
      }  
    }
  }
}

let data_repo = new DataRepo();
export default data_repo;
