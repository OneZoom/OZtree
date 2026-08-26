import { fromHighlightStr } from './highlights';
import {
    THUMBNAIL_MEDIA_KINDS,
    createMediaBlock,
    isThumbnailMedia,
    mediaBlockFromFields,
    parseMediaUrl,
} from './media';
import { DEFAULT_LICENSE, LICENSE_OPTIONS, isTourIdentifier, newEditorId, sanitizeTourIdentifier } from './tour';
import {
    type EditorHighlight,
    type EditorMediaBlock,
    type EditorThumbnailMedia,
    type EditorTextBlock,
    type EditorTour,
    type EditorTourStop,
    type Pinpoint,
    type TourLicense,
    type TransitionIn,
} from './types';

const LICENSE_VALUES = new Set<string>(LICENSE_OPTIONS.map((option) => option.value));
const TRANSITION_VALUES = new Set<TransitionIn>(['fly', 'leap', 'fly_straight']);

export class TourParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TourParseError';
    }
}

export function parseTourJsonString(text: string, filename?: string): EditorTour {
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        throw new TourParseError('Tour file is not valid JSON.');
    }
    return parseEditorTour(json, filename);
}

/** Parse production tour JSON (as compiled by ``editorTourToJson``) into an editor tour. */
export function parseEditorTour(json: unknown, filename?: string): EditorTour {
    if (!isRecord(json)) {
        throw new TourParseError('Tour file is not valid.');
    }
    if (!Array.isArray(json.tourstops)) {
        throw new TourParseError('Tour file is missing stops.');
    }

    const stops = json.tourstops.map((stop, index) => parseStop(stop, index));
    const identifiers = new Set<string>();
    for (const stop of stops) {
        if (identifiers.has(stop.identifier)) {
            throw new TourParseError(`Stop identifier "${stop.identifier}" is not unique.`);
        }
        identifiers.add(stop.identifier);
    }

    return {
        identifier: parseTourIdentifier(json.identifier, filename),
        title: asString(json.title),
        description: asString(json.description),
        author: asString(json.author),
        license: parseLicense(json.license),
        thumbnail: parseThumbnail(json.image_url),
        stops,
    };
}

function parseStop(value: unknown, index: number): EditorTourStop {
    if (!isRecord(value)) {
        throw new TourParseError(`Stop ${index + 1} is not valid.`);
    }

    const identifier = asString(value.identifier) || `stop_${index + 1}`;
    if (value.template_data !== undefined && !isRecord(value.template_data)) {
        throw new TourParseError(`Stop ${identifier} is not valid.`);
    }
    const tdata = isRecord(value.template_data) ? value.template_data : {};
    const { fillScreen, highlights } = parseQsOpts(value.qs_opts);
    const stopWaitMs = optionalFiniteNumber(value.stop_wait);

    return {
        id: newEditorId(),
        identifier,
        title: asString(tdata.title),
        location: parseOtt(value.ott),
        fillScreen,
        highlights,
        textBlocks: parseWindowText(tdata.window_text, identifier),
        mediaBlocks: parseMediaList(tdata.media, identifier),
        transitionIn: parseTransition(value.transition_in),
        flyInSpeed: asFiniteNumber(value.fly_in_speed, 1),
        autoAdvance: stopWaitMs !== undefined,
        stopWaitSeconds: stopWaitMs !== undefined ? stopWaitMs / 1000 : 5,
    };
}

function parseQsOpts(value: unknown): { fillScreen: boolean; highlights: EditorHighlight[] } {
    if (typeof value !== 'string' || !value) {
        return { fillScreen: false, highlights: [] };
    }
    const highlights: EditorHighlight[] = [];
    for (const part of value.replace(/^\?/, '').split('&')) {
        if (!part.startsWith('highlight=')) continue;
        let highlightStr = part.slice('highlight='.length);
        try {
            highlightStr = decodeURIComponent(highlightStr);
        } catch {
            // Keep the raw value if it is not valid URI encoding.
        }
        if (!highlightStr) continue;
        const highlight = fromHighlightStr(highlightStr);
        if (highlight && highlight.pinpoints.length > 0) {
            highlights.push(highlight);
        }
    }
    return {
        fillScreen: value.includes('into_node=max'),
        highlights,
    };
}

function parseWindowText(value: unknown, stopIdentifier: string): EditorTextBlock[] {
    if (value === undefined || value === null || value === '') return [];
    const items = Array.isArray(value) ? value : [value];
    return items.map((item, index) => {
        if (typeof item === 'string') {
            return { id: newEditorId(), text: item };
        }
        if (isRecord(item)) {
            return { id: newEditorId(), text: asString(item.text) };
        }
        throw new TourParseError(`Text block ${index + 1} on ${stopIdentifier} is not valid.`);
    }).filter((block) => block.text.length > 0);
}

function parseMediaList(value: unknown, stopIdentifier: string): EditorMediaBlock[] {
    return asArray(value, `Stop ${stopIdentifier} media`)
        .map((item, index) => parseProductionMedia(item, `Media block ${index + 1} on ${stopIdentifier}`))
        .filter((block): block is EditorMediaBlock => block !== null);
}

function parseProductionMedia(value: unknown, label: string): EditorMediaBlock | null {
    let url = '';
    if (typeof value === 'string') {
        url = value;
    } else if (isRecord(value)) {
        url = asString(value.url);
    } else {
        throw new TourParseError(`${label} is not valid.`);
    }
    if (!url) return null;
    const parsed = parseMediaUrl(url);
    return mediaBlockFromFields(parsed || { kind: 'link', url }, newEditorId());
}

function parseThumbnail(value: unknown): EditorThumbnailMedia {
    if (typeof value !== 'string' || !value) return createMediaBlock('image');
    const parsed = parseMediaUrl(value, THUMBNAIL_MEDIA_KINDS);
    if (!parsed) return createMediaBlock('image');
    const block = mediaBlockFromFields(parsed, newEditorId());
    return isThumbnailMedia(block) ? block : createMediaBlock('image');
}

function parseTourIdentifier(value: unknown, filename?: string): string {
    const identifier = asString(value);
    if (identifier) {
        if (!isTourIdentifier(identifier)) {
            throw new TourParseError('Tour identifier must be lowercase letters, numbers and underscores.');
        }
        return identifier;
    }
    if (!filename) return '';
    return sanitizeTourIdentifier(filename.replace(/\.[^.]+$/, ''));
}

function parseLicense(value: unknown): TourLicense {
    return LICENSE_VALUES.has(value as string) ? (value as TourLicense) : DEFAULT_LICENSE;
}

function parseTransition(value: unknown): TransitionIn {
    return TRANSITION_VALUES.has(value as TransitionIn) ? (value as TransitionIn) : 'fly';
}

function parseOtt(value: unknown): Pinpoint | null {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function asFiniteNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asArray(value: unknown, label: string): unknown[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
        throw new TourParseError(`${label} is not valid.`);
    }
    return value;
}
