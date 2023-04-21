import api_manager from '../api/api_manager';
import { get_factory } from '../factory/factory'
import data_repo from '../factory/data_repo';

/**
 * Convert a pinpoint (or list of pinpoints) into a list of leaf/node OZids
 *
 * A pinpoint is a string representing a location on the tree, most obviously used in URLs, it can be of the form:
 * ``12345``: Where 12345 is an OTT
 * ``@name``: Where name is a latin name
 * ``@name=12345``: Where name is a latin name, 12345 an OTT
 * ``@=12345``: Where 12345 is an OTT
 * ``@_ancestor=1234-6789``: Where 1234-6789 are OTTs
 * ``@_ozid=123456``: Where 123456 is an OZid / metacode
 * If required, API lookups will be made to fill in an gaps in local knowledge.
 *
 * @param pinpoint_or_pinpoints A pinpoint string or list of pinpoint strings
 * @return {Promise} Resolves to a pinpoint dict or list of pinpoint dicts, depending on what was handed in
 */
export function resolve_pinpoints(pinpoint_or_pinpoints) {
  let pinpoints = Array.isArray(pinpoint_or_pinpoints) ? pinpoint_or_pinpoints : [pinpoint_or_pinpoints];
  let extra_lookups = [];

  // Turn pinpoint strings into objects of parts
  pinpoints = pinpoints.map((pinpoint) => {
    let out = { pinpoint: pinpoint };

    // null/empty pinpoint is the root node
    if (!pinpoint) {
      out['ozid'] = 1;
      return out;
    }

    // Doesn't start with @? Treat as OTT & return early
    if (typeof pinpoint !== 'string' || !pinpoint.startsWith('@')) {
      out['ott'] = parseInt(pinpoint)
      return out
    }
    pinpoint = pinpoint.substring(1);

    let parts = pinpoint.split("=");
    if (parts.length === 1) {
      // NB: "@12345" used to be OZid. We've stopped doing that, but keep the NaN check
      //     so we don't interpret "@12345" as a latin_name
      if (isNaN(parseInt(parts[0]))) {
        out.latin_name = parts[0];
      }
    } else if (parts[0] === '_ozid') {
      // Raw OZID
      out.ozid = parseInt(parts[1], 10);
    } else if (parts[0] === '_ancestor') {
      // Common-ancestor lookup, add extra lookups to list of things to get
      out.sub_pinpoints = parts[1].split('-').map((sub_ott) => {
        let sub_pp = { pinpoint: sub_ott, ott: parseInt(sub_ott) };
        extra_lookups.push(sub_pp);
        return sub_pp;
      });
      // Temporary label so we don't try to lookup this node
      out.ozid = 'common_ancestor';
    } else {
      // Regular @[latin]=[OTT] form
      if (parts[0].length > 0) out.latin_name = parts[0];
      if (!isNaN(parseInt(parts[1]))) out.ott = parseInt(parts[1]);
    }

    return out;
  }).concat(extra_lookups);

  // Try local lookups first using data_repo
  pinpoints.forEach((p) => {
      p.ozid = p.ozid || data_repo.ott_id_map[p.ott] || data_repo.name_id_map[p.latin_name];
  })

  // Make a separate API call for each node without an ID, fill in details
  return Promise.all(pinpoints.filter((p) => !p.ozid && (p.ott || p.latin_name)).map((p) => new Promise(function(resolve, reject) {
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
          // If we can't get an ozid at this point, it's broken
          reject("Invalid pinpoint: " + p.pinpoint);
        }
      },
      error: function (res) {
        reject("Failed to talk to server: " + res);
      }
    });
  }))).then(function () {
    pinpoints.forEach((p) => {
      if (p.ozid === 'common_ancestor') {
        // For any common ancestors, look up their target node now their targets are identified
        // NB: Loading is wasteful, here, but OTOH it's what any user will immediately do
        p.ozid = (get_factory().dynamic_load_to_common_ancestor(p.sub_pinpoints.map((x) => x.ozid))).ozid;
      }
    });

    // Assume modifications were done in-place, return array / first-item matching input
    return Array.isArray(pinpoint_or_pinpoints) ? pinpoints.slice(0, pinpoint_or_pinpoints.length) : pinpoints[0];
  });
}

/**
  * Return a pinpoint string pointing at (node)
  */
export function node_to_pinpoint(node) {
  if (!node.ott && !node.latin_name) return null;
  return [
    "@",
    node.latin_name ? node.latin_name.split(" ").join("_") : "",
    node.ott ? "=" + node.ott : "",
  ].join("")
}
