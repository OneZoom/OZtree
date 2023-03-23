/** How long the timer is waiting for */
export function getTimeoutValue(timer) {
    // No _onTimeout ==> not armed, so return null
    return typeof timer._onTimeout === 'function' ? timer._idleTimeout : null;
}

/** Force timeout to happen now, close it */
export function triggerTimeout(timer) {
    timer._onTimeout();
    clearTimeout(timer);
}

