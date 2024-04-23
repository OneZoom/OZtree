/**
 * Add autoplay functionality for Vimeo video in tourstops.
 *
 * Designed to be used with ``applications.OZtree.modules.embed:media_embed``, i.e.
 *
 *     {{from applications.OZtree.modules.embed import media_embed}}
 *     <div class="tour">
 *       <div class="container">{{=XML(media_embed(url, ts_autoplay='tsstate-active_wait'))}}</div>
 *     </div>
 *
 * See {@link https://developer.vimeo.com/player/sdk/basics}
 */
function handler(tour) {
  const el_videos = Array.from(tour.container[0].querySelectorAll(":scope iframe.embed-vimeo"));

  // No vimeo, stop here.
  if (el_videos.length === 0) return;

  // Add reference to tourstop from embedded iframe
  el_videos.forEach((el_video) => {
    el_video.el_tourstop = el_video.closest('.tour > .container');
    el_video.el_tourstop.classList.add('contains-vimeo');
    // Split attribute into array, filter off empty entries (i.e. when attribute itself is empty)
    el_video.autoplay_states = (el_video.getAttribute('data-ts_autoplay') || '').split(" ").filter(x => x);
  });

  return new Promise((resolve) => {
    if (window.Vimeo) {
      // Vimeo API already loaded, nothing to do
      resolve();
    } else {
      // Load Vimeo API into current document
      var tag = document.createElement('script');
      tag.src = "https://player.vimeo.com/api/player.js";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Poll until Vimeo is available. Doesn't seem to be an async option
      let count = 0;
      const intervalId = setInterval(() => {
        console.log("Waiting for Vimeo");
        if (window.Vimeo) {
          clearTimeout(intervalId);
          resolve();
        } else if (count++ > 100) {
          clearTimeout(intervalId);
          throw new Error("Timeout waiting for vimeo to load");
        }
      }, 100);
    }
  }).then(() => {
    // Create a new player object for every existing iframe & block progression when playing
    return el_videos.forEach((el_video) => {
      el_video.vimeoplayer = new Vimeo.Player(el_video);
      el_video.vimeoplayer.on('play', function (data) {
        const tourstop = this.element.el_tourstop.tourstop;
        const block_name = this.element.src;

        if (tourstop.tour.state !== 'tstate-playing') {
          tourstop.tour.user_resume();
        }

        if (tourstop.state === el_video.autoplay_states.slice(-1)[0]) {
          tourstop.block_add(block_name);
        }
      });
      el_video.vimeoplayer.on('pause', function (data) {
        const tourstop = this.element.el_tourstop.tourstop;
        const block_name = this.element.src;

        el_video.vimeoplayer.getEnded().then((ended) => {
          // If AV is ending (rather than pausing mid-video, do nothing and let the ended event handle things
          if (ended) return;

          if (tourstop.state === 'tsstate-active_wait' && tourstop.tour.state === 'tstate-playing') {
            tourstop.tour.user_pause();
          }
        });
      });
      el_video.vimeoplayer.on('ended', function (data) {
        const tourstop = this.element.el_tourstop.tourstop;
        const block_name = this.element.src;
        
        tourstop.block_remove(block_name);
      });
    })
  }).then(() => {
    // Attach observers for any autoplaying video
    tour.tourstop_observer('.contains-vimeo', '*', (tour, tourstop, el_ts) => {
      el_ts.querySelectorAll(":scope iframe.embed-vimeo").forEach((el) => {
        el.vimeoplayer.getPaused().then((paused) => {

          if (!paused) {
            if (window.getComputedStyle(el_ts).visibility !== 'visible') {
              // Shouldn't ever play whilst invisible
              el.vimeoplayer.pause();
              el.vimeoplayer.setCurrentTime(0);
            } else if (tour.state != 'tstate-playing') {
              // Pause when tour is paused
              el.vimeoplayer.pause();
            }
          } else if (tour.state === 'tstate-playing' && el.autoplay_states.indexOf(tourstop.state) > -1) {
            el.vimeoplayer.play();

            // Check to see if final block should be added
            if (tourstop.state === el.autoplay_states.slice(-1)[0]) {
              if (!paused) tourstop.block_add(el.src);
            }
          }

        });
      });
    });
  });
}

export default handler;
