import { useCallback, useEffect, useRef, useState } from 'react';
import HighlightCard, { PlaceholderHighlightCard } from './HighlightCard';
import UkIcon from './UkIcon';
import {
    applyHighlightTypeChange,
    createHighlightFromPinpoint,
    jumpToPinpoints,
    patchHighlight,
    pinpointsAfterEdit,
    removeFanExclusion,
} from './highlights';
import { moveItem } from './tour';
import { useNodePinpointSelection } from './treeSelection';
import type {
    EditorHighlight,
    HighlightSelectionMode,
    HighlightType,
    Pinpoint,
} from './types';

interface HighlightListEditorProps {
    highlights: EditorHighlight[];
    onChange: (highlights: EditorHighlight[]) => void;
    /** When false, tree clicks are not captured and selection returns to idle. */
    active: boolean;
    /** Called before entering a tree-pick mode so parent can avoid multiple active tree-pickers. */
    onRequestActive?: () => void;
    addButton?: 'top' | 'bottom';
    showClearAll?: boolean;
}

export default function HighlightListEditor({
    highlights,
    onChange,
    active,
    onRequestActive,
    addButton = 'bottom',
    showClearAll = false,
}: HighlightListEditorProps) {
    const [mode, setMode] = useState<HighlightSelectionMode>({ kind: 'idle' });
    const editGeneration = useRef(0);
    const highlightsRef = useRef(highlights);
    const modeRef = useRef(mode);
    highlightsRef.current = highlights;
    modeRef.current = mode;

    const setSelectionMode = useCallback((next: HighlightSelectionMode) => {
        editGeneration.current += 1;
        setMode(next);
    }, []);

    const setIdle = useCallback(() => {
        setSelectionMode({ kind: 'idle' });
    }, [setSelectionMode]);

    useEffect(() => {
        if (!active) {
            setIdle();
        }
    }, [active, setIdle]);

    const beginMode = (next: HighlightSelectionMode) => {
        onRequestActive?.();
        setSelectionMode(next);
    };

    const onPick = useCallback((pinpoint: Pinpoint) => {
        const currentMode = modeRef.current;
        if (currentMode.kind === 'add') {
            onChange([...highlightsRef.current, createHighlightFromPinpoint(pinpoint)]);
            setIdle();
            return;
        }
        if (currentMode.kind === 'edit') {
            const highlight = highlightsRef.current.find((h) => h.id === currentMode.highlightId);
            if (!highlight) {
                setIdle();
                return;
            }
            const generation = ++editGeneration.current;
            void pinpointsAfterEdit(highlight, currentMode.pinpoint, pinpoint).then((pinpoints) => {
                if (generation !== editGeneration.current) return;
                if (!pinpoints) return;
                onChange(patchHighlight(highlightsRef.current, currentMode.highlightId, () => ({ pinpoints })));
                setIdle();
            });
        }
    }, [onChange, setIdle]);

    useNodePinpointSelection(active && mode.kind !== 'idle', onPick);

    const toggleAddHighlight = () => {
        if (mode.kind === 'add') {
            setIdle();
            return;
        }
        beginMode({ kind: 'add' });
    };

    const togglePinpointEdit = (highlightId: string, pinpointIndex: number) => {
        if (
            mode.kind === 'edit'
            && mode.highlightId === highlightId
            && mode.pinpoint.type === 'existing'
            && mode.pinpoint.index === pinpointIndex
        ) {
            setIdle();
            return;
        }
        beginMode({
            kind: 'edit',
            highlightId,
            pinpoint: { type: 'existing', index: pinpointIndex },
        });
    };

    const editingPinpoint = mode.kind === 'edit' ? mode.pinpoint : null;
    const editingHighlightId = mode.kind === 'edit' ? mode.highlightId : null;

    const addButtonEl = (
        <button
            id={addButton === 'top' ? 'toggle-add-highlight' : undefined}
            className={`uk-button ${addButton === 'top' ? 'uk-button-primary' : 'uk-button-default uk-margin-small-top'}`}
            type="button"
            disabled={mode.kind === 'add'}
            onClick={toggleAddHighlight}
        >
            {addButton === 'bottom' && (
                <UkIcon icon="plus" className="uk-margin-small-right" />
            )}
            Add highlight
        </button>
    );

    const list = (
        <>
            {highlights.length === 0 && mode.kind !== 'add' && (
                <p className="uk-text-muted">No highlights</p>
            )}
            {highlights.map((highlight, index) => (
                <HighlightCard
                    key={highlight.id}
                    highlight={highlight}
                    isEditingHighlight={editingHighlightId === highlight.id}
                    editingPinpoint={editingHighlightId === highlight.id ? editingPinpoint : null}
                    onTypeChange={(newType: HighlightType) => onChange(patchHighlight(
                        highlights,
                        highlight.id,
                        (h) => applyHighlightTypeChange(h, newType),
                    ))}
                    onColorChange={(newColor) => onChange(patchHighlight(highlights, highlight.id, { color: newColor }))}
                    onRemove={() => onChange(highlights.filter((h) => h.id !== highlight.id))}
                    onJump={() => jumpToPinpoints(highlight.pinpoints)}
                    canMoveUp={index > 0}
                    onMoveUp={() => onChange(moveItem(highlights, index, -1))}
                    canMoveDown={index < highlights.length - 1}
                    onMoveDown={() => onChange(moveItem(highlights, index, 1))}
                    onTogglePinpointEdit={(pinpointIndex) => togglePinpointEdit(highlight.id, pinpointIndex)}
                    onAddExclusion={() => beginMode({
                        kind: 'edit',
                        highlightId: highlight.id,
                        pinpoint: { type: 'append' },
                    })}
                    onRemoveExclusion={(exclusionIndex) => onChange(patchHighlight(
                        highlights,
                        highlight.id,
                        (h) => removeFanExclusion(h, exclusionIndex),
                    ))}
                />
            ))}
            {mode.kind === 'add' && (
                <PlaceholderHighlightCard onCancel={setIdle} />
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
