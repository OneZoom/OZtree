let hook = {};

/**
 * Hooks help to decouple controller from some relatively loosely connected module.
 * For example, garbage collection module is quite an independent module. In order to avoid slowness during garbage collection, the app set a timeout to postpone garbage collection 
 * after canvas refresh. If we don't use hook, then we would import garbage collection and call garbage's api to set the timer. However, this behaviour is more closely related
 * to garbage collection rather than controller. Controller should not know whether it needs to set a timer or do any other staffs to make other modules work. Therefore, I decide
 * to provide a hook before and after canvas refresh. Other modules could add callbacks to these hooks and keep the controller unchanged.
 */
function add_hook(key, handler) {
  if (!hook[key]) hook[key] = [];
  hook[key].push(handler);
}
function remove_hook(key) {
  hook[key] = [];
}
function call_hook(key) {
  const handlers = hook[key];
  if (handlers) {
    for (let i=0; i<handlers.length; i++) {
      handlers[i].call();
    }
  }
}

export {add_hook, remove_hook, call_hook};