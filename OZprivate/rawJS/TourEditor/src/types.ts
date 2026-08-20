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
