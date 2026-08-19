import { useEffect, useRef } from 'react';
import { toHighlightStr } from './highlights';
import type { EditorHighlight } from './types';

/**
 * One-way sync of editor highlights to ``controller.highlight_replace``.
 * Does not write while ``enabled`` is false (so page-load URL highlights stay
 * until a panel actually opens).
 *
 * When ``enabled`` becomes false or the component unmounts, the effect cleanup
 * can clear tree highlights (``clearOnDisable``).
 */
export function useHighlightTreeSync(
    highlights: EditorHighlight[],
    enabled: boolean,
    { clearOnDisable = false }: { clearOnDisable?: boolean } = {},
): void {
    const lastWritten = useRef<string[] | null>(null);
    const wasEnabled = useRef(false);

    useEffect(() => {
        if (!enabled) {
            wasEnabled.current = false;
            return;
        }

        const strs = highlights.map(toHighlightStr);
        const becameEnabled = !wasEnabled.current;
        wasEnabled.current = true;
        if (!becameEnabled && JSON.stringify(strs) === JSON.stringify(lastWritten.current)) {
            return;
        }
        lastWritten.current = strs;
        void window.onezoom.controller.highlight_replace(strs);
    }, [highlights, enabled]);

    useEffect(() => {
        if (!enabled || !clearOnDisable) return undefined;

        return () => {
            lastWritten.current = null;
            void window.onezoom.controller.highlight_replace([]);
        };
    }, [enabled, clearOnDisable]);
}
