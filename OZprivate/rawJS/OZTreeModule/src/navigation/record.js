import { tree_current_state_obj } from './setup_page';
import { get_largest_visible_node } from './utils';
import { parse_state, deparse_state } from './state';
import config from '../global_config';

let timer = null;

function record_url_delayed(controller, options, force) {
  clearTimeout(timer);
  timer = setTimeout(record_url.bind(this, controller, options, force), 300);
}

/**
 * Record current position into url. 
 * Record the following information into url:
 * 1. current pin node: find the largest visble node with ott, then store in following format: @latin_name(if exist)=ott
 * 2. querystring arguments: [default settings] + vis, cols, lang, popup type and popup ott: ?vis=spiral&popup=ott
 * 3. exact position: #x=1,y=2,w=2.333
 * Besides record url, also change document title if find a node with name.
 * Only record url if current pin node is the different from previous pin node or popup dialog close or open.
 * Also do not record file:/// links (not allowed for security reasons)
 * @param {Object} options It could contain the following properties:
 * record_popup: Contents of global_button_action, if a popup window should be open
 */
function record_url(controller, options, force) {
  clearTimeout(timer);

  if (config.disable_record_url) {
    // In an embedded view, e.g. Don't modify the page URL
    return;
  }

  options = options || {};
  let current_state = tree_current_state_obj(controller, {record_popup: options.record_popup});
  // No OTT found to anchor the URL on, don't record
  if (!current_state.pinpoint) return

  if (current_view_near_previous_view(current_state) && !(force)) {
    return;
  } else if (window.location.protocol != "file:") {
    if (options.replaceURL) {
      window.history.replaceState(null, "", deparse_state(current_state).href);
    } else {
      window.history.pushState(null, "", deparse_state(current_state).href);
    }
    document.title = unescape(get_title(controller));
  }
}

/**
 * @return {boolean} return true if all of the following condition meet:
 * -- current view pinpoint node has same ott as previous view's pinpoint node.
 * -- both view has no popup window or both view have the same popup window (same means its context are based on same ott)
 */
function current_view_near_previous_view(current_state) {
  let previous_state = parse_state(window.location);
  if (current_state === null && previous_state !== null) return false;
  else if (current_state !== null && previous_state === null) return false;
  else if (current_state === null && previous_state === null) return true;
  else if (current_state.vis_type !== previous_state.vis_type) return false;
  else if (current_state.pinpoint === previous_state.pinpoint) {
    //If no tap window open and position not changed a lot, do not record current position into history.
    if (!current_state.tap_action && !previous_state.tap_action) return true;
    //If opened tap is same as previous, do not record current position into history.
    if (current_state.tap_action && previous_state.tap_action && (JSON.stringify(current_state.tap_action) === JSON.stringify(previous_state.tap_action))) return true;
  }
  return false;
}

function get_title(controller) {
  let node_with_name = get_largest_visible_node(controller.root, (node) => !!(node.cname || node.latin_name));

  if (!node_with_name) return config.title_func();
  if (node_with_name.cname) return config.title_func(node_with_name.cname);
  return config.title_func(node_with_name.latin_name);
}

export { record_url_delayed, record_url };