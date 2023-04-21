import { get_factory, set_factory_midnode } from '../src/factory/factory'
import { populate_data_repo, get_ozid } from './util_data_repo'
import LifeMidnode from '../src/factory/life_midnode';

import node_details_fruit_bat from './util_data_repo.node_details.fruit_bat.js';

/**
 * Both populate the data_repo & init the factory object
 */
export function populate_factory() {
  return populate_data_repo().then(() => {
    let factory = get_factory();
    set_factory_midnode(LifeMidnode);
    factory.build_tree();

    // For everything in our sample dataset, mark as detail_fetched
    // This is generally done by api.node_details:update_nodes_details()
    node_details_fruit_bat.nodes.forEach((data) => {
      factory.dynamic_loading_by_metacode(data[0]).update_attribute();
    })
    node_details_fruit_bat.leaves.forEach((data) => {
      factory.dynamic_loading_by_metacode(-data[0]).update_attribute();
    })

    return factory;
  });
}
