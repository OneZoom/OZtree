import api_wrapper from './api_wrapper';
import tree_state from '../tree_state';
import config from '../global_config';

let visit_count_map = {
  detail_fetch_count: {},
  search_count: {},
  leaf_click_count: {},
  timer: null,
};

/**
 * @params {Number} ott
 */
function record_search_count(ott) {
  if (ott && !visit_count_map.search_count[ott]) {
    visit_count_map.search_count[ott] = true;
  }
}

/**
 * @params {Array} ott_array
 */
function record_detail_count(ott_array) {
  for (let i=0; i<ott_array.length; i++) {
    if (ott_array[i] && !visit_count_map.detail_fetch_count[ott_array[i]]) {
      visit_count_map.detail_fetch_count[ott_array[i]] = true;
    }
  }
}

/**
 * @params {Number} ott
 */ 
function record_click_count(ott) {
  if (ott && !visit_count_map.leaf_click_count[ott]) {
    visit_count_map.leaf_click_count[ott] = true;
  }
}

function start() {
  visit_count_map.interval = config.api.update_visit_count_interval, //increased from 2min to 4min to reduce potential database lock possiblity.
  visit_count_map.upload_num_threshold = config.api.update_visit_count_upload_num_threshold //Only upload if there are over this number of nodes in these count maps.
  reset_send_statistic();
}

function stop() {
  clearTimeout(visit_count_map.timer);
}

function send_statistic() {
  if (tree_state.canvas_repaint_recently === false) {
    do_real_send();
    reset_send_statistic();
  } else {
    reset_send_statistic();
  }
}

function reset_send_statistic(interval) {
  if (!interval) interval = visit_count_map.interval;
  clearTimeout(visit_count_map.timer);
  visit_count_map.timer = setTimeout(send_statistic, interval);
}

function do_real_send() {
  let api_hits = [], search_hits = [], leaf_click_count = [];
  for (let key in visit_count_map.detail_fetch_count) {
    if (visit_count_map.detail_fetch_count[key] === true) {
      api_hits.push(key.toString());
    }
  }
  
  for (let key in visit_count_map.search_count) {
    if (visit_count_map.search_count[key] === true) {
      search_hits.push(key.toString());
    }
  }
  
  for (let key in visit_count_map.leaf_click_count) {
    if (visit_count_map.leaf_click_count[key] === true) {
      leaf_click_count.push(key.toString());
    }
  }
  
  if ((api_hits.length + search_hits.length + leaf_click_count.length) <= visit_count_map.upload_num_threshold) return;
  let params = {
    url: config.api.update_visit_count_api,
    method: 'post',
    data: {
      api_hits: api_hits.join(","),
      search_hits: search_hits.join(","),
      leaf_click_count: leaf_click_count.join(",")
    },
    success: function(xhr) {
      for (let i=0; i<api_hits.length; i++) {
        let hit = api_hits[i];
        visit_count_map.detail_fetch_count[hit] = "uploaded";
      }
      
      for (let i=0; i<search_hits.length; i++) {
        let hit = search_hits[i];
        visit_count_map.search_count[hit] = "updated";
      }
      
      for (let i=0; i<leaf_click_count.length; i++) {
        let hit = leaf_click_count[i];
        visit_count_map.leaf_click_count[hit] = "updated";
      }
    }
  };
  api_wrapper(params);
}

export {start, stop, record_click_count, record_search_count, record_detail_count}
