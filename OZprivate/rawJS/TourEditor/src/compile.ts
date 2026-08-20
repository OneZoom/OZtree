import { toHighlightStr } from './highlights';
import {
    AUDIO_EXT,
    IMAGE_EXT,
    MEDIA_EXT,
    TOURS_URL_BASE,
    mediaBlockToUrl,
    oneZoomThumbUrl,
} from './media';
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
    template_data: {
        title?: string;
        window_text?: ProductionWindowText | ProductionWindowText[];
        media?: ProductionMedia[];
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
    const media = stop.mediaBlocks
        .map((block) => mediaBlockToUrl(block))
        .filter((url) => url.length > 0);
    const out: ProductionTourStopJson = {
        identifier: stop.identifier,
        template_data: {
            ...(stop.title ? { title: stop.title } : {}),
            ...(window_text.length > 0 ? { window_text } : {}),
            ...(media.length > 0 ? { media } : {}),
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
    const media = mediaHtml(tdata.media);
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
    ${media}
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

function mediaHtml(media: ProductionTourStopJson['template_data']['media']): string {
    if (!media || media.length === 0) return '';
    return media.map((item) => mediaEmbed(item, {
        ts_autoplay: 'tsstate-active_wait',
        url_base: TOURS_URL_BASE,
    })).join('');
}

/**
 * Generate embed HTML for a media URL, mirroring ``modules/embed.py:media_embed``.
 */
function mediaEmbed(
    url: ProductionMedia,
    defaults: Record<string, string | boolean | null | undefined> = {},
): string {
    const opts: Record<string, string | boolean | null | undefined> = typeof url === 'object' && url !== null
        ? { ...defaults, ...url }
        : { ...defaults, url };
    let href = String(opts.url || '');
    if (opts.url_base) {
        href = joinUrl(String(opts.url_base), href);
        opts.url = href;
    }

    const elementData = Object.entries(opts)
        .filter(([key, value]) => (
            key !== 'url' && key !== 'url_base' && key !== 'alt' && key !== 'title'
            && value !== undefined && value !== null && value !== true
        ))
        .map(([key, value]) => `data-${key}="${escapeHtml(String(value))}"`)
        .join(' ');
    const extraClass = Object.entries(opts)
        .filter(([key, value]) => key !== 'url' && value === true)
        .map(([key]) => escapeHtml(key))
        .join(' ');
    const klass = extraClass ? ` ${extraClass}` : '';
    const dataAttrs = elementData ? ` ${elementData}` : '';
    const alt = opts.alt !== undefined ? String(opts.alt) : '';
    const title = opts.title !== undefined ? String(opts.title) : '';

    const imgsrc = href.match(/^imgsrc:(\d+):(\d+)$/);
    if (imgsrc) {
        const srcUrl = oneZoomThumbUrl(Number(imgsrc[1]), Number(imgsrc[2]));
        const infoUrl = `/tree/pic_info/${imgsrc[1]}/${imgsrc[2]}`;
        return `<a class="embed-image${klass}" title="${escapeHtml(title)}" href="${escapeHtml(infoUrl)}"${dataAttrs}><img src="${escapeHtml(srcUrl)}" alt="${escapeHtml(alt)}" /><span class="copyright">©</span></a>`;
    }

    const youtube = href.match(/^https:\/\/www\.youtube\.com\/embed\/(.+)$/);
    if (youtube) {
        const sep = href.includes('?') ? '&' : '?';
        const origin = youtubeOrigin();
        const src = `${href}${sep}enablejsapi=1&playsinline=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;
        return `<div class="embed-video${klass}"><iframe class="embed-youtube" type="text/html" src="${escapeHtml(src)}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen${dataAttrs}></iframe></div>`;
    }

    if (/^https:\/\/player\.vimeo\.com\/video\/(.+)$/.test(href)) {
        return `<div class="embed-video${klass}"><iframe class="embed-vimeo" src="${escapeHtml(href)}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen${dataAttrs}></iframe></div>`;
    }

    const hosted = href.match(
        new RegExp(`^(https://commons\\.wikimedia\\.org/wiki/File:(.+)\\.(${MEDIA_EXT})|https://onezoom\\.github\\.io/tours/(.+)\\.(${MEDIA_EXT}))$`, 'i'),
    );
    if (hosted) {
        return hostedMediaHtml(href, klass, dataAttrs, alt, title);
    }

    const image = href.match(new RegExp(`^(.+\\.(?:${IMAGE_EXT}))$`, 'i'));
    if (image) {
        const imageAlt = alt || humaniseUrl(href);
        return `<a class="embed-image${klass}"${dataAttrs}><img src="${escapeHtml(href)}" alt="${escapeHtml(imageAlt)}" /></a>`;
    }
    if (new RegExp(`\\.(?:${AUDIO_EXT})$`, 'i').test(href)) {
        return `<div class="embed-audio${klass}"><audio controls src="${escapeHtml(href)}"${dataAttrs}></audio></div>`;
    }

    return `<a href="${escapeHtml(href)}" style="font-weight:bold">${escapeHtml(href)}</a>`;
}

function hostedMediaHtml(
    href: string,
    klass: string,
    dataAttrs: string,
    alt: string,
    title: string,
): string {
    const commons = href.match(
        new RegExp(`^https://commons\\.wikimedia\\.org/wiki/File:(.+)\\.(${MEDIA_EXT})$`, 'i'),
    );
    const tours = href.match(
        new RegExp(`^https://onezoom\\.github\\.io/tours/(.+)\\.(${MEDIA_EXT})$`, 'i'),
    );
    const name = commons ? `${commons[1]}.${commons[2]}` : `${tours![1]}.${tours![2]}`;
    const ext = (commons ? commons[2] : tours![2]).toLowerCase();
    const srcUrl = commons
        ? `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${name}`
        : href;
    const copyrightUrl = commons ? href : `${TOURS_URL_BASE}${tours![1]}.html`;
    const resolvedAlt = alt || humaniseUrl(commons ? name : tours![1]);
    const resolvedTitle = title || name;

    if (new RegExp(`^(?:${IMAGE_EXT})$`, 'i').test(ext)) {
        return `<a class="embed-image${klass}" title="${escapeHtml(resolvedTitle)}" href="${escapeHtml(copyrightUrl)}"${dataAttrs}><img src="${escapeHtml(srcUrl)}" alt="${escapeHtml(resolvedAlt)}" /><span class="copyright">©</span></a>`;
    }
    if (new RegExp(`^(?:${AUDIO_EXT})$`, 'i').test(ext)) {
        return `<div class="embed-audio${klass}"><audio controls src="${escapeHtml(srcUrl)}"${dataAttrs}></audio><a class="copyright" href="${escapeHtml(copyrightUrl)}">©</a></div>`;
    }
    return `<div class="embed-video${klass}"><video controls src="${escapeHtml(srcUrl)}"${dataAttrs}></video><a class="copyright" href="${escapeHtml(copyrightUrl)}">©</a></div>`;
}

function joinUrl(base: string, url: string): string {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;
    const normalisedBase = base.endsWith('/') ? base : `${base}/`;
    return new URL(url, normalisedBase).href;
}

function youtubeOrigin(): string {
    if (typeof window !== 'undefined' && window.location && window.location.origin !== 'null') {
        return window.location.origin;
    }
    return '';
}

function humaniseUrl(url: string): string {
    const base = url.split('/').pop() || url;
    return base.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
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
