import HighlightListEditor from './HighlightListEditor';
import LocationPicker from './LocationPicker';
import TextBlocks from './TextBlocks';
import TransitionFields from './TransitionFields';
import { useHighlightTreeSync } from './useHighlightTreeSync';
import type { EditorTourStop } from './types';
import UkIcon from './UkIcon';

interface StopEditorProps {
    stop: EditorTourStop;
    onChange: (
        patch: Partial<EditorTourStop> | ((stop: EditorTourStop) => Partial<EditorTourStop>),
    ) => void;
    onPreview: () => void;
}

export default function StopEditor({ stop, onChange, onPreview }: StopEditorProps) {
    useHighlightTreeSync(stop.highlights, true, { clearOnDisable: true });

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
                    fillScreen={stop.fillScreen}
                    onChange={(location) => onChange({ location })}
                    onFillScreenChange={(fillScreen) => onChange({ fillScreen })}
                />
            </div>

            <div className="tour-editor-section">
                <h4>Highlights</h4>
                <HighlightListEditor
                    highlights={stop.highlights}
                    onChange={(highlights) => onChange({ highlights })}
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
