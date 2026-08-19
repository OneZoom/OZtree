import UkIcon from './UkIcon';
import type { EditorTourStop } from './types';

interface StopListProps {
    stops: EditorTourStop[];
    onEdit: (stopId: string) => void;
    onRemove: (stopId: string) => void;
    onMove: (stopId: string, direction: number) => void;
}

export default function StopList({ stops, onEdit, onRemove, onMove }: StopListProps) {
    if (stops.length === 0) {
        return <p className="uk-text-muted">No stops yet</p>;
    }

    return (
        <div>
            {stops.map((stop, index) => (
                <div
                    key={stop.id}
                    className="uk-card uk-card-small uk-card-default uk-margin-small tour-editor-stop-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(stop.id)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEdit(stop.id);
                        }
                    }}
                >
                    <div className="uk-card-body">
                        <div className="tour-editor-stop-row">
                            <span className="tour-editor-stop-id">{stop.identifier}</span>
                            <div
                                className="tour-editor-stop-actions"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="uk-button uk-button-small uk-button-default uk-margin-small-right"
                                    title="Move up"
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => onMove(stop.id, -1)}
                                >
                                    <UkIcon icon="chevron-up" />
                                </button>
                                <button
                                    className="uk-button uk-button-small uk-button-default uk-margin-small-right"
                                    title="Move down"
                                    type="button"
                                    disabled={index === stops.length - 1}
                                    onClick={() => onMove(stop.id, 1)}
                                >
                                    <UkIcon icon="chevron-down" />
                                </button>
                                <button
                                    className="uk-button uk-button-small uk-button-primary uk-margin-small-right"
                                    title="Edit stop"
                                    type="button"
                                    onClick={() => onEdit(stop.id)}
                                >
                                    <UkIcon icon="pencil" />
                                </button>
                                <button
                                    className="uk-button uk-button-small uk-button-danger"
                                    title="Remove stop"
                                    type="button"
                                    onClick={() => onRemove(stop.id)}
                                >
                                    <UkIcon icon="trash" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
