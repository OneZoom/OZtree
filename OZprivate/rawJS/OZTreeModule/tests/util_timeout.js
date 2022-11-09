/** How long the timer is waiting for */
export function getTimeoutValue(timer) {
    return timer._idleTimeout;
}

/** Force timeout to happen now, close it */
export function triggerTimeout(timer) {
    timer._onTimeout();
    clearTimeout(timer);
}

