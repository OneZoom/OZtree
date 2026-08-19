import { useCallback, useState } from 'react';
import HighlightListEditor from './HighlightListEditor';
import LocationPicker from './LocationPicker';
import TextBlocks from './TextBlocks';
import TransitionFields from './TransitionFields';
import { useNodePinpointSelection } from './treeSelection';
import { useHighlightTreeSync } from './useHighlightTreeSync';
import type { EditorTourStop, LocationSelectionMode, Pinpoint } from './types';
import UkIcon from './UkIcon';

interface StopEditorProps {
    stop: EditorTourStop;
    onChange: (
        patch: Partial<EditorTourStop> | ((stop: EditorTourStop) => Partial<EditorTourStop>),
    ) => void;
    onPreview: () => void;
}

export default function StopEditor({ stop, onChange, onPreview }: StopEditorProps) {
    const [mode, setMode] = useState<LocationSelectionMode>({ kind: 'idle' });

    useHighlightTreeSync(stop.highlights, true, { clearOnDisable: true });

    const setIdle = useCallback(() => {
        setMode({ kind: 'idle' });
    }, []);

    const onPickLocation = useCallback((pinpoint: Pinpoint) => {
        onChange({ location: pinpoint });
        setIdle();
    }, [onChange, setIdle]);

    useNodePinpointSelection(mode.kind === 'location', onPickLocation);

    const startLocationPick = () => {
        if (mode.kind === 'location') {
            setIdle();
            return;
        }
        setMode({ kind: 'location' });
    };

    return (
        <div className="uk-form-stacked">
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="stop-title">Title</label>
                <input
                    id="stop-title"
                    className="uk-input"
                    type="text"
                    value={stop.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                />
            </div>

            <div className="tour-editor-section">
                <h4>Location</h4>
                <LocationPicker
                    location={stop.location}
                    isPicking={mode.kind === 'location'}
                    fillScreen={stop.fillScreen}
                    onStartPick={startLocationPick}
                    onFillScreenChange={(fillScreen) => onChange({ fillScreen })}
                />
            </div>

            <div className="tour-editor-section">
                <h4>Highlights</h4>
                <HighlightListEditor
                    highlights={stop.highlights}
                    onChange={(highlights) => onChange({ highlights })}
                    active={mode.kind !== 'location'}
                    onRequestActive={setIdle}
                    addButton="bottom"
                />
            </div>

            <div className="tour-editor-section">
                <h4>Text</h4>
                <TextBlocks
                    blocks={stop.textBlocks}
                    onChange={(textBlocks) => onChange({ textBlocks })}
                />
            </div>

            <div className="tour-editor-section">
                <h4>Transition</h4>
                <TransitionFields
                    transitionIn={stop.transitionIn}
                    flyInSpeed={stop.flyInSpeed}
                    autoAdvance={stop.autoAdvance}
                    stopWaitSeconds={stop.stopWaitSeconds}
                    onChange={onChange}
                />
            </div>

            <button
                className="uk-button uk-button-primary"
                type="button"
                onClick={onPreview}
            >
                <UkIcon icon="play" className="uk-margin-small-right" />
                Preview stop
            </button>
        </div>
    );
}
