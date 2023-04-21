/**
 * Return querystring that will do the opposite of (new_qs)
 */
function inverse_qs(new_qs, current_qs) {
  let new_sp = new URLSearchParams(new_qs);
  let current_sp = new URLSearchParams(current_qs || '');
  let out_sp = new URLSearchParams();

  for (let k of new Set(new_sp.keys())) {
    let values = current_sp.getAll(k);

    if (values.length === 0) {
      // Not set before, have a "key=" entry to clear it
      out_sp.set(k, '');
    } else {
      for (let v of values) out_sp.append(k, v);
    }
  }

  return '?' + out_sp.toString();
}

/**
 * Apply / unapply tree changes in a tourstop
 */
function handler(tour) {
  return new Promise((resolve) => {
    tour.tourstop_observer('*[data-qs_opts]', ['tsstate-transition_in', 'tsstate-active_wait'], (tour, tourstop, el_ts) => {
      var new_qs = (el_ts.getAttribute('data-qs_opts')
                   // Make sure there's a leading question mark
                   .replace(/^\??/, '?')
                   // Remove into_node parameter, not handled here
                   .replace(/into_node=[^&]*(&?)/, '')
                   );
      if (new_qs === '?') return;

      tourstop.hander_qsopts_old_qs = inverse_qs(new_qs, window.location.search);
      tour.onezoom.controller.set_treestate(new_qs);
    }, (tour, tourstop, el_ts) => {
      if (tourstop.hander_qsopts_old_qs) {
        tour.onezoom.controller.set_treestate(tourstop.hander_qsopts_old_qs);
        tourstop.hander_qsopts_old_qs = null;
      }
    });
    resolve();
  });
}

export default handler;
