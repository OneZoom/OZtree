# -*- coding: utf-8 -*-
"""
Self-contained functions and constants for dealing with images.

The src_flags are defined in models/_OZglobals.py
"""
import os

from gluon import current

local_web2py = ['static', os.path.join('FinalOutputs', 'img')]  # for use in URL helper
local_path = os.path.join(*local_web2py)  # general path

def thumb_path(src, src_id, preferred_px=None, square=True):
    if preferred_px is None:
        preferred_px = 150  # Currently unused
    # This breaks down all the images into multiple directories depending on last 3 chars
    return os.path.join(str(src), str(src_id)[-3:])

## thumb_url is a python function to return the url to get a thumbnail picture
## we also need to define a javascript equivalent for use on the client side
def thumb_url(base_url, src, src_id, preferred_px=None, square=True):
    if src == 'static':
        # Fetch static resource. This is here so you can get a static resource via.
        # image_cache.js:get_image('static', 'logo.svg')
        return URL('static','images') + '/' + src_id
    return os.path.join(base_url, thumb_path(src, src_id), "{}.jpg".format(src_id))

def js_thumb_url(base_url):
    URL = current.globalenv['URL']

    return '''function(src, src_id, preferred_px, square) {{
      if (src === 'static') {{
        return "{static_base}" + "/" + src_id;
      }}
      return "{base_url}" + src + "/" + src_id.toString().slice(-3) + "/" + src_id + ".jpg";
    }}'''.format(
        static_base=URL('static','images'),
        base_url=base_url,
    )
