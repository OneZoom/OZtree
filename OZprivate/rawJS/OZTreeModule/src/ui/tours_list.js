import { progressSummary } from '../tour/handler/TsProgress.js';

export function sortList(elUl) {
  Array.from(elUl.children).forEach((elLi) => {
    const progressEl = elLi.querySelector(':scope progress');
    const tourIdentifier = elLi.getAttribute('data-tour_identifier');
    const p = progressSummary(tourIdentifier);

    // Update progress meter with state
    progressEl.setAttribute('value', p.progress);
    progressEl.setAttribute('max', p.total);
    progressEl.classList.toggle('complete', p.finished);
    progressEl.textContent = (100 * (p.progress / p.total)) + " %";
  });
}
