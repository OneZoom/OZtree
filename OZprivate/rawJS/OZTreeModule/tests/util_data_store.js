import fakeFetch from './util_fake_fetch';
import { setup_fake_window } from './util_dom';
import dataStoreAPI from '../src/data_store/api.js';

/**
 * Return the DataStoreAPI, ensuring environment can do fake fetches
 */
export function getDataStoreAPI(test, injectClasses = []) {
  setup_fake_window(test, { setTimeout: setTimeout, fetch: fakeFetch() });

  injectClasses.forEach((cls) => {
    dataStoreAPI.inject(cls);
  });

  return dataStoreAPI;
};
