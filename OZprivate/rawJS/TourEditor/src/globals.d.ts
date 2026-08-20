import type { HighlightsEditorApi, TourEditorApi, HighlightDetail, HighlightStr, Pinpoint, ResolvedPinpoint, TreeNode } from './types';

interface OneZoomController {
    root: TreeNode;
    highlight_detail: () => HighlightDetail[];
    highlight_replace: (highlightStrs: HighlightStr[]) => Promise<void>;
    leap_to: (ozid: number) => void;
    tour_start: (
        tourSetting: Text | string,
        options?: { on_complete?: () => void },
    ) => Promise<void>;
    tour_goto_stop: (step: number) => void;
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

interface ServerUrls {
    data_path_pics: (src: number | string, srcId: number | string) => string;
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
        server_urls?: ServerUrls;
    }

    const onezoom: OneZoom;
}

export {};
