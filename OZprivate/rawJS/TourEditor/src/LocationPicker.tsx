import { useNodePinpointSelection } from './treeSelection';
import type { Pinpoint } from './types';

interface LocationPickerProps {
    location: Pinpoint | null;
    fillScreen: boolean;
    onChange: (location: Pinpoint) => void;
    onFillScreenChange: (fillScreen: boolean) => void;
}

export default function LocationPicker({
    location,
    fillScreen,
    onChange,
    onFillScreenChange,
}: LocationPickerProps) {
    const { active, setActive } = useNodePinpointSelection((pinpoint) => {
        onChange(pinpoint);
        setActive(false);
    });
    const label = active || !location ? 'Click a node' : location;
    const className = `pinpoint-clickable${active ? ' pinpoint-editing' : ''}`;

    return (
        <div>
            <div className="tour-editor-location-row">
                <span className={className} title="Click to change" onClick={() => setActive(!active)}>
                    {label}
                </span>
            </div>
            <select
                className="uk-select uk-form-small uk-margin-small-top"
                aria-label="Camera framing"
                value={fillScreen ? 'fill' : 'surroundings'}
                onChange={(e) => onFillScreenChange(e.target.value === 'fill')}
            >
                <option value="surroundings">Show surroundings</option>
                <option value="fill">Fill screen</option>
            </select>
        </div>
    );
}
