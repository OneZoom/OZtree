import { useEffect, useRef, useState } from 'react';
import { editorTourToJson, tourPublish } from './compile';
import { tourFileSlug } from './tour';
import type { EditorTour } from './types';
import UkIcon from './UkIcon';

interface PublishTourModalProps {
    tour: EditorTour;
    onClose: () => void;
}

type PublishStatus =
    | { kind: 'confirm' }
    | { kind: 'loading' }
    | { kind: 'success'; prUrl: string }
    | { kind: 'error'; message: string };

export default function PublishTourModal({ tour, onClose }: PublishTourModalProps) {
    const [status, setStatus] = useState<PublishStatus>({ kind: 'confirm' });
    const submitting = useRef(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && status.kind !== 'loading') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, status.kind]);

    const submit = async () => {
        if (submitting.current) return;
        submitting.current = true;
        setStatus({ kind: 'loading' });
        try {
            const result = await tourPublish(editorTourToJson(tour), tourFileSlug(tour));
            setStatus({ kind: 'success', prUrl: result.pr_url });
        } catch (err) {
            setStatus({
                kind: 'error',
                message: err instanceof Error ? err.message : 'Could not publish this tour.',
            });
        }
    };

    const canDismiss = status.kind !== 'loading';
    const title =
        status.kind === 'success' ? 'Tour submitted'
            : status.kind === 'error' ? 'Could not publish'
                : 'Publish tour';

    return (
        <div
            className="tour-open-modal uk-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby={status.kind === 'loading' ? undefined : 'tour-publish-title'}
            aria-busy={status.kind === 'loading'}
        >
            <div
                className="tour-open-modal-overlay"
                onClick={canDismiss ? onClose : undefined}
            />
            <div className="uk-modal-dialog uk-modal-body tour-open-modal-dialog">
                {canDismiss && (
                    <button
                        className="uk-modal-close-default"
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <UkIcon icon="close" />
                    </button>
                )}
                {status.kind !== 'loading' && (
                    <h2 id="tour-publish-title" className="uk-modal-title uk-text-center">
                        {title}
                    </h2>
                )}
                {status.kind === 'loading' && (
                    <div className="tour-publish-loading" role="status" aria-label="Submitting tour">
                        <span className="tour-publish-spinner" aria-hidden="true" />
                    </div>
                )}
                {status.kind === 'confirm' && (
                    <>
                        <p className="tour-open-warning">
                            <UkIcon icon="info" className="tour-open-warning-icon" />
                            <span>
                                Your tour will be submitted for review by the OneZoom team.
                                If it is accepted, it will be added to the public tour library.
                            </span>
                        </p>
                        <div className="tour-open-actions">
                            <button
                                className="oz-pill uk-button"
                                type="button"
                                onClick={onClose}
                            >
                                Back
                            </button>
                            <button
                                className="oz-pill uk-button"
                                type="button"
                                onClick={() => void submit()}
                            >
                                Submit
                            </button>
                        </div>
                    </>
                )}
                {status.kind === 'error' && (
                    <>
                        <p className="tour-open-error uk-text-danger">{status.message}</p>
                        <div className="tour-open-actions">
                            <button
                                className="oz-pill uk-button"
                                type="button"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
                {status.kind === 'success' && (
                    <>
                        <p className="tour-publish-copy">
                            Your tour has been submitted as a GitHub pull request.
                            The OneZoom team reviews proposed tours there before they appear
                            on the tree. You can follow the review or add comments using
                            this link:
                        </p>
                        <p className="tour-publish-pr">
                            <a
                                href={status.prUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {status.prUrl}
                            </a>
                        </p>
                        <div className="tour-open-actions">
                            <button
                                className="oz-pill uk-button"
                                type="button"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
