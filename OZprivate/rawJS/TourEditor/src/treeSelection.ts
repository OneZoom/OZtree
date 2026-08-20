import { useCallback, useEffect, useRef, useState } from 'react';
import { nodeToStablePinpoint } from './highlights';
import type { Pinpoint, TreeNode } from './types';

export type NodeSelection = {
    active: boolean;
    setActive: (active: boolean) => void;
};

/** Deactivate function of the instance that currently owns tree clicks. */
let activeDeactivate: (() => void) | null = null;

/**
 * Intercept tree node clicks while `active`. 
 * Always consumes the click so the tree does not navigate. 
 * Only one selection, the one that last called setActive(true) is active at a time.
 */
export function useNodeSelection(
    onNode: (node: TreeNode) => void,
    onActiveChanged?: (active: boolean) => void,
): NodeSelection {
    const [active, setActiveState] = useState(false);
    const onNodeRef = useRef(onNode);
    onNodeRef.current = onNode;
    const onActiveChangedRef = useRef(onActiveChanged);
    onActiveChangedRef.current = onActiveChanged;
    const activeRef = useRef(false);

    const applyActive = useCallback((next: boolean) => {
        if (activeRef.current === next) return;
        activeRef.current = next;
        setActiveState(next);
        onActiveChangedRef.current?.(next);
    }, []);

    const deactivate = useCallback(() => {
        applyActive(false);
    }, [applyActive]);

    const setActive = useCallback((next: boolean) => {
        if (next) {
            if (activeDeactivate && activeDeactivate !== deactivate) {
                // a different instance is currently active, steal it from them.
                activeDeactivate();
            }
            activeDeactivate = deactivate;
            applyActive(true);
            return;
        }
        if (activeDeactivate === deactivate) {
            activeDeactivate = null;
        }
        applyActive(false);
    }, [applyActive, deactivate]);

    useEffect(() => {
        if (!active) return undefined;

        const hookId = window.onezoom.add_hook('mouse_down_on_node', (node) => {
            onNodeRef.current(node);
            return false;
        });

        return () => window.onezoom.remove_hook('mouse_down_on_node', hookId);
    }, [active]);

    useEffect(() => () => {
        if (activeDeactivate === deactivate) {
            activeDeactivate = null;
        }
    }, [deactivate]);

    return { active, setActive };
}

/**
 * Intercept tree node clicks and report a stable pinpoint.
 * Does not know about tours, locations, or highlights.
 */
export function useNodePinpointSelection(
    onPick: (pinpoint: Pinpoint) => void,
    onActiveChanged?: (active: boolean) => void,
): NodeSelection {
    return useNodeSelection((node) => {
        const pinpoint = nodeToStablePinpoint(node);
        if (!pinpoint) {
            console.error('Failed to create stable pinpoint from node:', node);
            return;
        }
        onPick(pinpoint);
    }, onActiveChanged);
}

/**
 * Intercept tree node clicks and report that node's image.
 * Nodes with no image stay active so the user can click again.
 */
export function useNodeImageSelection(
    onPick: (src: number, srcId: number) => void,
): NodeSelection {
    const selection = useNodeSelection((node) => {
        const src = Number(node.pic_src);
        const srcId = Number(node.pic_filename);
        if (Number.isFinite(src) && src > 0 && Number.isFinite(srcId) && srcId > 0) {
            onPick(src, srcId);
            selection.setActive(false);
        }
    });
    return selection;
}
