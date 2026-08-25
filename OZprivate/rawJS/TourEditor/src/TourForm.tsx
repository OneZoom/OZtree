import MediaBlockCard from './MediaBlockCard';
import UkIcon from './UkIcon';
import { isThumbnailMedia, THUMBNAIL_MEDIA_KINDS } from './media';
import { LICENSE_OPTIONS, sanitizePartialTourIdentifier, sanitizeTourIdentifier, tourFileSlug } from './tour';
import type { EditorTour, TourLicense } from './types';
import StopList from './StopList';

interface TourFormProps {
    tour: EditorTour;
    onChange: (patch: Partial<EditorTour>) => void;
    onEditStop: (stopId: string) => void;
    onAddStop: () => void;
    onRemoveStop: (stopId: string) => void;
    onMoveStop: (stopId: string, direction: number) => void;
    onPreview: () => void;
    onOpenFile: () => void;
    onDownloadFile: () => void;
}

export default function TourForm({
    tour,
    onChange,
    onEditStop,
    onAddStop,
    onRemoveStop,
    onMoveStop,
    onPreview,
    onOpenFile,
    onDownloadFile,
}: TourFormProps) {
    return (
        <div className="uk-form-stacked">
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="tour-title">Title</label>
                <input
                    id="tour-title"
                    className="uk-input"
                    type="text"
                    value={tour.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                />
            </div>
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="tour-identifier">Identifier</label>
                <input
                    id="tour-identifier"
                    className="uk-input"
                    type="text"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    pattern="[a-z0-9_]*"
                    title="Lowercase letters, numbers, and underscores"
                    value={tour.identifier}
                    placeholder={tour.identifier ? undefined : tourFileSlug(tour)}
                    onChange={(e) => onChange({ identifier: sanitizePartialTourIdentifier(e.target.value) })}
                    onBlur={() => onChange({ identifier: sanitizeTourIdentifier(tour.identifier) })}
                />
            </div>
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="tour-description">Description</label>
                <textarea
                    id="tour-description"
                    className="uk-textarea"
                    rows={4}
                    value={tour.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                />
            </div>
            <div className="uk-margin">
                <div className="uk-form-label">Thumbnail</div>
                <MediaBlockCard
                    block={tour.thumbnail}
                    kinds={THUMBNAIL_MEDIA_KINDS}
                    onChange={(block) => {
                        if (isThumbnailMedia(block)) onChange({ thumbnail: block });
                    }}
                />
            </div>
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="tour-author">Author</label>
                <input
                    id="tour-author"
                    className="uk-input"
                    type="text"
                    value={tour.author}
                    onChange={(e) => onChange({ author: e.target.value })}
                />
            </div>
            <div className="uk-margin">
                <label className="uk-form-label" htmlFor="tour-license">License</label>
                <select
                    id="tour-license"
                    className="uk-select"
                    value={tour.license}
                    onChange={(e) => onChange({ license: e.target.value as TourLicense })}
                >
                    {LICENSE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>

            <div className="tour-editor-section">
                <h4>Stops</h4>
                <StopList
                    stops={tour.stops}
                    onEdit={onEditStop}
                    onRemove={onRemoveStop}
                    onMove={onMoveStop}
                />
                <button
                    className="uk-button uk-button-default uk-margin-small-top"
                    type="button"
                    onClick={onAddStop}
                >
                    <UkIcon icon="plus" className="uk-margin-small-right" />
                    Add stop
                </button>
                <button
                    className="uk-button uk-button-primary uk-margin-small-top uk-margin-small-left"
                    type="button"
                    disabled={tour.stops.length === 0}
                    title={tour.stops.length === 0 ? 'Add a stop to preview' : 'Preview tour'}
                    onClick={onPreview}
                >
                    <UkIcon icon="play" className="uk-margin-small-right" />
                    Preview tour
                </button>
            </div>
            <div className="uk-margin">
                <button
                    className="uk-button uk-button-default"
                    type="button"
                    onClick={onOpenFile}
                >
                    <UkIcon icon="upload" className="uk-margin-small-right" />
                    Open file
                </button>
                <button
                    className="uk-button uk-button-default uk-margin-small-left"
                    type="button"
                    onClick={onDownloadFile}
                >
                    <UkIcon icon="download" className="uk-margin-small-right" />
                    Download file
                </button>
            </div>
        </div>
    );
}
