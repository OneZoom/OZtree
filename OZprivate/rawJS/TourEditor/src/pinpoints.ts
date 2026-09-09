import type { Pinpoint, TreeNode } from './types';

/**
 * Get a stable OTT-based pinpoint that can be stored in the tours system.
 * Returns null if no OTT-based pinpoint can be found.
 */
export function nodeToOTTPinpoint(node: TreeNode): Pinpoint | null {
    const pinpoint = window.onezoom.utils.node_to_pinpoint(node);
    return hasOtt(pinpoint) ? pinpoint : null;
}

function hasOtt(pinpoint: Pinpoint | null): pinpoint is Pinpoint {
    return !!pinpoint && /=\d/.test(pinpoint) && !pinpoint.startsWith('@_ozid=');
}
