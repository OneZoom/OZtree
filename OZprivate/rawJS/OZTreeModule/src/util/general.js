/**
 * this function enables resolution of a JSON object
 * for example say the address in a JSON is a.b.c but we don't know what a is, 
 * we store 'b.c' as a string then call this function on a. 
 */

export function resolve(obj, str) {
  return str.split('.').reduce(function(prev, curr) {
        return prev ? prev[curr] : undefined
    }, obj || self)
}

export let is_on_mobile = (global && !global.navigator) // i.e. a unit test
    || navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i);
