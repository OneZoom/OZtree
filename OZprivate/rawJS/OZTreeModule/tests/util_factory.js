import { get_factory, set_factory_midnode } from '../src/factory/factory'
import { populate_data_repo, get_ozid } from './util_data_repo'
import LifeMidnode from '../src/factory/life_midnode';

/**
 * Both populate the data_repo & init the factory object
 */
export function populate_factory() {
  return populate_data_repo().then(() => {
    let factory = get_factory();
    set_factory_midnode(LifeMidnode);
    factory.build_tree();
    return factory;
  });
}
