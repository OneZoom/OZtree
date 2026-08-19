import { toHighlightStr } from './highlights';
import type { EditorTour, EditorTourStop, TourLicense } from './types';

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
    tourstops: ProductionTourStopJson[];
}

export type ProductionWindowText =
    | string
    | { text: string; [flag: string]: string | boolean };

export interface ProductionTourStopJson {
    identifier: string;
    ott?: string;
    qs_opts?: string;
    transition_in?: 'fly' | 'leap' | 'fly_straight';
    fly_in_speed?: number;
    stop_wait?: number;
    template_data: {
        title?: string;
        window_text?: ProductionWindowText | ProductionWindowText[];
    };
}

export function editorTourToJson(tour: EditorTour): ProductionTourJson {
    return {
        title: tour.title,
        description: tour.description,
        author: tour.author,
        license: tour.license,
        tourstops: tour.stops.map((stop) => editorStopToJson(stop)),
    };
}

function editorStopToJson(stop: EditorTourStop): ProductionTourStopJson {
    const qs_opts = stopQsOpts(stop);
    const window_text = stop.textBlocks
        .map((block) => block.text)
        .filter((text) => text.length > 0);
    const out: ProductionTourStopJson = {
        identifier: stop.identifier,
        template_data: {
            ...(stop.title ? { title: stop.title } : {}),
            ...(window_text.length > 0 ? { window_text } : {}),
        },
    };

    if (stop.location) out.ott = stop.location;
    if (qs_opts) out.qs_opts = qs_opts;
    if (stop.transitionIn !== 'fly') out.transition_in = stop.transitionIn;
    if (stop.flyInSpeed !== 1) out.fly_in_speed = stop.flyInSpeed;
    if (stop.autoAdvance) out.stop_wait = Math.round(stop.stopWaitSeconds * 1000);

    return out;
}

function stopQsOpts(stop: EditorTourStop): string | undefined {
    const parts: string[] = [];
    if (stop.fillScreen) parts.push('into_node=max');
    for (const highlight of stop.highlights) {
        if (highlight.pinpoints.length === 0) continue;
        parts.push(`highlight=${toHighlightStr(highlight)}`);
    }
    return parts.length > 0 ? `?${parts.join('&')}` : undefined;
}

/**
 * Compile production tour JSON to the HTML the tour engine parses.
 * Mirrors ``views/tour/data.html`` for the subset the editor can produce.
 */
export function tourJsonToHtml(tour: ProductionTourJson): string {
    const identifier = tour.identifier || 'preview';
    const stops = tour.tourstops || [];
    const tourAttrs = [
        `class="tour tour-data layout-def ${escapeHtml(identifier)}"`,
        `data-identifier="${escapeHtml(identifier)}"`,
        'data-focal-area="0.5 0.5"',
        optionalDataAttr('author', tour.author),
        optionalDataAttr('title', tour.title),
        optionalDataAttr('description', tour.description),
    ].filter(Boolean);

    const stopHtml = stops.map((stop, tsIdx) => stopToHtml(stop, tsIdx, stops)).join('');
    return `<div ${tourAttrs.join(' ')}>${stopHtml}</div>`;
}

function stopToHtml(
    stop: ProductionTourStopJson,
    tsIdx: number,
    stops: ProductionTourStopJson[],
): string {
    const tdata = stop.template_data || {};
    const stopAttrs = [
        'class="container tour_container"',
        optionalDataAttr('ott', stop.ott),
        optionalDataAttr('qs_opts', stop.qs_opts),
        optionalDataAttr('transition_in', stop.transition_in),
        optionalDataAttr('fly_in_speed', stop.fly_in_speed),
        optionalDataAttr('stop_wait', stop.stop_wait),
    ].filter(Boolean);

    const title = tdata.title
        ? `<h2 class="title">${escapeHtml(tdata.title)}</h2>`
        : '';
    const windowText = windowTextHtml(tdata.window_text);
    const options = stops.map((other, i) => {
        const label = escapeHtml((other.template_data || {}).title || '');
        const disabled = i === tsIdx ? ' disabled' : '';
        return `<option value="${i}"${disabled}>${label}</option>`;
    }).join('');

    return `<div ${stopAttrs.join(' ')}>
    <div class="header">
      <button type="button" class="button tour_exit" uk-icon="icon: close" aria-label="Exit tour"></button>
      <button type="button" class="handle" aria-label="Exit tour"></button>
      ${title}
    </div>
    ${windowText}
    <div class="footer">
      <button class="tour_backward">Back</button>
      <span class="grow">
        <select name="tourstop" class="ts-progress uk-select tour_goto" style="height: 35px; text-align-last: center;">
          <option hidden selected value="">${tsIdx + 1} of ${stops.length}</option>
          ${options}
        </select>
      </span>
      <button class="tour_resume">Resume</button>
      <button class="tour_forward">Next</button>
      <button class="tour_final">Exit</button>
    </div>
  </div>`;
}

function windowTextHtml(window_text: ProductionTourStopJson['template_data']['window_text']): string {
    if (!window_text) return '';
    const items = Array.isArray(window_text) ? window_text : [window_text];
    return items.map((value) => {
        const content = typeof value === 'string' ? { text: value } : value;
        const flags = Object.keys(content).filter((key) => key !== 'text' && content[key] === true);
        const className = ['window_text', ...flags].join(' ');
        return `<div class="${escapeHtml(className)}">${formatWindowText(content.text)}</div>`;
    }).join('');
}

function formatWindowText(text: string): string {
    return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
}

function optionalDataAttr(name: string, value: string | number | undefined | null): string {
    if (value === undefined || value === null || value === '') return '';
    return `data-${name}="${escapeHtml(String(value))}"`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
