/**
 * Map tourstop text/media visibility to production ``visible-*`` flags.
 *
 * Unlike the container ({@link ./stopVisibility.ts}), content is visible whenever its
 * parent is until any flag is set; then it is only visible in the flagged states.
 * ``hidden-active_wait`` does not apply here. ``visible-active_wait`` does.
 */

import { TOURSTOP_PHASES, type PhaseSelection } from './phases';
import { defaultStopVisibility } from './stopVisibility';

export const defaultContentVisibility: PhaseSelection = {
    transitionIn: true,
    active: true,
    transitionOut: true,
};

const VISIBLE_TRANSITION_IN = 'visible-transition_in';
const VISIBLE_ACTIVE_WAIT = 'visible-active_wait';
const VISIBLE_TRANSITION_OUT = 'visible-transition_out';

const CONTENT_VISIBILITY_CLASSES = [
    VISIBLE_TRANSITION_IN,
    VISIBLE_ACTIVE_WAIT,
    VISIBLE_TRANSITION_OUT,
] as const;

function coversContainer(content: PhaseSelection, container: PhaseSelection): boolean {
    return TOURSTOP_PHASES.every((phase) => !container[phase] || content[phase]);
}

export function parseContentVisibility(record: Record<string, unknown>): PhaseSelection {
    const hasFlag = CONTENT_VISIBILITY_CLASSES.some((name) => record[name] === true);
    if (!hasFlag) return { ...defaultContentVisibility };
    return {
        transitionIn: record[VISIBLE_TRANSITION_IN] === true,
        active: record[VISIBLE_ACTIVE_WAIT] === true,
        transitionOut: record[VISIBLE_TRANSITION_OUT] === true,
    };
}

/**
 * Production flags for a content block. Empty when the block is at least as
 * visible as ``container`` (the containing tourstop), so it can follow the parent.
 */
export function contentVisibilityFlags(
    selection: PhaseSelection,
    container: PhaseSelection = defaultStopVisibility,
): Record<string, true> {
    if (coversContainer(selection, container)) return {};
    const flags: Record<string, true> = {};
    if (selection.transitionIn) flags[VISIBLE_TRANSITION_IN] = true;
    if (selection.active) flags[VISIBLE_ACTIVE_WAIT] = true;
    if (selection.transitionOut) flags[VISIBLE_TRANSITION_OUT] = true;
    return flags;
}
