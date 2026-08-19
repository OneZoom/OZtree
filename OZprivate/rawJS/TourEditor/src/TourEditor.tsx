import { useCallback, useEffect, useState } from 'react';
import StopEditor from './StopEditor';
import TourForm from './TourForm';
import UkIcon from './UkIcon';
import {
    createEmptyStop,
    createEmptyTour,
    moveItem,
    nextStopIdentifier,
    updateTourStop,
} from './tour';
import type { EditorTour, EditorTourStop } from './types';

interface TourEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle: () => void;
}

export default function TourEditor({ isOpen, onClose, onToggle }: TourEditorProps) {
    const [tour, setTour] = useState<EditorTour | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

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

    const selectedStop = tour?.stops.find((stop) => stop.id === selectedStopId) ?? null;

    const addStop = () => {
        setTour((current) => {
            if (!current) return current;
            const stop = createEmptyStop(nextStopIdentifier(current.stops));
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

    const headerTitle = selectedStop
        ? `Editing ${selectedStop.identifier}`
        : 'Edit Your Tour';

    return (
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
                            stops={tour.stops}
                            onChange={patchSelectedStop}
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
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
