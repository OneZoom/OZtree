import api_manager from '../api/api_manager';
import data_repo from '../factory/data_repo';

/**
 * Convert a pinpoint (or list of pinpoints) into a list of leaf/node OZids
 *
 * A pinpoint is a string representing a location on the tree, most obviously used in URLs, it can be of the form:
 * ``12345``: Where 12345 is an OTT
 * ``@name``: Where name is a latin name
 * ``@name=12345``: Where name is a latin name, 12345 an OTT
 * ``@=12345``: Where 12345 is an OTT
 * ``@2040``: Where 2040 is a leaf / node OZid
 * If required, API lookups will be made to fill in an gaps in local knowledge.
 *
 * @param pinpoint_or_pinpoints A pinpoint string or list of pinpoint strings
 * @return {Promise} Resolves to an OZid or list of OZids, depending on what was handed in
 */
export function resolve_pinpoints(pinpoint_or_pinpoints) {
  let pinpoints = Array.isArray(pinpoint_or_pinpoints) ? pinpoint_or_pinpoints : [pinpoint_or_pinpoints];
  let lookups = [];

  // Turn pinpoint strings into objects of parts
  pinpoints = pinpoints.map((pinpoint) => {
    let out = { pinpoint: pinpoint };

    // Doesn't start with @? Treat as OTT & return early
    if (typeof pinpoint !== 'string' || !pinpoint.startsWith('@')) {
      out['ott'] = parseInt(pinpoint)
      return out
    }
    pinpoint = pinpoint.substring(1);

    let parts = pinpoint.split("=");
    if (parts.length === 1) {
      if (isNaN(parseInt(parts[0]))) {
        out.latin_name = parts[0];
      } else {
        out.ozid = parseInt(parts[0]);
      }
    } else if (parts[0].length > 0) {
      out.latin_name = parts[0];
    }
    if (parts.length > 1 && !isNaN(parseInt(parts[1]))) out.ott = parseInt(parts[1]);

    return out;
  });

  // Try local lookups first using data_repo
  pinpoints.forEach((p) => {
      p.ozid = p.ozid || data_repo.ott_id_map[p.ott] || data_repo.name_id_map[p.latin_name];
  })

  // Make a separate API call for each node without an ID, fill in details
  return Promise.all(pinpoints.filter((p) => !p.ozid).map((p) => new Promise(function(resolve, reject) {
    let data = {}
    if (p.ott) data.ott = p.ott
    if (p.latin_name) data.name = p.latin_name
    api_manager.search_init({
      data: data,
      success: function (res) {
        if (res.ids && res.ids.length) {
          if (p.ott) {
            data_repo.ott_id_map[p.ott] = res.ids[0]
            data_repo.id_ott_map[res.ids[0]] = p.ott
          }
          p.ozid = res.ids[0]
          resolve(p);
        } else {
          reject();
        }
      },
      error: function (res) {
        reject(res);
      }
    });
  }))).then(function () {
    // Assume modifications were done in-place, return array / first-item matching input
    return Array.isArray(pinpoint_or_pinpoints) ? pinpoints : pinpoints[0];
  });
}

/**
  * Return a pinpoint string pointing at (node)
  */
export function node_to_pinpoint(node) {
  if (!node.ott && !node.latin_name) return '@' + node.id
  return [
    "@",
    node.latin_name ? node.latin_name.split(" ").join("_") : "",
    node.ott ? "=" + node.ott : "",
  ].join("")
}
