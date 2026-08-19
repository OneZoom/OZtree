import { useEffect, useState } from 'react';
import HighlightListEditor from './HighlightListEditor';
import UkIcon from './UkIcon';
import { toHighlightStr } from './highlights';
import { useHighlightTreeSync } from './useHighlightTreeSync';
import type { EditorHighlight } from './types';

interface HighlightsEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle: () => void;
}

export default function HighlightsEditor({ isOpen, onClose, onToggle }: HighlightsEditorProps) {
    const [highlights, setHighlights] = useState<EditorHighlight[]>([]);

    useEffect(() => {
        window.highlightsEditor = { togglePanel: onToggle };
        return () => {
            window.highlightsEditor = { togglePanel: () => {} };
        };
    }, [onToggle]);

    useHighlightTreeSync(highlights, isOpen);

    const urlParams = highlights.map((h) => `highlight=${toHighlightStr(h)}`).join('&');

    return (
        <div id="highlights-editor" className={`tour-editor-panel${isOpen ? ' open' : ''}`}>
            <div className="tour-editor-panel-content">
                <div className="tour-editor-panel-header">
                    <h3>Highlights Editor</h3>
                    <div className="tour-editor-header-actions">
                        <button
                            id="highlights-editor-close"
                            className="tour-editor-close-btn"
                            type="button"
                            onClick={onClose}
                        >
                            <UkIcon icon="close" />
                        </button>
                    </div>
                </div>
                <div className="tour-editor-panel-body">
                    <HighlightListEditor
                        highlights={highlights}
                        onChange={setHighlights}
                        active={isOpen}
                        addButton="top"
                        showClearAll
                    />
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
