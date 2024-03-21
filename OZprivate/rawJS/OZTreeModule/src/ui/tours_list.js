import { progressSummary } from '../tour/handler/TsProgress.js';

export function sortList(elUl) {
  Array.from(elUl.children).forEach((elLi) => {
    const progressEl = elLi.querySelector(':scope progress');
    const tourIdentifier = elLi.getAttribute('data-tour_identifier');
    const p = progressSummary(tourIdentifier);

    // Order items in_progress / untouched / finished
    elLi.style.order = p.finished ? 1 : p.in_progress ? -1 : 0;

    // Update progress meter with state
    progressEl.setAttribute('value', p.progress);
    progressEl.setAttribute('max', p.total);
    progressEl.classList.toggle('complete', p.finished);
    progressEl.textContent = (100 * (p.progress / p.total)) + " %";
  });
}

/**
 * Given a list of tours from /tours/list.json, find a tour to tease
 */
export function teaseTour(tours) {
  // Cache progressSummary for tours, so we don't hammer localStorage whilst searching
  const psCache = {};
  function cachedProgressSummary (tourIdentifier) {
    if (!psCache[tourIdentifier]) {
      psCache[tourIdentifier] = progressSummary(tourIdentifier);
    }
    return psCache[tourIdentifier];
  }

  return tours.find((t) => {
    // Try find the first in_progress tour
    return cachedProgressSummary(t.identifier).in_progress;
  }) || tours.find((t) => {
    // No in_progress tours, look for the first tour that isn't finished
    return !cachedProgressSummary(t.identifier).finished;
  }) || null;
}
