import { DEFAULT_LICENSE, LICENSE_OPTIONS, newEditorId } from './tour';
import {
    DEFAULT_HIGHLIGHT_COLOR,
    type EditorHighlight,
    type EditorMediaBlock,
    type EditorMediaKind,
    type EditorTextBlock,
    type EditorTour,
    type EditorTourStop,
    type EditorYoutubeMedia,
    type HighlightType,
    type Pinpoint,
    type TourLicense,
    type TransitionIn,
} from './types';

const LICENSE_VALUES = new Set<string>(LICENSE_OPTIONS.map((option) => option.value));
const TRANSITION_VALUES = new Set<TransitionIn>(['fly', 'leap', 'fly_straight']);
const HIGHLIGHT_TYPES = new Set<HighlightType>(['fan', 'path']);
const MEDIA_KINDS = new Set<EditorMediaKind>([
    'onezoom',
    'youtube',
    'vimeo',
    'wikimedia',
    'tours',
    'image',
    'audio',
    'link',
]);

export class TourParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TourParseError';
    }
}

export function parseEditorTour(json: unknown): EditorTour {
    if (!isRecord(json)) {
        throw new TourParseError('Tour file is not valid.');
    }
    if (!Array.isArray(json.stops)) {
        throw new TourParseError('Tour file is missing stops.');
    }

    const stops = json.stops.map((stop, index) => parseStop(stop, index));
    const identifiers = new Set<string>();
    for (const stop of stops) {
        if (identifiers.has(stop.identifier)) {
            throw new TourParseError(`Stop identifier "${stop.identifier}" is not unique.`);
        }
        identifiers.add(stop.identifier);
    }

    return {
        title: asString(json.title),
        description: asString(json.description),
        author: asString(json.author),
        license: parseLicense(json.license),
        stops,
    };
}

function parseStop(value: unknown, index: number): EditorTourStop {
    if (!isRecord(value)) {
        throw new TourParseError(`Stop ${index + 1} is not valid.`);
    }

    const identifier = asString(value.identifier) || `stop_${index + 1}`;
    const highlights = asArray(value.highlights, `Stop ${identifier} highlights`).map(
        (highlight, highlightIndex) => parseHighlight(highlight, identifier, highlightIndex),
    );
    const textBlocks = asArray(value.textBlocks, `Stop ${identifier} text`).map(
        (block, blockIndex) => parseTextBlock(block, identifier, blockIndex),
    );
    const mediaBlocks = asArray(value.mediaBlocks, `Stop ${identifier} media`).map(
        (block, blockIndex) => parseMediaBlock(block, identifier, blockIndex),
    );

    return {
        id: asString(value.id) || newEditorId(),
        identifier,
        title: asString(value.title),
        location: parseLocation(value.location),
        fillScreen: asBoolean(value.fillScreen),
        highlights,
        textBlocks,
        mediaBlocks,
        transitionIn: parseTransition(value.transitionIn),
        flyInSpeed: asFiniteNumber(value.flyInSpeed, 1),
        autoAdvance: asBoolean(value.autoAdvance),
        stopWaitSeconds: asFiniteNumber(value.stopWaitSeconds, 5),
    };
}

function parseHighlight(
    value: unknown,
    stopIdentifier: string,
    index: number,
): EditorHighlight {
    if (!isRecord(value)) {
        throw new TourParseError(`Highlight ${index + 1} on ${stopIdentifier} is not valid.`);
    }
    const type = HIGHLIGHT_TYPES.has(value.type as HighlightType)
        ? (value.type as HighlightType)
        : 'fan';
    return {
        id: asString(value.id) || newEditorId(),
        type,
        color: asString(value.color) || DEFAULT_HIGHLIGHT_COLOR,
        pinpoints: asArray(value.pinpoints, `Highlight pinpoints on ${stopIdentifier}`)
            .filter((pinpoint): pinpoint is Pinpoint => typeof pinpoint === 'string' && pinpoint.length > 0),
    };
}

function parseTextBlock(
    value: unknown,
    stopIdentifier: string,
    index: number,
): EditorTextBlock {
    if (!isRecord(value)) {
        throw new TourParseError(`Text block ${index + 1} on ${stopIdentifier} is not valid.`);
    }
    return {
        id: asString(value.id) || newEditorId(),
        text: asString(value.text),
    };
}

function parseMediaBlock(
    value: unknown,
    stopIdentifier: string,
    index: number,
): EditorMediaBlock {
    if (!isRecord(value)) {
        throw new TourParseError(`Media block ${index + 1} on ${stopIdentifier} is not valid.`);
    }
    const kind = value.kind as EditorMediaKind;
    if (!MEDIA_KINDS.has(kind)) {
        throw new TourParseError(`Media block ${index + 1} on ${stopIdentifier} is not valid.`);
    }

    const id = asString(value.id) || newEditorId();
    switch (kind) {
        case 'onezoom':
            return {
                id,
                kind,
                src: asFiniteNumber(value.src, 0),
                srcId: asFiniteNumber(value.srcId, 0),
            };
        case 'youtube': {
            const block: EditorYoutubeMedia = { id, kind, videoId: asString(value.videoId) };
            const start = optionalFiniteNumber(value.start);
            const end = optionalFiniteNumber(value.end);
            if (start !== undefined) block.start = start;
            if (end !== undefined) block.end = end;
            return block;
        }
        case 'vimeo':
            return { id, kind, videoId: asString(value.videoId) };
        case 'wikimedia':
            return { id, kind, filename: asString(value.filename) };
        case 'tours':
            return { id, kind, path: asString(value.path) };
        case 'image':
        case 'audio':
        case 'link':
            return { id, kind, url: asString(value.url) };
    }
}

function parseLicense(value: unknown): TourLicense {
    return LICENSE_VALUES.has(value as string) ? (value as TourLicense) : DEFAULT_LICENSE;
}

function parseTransition(value: unknown): TransitionIn {
    return TRANSITION_VALUES.has(value as TransitionIn) ? (value as TransitionIn) : 'fly';
}

function parseLocation(value: unknown): Pinpoint | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
    return value === true;
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
