import { createRoot } from 'react-dom/client';
import HighlightsEditor from './HighlightsEditor';

window.highlightsEditor = {
    // Trying to open the panel before it's mounted is a no-op
    togglePanel: () => {},
};

function mount() {
    const el = document.getElementById('highlights-editor-root');
    if (!el) return;
    const root = createRoot(el);
    root.render(<HighlightsEditor />);
}

window.jQuery(document).one('setupOneZoom', mount);
