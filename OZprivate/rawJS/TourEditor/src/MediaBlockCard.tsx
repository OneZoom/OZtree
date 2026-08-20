import { useEffect, useState, type ReactNode } from 'react';
import UkIcon from './UkIcon';
import {
    TOURS_URL_BASE,
    mediaBlockFromFields,
    mediaBlockToUrl,
    mediaBlockWithKind,
    mediaBlockWithYoutubeTimes,
    mediaPreview,
    optionalYoutubeSeconds,
    parseMediaUrl,
    parseMediaUrlAsKind,
    type MediaPreview,
    MEDIA_KIND_OPTIONS
} from './media';
import { useNodeImageSelection } from './treeSelection';
import type {
    EditorAudioUrlMedia,
    EditorExternalLinkMedia,
    EditorImageUrlMedia,
    EditorMediaBlock,
    EditorMediaKind,
    EditorOneZoomImageMedia,
    EditorToursMedia,
    EditorVimeoMedia,
    EditorWikimediaMedia,
    EditorYoutubeMedia,
} from './types';



interface MediaBlockCardProps {
    block: EditorMediaBlock;
    onChange: (block: EditorMediaBlock) => void;
    onRemove: () => void;
    canMoveUp: boolean;
    onMoveUp: () => void;
    canMoveDown: boolean;
    onMoveDown: () => void;
}

interface KindCardProps<T extends EditorMediaBlock> {
    block: T;
    onChange: (block: EditorMediaBlock) => void;
}

export default function MediaBlockCard({
    block,
    onChange,
    onRemove,
    canMoveUp,
    onMoveUp,
    canMoveDown,
    onMoveDown,
}: MediaBlockCardProps) {
    const canonicalUrl = mediaBlockToUrl(block);
    const [urlDraft, setUrlDraft] = useState<string | null>(null);
    const urlValue = urlDraft ?? canonicalUrl;

    useEffect(() => {
        setUrlDraft(null);
    }, [block.id, block.kind]);

    const onUrlChange = (value: string) => {
        setUrlDraft(value);
        if (!value.trim()) {
            onChange(mediaBlockFromFields(parseMediaUrlAsKind('', block.kind), block.id));
            return;
        }
        const parsed = parseMediaUrl(value);
        if (parsed) onChange(mediaBlockFromFields(parsed, block.id));
    };

    return (
        <div className="uk-card uk-card-small uk-card-default uk-margin-small">
            <div className="uk-card-body">
                <input
                    className="uk-input uk-form-small"
                    type="text"
                    value={urlValue}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onBlur={() => setUrlDraft(null)}
                    placeholder="Paste a URL"
                    aria-label="Media URL"
                />
                <KindFields block={block} onChange={onChange} />
                <div className="tour-editor-media-preview">
                    <MediaPreviewView preview={mediaPreview(block)} />
                </div>
                <div className="tour-editor-item-actions uk-flex-right uk-margin-small-top">
                    <button
                        className="uk-button uk-button-small uk-button-default uk-margin-small-right"
                        title="Move down"
                        type="button"
                        disabled={!canMoveDown}
                        onClick={onMoveDown}
                    >
                        <UkIcon icon="chevron-down" />
                    </button>
                    <button
                        className="uk-button uk-button-small uk-button-default uk-margin-small-right"
                        title="Move up"
                        type="button"
                        disabled={!canMoveUp}
                        onClick={onMoveUp}
                    >
                        <UkIcon icon="chevron-up" />
                    </button>
                    <button
                        className="uk-button uk-button-small uk-button-danger"
                        title="Remove media"
                        type="button"
                        onClick={onRemove}
                    >
                        <UkIcon icon="close" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function KindFields({
    block,
    onChange,
}: {
    block: EditorMediaBlock;
    onChange: (block: EditorMediaBlock) => void;
}) {
    switch (block.kind) {
        case 'onezoom':
            return <OneZoomMediaBlockCard block={block} onChange={onChange} />;
        case 'youtube':
            return <YoutubeMediaBlockCard block={block} onChange={onChange} />;
        case 'vimeo':
            return <VimeoMediaBlockCard block={block} onChange={onChange} />;
        case 'wikimedia':
            return <WikimediaMediaBlockCard block={block} onChange={onChange} />;
        case 'tours':
            return <ToursMediaBlockCard block={block} onChange={onChange} />;
        case 'image':
            return <ImageMediaBlockCard block={block} onChange={onChange} />;
        case 'audio':
            return <AudioMediaBlockCard block={block} onChange={onChange} />;
        case 'link':
            return <LinkMediaBlockCard block={block} onChange={onChange} />;
    }
}

function OneZoomMediaBlockCard({ block, onChange }: KindCardProps<EditorOneZoomImageMedia>) {
    const { active, setActive } = useNodeImageSelection((src, srcId) => {
        onChange({ ...block, src, srcId });
    });
    const chosen = block.src && block.srcId ? `${block.src}:${block.srcId}` : '';
    return (
        <MediaKindRow block={block} onChange={onChange}>
            <button
                className={`uk-button uk-button-small ${active ? 'uk-button-primary' : 'uk-button-default'}`}
                type="button"
                onClick={() => setActive(!active)}
                aria-label={active ? 'Click a node' : chosen || 'None chosen'}
            >
                {active ? 'Click a node' : chosen || (
                    <span className="uk-text-muted">None chosen</span>
                )}
            </button>
        </MediaKindRow>
    );
}

function YoutubeMediaBlockCard({ block, onChange }: KindCardProps<EditorYoutubeMedia>) {
    const onVideoIdChange = (value: string) => {
        const parsed = parseMediaUrl(value);
        if (parsed?.kind === 'youtube') {
            onChange(mediaBlockFromFields(parsed, block.id));
            return;
        }
        onChange({ ...block, videoId: value });
    };

    return (
        <>
            <MediaKindRow block={block} onChange={onChange}>
                <input
                    className="uk-input uk-form-small"
                    type="text"
                    value={block.videoId}
                    onChange={(e) => onVideoIdChange(e.target.value)}
                    placeholder="Video ID"
                    aria-label="YouTube video ID"
                />
            </MediaKindRow>
            <YoutubeTimesRow block={block} onChange={onChange} />
        </>
    );
}

function VimeoMediaBlockCard({ block, onChange }: KindCardProps<EditorVimeoMedia>) {
    const onVideoIdChange = (value: string) => {
        const parsed = parseMediaUrl(value);
        if (parsed?.kind === 'vimeo') {
            onChange(mediaBlockFromFields(parsed, block.id));
            return;
        }
        onChange({ ...block, videoId: value });
    };

    return (
        <MediaKindRow block={block} onChange={onChange}>
            <input
                className="uk-input uk-form-small"
                type="text"
                value={block.videoId}
                onChange={(e) => onVideoIdChange(e.target.value)}
                placeholder="Video ID"
                aria-label="Vimeo video ID"
            />
        </MediaKindRow>
    );
}

function WikimediaMediaBlockCard({ block, onChange }: KindCardProps<EditorWikimediaMedia>) {
    const onFilenameChange = (value: string) => {
        const parsed = parseMediaUrl(value);
        if (parsed?.kind === 'wikimedia') {
            onChange(mediaBlockFromFields(parsed, block.id));
            return;
        }
        onChange({ ...block, filename: value.replace(/^File:/, '') });
    };

    return (
        <>
            <MediaKindRow block={block} onChange={onChange}>
                <input
                    className="uk-input uk-form-small"
                    type="text"
                    value={block.filename}
                    onChange={(e) => onFilenameChange(e.target.value)}
                    placeholder="Filename"
                    aria-label="Wikimedia filename"
                />
            </MediaKindRow>
            <p className="uk-text-small uk-margin-small-top">
                <a
                    href="https://commons.wikimedia.org/wiki/Main_Page"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Browse on Wikimedia Commons
                </a>
            </p>
        </>
    );
}

function ToursMediaBlockCard({ block, onChange }: KindCardProps<EditorToursMedia>) {
    const onPathChange = (value: string) => {
        const parsed = parseMediaUrl(value);
        if (parsed?.kind === 'tours') {
            onChange(mediaBlockFromFields(parsed, block.id));
            return;
        }
        onChange({
            ...block,
            path: value.startsWith(TOURS_URL_BASE) ? value.slice(TOURS_URL_BASE.length) : value.replace(/^\//, ''),
        });
    };

    return (
        <MediaKindRow block={block} onChange={onChange}>
            <input
                className="uk-input uk-form-small"
                type="text"
                value={block.path}
                onChange={(e) => onPathChange(e.target.value)}
                placeholder="Path"
                aria-label="Tours path"
            />
        </MediaKindRow>
    );
}

function ImageMediaBlockCard({ block, onChange }: KindCardProps<EditorImageUrlMedia>) {
    return <MediaKindRow block={block} onChange={onChange} />;
}

function AudioMediaBlockCard({ block, onChange }: KindCardProps<EditorAudioUrlMedia>) {
    return <MediaKindRow block={block} onChange={onChange} />;
}

function LinkMediaBlockCard({ block, onChange }: KindCardProps<EditorExternalLinkMedia>) {
    return <MediaKindRow block={block} onChange={onChange} />;
}

interface MediaKindSelectorProps {
    kind: EditorMediaKind;
    onKindChange: (kind: EditorMediaKind) => void;
}

export function MediaKindSelector({ kind, onKindChange }: MediaKindSelectorProps) {
    return (
        <select
            className="uk-select uk-form-small"
            value={kind}
            onChange={(e) => onKindChange(e.target.value as EditorMediaKind)}
            aria-label="Media type"
        >
            {MEDIA_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    );
}


function MediaKindRow({
    block,
    onChange,
    children,
}: KindCardProps<EditorMediaBlock> & { children?: ReactNode }) {
    return (
        <div className="tour-editor-media-row">
            <MediaKindSelector
                kind={block.kind}
                onKindChange={(kind) => onChange(mediaBlockWithKind(block, kind))}
            />
            {children}
        </div>
    );
}

function YoutubeTimesRow({
    block,
    onChange,
}: {
    block: EditorYoutubeMedia;
    onChange: (block: EditorYoutubeMedia) => void;
}) {
    const setTime = (field: 'start' | 'end', value: string) => {
        const seconds = optionalYoutubeSeconds(value);
        onChange(mediaBlockWithYoutubeTimes(
            block,
            field === 'start' ? seconds : block.start,
            field === 'end' ? seconds : block.end,
        ));
    };

    return (
        <div className="tour-editor-media-times">
            <label>
                <span>Start</span>
                <input
                    className="uk-input uk-form-small"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={block.start ?? ''}
                    onChange={(e) => setTime('start', e.target.value)}
                    aria-label="Start time in seconds"
                />
            </label>
            <label>
                <span>End</span>
                <input
                    className="uk-input uk-form-small"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={block.end ?? ''}
                    onChange={(e) => setTime('end', e.target.value)}
                    aria-label="End time in seconds"
                />
            </label>
            <span className="uk-text-muted">seconds</span>
        </div>
    );
}

function MediaPreviewView({ preview }: { preview: MediaPreview }) {
    switch (preview.type) {
        case 'image':
            return <img src={preview.src} alt="" />;
        case 'audio':
            return <audio controls src={preview.src} />;
        case 'video':
            return <video controls src={preview.src} />;
        case 'iframe':
            return (
                <iframe
                    key={preview.src}
                    src={preview.src}
                    title="YouTube player"
                    allow="autoplay; fullscreen; encrypted-media"
                    allowFullScreen
                />
            );
        case 'link':
            return <a href={preview.href} target="_blank" rel="noopener noreferrer">{preview.href}</a>;
        default:
            return null;
    }
}
