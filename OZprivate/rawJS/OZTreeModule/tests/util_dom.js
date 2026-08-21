var jsdom = require('jsdom');
const { JSDOM } = jsdom;

/**
 * Give (test) its own window/document/localStorage globals, torn down at the end
 * of the test so nothing is inherited by whatever runs next.
 *
 * Returns the JSDOM instance, for tests that need e.g. dom.window.MutationObserver.
 */
export function setup_dom(test, html = '<html><body></body></html>') {
  const dom = new JSDOM(html, {
    // NB: An origin is required for (window.localStorage) to be available
    url: 'https://www.onezoom.org/',
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;

  test.teardown(function () {
    dom.window.close();
    // NB: A closed window throws on access, so don't leave it lying around
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  return dom;
}

/**
 * Give (test) a bare (window) global with (props), for tests that want to fake
 * parts of the window without needing a DOM. Removed again at the end of the test.
 */
export function setup_fake_window(test, props = {}) {
  global.window = { ...props };

  test.teardown(function () {
    delete global.window;
  });

  return global.window;
}
