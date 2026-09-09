export const TOURSTOP_PHASES = ['transitionIn', 'active', 'transitionOut'] as const;
export type TourstopPhase = typeof TOURSTOP_PHASES[number];

export interface PhaseSelection {
    transitionIn: boolean;
    active: boolean;
    transitionOut: boolean;
}

export const PHASE_TOGGLE_OPTIONS: { phase: TourstopPhase; label: string }[] = [
    { phase: 'transitionIn', label: 'Transition in' },
    { phase: 'active', label: 'Active' },
    { phase: 'transitionOut', label: 'Transition out' },
];

export function togglePhase(selection: PhaseSelection, phase: TourstopPhase): PhaseSelection {
    return { ...selection, [phase]: !selection[phase] };
}

export function invertPhases(selection: PhaseSelection): PhaseSelection {
    const inverted = { ...selection };
    for (const phase of TOURSTOP_PHASES) {
        inverted[phase] = !selection[phase];
    }
    return inverted;
}
