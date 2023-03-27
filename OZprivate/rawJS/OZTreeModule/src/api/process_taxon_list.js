/* A function that takes in a list of headers and OTT/names and maps two callback functions onto the list,
 * one for a header line and one for a taxon line */

import api_manager from './api_manager'; //for api_manager.get_ids_by_ott_array()
import data_repo from '../factory/data_repo'

/**
 * Takes an list of headings & ott/name entries and applies the callback to each one in turn. This is mainly used for populating
 * the popular species menu, but is kept general so it can be used for a variety of other purposes.
 * @param {String} taxon_json - a JSON string specifying an array, each item of which is a string (treated as a header) or an object containing
 * an 'OTT' property and any number of optional text labels to use, keyed by language. For example taxon_list could be 
 * ['header text',{'OTT':1234,'en':'name to use},{...]
 * @param {Function} taxon_callback - the 4-param UI function [f(ott, used_name, sciname, OZid)] to call on a header string, e.g. adding it to a list
 * @param {Function} header_callback - the 1-param UI function [f(label)] to call on a header string, e.g. adding it to a list
 * @param {Function} completed_callback - a function [f()] to call once the taxa have been processed and the data_repo filled
 */
export default function (taxon_json, taxon_callback, header_callback, completed_callback) {
  if (taxon_json) {
    let taxon_list = JSON.parse(taxon_json);
    if (taxon_list && taxon_list.length) {
      let taxa = taxon_list.filter(function (x) { return typeof (x) !== "string" }); //filter out the headers, return a view
      let otts = taxa.map(function (item) { return item.OTT }).join(",")
      //must make an API call to add vernaculars to each item before processing
      api_manager.otts2vns({
        data: {
          otts: otts,
          prefer_short: 1, //return bespoke short names first (could be more inaccurate)
          include_unpreferred: 1
        },
        success: function (xhr) {
          //if there is not a matching language name, add from the returned value
          for (let i = 0; i < taxa.length; i++) {
            //pick the most precise user-specified name, then the 2-letter user-specified name, then any blank key
            //and if non of those exist, use the vernacular returned in the correct language by the API (if present)
            //since taxa is a filtered view into the taxon_list array, adding to one of them here should change taxon_list too
            taxa[i].vernacular = taxa[i][xhr.lang] || taxa[i][xhr.lang.split('-', 1)] || taxa[i][""] || xhr[taxa[i].OTT.toString()]
          }
          //call the main processing function
          api_manager.get_ids_by_ott_array({
            data: {
              ott_array: otts
            },
            success: function (xhr) {
              let res = populate_data_repo_id_ott_map(xhr);
              let ott_id_map = res[0];
              let scinames = res[1];
              for (let i = 0; i < taxon_list.length; i++) {
                if (typeof (taxon_list[i]) === "string") {
                  if (typeof header_callback === "function") {
                      header_callback(taxon_list[i]);
                  }
                } else {
                  if (typeof taxon_callback === "function") {
                      let ott = taxon_list[i].OTT.toString();
                      taxon_callback(ott, taxon_list[i].vernacular, scinames[ott], ott_id_map[ott]);
                  }
                }
              }
              if (typeof completed_callback === "function") {
                completed_callback();
              }
            }
          })
        }
      })
    }
  }
}

function populate_data_repo_id_ott_map(xhr) {
  let ott_id_map = {};
  for (let ott in xhr.leaves) {
    if (xhr.leaves.hasOwnProperty(ott)) {
      ott_id_map[ott] = -xhr.leaves[ott];
      data_repo.ott_id_map[ott] = -xhr.leaves[ott];
      data_repo.id_ott_map[-xhr.leaves[ott]] = ott;
    }
  }
  for (let ott in xhr.nodes) {
    if (xhr.nodes.hasOwnProperty(ott)) {
      ott_id_map[ott] = xhr.nodes[ott];
      data_repo.ott_id_map[ott] = xhr.nodes[ott];
      data_repo.id_ott_map[xhr.nodes[ott]] = ott;
    }
  }
  return [ott_id_map, xhr.names];
}


