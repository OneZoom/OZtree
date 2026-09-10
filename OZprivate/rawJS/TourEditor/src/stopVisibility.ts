/**
 * Map tourstop popup visibility to production ``template_data`` flags.
 */

import type { PhaseSelection } from './phases';

export const defaultStopVisibility: PhaseSelection = {
    transitionIn: false,
    active: true,
    transitionOut: false,
};

const VISIBLE_TRANSITION_IN = 'visible-transition_in';
const VISIBLE_TRANSITION_OUT = 'visible-transition_out';
const HIDDEN_ACTIVE_WAIT = 'hidden-active_wait';

export function parseStopVisibility(record: Record<string, unknown>): PhaseSelection {
    return {
        transitionIn: record[VISIBLE_TRANSITION_IN] === true,
        active: record[HIDDEN_ACTIVE_WAIT] !== true,
        transitionOut: record[VISIBLE_TRANSITION_OUT] === true,
    };
}

export function stopVisibilityFlags(selection: PhaseSelection): Record<string, true> {
    const flags: Record<string, true> = {};
    if (selection.transitionIn) flags[VISIBLE_TRANSITION_IN] = true;
    if (!selection.active) flags[HIDDEN_ACTIVE_WAIT] = true;
    if (selection.transitionOut) flags[VISIBLE_TRANSITION_OUT] = true;
    return flags;
}
