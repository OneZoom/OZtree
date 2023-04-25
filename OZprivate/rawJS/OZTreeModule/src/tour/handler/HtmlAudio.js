/**
 * Add autoplay functionality for HTML audio in tourstops.
 *
 * Designed to be used with ``applications.OZtree.modules.embed:media_embed``, i.e.
 *
 *     {{from applications.OZtree.modules.embed import media_embed}}
 *     <div class="tour">
 *       <div class="container">{{=XML(media_embed(url, ts_autoplay='tsstate-active_wait'))}}</div>
 *     </div>
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio}
 */
function handler(tour) {
  const el_audios = Array.from(tour.container[0].querySelectorAll(":scope audio"));

  // No vimeo, stop here.
  if (el_audios.length === 0) return;

  // Add reference to tourstop from embedded iframe
  el_audios.forEach((el) => {
    el.el_tourstop = el.closest('.tour > .container');
    el.el_tourstop.classList.add('contains-httpaudio');
    // Split attribute into array, filter off empty entries (i.e. when attribute itself is empty)
    el.autoplay_states = (el.getAttribute('data-ts_autoplay') || '').split(" ").filter(x => x);
  });

  return Promise.resolve().then(() => {
    // Attach events to block progression when playing
    return el_audios.forEach((el) => {
      el.addEventListener('play', (e) => {
        const tourstop = e.target.el_tourstop.tourstop;
        const block_name = event.target.src;

        if (tourstop.state === el.autoplay_states.slice(-1)[0]) {
          event.target.el_tourstop.tourstop.block_add(block_name);
        }
      });
      el.addEventListener('ended', (e) => {
        const tourstop = e.target.el_tourstop.tourstop;
        const block_name = event.target.src;

        event.target.el_tourstop.tourstop.block_remove(block_name);
      });
    })
  }).then(() => {
    // Attach observers for any autoplaying audio
    tour.tourstop_observer('.contains-httpaudio', '*', (tour, tourstop, el_ts) => {
      el_ts.querySelectorAll(":scope audio").forEach((el) => {
        if (window.getComputedStyle(el_ts).visibility !== 'visible') {
          // Shouldn't ever play whilst invisible
          el.pause();
          el.currentTime = 0;
        } else if (el.autoplay_states.indexOf(tourstop.state) > -1) {
          el.play();

          // Check to see if final block should be added
          if (tourstop.state === el.autoplay_states.slice(-1)[0]) {
            if (!el.paused) tourstop.block_add(el.src);
          }
        }
      });
    });
  });
}

export default handler;
