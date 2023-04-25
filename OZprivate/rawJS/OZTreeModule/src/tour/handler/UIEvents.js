/**
 * Bind previous, next, pause, play, exit button event
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
