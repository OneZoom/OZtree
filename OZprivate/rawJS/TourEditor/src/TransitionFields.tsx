import type { TransitionIn } from './types';

const TRANSITION_OPTIONS: { value: TransitionIn; label: string }[] = [
    { value: 'fly', label: 'Fly' },
    { value: 'leap', label: 'Jump' },
    { value: 'fly_straight', label: 'Fly straight' },
];

interface TransitionFieldsProps {
    transitionIn: TransitionIn;
    flyInSpeed: number;
    autoAdvance: boolean;
    stopWaitSeconds: number;
    onChange: (patch: {
        transitionIn?: TransitionIn;
        flyInSpeed?: number;
        autoAdvance?: boolean;
        stopWaitSeconds?: number;
    }) => void;
}

export default function TransitionFields({
    transitionIn,
    flyInSpeed,
    autoAdvance,
    stopWaitSeconds,
    onChange,
}: TransitionFieldsProps) {
    return (
        <div className="uk-form-stacked">
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="stop-transition">Type</label>
                <select
                    id="stop-transition"
                    className="uk-select"
                    value={transitionIn}
                    onChange={(e) => onChange({ transitionIn: e.target.value as TransitionIn })}
                >
                    {TRANSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="stop-fly-speed">
                    Flight speed
                    <span className="uk-text-muted uk-margin-small-left tour-editor-speed-value">{flyInSpeed.toFixed(1)}</span>
                </label>
                <input
                    id="stop-fly-speed"
                    className="uk-range"
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={flyInSpeed}
                    onChange={(e) => onChange({ flyInSpeed: Number(e.target.value) })}
                />
            </div>
            <div className="uk-margin">
                <label>
                    <input
                        className="uk-checkbox"
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(e) => onChange({ autoAdvance: e.target.checked })}
                    />
                    <span className="uk-margin-small-left">Auto-advance after:</span>
                </label>
                <input
                    className="uk-input uk-form-width-small uk-margin-small-left"
                    type="number"
                    min={0}
                    step={1}
                    disabled={!autoAdvance}
                    value={stopWaitSeconds}
                    onChange={(e) => onChange({ stopWaitSeconds: Number(e.target.value) })}
                    aria-label="Auto-advance seconds"
                />
                <span className="uk-text-muted uk-margin-small-left">seconds</span>
            </div>
        </div>
    );
}
