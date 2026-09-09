import React from 'react';
import type { PhaseSelection, TourstopPhase } from './phases';
import { PHASE_TOGGLE_OPTIONS, togglePhase } from './phases';

interface PhaseTogglesProps {
    value: PhaseSelection;
    onChange: (value: PhaseSelection) => void;
    disabledPhases?: PhaseSelection;
}

const ICONS: Record<TourstopPhase, React.ReactNode> = {
    transitionIn: "↘",
    active: "・",
    transitionOut: "↗",
};

export default function PhaseToggles({
    value,
    onChange,
    disabledPhases,
}: PhaseTogglesProps) {
    return (
        <div className="tour-editor-phase-toggles" role="group" aria-label="Show during phases">
            {PHASE_TOGGLE_OPTIONS.map(({ phase, label }) => {
                const selected = value[phase];
                const disabled = disabledPhases?.[phase] === true;
                const className = [
                    'tour-editor-phase-toggle',
                    selected ? 'is-active' : '',
                    disabled ? 'is-disabled' : '',
                ].filter(Boolean).join(' ');
                return (
                    <div
                        key={phase}
                        className={className}
                        aria-pressed={selected}
                        aria-disabled={disabled}
                        aria-label={`Show during ${label.toLowerCase()}`}
                        title={`Show during ${label.toLowerCase()}`}
                        onClick={disabled ? undefined : () => onChange(togglePhase(value, phase))}
                    >
                        {ICONS[phase]}
                    </div>
                );
            })}
        </div>
    );
}
