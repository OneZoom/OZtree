import PinpointDisplay from './PinpointDisplay';
import UkIcon from './UkIcon';
import type { EditorHighlight, EditingPinpointRef, HighlightType } from './types';

interface PlaceholderHighlightCardProps {
    onCancel: () => void;
}

export function PlaceholderHighlightCard({ onCancel }: PlaceholderHighlightCardProps) {
    return (
        <div className="uk-card uk-card-small uk-card-default uk-margin-small highlight-card">
            <div className="uk-card-body">
                <div className="uk-flex-column uk-flex-between uk-flex-middle">
                    <div className="uk-flex-1">
                        <div className="uk-flex uk-flex-middle uk-margin-small-bottom">
                            <select
                                className="uk-select uk-form-small uk-width-auto uk-margin-small-right"
                                disabled
                                style={{ width: 80 }}
                                defaultValue="fan"
                            >
                                <option value="fan">Fan</option>
                            </select>
                        </div>
                        <div className="uk-text-small uk-text-muted">
                            <span className="pinpoint-clickable pinpoint-editing" title="Click to change">
                                Click a node
                            </span>
                        </div>
                    </div>
                    <div className="uk-flex uk-flex-middle uk-margin-small-top">
                        <button
                            className="uk-button uk-button-small uk-button-danger uk-margin-small-right"
                            title="Remove highlight"
                            type="button"
                            onClick={onCancel}
                        >
                            <UkIcon icon="trash" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface HighlightCardProps {
    highlight: EditorHighlight;
    isEditingHighlight: boolean;
    editingPinpoint: EditingPinpointRef | null;
    onTypeChange: (newType: HighlightType) => void;
    onColorChange: (newColor: string) => void;
    onRemove: () => void;
    onJump: () => void;
    canMoveUp: boolean;
    onMoveUp: () => void;
    canMoveDown: boolean;
    onMoveDown: () => void;
    onTogglePinpointEdit: (pinpointIndex: number) => void;
    onAddExclusion: () => void;
    onRemoveExclusion: (exclusionIndex: number) => void;
}

export default function HighlightCard({
    highlight,
    isEditingHighlight,
    editingPinpoint,
    onTypeChange,
    onColorChange,
    onRemove,
    onJump,
    canMoveUp,
    onMoveUp,
    canMoveDown,
    onMoveDown,
    onTogglePinpointEdit,
    onAddExclusion,
    onRemoveExclusion,
}: HighlightCardProps) {
    return (
        <div className="uk-card uk-card-small uk-card-default uk-margin-small highlight-card">
            <div className="uk-card-body">
                <div className="uk-flex-column uk-flex-between uk-flex-middle">
                    <div className="uk-flex-1">
                        <div className="uk-flex uk-flex-middle uk-margin-small-bottom">
                            <select
                                className="uk-select uk-form-small uk-width-auto uk-margin-small-right"
                                style={{ width: 80 }}
                                value={highlight.type}
                                onChange={(e) => onTypeChange(e.target.value as HighlightType)}
                            >
                                <option value="fan">Fan</option>
                                <option value="path">Path</option>
                            </select>
                            <input
                                type="color"
                                className="uk-input uk-form-small uk-width-auto uk-margin-small-right"
                                value={highlight.color}
                                style={{ width: 40, height: 30, padding: 2 }}
                                onChange={(e) => onColorChange(e.target.value)}
                            />
                        </div>
                        <div className="uk-text-small uk-text-muted">
                            <PinpointDisplay
                                highlight={highlight}
                                isEditingHighlight={isEditingHighlight}
                                editingPinpoint={editingPinpoint}
                                onTogglePinpointEdit={onTogglePinpointEdit}
                                onAddExclusion={onAddExclusion}
                                onRemoveExclusion={onRemoveExclusion}
                            />
                        </div>
                    </div>
                    <div className="uk-flex uk-flex-middle uk-margin-small-top">
                        <button
                            className="uk-button uk-button-small uk-button-danger uk-margin-small-right"
                            title="Remove highlight"
                            type="button"
                            onClick={onRemove}
                        >
                            <UkIcon icon="trash" />
                        </button>
                        <button
                            className="uk-button uk-button-small uk-button-primary uk-margin-small-right"
                            title="Jump"
                            type="button"
                            onClick={onJump}
                        >
                            <UkIcon icon="crosshairs" />
                        </button>
                        <button
                            className="move-highlight-up-button uk-button uk-button-small uk-button-default uk-margin-small-right"
                            title="Move up"
                            type="button"
                            disabled={!canMoveUp}
                            onClick={onMoveUp}
                        >
                            <UkIcon icon="chevron-up" />
                        </button>
                        <button
                            className="move-highlight-down-button uk-button uk-button-small uk-button-default uk-margin-small-right"
                            title="Move down"
                            type="button"
                            disabled={!canMoveDown}
                            onClick={onMoveDown}
                        >
                            <UkIcon icon="chevron-down" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
