export type HighlightType = 'fan' | 'path';

/** Highlight string sent to the tree, e.g. ``fan:#ff6b6b@Mammalia``. */
export type HighlightStr = string;

/** Pinpoint string, e.g. ``@Mammalia``. */
export type Pinpoint = string;

/**
 * Resolved highlight from ``onezoom.controller.highlight_detail()``.
 * See OZTreeModule/src/projection/highlight/highlight.js
 */
export interface HighlightDetail {
    str: HighlightStr;
    type: HighlightType;
    color: string;
    pinpoints: Pinpoint[];
    ozids?: number[];
}

/** Editor-owned highlight row. ``id`` is stable across edits; ``str`` is derived when writing to the tree. */
export interface EditorHighlight {
    id: string;
    type: HighlightType;
    color: string;
    pinpoints: Pinpoint[];
}

export interface ValidationResult {
    valid: boolean;
    shouldSwap: boolean;
}

export interface TreeNode {
    ozid: number;
    children?: TreeNode[];
    child_index_towards: (ozid: number) => number | null;
    pic_src?: number | string;
    pic_filename?: number | string;
}

export interface ResolvedPinpoint {
    pinpoint: Pinpoint;
    ozid: number;
}

export interface EditorPanelApi {
    togglePanel: () => void;
}

export type TourEditorApi = EditorPanelApi;
export type HighlightsEditorApi = EditorPanelApi;

export type TransitionIn = 'fly' | 'leap' | 'fly_straight';

export type TourLicense = 'all-rights-reserved' | 'cc-by-4.0' | 'cc0-1.0';

export interface EditorTextBlock {
    id: string;
    text: string;
}

interface EditorMediaBlockBase {
    id: string;
}

/** OneZoom image: ``imgsrc:{src}:{srcId}``. ``src`` is a ``src_flags`` value, e.g. 99 for ``eol_old``. */
export interface EditorOneZoomImageMedia extends EditorMediaBlockBase {
    kind: 'onezoom';
    src: number;
    srcId: number;
}

/** YouTube embed: ``https://www.youtube.com/embed/{videoId}``. Times are seconds. */
export interface EditorYoutubeMedia extends EditorMediaBlockBase {
    kind: 'youtube';
    videoId: string;
    start?: number;
    end?: number;
}

/** Vimeo embed: ``https://player.vimeo.com/video/{videoId}``. */
export interface EditorVimeoMedia extends EditorMediaBlockBase {
    kind: 'vimeo';
    videoId: string;
}

/**
 * Wikimedia Commons file page: ``https://commons.wikimedia.org/wiki/File:{filename}``.
 * Extension determines if image (gif/jpg/jpeg/png/svg), audio (ogg/mp3), or video (ogv/webm/mpg/mpeg).
 */
export interface EditorWikimediaMedia extends EditorMediaBlockBase {
    kind: 'wikimedia';
    filename: string;
}

/**
 * Asset on ``https://onezoom.github.io/tours/{path}``.
 * Extension determines if image, audio, or video, same as Wikimedia.
 */
export interface EditorToursMedia extends EditorMediaBlockBase {
    kind: 'tours';
    path: string;
}

/** Generic image URL ending in gif/jpg/jpeg/png/svg. */
export interface EditorImageUrlMedia extends EditorMediaBlockBase {
    kind: 'image';
    url: string;
}

/** Generic audio URL ending in ogg/mp3. */
export interface EditorAudioUrlMedia extends EditorMediaBlockBase {
    kind: 'audio';
    url: string;
}

/** Unrecognised http(s) URL. Production embed is a bold link. */
export interface EditorExternalLinkMedia extends EditorMediaBlockBase {
    kind: 'link';
    url: string;
}

export type EditorMediaBlock =
    | EditorOneZoomImageMedia
    | EditorYoutubeMedia
    | EditorVimeoMedia
    | EditorWikimediaMedia
    | EditorToursMedia
    | EditorImageUrlMedia
    | EditorAudioUrlMedia
    | EditorExternalLinkMedia;

export type EditorMediaKind = EditorMediaBlock['kind'];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type EditorMediaBlockNoId = DistributiveOmit<EditorMediaBlock, 'id'>;

export interface EditorTour {
    title: string;
    description: string;
    author: string;
    license: TourLicense;
    stops: EditorTourStop[];
}

export interface EditorTourStop {
    id: string;
    identifier: string;
    title: string;
    location: Pinpoint | null;
    fillScreen: boolean;
    highlights: EditorHighlight[];
    textBlocks: EditorTextBlock[];
    mediaBlocks: EditorMediaBlock[];
    transitionIn: TransitionIn;
    flyInSpeed: number;
    autoAdvance: boolean;
    stopWaitSeconds: number;
}

export const DEFAULT_HIGHLIGHT_COLOR = '#ff6b6b';
export const ROOT_PINPOINT = '@_ozid=1';

export type EditingPinpointRef =
    | { type: 'existing'; index: number }
    | { type: 'append' };

/** Icon names from UIkit 3.21.13 ``uikit-icons.js``. */
export type UkIconName =
    | '500px'
    | 'album'
    | 'android'
    | 'android-robot'
    | 'apple'
    | 'arrow-down'
    | 'arrow-left'
    | 'arrow-right'
    | 'arrow-up'
    | 'arrow-up-right'
    | 'bag'
    | 'ban'
    | 'behance'
    | 'bell'
    | 'bluesky'
    | 'bold'
    | 'bolt'
    | 'bookmark'
    | 'calendar'
    | 'camera'
    | 'cart'
    | 'check'
    | 'chevron-double-left'
    | 'chevron-double-right'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-up'
    | 'clock'
    | 'close'
    | 'cloud-download'
    | 'cloud-upload'
    | 'code'
    | 'cog'
    | 'comment'
    | 'commenting'
    | 'comments'
    | 'copy'
    | 'credit-card'
    | 'crosshairs'
    | 'database'
    | 'desktop'
    | 'discord'
    | 'download'
    | 'dribbble'
    | 'etsy'
    | 'expand'
    | 'eye'
    | 'eye-slash'
    | 'facebook'
    | 'file'
    | 'file-edit'
    | 'file-pdf'
    | 'file-text'
    | 'flickr'
    | 'folder'
    | 'forward'
    | 'foursquare'
    | 'future'
    | 'git-branch'
    | 'git-fork'
    | 'github'
    | 'github-alt'
    | 'gitter'
    | 'google'
    | 'grid'
    | 'happy'
    | 'hashtag'
    | 'heart'
    | 'history'
    | 'home'
    | 'image'
    | 'info'
    | 'instagram'
    | 'italic'
    | 'joomla'
    | 'laptop'
    | 'lifesaver'
    | 'link'
    | 'link-external'
    | 'linkedin'
    | 'list'
    | 'location'
    | 'lock'
    | 'mail'
    | 'mastodon'
    | 'menu'
    | 'microphone'
    | 'microsoft'
    | 'minus'
    | 'minus-circle'
    | 'more'
    | 'more-vertical'
    | 'move'
    | 'nut'
    | 'paint-bucket'
    | 'pencil'
    | 'phone'
    | 'phone-landscape'
    | 'pinterest'
    | 'play'
    | 'play-circle'
    | 'plus'
    | 'plus-circle'
    | 'print'
    | 'pull'
    | 'push'
    | 'question'
    | 'quote-right'
    | 'receiver'
    | 'reddit'
    | 'refresh'
    | 'reply'
    | 'rss'
    | 'search'
    | 'server'
    | 'settings'
    | 'shrink'
    | 'sign-in'
    | 'sign-out'
    | 'signal'
    | 'social'
    | 'soundcloud'
    | 'star'
    | 'strikethrough'
    | 'table'
    | 'tablet'
    | 'tablet-landscape'
    | 'tag'
    | 'telegram'
    | 'threads'
    | 'thumbnails'
    | 'tiktok'
    | 'trash'
    | 'triangle-down'
    | 'triangle-left'
    | 'triangle-right'
    | 'triangle-up'
    | 'tripadvisor'
    | 'tumblr'
    | 'tv'
    | 'twitch'
    | 'twitter'
    | 'uikit'
    | 'unlock'
    | 'upload'
    | 'user'
    | 'users'
    | 'video-camera'
    | 'vimeo'
    | 'warning'
    | 'whatsapp'
    | 'wordpress'
    | 'world'
    | 'x'
    | 'xing'
    | 'yelp'
    | 'yootheme'
    | 'youtube';
