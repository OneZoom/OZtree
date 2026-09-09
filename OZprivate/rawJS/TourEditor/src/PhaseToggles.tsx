import React from 'react';
import type { PhaseSelection, TourstopPhase } from './phases';
import { PHASE_TOGGLE_OPTIONS, togglePhase } from './phases';

interface PhaseTogglesProps {
    value: PhaseSelection;
    onChange: (value: PhaseSelection) => void;
}

const ICONS: Record<TourstopPhase, React.ReactNode> = {
    transitionIn: "↘",
    active: "・",
    transitionOut: "↗",
};

export default function PhaseToggles({
    value,
    onChange,
}: PhaseTogglesProps) {
    return (
        <div className="tour-editor-phase-toggles" role="group" aria-label="Show during phases">
            {PHASE_TOGGLE_OPTIONS.map(({ phase, label }) => {
                const selected = value[phase];
                return (
                    <div
                        key={phase}
                        className={`tour-editor-phase-toggle${selected ? ' is-active' : ''}`}
                        aria-pressed={selected}
                        aria-label={`Show during ${label.toLowerCase()}`}
                        title={`Show during ${label.toLowerCase()}`}
                        onClick={() => onChange(togglePhase(value, phase))}
                    >
                        {ICONS[phase]}
                    </div>
                );
            })}
        </div>
    );
}
