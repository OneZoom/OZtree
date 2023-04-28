/* A function that takes in a list of headers and OTT/names and maps two callback functions onto the list,
 * one for a header line and one for a taxon line */

import config from '../global_config';
import { resolve_pinpoints } from '../navigation/pinpoint.js';

/**
 * Takes an list of headings & ott/name entries and applies the callback to each one in turn. This is mainly used for populating
 * the popular species menu, but is kept general so it can be used for a variety of other purposes.
 * @param {String} taxon_json - a JSON string specifying an array, each item of which is a string (treated as a header) or an object containing
 * an 'OTT' property and any number of optional text labels to use, keyed by language. For example taxon_list could be 
 * ['header text',{'OTT':1234,'en':'name to use},{...]
 * @param {Function} taxon_callback - the 1-param UI function [f(result)] to call on a header string, e.g. adding it to a list, result is a compile_searchbox_data() structure
 * @param {Function} header_callback - the 1-param UI function [f(label)] to call on a header string, e.g. adding it to a list
 * @param {Function} completed_callback - a function [f()] to call once the taxa have been processed and the data_repo filled
 */
export default function process_taxon_list(taxon_json, taxon_callback, header_callback, completed_callback) {
  let taxon_list = JSON.parse(taxon_json || '[]');
  let lang = config.lang || 'en';
  if (!taxon_list || !taxon_list.length) return;

  let taxa = taxon_list.filter(function (x) { return typeof (x) !== "string" }); //filter out the headers, return a view
  return resolve_pinpoints(taxa.map((t) => t.OTT), { sciname: 'y', vn: 'short:unpreferred' }).then((pps) => {
    // Update taxa with results of pp search
    pps.forEach((p, i) => {
      Object.assign(taxa[i], p);

      //pick the most precise user-specified name, then the 2-letter user-specified name, then any blank key
      //and if non of those exist, use the vernacular returned in the correct language by the API (if present)
      //since taxa is a filtered view into the taxon_list array, adding to one of them here should change taxon_list too
      taxa[i].vernacular = taxa[i][lang] || taxa[i][lang.split('-', 1)] || taxa[i][""] || p.vn
    });

    taxon_list.forEach((taxon) => {
      if (typeof taxon === "string") {
        if (typeof header_callback === "function") header_callback(taxon);
        return;
      }
      if (typeof taxon_callback === "function") {
        // Recreate a compile_searchbox_data() format
        let result = [
          taxon.vernacular,
          taxon.sciname,
          taxon.ozid,
        ];
        result.pinpoint = taxon.pinpoint;
        taxon_callback(taxon.ott, result);
      }
    });
  }).then(completed_callback || ((x) => x));
}
