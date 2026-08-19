import { DEFAULT_LICENSE, LICENSE_OPTIONS, newEditorId } from './tour';
import {
    DEFAULT_HIGHLIGHT_COLOR,
    type EditorHighlight,
    type EditorTextBlock,
    type EditorTour,
    type EditorTourStop,
    type HighlightType,
    type Pinpoint,
    type TourLicense,
    type TransitionIn,
} from './types';

const LICENSE_VALUES = new Set<string>(LICENSE_OPTIONS.map((option) => option.value));
const TRANSITION_VALUES = new Set<TransitionIn>(['fly', 'leap', 'fly_straight']);
const HIGHLIGHT_TYPES = new Set<HighlightType>(['fan', 'path']);

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

    return {
        id: asString(value.id) || newEditorId(),
        identifier,
        title: asString(value.title),
        location: parseLocation(value.location),
        fillScreen: asBoolean(value.fillScreen),
        highlights,
        textBlocks,
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

function asArray(value: unknown, label: string): unknown[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
        throw new TourParseError(`${label} is not valid.`);
    }
    return value;
}
