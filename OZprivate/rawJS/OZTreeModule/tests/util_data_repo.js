var jsdom = require('jsdom');

import node_details_fruit_bat from './util_data_repo.node_details.fruit_bat.js';

import data_repo from '../src/factory/data_repo';

/**
  * Return promise that data_repo is setup and ready to query
  * @param tree_serial String The postfix for files in static/FinalOutputs/data/
  */
export function populate_data_repo(tree_serial = '25589581') {
  return new Promise((resolve) => {
    // NB: We use JSDOM because the generated files don't export their contents, so wouldn't
    //     be accessible if we require()d them.
    const vdom = new jsdom.JSDOM(`<body>
       <!-- rawData, metadata -->
       <script src="completetree_${tree_serial}.js" type="text/javascript"></script>
       <!-- cut_position_map_json_str, polytomy_cut_position_map_json_str, cut_thresholdcut_threshold -->
       <script src="cut_position_map_${tree_serial}.js" type="text/javascript"></script>
       <!-- tree_date -->
       <script src="dates_${tree_serial}.js" type="text/javascript"></script>
    </body>`, {
      resources: 'usable',
      runScripts: 'dangerously',
      url: `file:${__dirname}/../../../../static/FinalOutputs/data/moo.html`,
    });

    vdom.window.onload = function () {
      // When JSDOM is ready, files should be loaded. Import their contents
      data_repo.setup({
        raw_data: this.rawData,
        cut_map: JSON.parse(this.cut_position_map_json_str),
        poly_cut_map: JSON.parse(this.polytomy_cut_position_map_json_str),
        metadata: this.metadata,
        cut_threshold: this.cut_threshold,
        tree_date: this.tree_date,
      });

      // Add some dummy data so we can look up some IDs / OTTs, captured output from node_details
      data_repo.update_metadata(node_details_fruit_bat);
      // NB: We also mark these nodes as detail_fetched in util_factory

      resolve(data_repo);
    }
  });
}

/**
  * Find an OZid that matches given conditions
  */
export function get_ozid({leaf = false, node = false, nonexistant = false}) {
  var candidates = Object.keys(data_repo.id_ott_map);

  if (nonexistant) candidates = [999999999, -999999999]
  if (leaf) candidates = candidates.filter((x) => x < 0)
  if (node) candidates = candidates.filter((x) => x >= 0)

  return parseInt(candidates[Math.floor(Math.random() * (candidates.length - 1))]);
}
