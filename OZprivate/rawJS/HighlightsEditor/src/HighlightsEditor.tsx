import { useCallback, useEffect, useRef, useState } from 'react';
import HighlightCard, { PlaceholderHighlightCard } from './HighlightCard';
import UkIcon from './UkIcon';
import {
    createHighlightFromNode,
    fromControllerDetail,
    jumpToPinpoints,
    nodeToStablePinpoint,
    pinpointsForTypeChange,
    swapPathEndpoints,
    toHighlightStr,
    updatePinpoints,
    validateHighlightPinpoints,
} from './highlights';
import type { EditingPinpointRef, EditorHighlight, HighlightType } from './types';

interface EditorSelectionState {
    isAddingHighlight: boolean;
    editingId: string | null;
    editingPinpoint: EditingPinpointRef | null;
}

function patchHighlight(
    highlights: EditorHighlight[],
    id: string,
    patch: (highlight: EditorHighlight) => Partial<EditorHighlight>,
): EditorHighlight[] {
    return highlights.map((h) => (h.id === id ? { ...h, ...patch(h) } : h));
}

export default function HighlightsEditor() {
    const [isOpen, setIsOpen] = useState(false);
    const [isAddingHighlight, setIsAddingHighlight] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingPinpoint, setEditingPinpoint] = useState<EditingPinpointRef | null>(null);
    const [highlights, setHighlights] = useState<EditorHighlight[]>(() =>
        window.onezoom.controller.highlight_detail().map(fromControllerDetail),
    );

    const skipNextWrite = useRef(true);
    const lastWritten = useRef<string[]>([]);
    const stateRef = useRef<EditorSelectionState>({
        isAddingHighlight: false,
        editingId: null,
        editingPinpoint: null,
    });
    stateRef.current = { isAddingHighlight, editingId, editingPinpoint };

    const stopAddAndEdit = useCallback(() => {
        setIsAddingHighlight(false);
        setEditingId(null);
        setEditingPinpoint(null);
    }, []);

    const closePanel = useCallback(() => {
        setIsOpen(false);
        stopAddAndEdit();
    }, [stopAddAndEdit]);

    const togglePanel = useCallback(() => {
        setIsOpen((open) => {
            if (open) {
                stopAddAndEdit();
            }
            return !open;
        });
    }, [stopAddAndEdit]);

    useEffect(() => {
        // Make the toggle function available
        window.highlightsEditor = { togglePanel };
        return () => {
            window.highlightsEditor = { togglePanel: () => {} };
        };
    }, [togglePanel]);

    useEffect(() => {
        // Write the highlights back to the controller.
        // This is one way, we don't read them back from the controller whilst the panel is open.
        const strs = highlights.map(toHighlightStr);
        if (skipNextWrite.current) {
            skipNextWrite.current = false;
            lastWritten.current = strs;
            return;
        }
        if (JSON.stringify(strs) === JSON.stringify(lastWritten.current)) {
            return;
        }
        lastWritten.current = strs;
        window.onezoom.controller.highlight_replace(strs);
    }, [highlights]);

    useEffect(() => {
        // Asychronoushly update the validity of the highlights
        let cancelled = false;
        highlights.forEach((h) => {
            validateHighlightPinpoints(h.pinpoints, h.type).then(({ valid, shouldSwap }) => {
                if (cancelled) return;
                if (shouldSwap) {
                    setHighlights((prev) => {
                        const current = prev.find((row) => row.id === h.id);
                        if (!current) return prev;
                        return patchHighlight(prev, h.id, () => ({
                            pinpoints: swapPathEndpoints(current.pinpoints),
                            invalid: false,
                        }));
                    });
                    return;
                }
                setHighlights((prev) => {
                    const current = prev.find((row) => row.id === h.id);
                    if (!current || current.invalid === !valid) return prev;
                    return patchHighlight(prev, h.id, () => ({ invalid: !valid }));
                });
            });
        });
        return () => {
            cancelled = true;
        };
    }, [highlights]);

    useEffect(() => {
        // handle clicking on a node when necessary
        const selecting = isAddingHighlight || (editingId != null && editingPinpoint != null);
        if (!selecting) return undefined;

        const hookId = window.onezoom.add_hook('mouse_down_on_node', (node) => {
            const { isAddingHighlight, editingId, editingPinpoint } = stateRef.current;
            if (editingId != null && editingPinpoint != null) {
                const newPinpoint = nodeToStablePinpoint(node);
                if (!newPinpoint) {
                    console.error('Failed to create stable pinpoint from node:', node);
                    alert('Failed to create pinpoint from selected node.');
                } else {
                    setHighlights((prev) => patchHighlight(prev, editingId, (h) => ({
                        pinpoints: updatePinpoints(h, editingPinpoint, newPinpoint),
                    })));
                }
            } else if (isAddingHighlight) {
                const created = createHighlightFromNode(node);
                if (created) {
                    setHighlights((prev) => [...prev, created]);
                }
            }
            stopAddAndEdit();
            return false;
        });

        return () => window.onezoom.remove_hook('mouse_down_on_node', hookId);
    }, [isAddingHighlight, editingId, editingPinpoint, stopAddAndEdit]);

    const toggleAddMode = () => {
        if (isAddingHighlight) {
            stopAddAndEdit();
        } else {
            setIsAddingHighlight(true);
        }
    };

    const clearAllHighlights = () => {
        setHighlights([]);
    };

    const removeHighlight = (highlightId: string) => {
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    };

    const moveHighlight = (highlightId: string, direction: number) => {
        setHighlights((prev) => {
            const currentIndex = prev.findIndex((h) => h.id === highlightId);
            const newIndex = currentIndex + direction;
            if (currentIndex < 0 || newIndex < 0 || newIndex >= prev.length) return prev;
            const next = [...prev];
            [next[currentIndex], next[newIndex]] = [next[newIndex], next[currentIndex]];
            return next;
        });
    };

    const updateHighlightColor = (highlightId: string, newColor: string) => {
        setHighlights((prev) => patchHighlight(prev, highlightId, () => ({ color: newColor })));
    };

    const updateHighlightType = (highlightId: string, newType: HighlightType) => {
        setHighlights((prev) => patchHighlight(prev, highlightId, (h) => ({
            type: newType,
            pinpoints: pinpointsForTypeChange(h.pinpoints),
        })));
    };

    const togglePinpointEdit = (highlightId: string, pinpointIndex: number) => {
        if (
            editingId === highlightId
            && editingPinpoint?.type === 'existing'
            && editingPinpoint.index === pinpointIndex
        ) {
            setEditingId(null);
            setEditingPinpoint(null);
            return;
        }
        setEditingId(highlightId);
        setEditingPinpoint({ type: 'existing', index: pinpointIndex });
    };

    const addExclusion = (highlightId: string) => {
        setEditingId(highlightId);
        setEditingPinpoint({ type: 'append' });
    };

    const removeExclusion = (highlightId: string, exclusionIndex: number) => {
        setHighlights((prev) => patchHighlight(prev, highlightId, (h) => {
            if (h.type !== 'fan' || exclusionIndex <= 0 || exclusionIndex >= h.pinpoints.length) {
                return {};
            }
            return { pinpoints: h.pinpoints.filter((_, i) => i !== exclusionIndex) };
        }));
    };

    const jumpToHighlight = (highlightId: string) => {
        const highlight = highlights.find((h) => h.id === highlightId);
        if (highlight) jumpToPinpoints(highlight.pinpoints);
    };

    const urlParams = highlights.map((h) => `highlight=${toHighlightStr(h)}`).join('&');

    return (
        <div id="highlights-editor" className={`highlights-panel${isOpen ? ' open' : ''}`}>
            <div className="highlights-panel-content">
                <div className="highlights-panel-header">
                    <h3>Highlights Editor</h3>
                    <button
                        id="highlights-editor-close"
                        className="highlights-close-btn"
                        type="button"
                        onClick={closePanel}
                    >
                        <UkIcon icon="close" />
                    </button>
                </div>

                <div className="highlights-panel-body">
                    <div className="highlights-controls">
                        <div className="uk-flex uk-flex-between uk-flex-wrap uk-margin-bottom">
                            <button
                                id="toggle-add-highlight"
                                className="uk-button uk-button-primary"
                                type="button"
                                disabled={isAddingHighlight}
                                onClick={toggleAddMode}
                            >
                                Add Highlight
                            </button>
                            <button
                                id="clear-all-highlights"
                                className="uk-button uk-button-secondary"
                                type="button"
                                disabled={highlights.length === 0}
                                onClick={clearAllHighlights}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div id="highlights-list" className="highlights-list">
                        {highlights.length === 0 && !isAddingHighlight && (
                            <p className="uk-text-muted">No highlights</p>
                        )}
                        {highlights.map((highlight, index) => (
                            <HighlightCard
                                key={highlight.id}
                                highlight={highlight}
                                isEditingHighlight={editingId === highlight.id}
                                editingPinpoint={editingPinpoint}
                                onTypeChange={(newType) => updateHighlightType(highlight.id, newType)}
                                onColorChange={(newColor) => updateHighlightColor(highlight.id, newColor)}
                                onRemove={() => removeHighlight(highlight.id)}
                                onJump={() => jumpToHighlight(highlight.id)}
                                canMoveUp={index > 0}
                                onMoveUp={() => moveHighlight(highlight.id, -1)}
                                canMoveDown={index < highlights.length - 1}
                                onMoveDown={() => moveHighlight(highlight.id, 1)}
                                onTogglePinpointEdit={(pinpointIndex) => togglePinpointEdit(highlight.id, pinpointIndex)}
                                onAddExclusion={() => addExclusion(highlight.id)}
                                onRemoveExclusion={(exclusionIndex) => removeExclusion(highlight.id, exclusionIndex)}
                            />
                        ))}
                        {isAddingHighlight && (
                            <PlaceholderHighlightCard onCancel={stopAddAndEdit} />
                        )}
                    </div>

                    {highlights.length > 0 && (
                        <div id="highlights-url-section" className="highlights-url-section">
                            <h5>URL Parameters</h5>
                            <div id="highlights-url" className="highlights-url-display">
                                <p className="uk-text-small">{urlParams}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
