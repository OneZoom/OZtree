import type { Pinpoint } from './types';

interface LocationPickerProps {
    location: Pinpoint | null;
    isPicking: boolean;
    fillScreen: boolean;
    onStartPick: () => void;
    onFillScreenChange: (fillScreen: boolean) => void;
}

export default function LocationPicker({
    location,
    isPicking,
    fillScreen,
    onStartPick,
    onFillScreenChange,
}: LocationPickerProps) {
    const label = isPicking || !location ? 'Click a node' : location;
    const className = `pinpoint-clickable${isPicking ? ' pinpoint-editing' : ''}`;

    return (
        <div>
            <div className="tour-editor-location-row">
                <span className={className} title="Click to change" onClick={onStartPick}>
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
