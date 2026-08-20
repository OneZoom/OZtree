import HighlightCard, { PlaceholderHighlightCard } from './HighlightCard';
import UkIcon from './UkIcon';
import { createHighlightFromPinpoint, jumpToPinpoints, patchHighlight } from './highlights';
import { moveItem } from './tour';
import { useNodePinpointSelection } from './treeSelection';
import type { EditorHighlight } from './types';

interface HighlightListEditorProps {
    highlights: EditorHighlight[];
    onChange: (highlights: EditorHighlight[]) => void;
    addButton?: 'top' | 'bottom';
    showClearAll?: boolean;
}

export default function HighlightListEditor({
    highlights,
    onChange,
    addButton = 'bottom',
    showClearAll = false,
}: HighlightListEditorProps) {
    const { active: isAddingHighlight, setActive: setIsAddingHighlight } = useNodePinpointSelection((pinpoint) => {
        onChange([...highlights, createHighlightFromPinpoint(pinpoint)]);
        setIsAddingHighlight(false);
    });

    const addButtonEl = (
        <button
            id={addButton === 'top' ? 'toggle-add-highlight' : undefined}
            className={`uk-button ${addButton === 'top' ? 'uk-button-primary' : 'uk-button-default uk-margin-small-top'}`}
            type="button"
            disabled={isAddingHighlight}
            onClick={() => setIsAddingHighlight(true)}
        >
            {addButton === 'bottom' && (
                <UkIcon icon="plus" className="uk-margin-small-right" />
            )}
            Add highlight
        </button>
    );

    const list = (
        <>
            {highlights.length === 0 && !isAddingHighlight && (
                <p className="uk-text-muted">No highlights</p>
            )}
            {highlights.map((highlight, index) => (
                <HighlightCard
                    key={highlight.id}
                    highlight={highlight}
                    onChange={(patch) => onChange(patchHighlight(highlights, highlight.id, patch))}
                    onRemove={() => onChange(highlights.filter((item) => item.id !== highlight.id))}
                    onJump={() => jumpToPinpoints(highlight.pinpoints)}
                    canMoveUp={index > 0}
                    onMoveUp={() => onChange(moveItem(highlights, index, -1))}
                    canMoveDown={index < highlights.length - 1}
                    onMoveDown={() => onChange(moveItem(highlights, index, 1))}
                />
            ))}
            {isAddingHighlight && (
                <PlaceholderHighlightCard onCancel={() => setIsAddingHighlight(false)} />
            )}
        </>
    );

    return (
        <div>
            {addButton === 'top' && (
                <div className="uk-flex uk-flex-between uk-flex-wrap uk-margin-bottom">
                    {addButtonEl}
                    {showClearAll && (
                        <button
                            id="clear-all-highlights"
                            className="uk-button uk-button-secondary"
                            type="button"
                            disabled={highlights.length === 0}
                            onClick={() => onChange([])}
                        >
                            Clear All
                        </button>
                    )}
                </div>
            )}
            {list}
            {addButton === 'bottom' && addButtonEl}
        </div>
    );
}
