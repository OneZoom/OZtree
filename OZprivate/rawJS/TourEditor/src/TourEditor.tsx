import { useCallback, useEffect, useState } from 'react';
import OpenTourModal from './OpenTourModal';
import StopEditor from './StopEditor';
import TourForm from './TourForm';
import UkIcon from './UkIcon';
import { editorTourToJson, tourJsonFilename, tourJsonString, tourJsonToHtml } from './compile';
import {
    createEmptyStop,
    createEmptyTour,
    moveItem,
    updateTourStop,
} from './tour';
import type { EditorTour, EditorTourStop } from './types';

interface TourEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onOpen: () => void;
    onToggle: () => void;
}

type PendingPreview = { stopId?: string };

function playEditorTour(
    tour: EditorTour,
    startStopId: string | undefined,
    onComplete: () => void,
): Promise<void> {
    const html = tourJsonToHtml(editorTourToJson(tour));
    const index = startStopId
        ? tour.stops.findIndex((stop) => stop.id === startStopId)
        : 0;
    const started = window.onezoom.controller.tour_start(document.createTextNode(html), {
        on_complete: onComplete,
    });
    return Promise.resolve(started).then(() => {
        // start() already plays stop 0; jumping to 0 would restart it as a leap.
        if (index > 0) {
            window.onezoom.controller.tour_goto_stop(index);
        }
    });
}

export default function TourEditor({ isOpen, onClose, onOpen, onToggle }: TourEditorProps) {
    const [tour, setTour] = useState<EditorTour | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
    const [openFileModal, setOpenFileModal] = useState(false);

    const closePanel = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        window.tourEditor = { togglePanel: onToggle };
        return () => {
            window.tourEditor = { togglePanel: () => {} };
        };
    }, [onToggle]);

    useEffect(() => {
        if (isOpen) {
            setTour((current) => current ?? createEmptyTour());
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen || !pendingPreview || !tour) return;
        /** The panel is closed so e.g. highlight sync is now unmounted. Play any pending preview. */
        const { stopId } = pendingPreview;
        setPendingPreview(null);
        void playEditorTour(tour, stopId, onOpen);
    }, [isOpen, pendingPreview, tour, onOpen]);

    const selectedStop = tour?.stops.find((stop) => stop.id === selectedStopId) ?? null;

    const requestPreview = (stopId?: string) => {
        if (!tour || tour.stops.length === 0) return;
        setPendingPreview({ stopId });
        onClose();
    };

    const addStop = () => {
        setTour((current) => {
            if (!current) return current;
            const stop = createEmptyStop(current.stops);
            return { ...current, stops: [...current.stops, stop] };
        });
    };

    const removeStop = (stopId: string) => {
        setTour((current) => {
            if (!current) return current;
            return { ...current, stops: current.stops.filter((stop) => stop.id !== stopId) };
        });
        setSelectedStopId((current) => (current === stopId ? null : current));
    };

    const moveStop = (stopId: string, direction: number) => {
        setTour((current) => {
            if (!current) return current;
            const index = current.stops.findIndex((stop) => stop.id === stopId);
            return { ...current, stops: moveItem(current.stops, index, direction) };
        });
    };

    const patchSelectedStop = (
        patch: Partial<EditorTourStop> | ((stop: EditorTourStop) => Partial<EditorTourStop>),
    ) => {
        if (!selectedStopId) return;
        setTour((current) => (current ? updateTourStop(current, selectedStopId, patch) : current));
    };

    const downloadTour = () => {
        if (!tour) return;
        const blob = new Blob([tourJsonString(tour)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = tourJsonFilename(tour);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    const loadTour = (loaded: EditorTour) => {
        setTour(loaded);
        setSelectedStopId(null);
        setOpenFileModal(false);
    };

    const headerTitle = selectedStop
        ? `Editing ${selectedStop.title || selectedStop.identifier}`
        : 'Edit Your Tour';

    return (
        <>
            <div id="tour-editor" className={`tour-editor-panel${isOpen ? ' open' : ''}`}>
                <div className="tour-editor-panel-content">
                    <div className="tour-editor-panel-header">
                        {selectedStop && (
                            <button
                                className="tour-editor-back-btn"
                                type="button"
                                title="Back"
                                onClick={() => setSelectedStopId(null)}
                            >
                                <UkIcon icon="chevron-left" />
                            </button>
                        )}
                        <h3>{headerTitle}</h3>
                        <div className="tour-editor-header-actions">
                            <button
                                id="tour-editor-close"
                                className="tour-editor-close-btn"
                                type="button"
                                onClick={closePanel}
                            >
                                <UkIcon icon="close" />
                            </button>
                        </div>
                    </div>
                    <div className="tour-editor-panel-body">
                        {isOpen && tour && selectedStop && (
                            <StopEditor
                                stop={selectedStop}
                                onChange={patchSelectedStop}
                                onPreview={() => requestPreview(selectedStop.id)}
                            />
                        )}
                        {isOpen && tour && !selectedStop && (
                            <TourForm
                                tour={tour}
                                onChange={(patch) => setTour((current) => (current ? { ...current, ...patch } : current))}
                                onEditStop={setSelectedStopId}
                                onAddStop={addStop}
                                onRemoveStop={removeStop}
                                onMoveStop={moveStop}
                                onPreview={() => requestPreview()}
                                onOpenFile={() => setOpenFileModal(true)}
                                onDownloadFile={downloadTour}
                            />
                        )}
                    </div>
                </div>
            </div>
            {openFileModal && (
                <OpenTourModal
                    onClose={() => setOpenFileModal(false)}
                    onOpen={loadTour}
                />
            )}
        </>
    );
}
