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
