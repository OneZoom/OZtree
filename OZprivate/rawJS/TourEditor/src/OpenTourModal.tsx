import { useEffect, useRef, useState } from 'react';
import UkIcon from './UkIcon';
import { parseTourJsonString } from './parse';
import type { EditorTour } from './types';

interface OpenTourModalProps {
    onClose: () => void;
    onOpen: (tour: EditorTour) => void;
}

export default function OpenTourModal({ onClose, onOpen }: OpenTourModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [opening, setOpening] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const openFile = async (file: File) => {
        if (opening) return;
        setOpening(true);
        setError(null);
        try {
            const tour = parseTourJsonString(await file.text(), file.name);
            onOpen(tour);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not open this tour file.');
        } finally {
            setOpening(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div
            className="tour-open-modal uk-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-open-title"
        >
            <div className="tour-open-modal-overlay" onClick={onClose} />
            <div className="uk-modal-dialog uk-modal-body tour-open-modal-dialog">
                <button
                    className="uk-modal-close-default"
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                >
                    <UkIcon icon="close" />
                </button>
                <h2 id="tour-open-title" className="uk-modal-title uk-text-center">
                    Open tour from file
                </h2>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(event) => {
                        const selected = event.target.files?.[0];
                        if (selected) void openFile(selected);
                    }}
                />
                <p className="tour-open-warning">
                    <UkIcon icon="warning" className="tour-open-warning-icon" />
                    <span>
                        Only open tours from sources you trust. OneZoom has not reviewed
                        third-party tour content for safety, accuracy, or appropriateness.
                    </span>
                </p>
                {error && <p className="tour-open-error uk-text-danger">{error}</p>}
                <div className="tour-open-actions">
                    <button
                        className="oz-pill uk-button"
                        type="button"
                        disabled={opening}
                        onClick={() => inputRef.current?.click()}
                    >
                        Browse
                    </button>
                </div>
            </div>
        </div>
    );
}
