import { useEffect, useRef } from 'react';
import { nodeToStablePinpoint } from './highlights';
import type { Pinpoint } from './types';

/**
 * While ``active``, intercept tree node clicks and report a stable pinpoint.
 * Does not know about tours, locations, or highlights.
 */
export function useNodePinpointSelection(
    active: boolean,
    onPick: (pinpoint: Pinpoint) => void,
): void {
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    useEffect(() => {
        if (!active) return undefined;

        const hookId = window.onezoom.add_hook('mouse_down_on_node', (node) => {
            const pinpoint = nodeToStablePinpoint(node);
            if (!pinpoint) {
                console.error('Failed to create stable pinpoint from node:', node);
                return false;
            }
            onPickRef.current(pinpoint);
            return false;
        });

        return () => window.onezoom.remove_hook('mouse_down_on_node', hookId);
    }, [active]);
}
