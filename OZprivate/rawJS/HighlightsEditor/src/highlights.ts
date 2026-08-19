import type {
    EditingPinpointRef,
    EditorHighlight,
    HighlightDetail,
    HighlightStr,
    HighlightType,
    Pinpoint,
    TreeNode,
    ValidationResult,
} from './types';
import { DEFAULT_HIGHLIGHT_COLOR, ROOT_PINPOINT } from './types';

export function newHighlightId(): string {
    return crypto.randomUUID();
}

export function getColorValue(colorStr: string | undefined): string {
    if (!colorStr) return DEFAULT_HIGHLIGHT_COLOR;
    if (colorStr.startsWith('rgb')) {
        const rgb = colorStr.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            return `#${rgb.map((x) => parseInt(x, 10).toString(16).padStart(2, '0')).join('')}`;
        }
    }
    return colorStr.startsWith('#') ? colorStr : DEFAULT_HIGHLIGHT_COLOR;
}

export function fromControllerDetail(detail: HighlightDetail): EditorHighlight {
    return {
        id: newHighlightId(),
        type: detail.type,
        color: getColorValue(detail.color),
        pinpoints: [...(detail.pinpoints || [])],
    };
}

export function toHighlightStr(highlight: EditorHighlight): HighlightStr {
    return `${highlight.type}:${highlight.color}${highlight.pinpoints.join('')}`;
}

export function nodeToStablePinpoint(node: TreeNode): Pinpoint | null {
    // For creating tours we specifically want a stable pinpoint.
    // Fail if we can't find one.
    const pinpoint = window.onezoom.utils.node_to_pinpoint(node);
    if (!pinpoint || pinpoint.startsWith('@_ozid=')) {
        return null;
    }
    return pinpoint;
}

export function createHighlightFromNode(node: TreeNode): EditorHighlight | null {
    const pinpoint = nodeToStablePinpoint(node);
    if (!pinpoint) {
        console.warn('Cannot create pinpoint for node:', node);
        return null;
    }
    return {
        id: newHighlightId(),
        type: 'fan',
        color: DEFAULT_HIGHLIGHT_COLOR,
        pinpoints: [pinpoint],
    };
}

export function updatePinpoints(
    highlight: EditorHighlight,
    editingPinpoint: EditingPinpointRef,
    newPinpoint: Pinpoint,
): Pinpoint[] {
    const { type, pinpoints } = highlight;

    if (editingPinpoint.type === 'append') {
        return [...pinpoints, newPinpoint];
    }

    const index = editingPinpoint.index;

    if (type === 'fan') {
        if (index === 0) {
            return [newPinpoint];
        }
        return pinpoints.map((p, i) => (i === index ? newPinpoint : p));
    }

    if (index === 0) {
        if (pinpoints.length === 1) {
            return [newPinpoint, pinpoints[0]];
        }
        return pinpoints.map((p, i) => (i === 0 ? newPinpoint : p));
    }
    if (pinpoints.length === 1) {
        return [newPinpoint];
    }
    return pinpoints.map((p, i) => (i === pinpoints.length - 1 ? newPinpoint : p));
}

export function pinpointsForTypeChange(pinpoints: Pinpoint[]): Pinpoint[] {
    return pinpoints.slice(0, 1);
}

export function swapPathEndpoints(pinpoints: Pinpoint[]): Pinpoint[] {
    if (pinpoints.length < 2) return pinpoints;
    const next = [...pinpoints];
    [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
    return next;
}

export function isAncestor(
    ancestorNode: { ozid: number } | undefined,
    descendantNode: { ozid: number } | undefined,
): boolean {
    if (!ancestorNode || !descendantNode || ancestorNode.ozid == null || descendantNode.ozid == null) {
        return false;
    }

    let node: TreeNode | null = window.onezoom.controller.root;
    while (node !== null && node.ozid !== ancestorNode.ozid) {
        const next_idx = node.child_index_towards(descendantNode.ozid);
        if (next_idx === null) {
            return false;
        }
        node = node.children?.[next_idx] ?? null;
    }
    return node !== null && node.child_index_towards(descendantNode.ozid) !== null;
}

/**
 * Check that subsequent pinpoints are descendants of the first pinpoint.
 */
export async function validateHighlightPinpoints(
    pinpointList: Pinpoint[],
    type: HighlightType,
): Promise<ValidationResult> {
    if (pinpointList.length < 2) {
        return { valid: true, shouldSwap: false };
    }

    const resolvedPinpoints = await window.onezoom.utils.resolve_pinpoints(pinpointList);
    if (!resolvedPinpoints || resolvedPinpoints.length < pinpointList.length) {
        return { valid: false, shouldSwap: false };
    }

    const startNode = resolvedPinpoints[0];
    const isPath = type === 'path' && pinpointList.length === 2;

    for (const node of resolvedPinpoints.slice(1)) {
        if (!isAncestor(startNode, node)) {
            return {
                valid: false,
                shouldSwap: isPath && isAncestor(node, startNode),
            };
        }
    }

    return { valid: true, shouldSwap: false };
}

/**
 * Pinpoints to commit after validation. Swaps path endpoints when needed.
 * Returns null when the pinpoints are invalid and cannot be repaired.
 */
export async function pinpointsToCommit(
    pinpoints: Pinpoint[],
    type: HighlightType,
): Promise<Pinpoint[] | null> {
    const { valid, shouldSwap } = await validateHighlightPinpoints(pinpoints, type);
    if (shouldSwap) return swapPathEndpoints(pinpoints);
    if (!valid) return null;
    return pinpoints;
}

export async function pinpointsAfterEdit(
    highlight: EditorHighlight,
    editingPinpoint: EditingPinpointRef,
    newPinpoint: Pinpoint,
): Promise<Pinpoint[] | null> {
    return pinpointsToCommit(
        updatePinpoints(highlight, editingPinpoint, newPinpoint),
        highlight.type,
    );
}

export function jumpToPinpoints(pinpoints: Pinpoint[]): void {
    if (pinpoints.length === 0) {
        console.warn('No pinpoints found in highlight');
        return;
    }

    for (const pinpoint of pinpoints) {
        // This is the root endpoint, added by default to single-pinpoint paths
        if (pinpoint !== ROOT_PINPOINT) {
            window.onezoom.utils.resolve_pinpoints([pinpoint]).then((resolved) => {
                if (resolved && resolved.length > 0) {
                    window.onezoom.controller.leap_to(resolved[0].ozid);
                }
            });
            return;
        }
    }
    window.onezoom.controller.leap_to(1);
}
