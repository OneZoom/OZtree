import type { HighlightsEditorApi, TourEditorApi, HighlightDetail, HighlightStr, Pinpoint, ResolvedPinpoint, TreeNode } from './types';

interface OneZoomController {
    root: TreeNode;
    highlight_detail: () => HighlightDetail[];
    highlight_replace: (highlightStrs: HighlightStr[]) => Promise<void>;
    leap_to: (ozid: number) => void;
}

interface OneZoom {
    controller: OneZoomController;
    utils: {
        node_to_pinpoint: (node: TreeNode) => Pinpoint | null;
        resolve_pinpoints: (pinpoints: string[]) => Promise<ResolvedPinpoint[]>;
    };
    add_hook: (name: string, handler: (node: TreeNode) => boolean | void) => number;
    remove_hook: (name: string, id: number) => void;
}

interface JQueryOn {
    one: (event: string, handler: () => void) => void;
}

interface JQueryStatic {
    (el: Document): JQueryOn;
}

interface UIkitGlobal {
    update: (el: Element) => void;
}

declare global {
    interface Window {
        onezoom: OneZoom;
        tourEditor: TourEditorApi;
        highlightsEditor: HighlightsEditorApi;
        jQuery: JQueryStatic;
        UIkit?: UIkitGlobal;
    }

    const onezoom: OneZoom;
}

export {};
