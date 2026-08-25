import type {
    EditorTextBlock,
    EditorTour,
    EditorTourStop,
    TourLicense,
} from './types';

export const LICENSE_OPTIONS: { value: TourLicense; label: string }[] = [
    { value: 'all-rights-reserved', label: 'All rights reserved' },
    { value: 'cc-by-4.0', label: 'CC BY 4.0' },
    { value: 'cc0-1.0', label: 'CC0 1.0' },
];

export const DEFAULT_LICENSE: TourLicense = 'all-rights-reserved';

export function newEditorId(): string {
    return crypto.randomUUID();
}

/** Filesystem-safe stem from a tour title, e.g. ``My Nice Tour!`` → ``my_nice_tour``. */
export function tourFileSlug(tour: EditorTour): string {
    const slug = tour.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
    return slug || 'untitled';
}

function nextStopIdentifier(stops: EditorTourStop[]): string {
    const used = new Set(stops.map((stop) => stop.identifier));
    let n = 1;
    while (used.has(`stop_${n}`)) {
        n += 1;
    }
    return `stop_${n}`;
}

export function createEmptyTour(): EditorTour {
    return {
        title: '',
        description: '',
        author: '',
        license: DEFAULT_LICENSE,
        thumbnail: { id: newEditorId(), kind: 'image', url: '' },
        stops: [],
    };
}

export function createEmptyStop(existingStops: EditorTourStop[] = []): EditorTourStop {
    return {
        id: newEditorId(),
        identifier: nextStopIdentifier(existingStops),
        title: '',
        location: null,
        fillScreen: false,
        highlights: [],
        textBlocks: [],
        mediaBlocks: [],
        transitionIn: 'fly',
        flyInSpeed: 1,
        autoAdvance: false,
        stopWaitSeconds: 5,
    };
}

export function createTextBlock(text = ''): EditorTextBlock {
    return { id: newEditorId(), text };
}

export function moveItem<T>(items: T[], index: number, direction: number): T[] {
    const newIndex = index + direction;
    if (index < 0 || newIndex < 0 || newIndex >= items.length) {
        return items;
    }
    const next = [...items];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    return next;
}

export function updateTourStop(
    tour: EditorTour,
    stopId: string,
    patch: Partial<EditorTourStop> | ((stop: EditorTourStop) => Partial<EditorTourStop>),
): EditorTour {
    return {
        ...tour,
        stops: tour.stops.map((stop) => {
            if (stop.id !== stopId) return stop;
            const next = typeof patch === 'function' ? patch(stop) : patch;
            return { ...stop, ...next };
        }),
    };
}
