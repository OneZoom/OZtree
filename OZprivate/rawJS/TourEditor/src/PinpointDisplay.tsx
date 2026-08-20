import { useRef } from 'react';
import UkIcon from './UkIcon';
import { pinpointsAfterEdit } from './highlights';
import { useNodePinpointSelection, type NodeSelection } from './treeSelection';
import type { EditingPinpointRef, EditorHighlight, Pinpoint } from './types';

/**
 * Tree picking that stays active until cancelled or `onCommit` succeeds
 */
function useCommitPinpoint(
    onCommit: (picked: Pinpoint) => Promise<boolean>,
): NodeSelection {
    const generation = useRef(0);
    const selection = useNodePinpointSelection((picked) => {
        const g = ++generation.current;
        void onCommit(picked).then((ok) => {
            if (g !== generation.current) return;
            if (ok) selection.setActive(false);
        });
    }, (isActive) => {
        if (!isActive) generation.current += 1;
    });
    return selection;
}

function PinpointLabel({
    pinpoint,
    title,
    onCommit,
}: {
    pinpoint: Pinpoint;
    title: string;
    onCommit: (picked: Pinpoint) => Promise<boolean>;
}) {
    const { active, setActive } = useCommitPinpoint(onCommit);
    const className = `pinpoint-clickable${active ? ' pinpoint-editing' : ''}`;
    return (
        <span className={className} title={title} onClick={() => setActive(!active)}>
            {active ? 'Click a node' : pinpoint}
        </span>
    );
}

function AddExclusionButton({
    onCommit,
}: {
    onCommit: (picked: Pinpoint) => Promise<boolean>;
}) {
    const { active, setActive } = useCommitPinpoint(onCommit);
    if (active) {
        return (
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
        );
    }
    return (
        <div>
            <button
                className="uk-button uk-button-small uk-button-default uk-margin-small-top add-exclusion-btn"
                title="Add exclusion"
                type="button"
                onClick={() => setActive(true)}
            >
                <UkIcon icon="ban" ratio={0.6} className="uk-margin-small-right" /> Add Exclusion
            </button>
        </div>
    );
}

interface PinpointDisplayProps {
    highlight: EditorHighlight;
    onChange: (pinpoints: Pinpoint[]) => void;
}

export default function PinpointDisplay({ highlight, onChange }: PinpointDisplayProps) {
    const pinpointList = highlight.pinpoints;
    const commit = (editing: EditingPinpointRef) => async (picked: Pinpoint) => {
        const next = await pinpointsAfterEdit(highlight, editing, picked);
        if (!next) return false;
        onChange(next);
        return true;
    };

    if (pinpointList.length === 0) {
        return 'No pinpoints';
    }

    let body = null;

    if (highlight.type === 'fan') {
        const exclusions = pinpointList.slice(1);
        body = (
            <>
                <PinpointLabel
                    pinpoint={pinpointList[0]}
                    title="Click to change"
                    onCommit={commit({ type: 'existing', index: 0 })}
                />
                {exclusions.length > 0 && (
                    <>
                        <br />
                        <div className="exclusions-section">
                            <small className="uk-text-muted">Exclusions:</small>
                            <br />
                            {exclusions.map((exclusion, idx) => {
                                const exclusionIndex = idx + 1;
                                return (
                                    <span key={`${exclusion}-${exclusionIndex}`}>
                                        <span className="exclusion-item">
                                            <PinpointLabel
                                                pinpoint={exclusion}
                                                title="Click to change exclusion"
                                                onCommit={commit({ type: 'existing', index: exclusionIndex })}
                                            />
                                            <span
                                                className="remove-exclusion-btn"
                                                title="Remove exclusion"
                                                onClick={() => onChange(
                                                    highlight.pinpoints.filter((_, i) => i !== exclusionIndex),
                                                )}
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
                <AddExclusionButton onCommit={commit({ type: 'append' })} />
            </>
        );
    } else if (highlight.type === 'path') {
        body = pinpointList.map((pinpoint, idx) => (
            <span key={`${pinpoint}-${idx}`}>
                {idx > 0 ? ' → ' : null}
                <PinpointLabel
                    pinpoint={pinpoint}
                    title={`Click to change ${idx === 0 ? 'start' : 'end'}`}
                    onCommit={commit({ type: 'existing', index: idx })}
                />
            </span>
        ));
    }

    return <>{body}</>;
}
