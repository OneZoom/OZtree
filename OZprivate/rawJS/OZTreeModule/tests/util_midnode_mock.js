// NB: midnode.js sits in an import cycle rooted at data_repo (data_repo -> tree_settings ->
// at_midnode -> midnode), so it has to be pulled in via data_repo to resolve
import '../src/factory/data_repo';
import Midnode from '../src/factory/midnode';

/**
 * The parts of Midnode a pre_calc / layout needs that aren't plain data, so a mock node
 * can be an object literal of only the values the test cares about
 */
const midnode_mock_proto = {};
for (const name of ['branch_restart', 'branch_point', 'branch_cubic', 'branch_start', 'branch_end']) {
  Object.defineProperty(
    midnode_mock_proto, name, Object.getOwnPropertyDescriptor(Midnode.prototype, name),
  );
}

/**
 * Make a mock node out of (props), e.g. mk_node({ richness_val: 0.3 })
 */
export function mk_node(props) {
  return Object.assign(Object.create(midnode_mock_proto), props);
}
