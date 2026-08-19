import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import HighlightsEditor from './HighlightsEditor';
import TourEditor from './TourEditor';

window.tourEditor = {
    togglePanel: () => {},
};
window.highlightsEditor = {
    togglePanel: () => {},
};

type OpenPanel = 'tour' | 'highlights' | null;

function ExpertEditors() {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

    const closePanels = useCallback(() => setOpenPanel(null), []);
    const toggleTour = useCallback(() => {
        setOpenPanel((current) => (current === 'tour' ? null : 'tour'));
    }, []);
    const toggleHighlights = useCallback(() => {
        setOpenPanel((current) => (current === 'highlights' ? null : 'highlights'));
    }, []);

    return (
        <>
            <TourEditor
                isOpen={openPanel === 'tour'}
                onClose={closePanels}
                onToggle={toggleTour}
            />
            <HighlightsEditor
                isOpen={openPanel === 'highlights'}
                onClose={closePanels}
                onToggle={toggleHighlights}
            />
        </>
    );
}

function mount() {
    const el = document.getElementById('tour-editor-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(<ExpertEditors />);
}

window.jQuery(document).one('setupOneZoom', mount);
