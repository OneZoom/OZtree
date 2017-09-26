import Midnode from './midnode';
import {ObjectPool} from '../util/index';

class ATMidnode extends Midnode {
  constructor() {
    super();
    this._concestor = null;
    this.bezsx = undefined;
    this.bezsy = undefined;
    this.bezc1x = undefined;
    this.bezc1y = undefined;
    this.bezc2x = undefined;
    this.bezc2y = undefined;
    this.bezex = undefined;
    this.bezey = undefined;
    this.bezr = undefined;
  }
  release() {
    super.release();
    this._concestor = null;
  }
  /**
   * Call get_attribute("scientificName") rather than this.latin_name because 
   * latin_name ended with '_' would be stored as null. get_attribute would 
   * get the raw data which would match the key in mapping. 
   */
  get concestor() {
    if (this._concestor !== null) return this._concestor;
    let ott_or_latin_name = this.ott || this.get_attribute("scientificName");
    let _concestor = mapping[ott_or_latin_name];
    if (this.detail_fetched) {
      this._concestor = _concestor;
    }
    return _concestor;
  }
}

//Ancestor's Tale specific: function overrides
let mapping = {
  //use ott number if one exists, otherwise name
  "ChimpHumanClade_":"1",
  312031:"2",
  770311:"3",
  386191:"4",
  842867:"5",
  386195:"6",
  702152:"7",
  913935:"8",
  "Clade305_":"9",
  "Euarchonta":"10",
  392222:"11",
  5334778:"12",
  683263:"13",
  229558:"14",
  244265:"15",
  229560:"16",
  229562:"17",
  4940726:"18",
  458402:"19",
  114654:"20",
  278114:"21",
  801601:"22",
  "ChordataMinusAmphioxus_":"23",
  125642:"24",
  147604:"25",
  "Nephrozoa":"26",
  117569:"27",
  "BilatCnid_":"28",
  "BiCnCt_":"29",
  "BiCnCtPl_":"30",
  691846:"31",
  "CollarClade_":"32",
  "Filozoa":"33",
  5246131:"34",
  332573:"35",
  "Amorphea minus amoebozoa_":"36",
  "Amorphea":"37",
  304358:"38",
  "LE clade_":"39a",
  "TACKLE clade_":"39b",
  "TACKLED clade_":"39c",
  "AllArchaeaAndEukaryotes_":"39d"
  
};

ATMidnode.obj_pool = new ObjectPool(ATMidnode, 25000);

export default ATMidnode;