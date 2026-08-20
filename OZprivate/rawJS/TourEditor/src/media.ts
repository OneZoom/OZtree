import { newEditorId } from './tour';
import type {
    EditorAudioUrlMedia,
    EditorExternalLinkMedia,
    EditorImageUrlMedia,
    EditorMediaBlock,
    EditorMediaBlockNoId,
    EditorMediaKind,
    EditorOneZoomImageMedia,
    EditorToursMedia,
    EditorVimeoMedia,
    EditorWikimediaMedia,
    EditorYoutubeMedia,
} from './types';

export const TOURS_URL_BASE = 'https://onezoom.github.io/tours/';
export const WIKIMEDIA_FILE_BASE = 'https://commons.wikimedia.org/wiki/File:';

export const MEDIA_KIND_OPTIONS: { value: EditorMediaKind; label: string }[] = [
    { value: 'onezoom', label: 'OneZoom Tree' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'vimeo', label: 'Vimeo' },
    { value: 'wikimedia', label: 'Wikimedia' },
    { value: 'tours', label: 'OneZoom tours' },
    { value: 'image', label: 'Image URL' },
    { value: 'audio', label: 'Audio URL' },
    { value: 'link', label: 'Link' },
];

export const IMAGE_EXT = 'gif|jpe?g|png|svg';
export const AUDIO_EXT = 'ogg|mp3';
export const VIDEO_EXT = 'ogv|webm|mpg|mpeg';
export const MEDIA_EXT = `${IMAGE_EXT}|${AUDIO_EXT}|${VIDEO_EXT}`;

export type MediaPreview =
    | { type: 'empty' }
    | { type: 'image'; src: string }
    | { type: 'audio'; src: string }
    | { type: 'video'; src: string }
    | { type: 'iframe'; src: string }
    | { type: 'link'; href: string };

export function createMediaBlock(kind: EditorMediaKind = 'image'): EditorMediaBlock {
    const id = newEditorId();
    switch (kind) {
        case 'onezoom':
            return { id, kind, src: 0, srcId: 0 };
        case 'youtube':
            return { id, kind, videoId: '' };
        case 'vimeo':
            return { id, kind, videoId: '' };
        case 'wikimedia':
            return { id, kind, filename: '' };
        case 'tours':
            return { id, kind, path: '' };
        case 'image':
            return { id, kind, url: '' };
        case 'audio':
            return { id, kind, url: '' };
        case 'link':
            return { id, kind, url: '' };
    }
}

export function mediaBlockToUrl(block: EditorMediaBlock): string {
    switch (block.kind) {
        case 'onezoom':
            return block.src && block.srcId ? `imgsrc:${block.src}:${block.srcId}` : '';
        case 'youtube': {
            if (!block.videoId) return '';
            const params = new URLSearchParams();
            if (block.start !== undefined) params.set('start', String(block.start));
            if (block.end !== undefined) params.set('end', String(block.end));
            const qs = params.toString();
            return `https://www.youtube.com/embed/${block.videoId}${qs ? `?${qs}` : ''}`;
        }
        case 'vimeo':
            return block.videoId ? `https://player.vimeo.com/video/${block.videoId}` : '';
        case 'wikimedia':
            return block.filename ? `${WIKIMEDIA_FILE_BASE}${block.filename}` : '';
        case 'tours':
            return block.path;
        case 'image':
        case 'audio':
        case 'link':
            return block.url;
    }
}

/** Parse a pasted URL into a media block, detecting kind. */
export function parseMediaUrl(url: string): EditorMediaBlockNoId | null {
    const trimmed = url.trim();
    if (!trimmed) return null;
    return (
        parseOneZoom(trimmed)
        || parseYoutube(trimmed)
        || parseVimeo(trimmed)
        || parseWikimedia(trimmed)
        || parseTours(trimmed)
        || parseImageUrl(trimmed)
        || parseAudioUrl(trimmed)
        || parseExternalLink(trimmed)
    );
}

/** Interpret ``url`` as ``kind``. Unrecognised values become an empty block of that kind. */
export function parseMediaUrlAsKind(url: string, kind: EditorMediaKind): EditorMediaBlockNoId {
    const trimmed = url.trim();
    switch (kind) {
        case 'onezoom':
            return parseOneZoom(trimmed) || { kind, src: 0, srcId: 0 };
        case 'youtube':
            return parseYoutube(trimmed) || { kind, videoId: '' };
        case 'vimeo':
            return parseVimeo(trimmed) || { kind, videoId: '' };
        case 'wikimedia':
            return parseWikimedia(trimmed) || { kind, filename: '' };
        case 'tours':
            return parseTours(trimmed) || { kind, path: '' };
        case 'image':
            return { kind, url: trimmed };
        case 'audio':
            return { kind, url: trimmed };
        case 'link':
            return parseExternalLink(trimmed) || { kind, url: '' };
    }
}

/** Reattach the editor ``id``. Object-spread of the fields union would keep only ``kind``. */
export function mediaBlockFromFields<T extends EditorMediaBlockNoId>(
    fields: T,
    id: string,
): T & { id: string } {
    return { ...fields, id };
}

export function mediaBlockWithKind(block: EditorMediaBlock, kind: EditorMediaKind): EditorMediaBlock {
    if (block.kind === kind) return block;
    return mediaBlockFromFields(parseMediaUrlAsKind(mediaBlockToUrl(block), kind), block.id);
}

export function mediaBlockWithYoutubeTimes(
    block: EditorYoutubeMedia,
    start: number | undefined,
    end: number | undefined,
): EditorYoutubeMedia {
    const next: EditorYoutubeMedia = { id: block.id, kind: 'youtube', videoId: block.videoId };
    if (start !== undefined) next.start = start;
    if (end !== undefined) next.end = end;
    return next;
}

/** Empty or invalid input clears the time; otherwise a non-negative whole number of seconds. */
export function optionalYoutubeSeconds(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return Math.round(n);
}

export function mediaPreview(block: EditorMediaBlock): MediaPreview {
    switch (block.kind) {
        case 'onezoom': {
            const src = oneZoomThumbUrl(block.src, block.srcId);
            return src ? { type: 'image', src } : { type: 'empty' };
        }
        case 'youtube': {
            const src = mediaBlockToUrl(block);
            return src ? { type: 'iframe', src } : { type: 'empty' };
        }
        case 'vimeo':
            return block.videoId
                ? { type: 'iframe', src: `https://player.vimeo.com/video/${block.videoId}` }
                : { type: 'empty' };
        case 'wikimedia': {
            if (!block.filename) return { type: 'empty' };
            const src = wikimediaFileUrl(block.filename);
            return previewForExtension(block.filename, src);
        }
        case 'tours': {
            if (!block.path) return { type: 'empty' };
            return previewForExtension(block.path, `${TOURS_URL_BASE}${block.path}`);
        }
        case 'image':
            return block.url ? { type: 'image', src: block.url } : { type: 'empty' };
        case 'audio':
            return block.url ? { type: 'audio', src: block.url } : { type: 'empty' };
        case 'link':
            return block.url ? { type: 'link', href: block.url } : { type: 'empty' };
    }
}

export function oneZoomThumbUrl(src: number, srcId: number): string {
    if (!src || !srcId) return '';
    const dataPathPics = typeof window !== 'undefined' ? window.server_urls?.data_path_pics : undefined;
    return dataPathPics ? dataPathPics(src, String(srcId)) : '';
}

function parseOneZoom(url: string): Omit<EditorOneZoomImageMedia, 'id'> | null {
    const match = url.match(/^(?:imgsrc:)?(\d+):(\d+)$/);
    if (!match) return null;
    return { kind: 'onezoom', src: Number(match[1]), srcId: Number(match[2]) };
}

function parseYoutube(url: string): Omit<EditorYoutubeMedia, 'id'> | null {
    let parsed: URL;
    try {
        parsed = new URL(decodeHtmlAmpersands(url));
    } catch {
        return null;
    }
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';
    if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        const embed = parsed.pathname.match(/^\/embed\/([^/]+)/);
        const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
        videoId = embed?.[1] || shorts?.[1] || parsed.searchParams.get('v') || '';
    } else {
        return null;
    }
    videoId = videoId.replace(/[^A-Za-z0-9_-].*$/, '');
    if (!videoId) return null;

    const block: Omit<EditorYoutubeMedia, 'id'> = { kind: 'youtube', videoId };
    const start = parseStartParam(parsed.searchParams);
    const end = parseIntParam(parsed.searchParams.get('end'));
    if (start !== undefined) block.start = start;
    if (end !== undefined) block.end = end;
    return block;
}

function parseVimeo(url: string): Omit<EditorVimeoMedia, 'id'> | null {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';
    if (host === 'player.vimeo.com') {
        videoId = (parsed.pathname.match(/^\/video\/(\d+)/) || [])[1] || '';
    } else if (host === 'vimeo.com') {
        videoId = (parsed.pathname.match(/^\/(\d+)/) || [])[1] || '';
    } else {
        return null;
    }
    return videoId ? { kind: 'vimeo', videoId } : null;
}

function parseWikimedia(url: string): Omit<EditorWikimediaMedia, 'id'> | null {
    const commons = url.match(
        new RegExp(`^https://commons\\.wikimedia\\.org/wiki/File:(.+)\\.(${MEDIA_EXT})$`, 'i'),
    );
    if (commons) {
        return wikimediaBlock(`${decodeURIComponent(commons[1])}.${commons[2]}`);
    }
    const filename = uploadCommonsFileName(url);
    return filename ? wikimediaBlock(filename) : null;
}

function wikimediaBlock(filename: string): Omit<EditorWikimediaMedia, 'id'> {
    return { kind: 'wikimedia', filename };
}

/**
 * Commons originals and thumbs on upload.wikimedia.org, e.g.
 * ``/wikipedia/commons/1/15/Name.jpg`` or ``/wikipedia/commons/thumb/9/95/Name.jpg/1920px-Name.jpg``.
 */
function uploadCommonsFileName(url: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (parsed.hostname.replace(/^www\./, '').toLowerCase() !== 'upload.wikimedia.org') {
        return null;
    }
    let pathname = parsed.pathname;
    try {
        pathname = decodeURIComponent(pathname);
    } catch {
        // Keep the raw path if it is not valid URI encoding.
    }
    const match = pathname.match(
        new RegExp(
            `^/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+\\.(${MEDIA_EXT}))(?:/.*)?$`,
            'i',
        ),
    );
    return match ? match[1] : null;
}

function parseTours(url: string): Omit<EditorToursMedia, 'id'> | null {
    const absolute = url.match(
        new RegExp(`^https://onezoom\\.github\\.io/tours/(.+\\.(?:${MEDIA_EXT}))$`, 'i'),
    );
    if (absolute) return { kind: 'tours', path: absolute[1] };
    if (/^https?:\/\//i.test(url)) return null;
    if (new RegExp(`\\.(?:${MEDIA_EXT})$`, 'i').test(url)) {
        return { kind: 'tours', path: url.replace(/^\//, '') };
    }
    return null;
}

function parseImageUrl(url: string): Omit<EditorImageUrlMedia, 'id'> | null {
    if (isWikipediaHost(url)) return null;
    return new RegExp(`\\.(?:${IMAGE_EXT})$`, 'i').test(url) ? { kind: 'image', url } : null;
}

function parseAudioUrl(url: string): Omit<EditorAudioUrlMedia, 'id'> | null {
    if (isWikipediaHost(url)) return null;
    return new RegExp(`\\.(?:${AUDIO_EXT})$`, 'i').test(url) ? { kind: 'audio', url } : null;
}

function isWikipediaHost(url: string): boolean {
    try {
        return /(^|\.)wikipedia\.org$/i.test(new URL(url).hostname.replace(/^www\./, ''));
    } catch {
        return false;
    }
}

function parseExternalLink(url: string): Omit<EditorExternalLinkMedia, 'id'> | null {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return { kind: 'link', url };
    } catch {
        return null;
    }
}

function wikimediaFileUrl(filename: string): string {
    return `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(filename)}`;
}

function previewForExtension(name: string, src: string): MediaPreview {
    if (new RegExp(`\\.(?:${IMAGE_EXT})$`, 'i').test(name)) return { type: 'image', src };
    if (new RegExp(`\\.(?:${AUDIO_EXT})$`, 'i').test(name)) return { type: 'audio', src };
    if (new RegExp(`\\.(?:${VIDEO_EXT})$`, 'i').test(name)) return { type: 'video', src };
    return { type: 'empty' };
}

/** URLs copied from YouTube embed editor often encode ``&`` as ``&amp;``. */
function decodeHtmlAmpersands(url: string): string {
    let decoded = url;
    for (let i = 0; i < 3; i += 1) {
        const next = decoded.replace(/&amp;/g, '&');
        if (next === decoded) break;
        decoded = next;
    }
    return decoded;
}

function parseStartParam(params: URLSearchParams): number | undefined {
    const start = parseIntParam(params.get('start'));
    if (start !== undefined) return start;
    return parseTimeParam(params.get('t'));
}

function parseIntParam(value: string | null): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

/** ``t=30``, ``t=30s``, or ``t=1m30s``. */
function parseTimeParam(value: string | null): number | undefined {
    if (!value) return undefined;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return undefined;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}
