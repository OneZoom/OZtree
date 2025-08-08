import fakeFetch from './util_fake_fetch';
import dataStoreAPI from '../src/data_store/api.js';

/**
 * Return the DataStoreAPI, ensuring environment can do fake fetches
 */
export function getDataStoreAPI(test, injectClasses = []) {
  if (!global.window) global.window = { setTimeout: setTimeout };
  if (!global.window.fetch) window.fetch = fakeFetch();

  injectClasses.forEach((cls) => {
    dataStoreAPI.inject(cls);
  });

  return dataStoreAPI;
};
