/**
 * Support HTML audio in tourstops
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio
 */
function handler(tour) {
  const el_audios = Array.from(tour.container[0].querySelectorAll(":scope audio"));

  // No vimeo, stop here.
  if (el_audios.length === 0) return;

  // Add reference to tourstop from embedded iframe
  el_audios.forEach((el) => {
    el.el_tourstop = el.closest('.tour > .container');
    el.el_tourstop.classList.add('contains-httpaudio');
  });

  return Promise.resolve().then(() => {
    // Attach events to block progression when playing
    return el_audios.forEach((el) => {
      el.addEventListener('play', (e) => {
        event.target.el_tourstop.tourstop.block_add('httpaudioplaying');
      });
      el.addEventListener('ended', (e) => {
        event.target.el_tourstop.tourstop.block_remove('httpaudioplaying');
      });
    })
  }).then(() => {
    // Attach observers for any autoplaying audio
    tour.tourstop_observer(
      ".contains-httpaudio",
      ['tsstate-active_wait'],
      function (tour, el_ts) {
        // Start playing
        el_ts.querySelectorAll(":scope audio").forEach((el) => {
          el.play();
        });
      },
      function (tour, el_ts) {
        // Leaving tourstop, stop & rewind
        el_ts.querySelectorAll(":scope audio").forEach((el) => {
          el.pause();
          el.currentTime = 0;
        });
      },
    );
  });
}

export default handler;
