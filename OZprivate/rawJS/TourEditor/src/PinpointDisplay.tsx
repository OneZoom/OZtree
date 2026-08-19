import UkIcon from './UkIcon';
import type { EditingPinpointRef, EditorHighlight, Pinpoint } from './types';

interface PinpointLabelProps {
    pinpoint: Pinpoint;
    isEditing: boolean;
    title: string;
    onClick: () => void;
}

function PinpointLabel({ pinpoint, isEditing, title, onClick }: PinpointLabelProps) {
    const className = `pinpoint-clickable${isEditing ? ' pinpoint-editing' : ''}`;
    return (
        <span className={className} title={title} onClick={onClick}>
            {isEditing ? 'Click a node' : pinpoint}
        </span>
    );
}

interface PinpointDisplayProps {
    highlight: EditorHighlight;
    isEditingHighlight: boolean;
    editingPinpoint: EditingPinpointRef | null;
    onTogglePinpointEdit: (pinpointIndex: number) => void;
    onAddExclusion: () => void;
    onRemoveExclusion: (exclusionIndex: number) => void;
}

export default function PinpointDisplay({
    highlight,
    isEditingHighlight,
    editingPinpoint,
    onTogglePinpointEdit,
    onAddExclusion,
    onRemoveExclusion,
}: PinpointDisplayProps) {
    const pinpointList = highlight.pinpoints;
    const type = highlight.type;

    if (pinpointList.length === 0) {
        return 'No pinpoints';
    }

    let body = null;

    if (type === 'fan') {
        const isEditingFirstPinpoint = isEditingHighlight && editingPinpoint?.type === 'existing' && editingPinpoint.index === 0;
        const exclusions = pinpointList.slice(1);
        const isAddingExclusion = isEditingHighlight && editingPinpoint?.type === 'append';

        body = (
            <>
                <PinpointLabel
                    pinpoint={pinpointList[0]}
                    isEditing={isEditingFirstPinpoint}
                    title="Click to change"
                    onClick={() => onTogglePinpointEdit(0)}
                />
                {exclusions.length > 0 && (
                    <>
                        <br />
                        <div className="exclusions-section">
                            <small className="uk-text-muted">Exclusions:</small>
                            <br />
                            {exclusions.map((exclusion, idx) => {
                                const exclusionIndex = idx + 1;
                                const isEditingPinpoint = isEditingHighlight && editingPinpoint?.type === 'existing' && editingPinpoint.index === exclusionIndex;
                                return (
                                    <span key={`${exclusion}-${exclusionIndex}`}>
                                        <span className="exclusion-item">
                                            <PinpointLabel
                                                pinpoint={exclusion}
                                                isEditing={isEditingPinpoint}
                                                title="Click to change exclusion"
                                                onClick={() => onTogglePinpointEdit(exclusionIndex)}
                                            />
                                            <span
                                                className="remove-exclusion-btn"
                                                title="Remove exclusion"
                                                onClick={() => onRemoveExclusion(exclusionIndex)}
                                            >
                                                <UkIcon icon="close" />
                                            </span>
                                        </span>
                                        <br />
                                    </span>
                                );
                            })}
                        </div>
                    </>
                )}
                {isAddingExclusion ? (
                    <div>
                        <button
                            className="uk-button uk-button-small uk-button-primary uk-margin-small-top add-exclusion-btn"
                            title="Add exclusion"
                            disabled
                            type="button"
                        >
                            Click on tree to add exclusion
                        </button>
                    </div>
                ) : (
                    <div>
                        <button
                            className="uk-button uk-button-small uk-button-default uk-margin-small-top add-exclusion-btn"
                            title="Add exclusion"
                            type="button"
                            onClick={onAddExclusion}
                        >
                            <UkIcon icon="ban" ratio={0.6} className="uk-margin-small-right" /> Add Exclusion
                        </button>
                    </div>
                )}
            </>
        );
    } else if (type === 'path') {
        body = pinpointList.map((pinpoint, idx) => {
            const isEditingPinpoint = isEditingHighlight && editingPinpoint?.type === 'existing' && editingPinpoint.index === idx;
            return (
                <span key={`${pinpoint}-${idx}`}>
                    {idx > 0 ? ' → ' : null}
                    <PinpointLabel
                        pinpoint={pinpoint}
                        isEditing={isEditingPinpoint}
                        title={`Click to change ${idx === 0 ? 'start' : 'end'}`}
                        onClick={() => onTogglePinpointEdit(idx)}
                    />
                </span>
            );
        });
    }

    return <>{body}</>;
}
