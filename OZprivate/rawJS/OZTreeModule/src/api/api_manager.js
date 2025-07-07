import api_wrapper from './api_wrapper';
import node_details_api from './node_details';
import image_details_api from './image_details';
import * as visit_count_api from './visit_count';
import config from '../global_config';

/** Class to access the OneZoom web API, in which API requests are queued so that they do not overload the server. A single instance of the APImanager class should be present for each OneZoom application. The application should request any non-static content through that instance. 
*/
class APIManager {
  constructor() {
  }
  
  /** Set the urls that will be used when calling the API.
   *  @params {Object.<string, string>} server_urls - a set of urls for the OneZoom API. 
   * Names for each url can be one of 'search_api', 'search_sponsor_api',
   * 'node_details_api', 'pinpoints_api'
   */
  set_urls(server_urls) {
    for (let name in server_urls) {
      if (server_urls.hasOwnProperty(name) && config.api.hasOwnProperty(name)) {
        config.api[name] = server_urls[name];
      }
    }
  }
  
  /** Starts the API queue, collecting API requests and making intermittent API calls to 
   * record the places visited on the tree
   */
  start(controller) {
    visit_count_api.start(controller);
    node_details_api.start(controller);
    image_details_api.start(controller);
  }

  /**
   * Call the /API/pinpoints endpoint
   * @param pps Array of pinpoints to lookup
   * @param options /API/pinpoints querystring options
   * @return Promise of parsed result
   */
  pinpoints(pps, options={}) {
    return new Promise((resolve, reject) => {
      if (pps.length === 0) {
        // Don't bother the server if we have nothing to do
        resolve({ results: [] });
        return;
      }
      api_wrapper({
        method: 'get',
        url: config.api.pinpoints_api + '/' + pps.join("/"),
        data: options,
        success: resolve,
        error: (res) => reject("Failed to talk to server: " + res),
      })
    });
  }

  /**
   * Call /tour/list.json?tours=(tour_ids)
   * @param tour_ids Array of (string) tour identifiers
   * @return Promise of parsed result
   */
  tour_list(tour_ids) {
    return new Promise((resolve, reject) => {
      api_wrapper({
        method: 'get',
        url: config.api.tour_list_api,
        data: { tours: tour_ids.join(",") },
        success: resolve,
        error: (res) => reject("Failed to talk to server: " + res),
      });
    }).then((data) => data.tours);
  }

  /**
   * Call /tour/search.json?query=(searchString)
   * @return Promise of parsed result
   */
  tour_search(searchString) {
    return new Promise((resolve, reject) => {
      api_wrapper({
        method: 'get',
        url: config.api.tour_search_api,
        data: { query: searchString },
        success: resolve,
        error: (res) => reject("Failed to talk to server: " + res),
      });
    }).then((data) => data.results);
  }

  /**
   * @params {String} query
   */
  search(params) {
    params.url = config.api.search_api;
    if (params.url)
      api_wrapper(params);
    else
      alert('Something’s not quite right.' +
       '\n(search_api was not set in config.api).' +
       '\nPlease email mail@onezoom.org and let us know.')
  } 
  search_sponsor(params) {
    if (config.lang) params.data.lang = config.lang;
    params.url = config.api.search_sponsor_api;
    if (params.url)
      api_wrapper(params);
    else
      alert('Something’s not quite right.' +
       '\n(search_sponsor_api was not set in config.api).' +
       '\nPlease email mail@onezoom.org and let us know.')
  }
  node_detail(params) {
    //node_detail contains vernaculars, so we have to set the language if necessary
    if (config.lang) params.data.lang = config.lang;
    params.url = config.api.node_details_api;
    api_wrapper(params);
  }
}

let api_manager = new APIManager();
export default api_manager;