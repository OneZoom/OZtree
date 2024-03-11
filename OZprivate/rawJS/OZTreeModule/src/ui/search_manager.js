import api_manager from '../api/api_manager';
import node_details_api from '../api/node_details';
import { node_to_pinpoint } from '../navigation/pinpoint';
import {capitalizeFirstLetter, max} from '../util/index'; // basic tools

/** Class providing functions that send queries to the search API, via the API manager class, and process the returned results. Can be used even if there is no OneZoom canvas */
class SearchManager {
  
    
  /**
   * Create a search manager.
   */
  constructor() {
    this.search_timer = null;
    this.last_search = null;
  }

  /**
   * Configure the URLs to use when searching
   */
  set_urls(server_urls) {
    api_manager.set_urls(server_urls);
    this._urls_configured = true;
  }
    
  /**
   * The main function for carrying out text string searches
   * @param {string} toSearchFor - the string to search for. If blank, previous searches are cancelled
   * @param {function} callback - the function that gets called and passed the results of the search
   *    and ott to id mappings. Found objects will be added to these mappings.
   * @param {float} search_delay - number of milliseconds before actually making the search call. If another 
   *    call is made within this time, the original call is cancelled.
   * @param {function} onSend - the function that gets executed when the search has been sent to the server
   */
  full_search(toSearchFor, callback, search_delay=400, onSend=null) {
    // If not yet configured, look for configuration in global environment
    if (!this._urls_configured && global.window && window.server_urls) {
      this.set_urls(window.server_urls);
    }
    
    if ((!this.last_search)||(this.last_search != toSearchFor))
    {
      
    clearTimeout(this.search_timer);
    let originalSearch = toSearchFor; // we want to return the original search string back to the UI.
    // detect if the search string has something in relating to sponsorship and catch that after running the text through the translation services.
    if (toSearchFor.toLowerCase().indexOf(OZstrings["Sponsored for"].toLowerCase()) === 0) {
        this.searchForSponsor(toSearchFor.substr(OZstrings["Sponsored for"].length), callback, "for");
    } else if (toSearchFor.toLowerCase().indexOf(OZstrings["Sponsored by"].toLowerCase()) === 0) {
        this.searchForSponsor(toSearchFor.substr(OZstrings["Sponsored by"].length), callback, "by");
    } else if (toSearchFor.toLowerCase().indexOf(OZstrings["Sponsored"].toLowerCase()) === 0) {
        this.searchForSponsor(toSearchFor.substr(OZstrings["Sponsored"].length), callback, "all");
    } else if (toSearchFor.toLowerCase().indexOf(OZstrings["Sponsor"].toLowerCase()) === 0) {
        this.searchForSponsor(toSearchFor.substr(OZstrings["Sponsor"].length), callback, "all");
    } else {
        // otherwise do normal search on the search hit, this should return the full set of results including sponsors
        let self = this;
        toSearchFor = toSearchFor.trim(); // this gets rid of spaces at the start and end of the search string
        if (toSearchFor.length == 0) return; // no point searching for nothing
        
        // this is a time out for the search
        this.search_timer = setTimeout(function() {
            if (onSend) onSend(); // this informs the UI that an API request has now been made.
            // this calls the API
            api_manager.search({
                dont_resend: true,
                data: {
                query: toSearchFor
                },
                success: function(res) {
                // this sorts the results
                    this.last_search = null;
                    let newRes1 = self.populateByNodeResults(toSearchFor, res.nodes);
                    // this calls the API again for sponsor search
                    self.searchForSponsor(toSearchFor, function(res) {
                        let newRes = newRes1.concat(res);
                        // sort the results based on quality retuned with the search results.
                        // this sorts the results
                        newRes.sort(function(a, b) {
                            if (a[3] < b[3]) {
                                return 1;
                            } else if (a[3] == b[3]) {
                                return 0;
                            } else {
                                return -1;
                            }
                        });
                        callback(originalSearch,toSearchFor,newRes);
                    }, "all");
                }
            });
        }, search_delay);
    }
    }
  }
  // Notes: the Python server side API calls to server throws out punctuation except for 
  // ',’,-.×# (see: punctuation_to_space_table in API.py)
  // It will also sort out what happens if only 2 characters are requested by requiring exact match to return anything.
  // It will also strip out leading spaces and punctations on the search for sponsors only
    
  /**
   * Search specifically within sponsorship fields.
   * @param {string} toSearchFor - the string to search for within sponsor fields (name, message)
   * @param {Object} callback - will be called with the results object
   * @param {string} type - can be 'all' 'by' or 'for' and refers to the sponsorship search scope
   * @param {float} search_delay - how long to wait before sending off the request
   */
  searchForSponsor(toSearchFor, callback, type, search_delay=400) {
    let self = this;
    clearTimeout(this.search_timer);
    if (!type) type = "all"; // catch case where no type has been entered
    toSearchFor = toSearchFor.trim(); // trim leading and trailing spaces in string
    this.search_timer = setTimeout(function() {
      api_manager.search_sponsor({
        dont_resend: true,
        data: {
        query: toSearchFor,
        type: 'all'
        },
        success: function(res) {
            let newRes = self.populateBySponsorResults(toSearchFor, res, type);
            // sort the results based on quality retuned with the search results.
            newRes.sort(function(a, b) {
                if (a[3] < b[3]) {
                    return 1;
                } else if (a[3] == b[3]) {
                    return 0;
                } else {
                    return -1;
                }
            });
            callback(newRes);
        }
      });
      }, search_delay);
  }
  
  /**
   * Look up details of a set of OneZoom nodes.
   * @param {integer[]} node_ids - a set of <400 OneZoom node ids (negative for leaves, positive for internal nodes)
   * @param {Object} callback - will be called on each of the node IDs with the parameters
   *  (id, ott, sciname, vernacular, image_src_ids, image_srcs, date)
   * @todo implement "image_src_ids, image_srcs, date" - giving a single img for leaves and potentially multiple for nodes
   * @param {string} image_source - 'best_verified', 'best_pd', or 'best_any'
   */
  lookup_nodes(node_ids, callback, image_source) {
    // If not yet configured, look for configuration in global environment
    if (!this._urls_configured && global.window && window.server_urls) {
      this.set_urls(window.server_urls);
    }

    let nodes_searched_for = node_ids.splice(0,400);
    let leaves_arr = nodes_searched_for.filter(x => !isNaN(x) && x < 0).map(Math.abs);
    let nodes_arr  = nodes_searched_for.filter(x => !isNaN(x) && x > 0);
    let params = {
      method: 'post',
      data: {
        node_ids: nodes_arr.join(","),
        leaf_ids: leaves_arr.join(","),
        image_source: image_source
      },
      nodes_searched_for: nodes_searched_for,
      success: function(res) {
        let node_mapping = {};
        res.nodes.forEach(function(elem) {
            node_mapping[elem[node_details_api.node_cols["id"]]]=elem;
        });
        res.leaves.forEach(function(elem) {
            node_mapping[-elem[node_details_api.leaf_cols["id"]]]=elem;
        });
        let vernacular_mapping = {}
        res.vernacular_by_ott.forEach(function(elem) {
            vernacular_mapping[elem[0]]=elem[1];
        })
        res.vernacular_by_name.forEach(function(elem) {
            vernacular_mapping[elem[0]]=elem[1];
        })
        for (let i=0; i< params.nodes_searched_for.length; i++) {
            let id = params.nodes_searched_for[i];
            let ret = node_mapping[id];
            if (ret) {
                let ott;
                let sciname;
                if (id < 0) {
                    ott = ret[node_details_api.leaf_cols["ott"]];
                    sciname = ret[node_details_api.leaf_cols["name"]];
                } else {
                    ott = ret[node_details_api.node_cols["ott"]];
                    sciname = ret[node_details_api.node_cols["name"]];
                }
                let vernacular = vernacular_mapping[ott] || vernacular_mapping[sciname] || undefined;
                // Recreate a compile_searchbox_data() format
                let result = [
                    vernacular,
                    (sciname && !sciname.endsWith("_"))?sciname:undefined,
                    id,
                ];
                result.pinpoint = '@' + (result[1] || '').replace(/ /g, '_') + '=' + ott
                callback(result)
            }
        }
      }
    }
    api_manager.node_detail(params);
  }

 /**
  * @private
  * Prepares a set of data including hit quality for searches of sponsor name.
  */
  populateBySponsorResults(toSearchFor, res, type='all') {
    let temp_ott_id_map = {}; // map from ottid to OZid
    let newRes = []; // the result that will get returned
    if (res) { // check that a result has been returned at all
        if (res.nodes){ // check if there are node search results before processing those
            for (let i=0; i<res.nodes.length; i++) {
                temp_ott_id_map[res.nodes[i].ott] = res.nodes[i].id;
            }
        }
        if (res.leaves){ // check that there are leaf search results
            for (let i=0; i<res.leaves.length; i++) {
                temp_ott_id_map[res.leaves[i].ott] = -res.leaves[i].id;
            }
         }
          if (res.reservations){ // check that there are reservation search results (sponsors)
              for (let i=0; i<res.reservations.length; i++) {
                  let record = res.reservations[i];

                  let ott = record[0];
                  let latinName = record[1];
                  let vernacular = res.common_names[ott];
                  let id = temp_ott_id_map[ott];
                  let searchScore = (record[4] == type)?1:0;
                  // give a low score, but higher if you asked for "for" and got "for or asked for "by" and got "by"
                  let tidy_common = vernacular ? capitalizeFirstLetter(vernacular) : null; // ready for printing in UI
                  
                  // "latin names" starting or ending with underscore are "fake" in OneZoom
                  let row = [tidy_common, latinName && !latinName.startsWith("_") ? latinName : null, id, searchScore];
                  let additional_info = {info_type: "Sponsorship Info", text: null};
                  let prefix = "";
                  if (record[4] && record[4] !== "null") prefix = OZstrings["Sponsored " + record[4]] + " ";
                  if (record[2] && record[3]) {
                      additional_info.text = prefix + record[2] + "</br>" + capitalizeFirstLetter(record[3]);
                      row.push(additional_info);
                  } else if (record[2]) {
                      additional_info.text = prefix + record[2];
                      row.push(additional_info);
                  } else if (record[3]) {
                      additional_info.text = capitalizeFirstLetter(record[3]);
                      row.push(additional_info);
                  }
                  row.pinpoint = node_to_pinpoint({ ott: ott, latin_name: latinName });
                  newRes.push(row);
              }
          }
      }
    return newRes; // return the result ready for processsing, with all search results appended to it.
  }

  /**
  * @private
  * Prepares a set of data including hit quality for searches of nodes (including leaves).
  */
  populateByNodeResults(toSearchFor, res) {
    let newRes = []; // the variable we're going to return
    // do nodes first
    for (let i=0; i<res.node_hits.length; i++) {
        newRes.push(this.compile_searchbox_data(toSearchFor, res.lang, res.node_hits[i], res.headers, false));
        // results returned from API search automatically have language in them
    }
    // now do leaves
    for (let i=0; i<res.leaf_hits.length; i++) {
        newRes.push(this.compile_searchbox_data(toSearchFor, res.lang, res.leaf_hits[i], res.headers, true));
    }
    return newRes;
  }
  
  /**
   * @private
   * Prepares a set of data including hit quality for searches of node (either leaf or interior node)
   * @return [common_name, sciname, ozid, score, [, extra_vernacular], pinpoint = "@latin=ott"]
   */
  compile_searchbox_data(toSearchFor, lang, record, cols, is_leaf) {
    // uses search match and pluralize
    let vernacular = record[cols["vernacular"]];
    let latinName  = record[cols["name"]];
    let ott = record[cols["ott"]];
    let id = record[cols["id"]];
    let extra_vernaculars = record[cols["extra_vernaculars"]];
    let id_decider = is_leaf? -1:1;
    let tidy_common = vernacular ? capitalizeFirstLetter(vernacular) : null; // ready for printing in UI
    
    // "latin names" starting or ending with underscore are "fake" in OneZoom
    let row = [tidy_common, latinName && !latinName.startsWith("_") ? latinName : null, id * id_decider];
    let score_result = overall_search_score(toSearchFor, latinName, lang, vernacular, extra_vernaculars);
    if (score_result.length < 2) {
        row = row.concat(score_result)
    } else {
        //the second item retuend by the score function is a index into the extra_vernaculars
        //array, if the match was only to an extra vernacular
        let extra = OZstrings["Also called:"] + " " + extra_vernaculars[score_result[1]]
        row = row.concat([score_result[0], {info_type: "Extra Vernacular", text: extra}])
    }
    row.pinpoint = node_to_pinpoint({ ott: ott, latin_name: latinName });
    return row;
  }
}

//** FUNCTIONS THAT FOLLOW OUTSIDE OF THE CLASS SHOULD BE CORRECTLY INDENTED, AT THEY
//** ARE USED IN THE UNIT TESTING OF THE SEARCH API. IN PARTICULAR, THERE SHOULD BE 
//** NO INDENT OF THE function DEFINITION, AND THE ONLY NON-INDENTED CLOSE-CURLY-BRACE
//** SHOULD BE TO CLOSE THE FUNCTION


/**
 * @private
 * Provides a total search score for a species given the scientific, vernacular, and extra (unpreferred) vernacular names
 * Returns an array of the score plus (if matched) the index of the best matching extra vernacular score
 */
function overall_search_score(toSearchFor, latinName, lang, vernacular, extra_vernaculars) {
    let latin_score = latinName ? match_score(toSearchFor, latinName)*3 : 0;
    let toSearchFor_plural = pluralize(toSearchFor, lang)
    let toSearchFor_dedash = dedash(toSearchFor)
    let vernacular_score = vernacular?  Math.max(
                                            match_score(toSearchFor,        vernacular)*3+2,
                                            match_score(toSearchFor_plural, vernacular)*3+1,
                                            match_score(toSearchFor_dedash, vernacular)*3+1) : 0;
    
    let extra_vernacular_score = -20;
    let extra_vernacular_index=[];
    if (extra_vernaculars) {
        for (let k=0; k<extra_vernaculars.length; k++) {
            let extra_vernacular = extra_vernaculars[k];
            let temp_score = Math.max(
                                 match_score(toSearchFor,        extra_vernacular)*3+2,
                                 match_score(toSearchFor_plural, extra_vernacular)*3+1,
                                 match_score(toSearchFor_dedash, extra_vernacular)*3+1) - 20;
            
            if (temp_score >= extra_vernacular_score) {
                extra_vernacular_index = [k]
                extra_vernacular_score = temp_score;
            }
        }  
    }
    return [Math.max(latin_score, vernacular_score, extra_vernacular_score)].concat(extra_vernacular_index)
}
/**
 * @private
 * Provides a numerical ranking for search quality which can be used for ranking search results locally
 */
function match_score(toSearchFor, toSearchIn) {
    // when we use this we'll have to check there isn't a lowdash escape on the end of the toSearchIn
    if (toSearchIn==toSearchFor) {
        // perfect match
        return 10;
    } else {
        // try lowercase
        let toSearchInLower = toSearchIn.toLowerCase()
        let toSearchForLower = toSearchFor.toLowerCase()
        if (toSearchInLower==toSearchForLower) {
            // perfect match with lower case
            return 9;
        } else {
            // try again without punctuation but with spaces in place
            let toSearchInCut = toSearchInLower.replace(/[^\w\s]|_/g, "")
            let toSearchForCut = toSearchForLower.replace(/[^\w\s]|_/g, "")
            if (toSearchInCut==toSearchForCut) {
                // perfect match without punctuation or case sensitivity
                return 8;
            } else {
                // try and search within instead of looking for perfect match
                let tempSearchResult = toSearchInLower.search(toSearchForLower)
                if (tempSearchResult != -1) {
                    // we have some kind of match with spaces
                    if (tempSearchResult == 0) {
                        // at the start of the phrase
                        if (/\s/g.test(toSearchInLower[tempSearchResult+toSearchForLower.length])) {
                            // straddled by spaces
                            return 6;
                        } else {
                            // not straddled by spaces
                            return 5;
                        }
                    } else {
                        if ((tempSearchResult + toSearchForLower.length)==toSearchInLower.length) {
                            // at the end of the phrase
                            if (/\s/g.test(toSearchInLower[tempSearchResult-1])) {
                                // straddled by spaces
                                return 7;
                            } else {
                                // not straddled by spaces
                                return 6;
                            }
                        } else {
                            // not at the start or end - check if it's straddled by spaces
                            if ((/\s/g.test(toSearchInLower[tempSearchResult-1]))&&(/\s/g.test(toSearchInLower[tempSearchResult+toSearchForLower.length]))) {
                                // straddled by spaces
                                return 4;
                            } else {
                                // not straddled by spaces
                                return 3;
                            }
                        }
                    }
                } else {
                    // remove everything including spaces etc.
                    let toSearchInCut2 = toSearchInLower.replace(/[^\w]|_/g, "")
                    let toSearchForCut2 = toSearchForLower.replace(/[^\w]|_/g, "")
                    tempSearchResult = toSearchInCut2.search(toSearchForCut2)
                    if (tempSearchResult != -1) {
                        // we have some kind of match with spaces and punctuation removed
                        if (tempSearchResult == 0) {
                            // at the start of the phrase
                            return 2;
                        } else {
                            // not at the start
                            return 0;
                        }
                    } else {
                        // no kind of match at all
                        return 0;
                    }
                }
            }
        }
    }
}

/**
 * This function gives a plural for any term given. It is used when providing a 
 * ranking for search results returned from the API
 *
 * @todo this is not internationalized, so search results in languages other than
 *  english will not be pluralized
 * @param {string} stringIn - the string to pluralize.
 * @param {string} lang - the 2 or 4 letter language string, e.g. 'en' or 'en-GB'.
 */
function pluralize(stringIn, lang='en') {
    if (lang && /^en/.test(lang)) {
        let lastChar = stringIn.substr(stringIn.length - 1);
        let secondLastChar = stringIn.substr(stringIn.length - 2,1);
        let lastTwoChars = stringIn.substr(stringIn.length - 2,2);
        if ((lastChar== "y")&&(vowel(secondLastChar)==false)) {
            return stringIn.substr(0,stringIn.length - 1)+"ies";
        } else if (lastChar=="s" || lastChar=="x" || lastChar=="z") {
            return stringIn+"es";
        } else if (lastTwoChars=="ch" || lastTwoChars=="sh") {
            return stringIn+"es";
        } else {
            //With nouns that end in a consonant or a single vowel plus -f or -fe, change the -f or -fe to -ves:
            // can't be bothered!!!!
            return (stringIn+"s");
        }
    } else {
        return (stringIn);
    }
}

/**
 * @private
 * Returns true if the character passed in is a vowel (only used by pluralize)
 */
function vowel(charIn) {
    return ['a', 'e', 'i', 'o', 'u'].indexOf(charIn) !== -1;
}

/**
 * @private
 * Removes dashes from a string
 */
function dedash(stringIn) {
    return stringIn.split("-").join(" ");
}

let search_manager = new SearchManager();
export default search_manager;
