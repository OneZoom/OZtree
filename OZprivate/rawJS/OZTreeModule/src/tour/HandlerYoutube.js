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
          const el = event.target.getIframe().el_tourstop;

          if (event.data == YT.PlayerState.ENDED) {
            el.classList.remove('block-youtubeplaying');
          } else if (event.data == YT.PlayerState.PLAYING) {
            el.classList.add('block-youtubeplaying');
          }
          // NB; Ignore other events, particularly UNSTARTED since this happens after end
        },
      },
    }))));
  }).then(() => {
    // Attach observers for any autoplaying video
    tour.tourstop_observer(
      ".contains-youtube",
      ['tsstate-active_wait'],
      function (tour, el_ts) {
        // Start video playing,
        el_ts.querySelectorAll(":scope iframe.embed-youtube").forEach((el_yt) => {
          window.YT.get(el_yt.id).playVideo();
        });
      },
      function (tour, el_ts) {
        // Leaving tourstop, stop any video
        el_ts.querySelectorAll(":scope iframe.embed-youtube").forEach((el_yt) => {
          window.YT.get(el_yt.id).stopVideo();
        });
      },
    );
  });
}

export default handler;
