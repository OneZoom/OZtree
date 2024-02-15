/**
 * Adds progress information to a select.tour_goto dropdown
 *
 * Add a "ts-progress" class to a tour_goto select, and initial characters will display the progress
 * through that tour.
 *
 * State is either stored in localStorage or in browser memory if localStorage isn't available.
 *
 * See {@link tour/handler/UIEvents} for tour_goto markup
 */
function handler(tour) {
  // Without an identifier, we can't store state
  if (!tour.container[0].getAttribute("data-identifier")) return Promise.resolve();

  return new Promise((resolve) => {
    updateTsProgress(tour, progressStore(tour));

    tour.tourstop_observer('*', ['tsstate-active_wait'], (tour, tourstop, el_ts) => {
      const progress = progressStore(tour);
      progress[tour.curr_step] = true;
      progressStore(tour, progress)
      updateTsProgress(tour, progress);
    });

    resolve();
  });
}

function updateTsProgress(tour, progress) {
  tour.tourstop_array.map((ts, tsIdx) => {
    const tspEl = ts.container[0].querySelector(':scope select.ts-progress')
    if (!tspEl) return;

    Array.from(tspEl.options).map((optEl, optIdx) => {
      const val = parseInt(optEl.value, 10);
      if (isNaN(val)) return; // Ignore any "current" entries

      // Append character state to all other entries
      optEl.textContent = optEl.textContent.replace(
        // Select any previous character state to replace, if it exists
        /^\uFE0E[^ ]+ |^/,
        // Replace with new character
        // NB: \uFE0E suppress Emoji-rendering: https://en.wikipedia.org/wiki/Variation_Selectors_(Unicode_block)
        val === tsIdx ? "\uFE0E⇨ " : progress[val] ? "\uFE0E▣ " : "\uFE0E☐ ",
      );
    });
  });
}

function progressStore(tour, newVal) {
  const storageKey = 'ts-progress-' + tour.container[0].getAttribute("data-identifier");

  if (newVal) {
    if (newVal.length !== tour.tourstop_array.length) {
        throw new Error(`Progress invalid length: ${newVal.length} vs ${tour.tourstop_array.length}`);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(newVal));
    } catch (error) {
      // No localStorage, store in-memory
      if (!window.fakeLs) window.fakeLs = {};
      window.fakeLs[storageKey] = newVal;
    }
    return newVal;
  }
  
  // Fetch current state from storage
  var progress;
  try {
    progress = JSON.parse(localStorage.getItem(storageKey));
  } catch(error) {
    progress = (window.fakeLs || {})[storageKey];
  }
  if (progress && progress.length === tour.tourstop_array.length) return progress;

  // No state / invalid number of tourstops, return fresh state
  return Array.from({length: tour.tourstop_array.length}, () => false);
}

export default handler;
