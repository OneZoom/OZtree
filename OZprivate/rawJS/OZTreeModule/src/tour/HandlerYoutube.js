/**
 * Support youtube videos in tourstops
 * https://developers.google.com/youtube/iframe_api_reference
 */
function handler(tour) {
  const el_yts = Array.from(tour.container[0].querySelectorAll(":scope iframe.embed-youtube"));

  // No youtube, stop here.
  if (el_yts.length === 0) return;

  // Add reference to tourstop from embedded iframe
  el_yts.forEach((el_yt) => {
    el_yt.el_tourstop = el_yt.closest('.tour > .container');
    el_yt.el_tourstop.classList.add('contains-youtube');
    // Split attribute into array, filter off empty entries (i.e. when attribute itself is empty)
    el_yt.autoplay_states = (el_yt.getAttribute('data-ts_autoplay') || '').split(" ").filter(x => x);
  });

  return new Promise((resolve) => {
    if (window.YT) {
      // Youtube API already loaded, nothing to do
      resolve();
    } else {
      // Load youtube API into current document
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Resolve promise when the API is ready
      window.onYouTubeIframeAPIReady = resolve;
    }
  }).then(() => {
    // Create a new player object for every existing iframe & block progression when playing
    return Promise.all(el_yts.map((el_yt) => new Promise((resolve) => new YT.Player(el_yt, {
      events: {
        onReady: resolve,
        onStateChange: function (event) {
          const iframe = event.target.getIframe();
          const block_name = iframe.src;
          const tourstop = iframe.el_tourstop.tourstop;

          if (event.data == YT.PlayerState.ENDED) {
            tourstop.block_remove(block_name);
          } else if (event.data == YT.PlayerState.PLAYING && tourstop.state === iframe.autoplay_states.slice(-1)[0]) {
            tourstop.block_add(block_name);
          }
          // NB; Ignore other events, particularly UNSTARTED since this happens after end
        },
      },
    }))));
  }).then(() => {
    // Attach observers for any autoplaying video
    tour.tourstop_observer('.contains-youtube', '*', (tour, tourstop, el_ts) => {
      el_ts.querySelectorAll(":scope iframe.embed-youtube").forEach((el) => {
        if (window.getComputedStyle(el_ts).visibility !== 'visible') {
          // Shouldn't ever play whilst invisible
          window.YT.get(el.id).stopVideo();
        } else if (el.autoplay_states.indexOf(tourstop.state) > -1) {
          window.YT.get(el.id).playVideo();

          // Check to see if final block should be added
          if (tourstop.state === el.autoplay_states.slice(-1)[0]) {
            if (window.YT.get(el.id).getPlayerState() === YT.PlayerState.PLAYING) {
              tourstop.block_add(el.src);
            }
          }
        }
      });
    });
  });
}

export default handler;
