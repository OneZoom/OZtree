import get_controller from '../controller/controller';
/*
 * Collect nodes and leaves which are on or near the main branch in the fly animation. Fetch details of 
 * these nodes before fly animation.
*/
function page_loading_anim(OZIDin, init) {
  console.log(arguments);
  get_controller().fly_to_node(OZIDin, init);
}

export {page_loading_anim};
