import $ from 'jquery';
import config from '../global_config';

let waiting_queue = [];
let processing_requests = 0;
let abort_request_threshold = config.api.abort_request_threshold;
let MAX_CONCURRENT_REQUEST = config.api.max_concurrent_request;

/**
 * settimeout to abort request if it takes more than certain amount of time.
 * check waiting queue after any processing request complete
 */
let process = function(params) {
  processing_requests++;
  let method = params.method ? params.method : "get";
  $.ajax({
    url: params.url,
    method: method,
    data: params.data,
    success: params.success,
    timeout: abort_request_threshold,
    error: function(xhr, status, message) {
      if (status === "timeout" && !params.dont_resend) {
        waiting_queue.push(params);
      }
      if (typeof params.error === "function") {
        params.error();  
      }
    },
    complete: function() {
      processing_requests--;
      check_request_num_and_process();
    }
  });
}

let check_request_num_and_process = function() {    
  if (processing_requests >= MAX_CONCURRENT_REQUEST) return;
  else if (waiting_queue.length > 0) {
    let params = waiting_queue.shift();  //First in, first out order.
    process(params);
  }
}

/**
 * If waiting_queue's length > 0, then the current conccurent request must be at
 * its maximum allowed amount. 
 * abort_when_busy is set to true when the information you fetched is only useful
 * for the current app state. For example, node details is only useful for current
 * visible nodes because when user move the tree around, the visibles nodes set would
 * change and then the node details returned would not be used.
 */
let api_wrapper = function(params) {
  if (waiting_queue.length > 0 && params.abort_when_busy) {
    if (params.abort_callback) params.abort_callback();
    return;
  }
  waiting_queue.push(params);
  check_request_num_and_process();
} 

export default api_wrapper;