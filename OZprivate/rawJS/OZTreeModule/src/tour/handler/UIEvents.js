/**
 * Bind button events based on CSS classes, pause tree when hidden
 *
 * This handler enables behavioural CSS classes to control the tour, for example:
 *
 *     <div class="tour">
 *       <div class="container" data-ott="770315">
 *         ... Tour stop HTML ...
 *         <div class='footer'>
 *           <span class='button tour_backward'>← {{=T('Previous')}}</span>
 *           <span class='button tour_resume'>{{=T('Resume tutorial')}}</span>
 *           <span class='button tour_exit'>{{=T('Exit tutorial')}}</span>
 *           <span class='button tour_forward'>{{=T('Skip')}} →</span>
 *           <span class='button tour_goto stop_5'>{{=('Visit stop')}} 5</span>
 *           <select class="tour_goto"><option value="5">5</option</select>
 *         </div>
 *       </div>
 *     </div>
 *
 * On clicking ``tour_backward`` / ``tour_forward``, the tour will go backwards/forwards.
 * On clicking ``tour_exit``, the tour will close.
 *
 * When the tour is paused (e.g. as a result of user interaction) the ``tour_resume`` button will be visible,
 * clicking it will resume the tour.
 *
 * Note that these buttons have to be added to every tourstop. A template include,
 * ``{{ include "tour/tourstop/footer.html" }}`` exists to make this easier.
 *
 * When the document is on a hidden tab, a block will be added to tourstops, so we do not advance from the current tourstop.
 */
function handler(tour) {
  const document = tour.container[0].ownerDocument;

  tour.container.click((e) => {
    var target = $(e.target).closest('.tour_forward,.tour_backward,.tour_goto,.tour_play,.tour_pause,.tour_resume,.tour_exit,.exit_confirm,.exit_cancel');

    if (target.length === 0) return;
    if (target.hasClass('tour_forward')) return tour.user_forward()
    if (target.hasClass('tour_backward')) return tour.user_backward()
    if (target.hasClass('tour_play')) return tour.user_play()
    if (target.hasClass('tour_pause')) return tour.user_pause()
    if (target.hasClass('tour_resume')) return tour.user_resume()
    if (target.hasClass('tour_exit')) return tour.user_exit()
    if (target[0].tagName !== 'SELECT' && target[0].classList.contains('tour_goto')) {
      let m = target[0].className.match(/(?:\W|^)stop_(\d+)/);

      if (!m) throw new Error("tour_goto class set without stop_(n) class: ", target[0].className);
      return tour.goto_stop(parseInt(m[1], 10));
    }
    if (target.hasClass('exit_confirm')) {
      tour.exit_confirm_popup.hide()
      return tour.user_exit()
    }
    if (target.hasClass('exit_cancel')) {
      tour.exit_confirm_popup.hide()
      return tour.user_resume()
    }
  });
  tour.container.change((event) => {
    var target = event.target.closest('.tour_goto');

    if (!target) return;
    if (target.tagName === 'SELECT' && target.classList.contains('tour_goto')) {
      return tour.goto_stop(parseInt(target.value, 10));
    }
  });

  // Resize tourstop containers when grabbed by handles
  var downInit = null;
  const onMouseMove = (event) => {
    if (!downInit) return;
    var y = event.touches ? event.touches[0].screenY : event.screenY;
    downInit.tourstop.style.height = Math.max(downInit.offset - y, 50) + 'px';
    downInit.move = true;
  };
  const onMouseUp = (event) => {
    const minimisedHeight = Array.from(downInit.tourstop.children).map(function (el) {
      if (el.classList.contains('header') || el.classList.contains('actions') || el.classList.contains('footer')) {
        // https://youmightnotneedjquery.com/#elements
        const style = getComputedStyle(el);

        return (
          el.getBoundingClientRect().height +
          parseFloat(style.marginTop) +
          parseFloat(style.marginBottom)
        );
      }

      return 0;
    }).reduce((acc, a) => acc + a, 0) + 20;  // NB: Not sure where the 20 pixels are coming from

    function resizeTo(elTs, height, callback) {
      elTs.style.transition = 'height 0.3s ease-out';
      elTs.style.height = height + 'px';
      window.setTimeout(() => {
        elTs.style.transition = '';
        if (callback) callback();
      }, 300);
    }

    if (event.touches) {
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('touchcancel', onMouseUp);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    if (!downInit.move) {
      // If we didn't move, toggle pause/resume
      if (Math.abs(downInit.tourstop.offsetHeight - minimisedHeight) < 3) {
          resizeTo(downInit.tourstop, downInit.tourstop.ozOrigHeight, () => tour.user_resume());
      } else {
          resizeTo(downInit.tourstop, minimisedHeight, () => tour.user_pause());
      }
    } else if (downInit.tourstop.offsetHeight < minimisedHeight * 0.8) {
      resizeTo(downInit.tourstop, 0, () => tour.user_exit());
    } else if (downInit.tourstop.offsetHeight < minimisedHeight * 1.5) {
      resizeTo(downInit.tourstop, minimisedHeight, () => tour.user_pause());
    } else {
      resizeTo(downInit.tourstop, downInit.tourstop.ozOrigHeight, () => tour.user_resume());
    }
    downInit = null;
  };
  const onMouseDown = (event) => {
    const elHeader = event.target.closest('.header');

    if (elHeader && elHeader.querySelector(':scope .handle').offsetParent) {
      // Clicked on header & handle visible, so enable resize
      const container = event.target.closest('.container');
      var y = event.touches ? event.touches[0].screenY : event.screenY;
      downInit = {target: event.target, tourstop: container, offset: container.offsetHeight + y};
      if (!downInit.tourstop.style.height) {
          // Store natural height
          downInit.tourstop.ozOrigHeight = downInit.tourstop.offsetHeight;
          // Fix the height at the current height, so animations work
          downInit.tourstop.style.height = downInit.tourstop.ozOrigHeight + 'px';
      }

      if (event.touches) {
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('touchend', onMouseUp);
        document.addEventListener('touchcancel', onMouseUp);
      } else {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    }
  };
  tour.container[0].addEventListener('mousedown', onMouseDown);
  tour.container[0].addEventListener('touchstart', onMouseDown);
  tour.tourstop_observer('*', '*', (tour, tourstop, el_ts) => {
    // Reset tourstop height after any state change
    el_ts.style.height = '';
  });

  // Listen to document level visibility (read: inactive tab), translate to tourstop blocks
  const onVisibilityChange = (e) => {
    tour.tourstop_array.forEach((ts) => {
      ts.block_toggle('hiddentab', document.visibilityState !== 'visible');
    });
  };
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

export default handler;
