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
    var target = $(e.target).closest('.tour_forward,.tour_backward,.tour_play,.tour_pause,.tour_resume,.tour_exit,.exit_confirm,.exit_cancel');

    if (target.length === 0) return;
    if (target.hasClass('tour_forward')) return tour.user_forward()
    if (target.hasClass('tour_backward')) return tour.user_backward()
    if (target.hasClass('tour_play')) return tour.user_play()
    if (target.hasClass('tour_pause')) return tour.user_pause()
    if (target.hasClass('tour_resume')) return tour.user_resume()
    if (target.hasClass('tour_exit')) return tour.user_exit()
    if (target.hasClass('exit_confirm')) {
      tour.exit_confirm_popup.hide()
      return tour.user_exit()
    }
    if (target.hasClass('exit_cancel')) {
      tour.exit_confirm_popup.hide()
      return tour.user_resume()
    }
  })

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
