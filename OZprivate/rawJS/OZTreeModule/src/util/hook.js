let hook = {};

/**
 * Hooks help to decouple controller from some relatively loosely connected module.
 * For example, garbage collection module is quite an independent module. In order to 
 * avoid slowness during garbage collection, the app set a timeout to postpone garbage
 * collection after canvas refresh. If we don't use hook, then we would import garbage
 * collection and call garbage's api to set the timer. However, this behaviour is more
 * closely related to garbage collection rather than controller. Controller should not
 * know whether it needs to set a timer or do any other staffs to make other modules work.
 * Therefore, I decide to provide a hook before and after canvas refresh. Other modules
 * could add callbacks to these hooks and keep the controller unchanged.
 *
 * Another use for hooks is to provide functions to call e.g. on mouse_down, touch_move,
 * etc.
 */
 
/**
 * Each time add_hook(foo) is called it returns an identifier which can be used to remove
 * that hook using remove_hook(foo, id) 
 */
 
function add_hook(key, handler) {
  if (!hook[key]) hook[key] = {};
  let id = 1
  while (id.toString() in hook[key]) {
    id += 1
  }
  hook[key][id.toString()] = handler;
  return id.toString()
}
function remove_hook(key, id) {
  if (id) {
    hook[key] = {};
  } else {
    delete hook[key][id];
  }
}
function call_hook(key, arg) {
  const handlers = hook[key];
  let rv;
  if (handlers) {
    for (let id in handlers) {
      if (handlers[id].call(this, arg) === false) return false;
    }
  }
  return true;
}

export {add_hook, remove_hook, call_hook};