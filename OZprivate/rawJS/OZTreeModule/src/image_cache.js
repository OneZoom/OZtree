import config from './global_config';

let pic_map = {};
let count = 0;

export function get_image(src, filename, preferred_px=null) {
  if (filename && src) {
    let url = config.pic.data_path_pics(src, filename, preferred_px); //use url as key into the cache array
    if (!pic_map[url]) {
      pic_map[url] = {};
      pic_map[url].image = new Image();
      pic_map[url].image.src = url;
    }
    pic_map[url].last_used = count++;
    return image_ready(pic_map[url].image) ? pic_map[url].image : null;
  } else {
    return null;
  }
}

export function image_ready(image) {
  return image && image.complete && !isNaN(image.naturalWidth) && image.naturalWidth > 0;
}


setInterval(clear_least_used_image, config.pic.clear_image_cache_interval);

//sort images by its last used time. Delete least used images so that the pic_map size won't exceed the max allowed pic_map size.
function clear_least_used_image() {
  if (Object.keys(pic_map).length > config.pic.max_allowed_pic_map_size) {
    let pic_array = [];
    for (let key in pic_map) {
      pic_array.push(key);
    }
    pic_array.sort(function(a,b) {
      if (pic_map[a].last_used < pic_map[b].last_used) {
        return 1;
      } else if (pic_map[a].last_used > pic_map[b].last_used) {
        return -1;
      } else {
        return 0
      }
    });
    for (let i=config.pic.max_allowed_pic_map_size; i<pic_array.length; i++) {
      delete pic_map[pic_array[i]];
    }
  }
}

