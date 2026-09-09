import { toHighlightStr } from './highlights';
import { mediaBlockToUrl } from './media';
import { sanitizeTourIdentifier, tourFileSlug } from './tour';
import { stopVisibilityFlags, defaultStopVisibility } from './stopVisibility';
import { contentVisibilityFlags, defaultContentVisibility } from './tourContentVisibility';
import type { EditorMediaBlock, EditorTextBlock, EditorTour, EditorTourStop, TourLicense } from './types';
import { PhaseSelection } from './phases';

/**
 * Production tour JSON as documented in ``controllers/tour.py``.
 * This is the format stored in the DB and compiled to HTML by ``views/tour/data.html``.
 */
export interface ProductionTourJson {
    identifier?: string;
    title: string;
    description: string;
    author: string;
    license?: TourLicense;
    image_url?: string;
    tourstops: ProductionTourStopJson[];
}

export type ProductionWindowText =
    | string
    | { text: string; [flag: string]: string | boolean };

export type ProductionMedia =
    | string
    | { url: string; [key: string]: string | boolean | null | undefined };

export interface ProductionTourStopJson {
    identifier: string;
    ott?: string;
    qs_opts?: string;
    transition_in?: 'fly' | 'leap' | 'fly_straight';
    fly_in_speed?: number;
    stop_wait?: number;
    comment?: string;
    template_data: {
        title?: string;
        window_text?: ProductionWindowText | ProductionWindowText[];
        media?: ProductionMedia[];
        comment?: string;
        'visible-transition_in'?: boolean;
        'visible-transition_out'?: boolean;
        'hidden-active_wait'?: boolean;
        class?: string;
    };
}

export function tourJsonFilename(tour: EditorTour): string {
    return `${tourFileSlug(tour)}.json`;
}

export function tourJsonString(tour: EditorTour): string {
    return `${JSON.stringify(editorTourToJson(tour), null, 2)}\n`;
}

export function editorTourToJson(tour: EditorTour): ProductionTourJson {
    const image_url = mediaBlockToUrl(tour.thumbnail);
    return {
        identifier: sanitizeTourIdentifier(tour.identifier || tourFileSlug(tour)),
        title: tour.title,
        description: tour.description,
        author: tour.author,
        license: tour.license,
        ...(image_url ? { image_url } : {}),
        tourstops: tour.stops.map((stop) => editorStopToJson(stop)),
    };
}

function editorStopToJson(stop: EditorTourStop): ProductionTourStopJson {
    const qs_opts = stopQsOpts(stop);
    const stopVisibility = stop.visibility ?? defaultStopVisibility;
    const window_text = stop.textBlocks
        .filter((block) => block.text.length > 0)
        .map((block) => windowTextValue(block, stopVisibility));
    const media = stop.mediaBlocks
        .map((block) => mediaValue(block, stopVisibility))
        .filter((item): item is ProductionMedia => item !== null);
    const out: ProductionTourStopJson = {
        identifier: stop.identifier,
        template_data: {
            ...(stop.title ? { title: stop.title } : {}),
            ...stopVisibilityFlags(stopVisibility),
            ...(window_text.length > 0 ? { window_text } : {}),
            ...(media.length > 0 ? { media } : {}),
            ...(stop.templateComment ? { comment: stop.templateComment } : {}),
        },
    };

    if (stop.location) out.ott = stop.location;
    if (qs_opts) out.qs_opts = qs_opts;
    if (stop.transitionIn !== 'fly') out.transition_in = stop.transitionIn;
    if (stop.flyInSpeed !== 1) out.fly_in_speed = stop.flyInSpeed;
    if (stop.autoAdvance) out.stop_wait = Math.round(stop.stopWaitSeconds * 1000);
    if (stop.comment) out.comment = stop.comment;

    return out;
}

function stopQsOpts(stop: EditorTourStop): string | undefined {
    const parts: string[] = [];
    if (stop.fillScreen) parts.push('into_node=max');
    for (const highlight of stop.highlights) {
        if (highlight.pinpoints.length === 0) continue;
        parts.push(`highlight=${toHighlightStr(highlight)}`);
    }
    for (const { key, value } of stop.extraQueryStrings ?? []) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    return parts.length > 0 ? `?${parts.join('&')}` : undefined;
}

function windowTextValue(block: EditorTextBlock, stopVisibility: PhaseSelection): ProductionWindowText {
    const flags = contentVisibilityFlags(
        block.visibility ?? defaultContentVisibility,
        stopVisibility,
    );
    if (Object.keys(flags).length === 0) return block.text;
    return { text: block.text, ...flags };
}

function mediaValue(block: EditorMediaBlock, stopVisibility: PhaseSelection): ProductionMedia | null {
    const url = mediaBlockToUrl(block);
    if (!url) return null;
    const flags = contentVisibilityFlags(
        block.visibility ?? defaultContentVisibility,
        stopVisibility,
    );
    const extras = mediaEmbedExtras(block);
    if (Object.keys(flags).length === 0 && Object.keys(extras).length === 0) return url;
    return { url, ...flags, ...extras };
}

function mediaEmbedExtras(block: EditorMediaBlock): Record<string, string | null> {
    const extras: Record<string, string | null> = {};
    if (block.ts_autoplay !== undefined) extras.ts_autoplay = block.ts_autoplay;
    if (block.alt) extras.alt = block.alt;
    if (block.title) extras.title = block.title;
    return extras;
}

/**
 * Turn production tour JSON into the HTML the tour engine parses.
 *
 * ``/tour/preview.html`` renders the document with ``views/tour/data.html``, the same
 * template a saved tour goes through, so an unsaved tour previews exactly as it will
 * once published. Nothing is written to the database.
 */
export async function tourPreviewHtml(tour: ProductionTourJson): Promise<string> {
    const url = window.server_urls?.tour_preview_api ?? '/tour/preview.html';
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tour),
    });
    if (!response.ok) {
        // Our own refusals come back as a plain-text reason; anything else is a
        // framework error page that would be no help to a tour author.
        const reason = (await response.text().catch(() => '')).trim();
        throw new Error(reason && !reason.startsWith('<')
            ? reason
            : `The server could not render this tour (error ${response.status}).`);
    }
    return response.text();
}
