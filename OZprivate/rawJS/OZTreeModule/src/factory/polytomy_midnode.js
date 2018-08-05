import Midnode from './midnode';
import {ObjectPool} from '../util/index';
import data_repo from './data_repo';

class PolytomyMidnode extends Midnode {
  constructor() {
    super();
    this.sx = null;
    this.ex = null;
    this.sy = null;
    this.ey = null;
  }
    
  // this does not return richness, it returns number of grandchildren. This may be useful but probably not for our purposes.
  get clade_richness() {
    let richness = 1;
    for (let i=0; i<this.children.length; i++) {
      richness += 1 + this.children[i].children.length;
    }
    return richness;
  }
    
  /**
   * Get cut index for children of node. 
   * If node string length < cut_threshold, then force search the cut index,
   * otherwise look up cut_map.
   * this replaces the cuts in midnode.js
   */
  get_cuts(data_repo) {
    let start = this.start;
    let end = this.end;
    let cuts = [];
    if (data_repo.poly_cut_map[end]) {
      return data_repo.poly_cut_map[end];
    } else {
      split_string_and_record_in_cuts(start, end, cuts, true);  
      return cuts;
    }
  }

  // Override: If this node has more than 3 children, don't bother developing anything below it, whatever the callee says
  develop_children(depths) {
    super.develop_children(this.full_children_length > 3 ? 0 : depths);
  }

}

function display_cut_substr(cuts) {
  console.log("cuts length -> " + cuts.length);
  console.log(cuts);
  for (let i=0; i<cuts.length; i+=2) {
    console.log(data_repo.raw_data.slice(cuts[i], cuts[i+1]+1));
  }
}

function split_string_and_record_in_cuts(start, end, cuts, first_cut=true) {
  if (end <= start || (!first_cut && data_repo.raw_data.charAt(end) === ')')) {
    return cuts.push(start, end);
  } else {
    let bracketscount = 0;
    let cut_point;
    for (let i=end; i>=start; i--) {
      let char_at_index = data_repo.raw_data.charAt(i);
      if (char_at_index === ')' || char_at_index === '}') {
        bracketscount++;
      } else if (char_at_index === '(' || char_at_index === '{') {
        bracketscount--;
        if (bracketscount === 1) {
          cut_point = i-1;
          break;
        }
      }
    }
    if (cut_point) {      
      split_string_and_record_in_cuts(start+1, cut_point, cuts, false);
      split_string_and_record_in_cuts(cut_point+1, end-1, cuts, false);  
    } else if (end-start == 1) {
      split_string_and_record_in_cuts(start, start, cuts, false);
      split_string_and_record_in_cuts(end, end, cuts, false);
    } else {
      throw new Error(`error while parsing start: ${start} end: ${end} --- ${data_repo.raw_data.slice(start, end+1)}`);
    }
  }
}

PolytomyMidnode.obj_pool = new ObjectPool(PolytomyMidnode, 100000);

export default PolytomyMidnode;
