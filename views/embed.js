{{ # Ensure we only include this once
try:
    __include_embed_js
except NameError:
    __include_embed_js = True
}}
/* When a page is embedded, we assume it is in the tree viewer, and thus needs pinch zoom functionality
 * removing, otherwise the viewer itself will be pinch zoomed. A better way would be to pass this
 * onto the iframe but not the rest of the viewer, e.g. by using http://timmywil.github.io/jquery.panzoom/.
 */
function preventTouchZoom(event) {
    if(event.touches.length > 1) {
        {{if is_testing:}}if (window.zoom_prevented_func !== undefined) {window.zoom_prevented_func();};/* used for functional testing */{{pass}}
        event.preventDefault(); 
        event.stopPropagation();
    };
}
$(document).ready(function() {
    $("body").on("touchstart touchmove touchend", preventTouchZoom);
});

{{
## Set up and override python functions for embedding
# Embedded pages are our own pages used as iframes within the viewer, and have e.g. toolbars etc absent.
# They also have pinch-zooming turned off, as this zooms the entire page, not just the iframe
# We may also wish to "sandbox" links within embedded pages e.g. for museum displays. 
# The degree of sandboxing is specified by the 'embed' parameter as follows:
#1 no sandboxing: all links open as normal. Links that are internal (i.e. use the URL helper) 
#  should pass on the embed status (this also avoids embedding the tree viewer itself) (normal display)
#  We would probably like to stop URLs that open in a new tab (e.g. within an A(... _target="_blank") helper
#  from also adding embed, but this is diffcult to do, so these should be hardcoded urls instead
#2 minor "sandbox": all links open in a new tab (the "embed" need not be passed on to these links)
#3 can only follow relative links without _target set (and cannot e.g. right click): embed status should be passed on (normal museum display)
#4 cannot follow links at all (and cannot e.g. right click) 
if request.vars.embed:
}}
{{
  if request.vars.embed=='1':
    #add embed status to internal links that have no _target set (if they have one set, they won't be embedded)
    web2py_URL = URL
    def URL(*args, **kwargs): return web2py_URL(*args, **dict(kwargs, vars=dict(kwargs.get('vars') or {}, embed=request.vars.embed)))
  elif request.vars.embed=='2':
    #make *all* links created via the web2py A() helper open in a new tab, e.g. from logos - this should override others
    web2py_A = A
    def A(*args, **kwargs): return web2py_A(*args, **dict(kwargs, _target='_blank'))
  else:
}}

/* disable right click */ document.oncontextmenu = function() {return false;}

{{
    if request.vars.embed=='3':
      #add embed to any internal URLs 
      web2py_URL = URL
      def URL(*args, **kwargs): return web2py_URL(*args, **dict(kwargs, vars=dict(kwargs.get('vars') or {}, embed=request.vars.embed)))
      #remove external A href links
      web2py_A = A
      def A(*args, **kwargs): return web2py_A(*args, **kwargs) if '_target' not in kwargs and ('_href' not in kwargs or kwargs['_href'].startswith(".") or (kwargs['_href'].startswith("/") and not kwargs['_href'].startswith("//"))) else SPAN(*args, _style="text-decoration: underline;", **kwargs)
    elif request.vars.embed=='4':
      #remove hyperlink from *all* links created via the web2py A() helper
      def A(*args, **kwargs): return SPAN(*args, _style="text-decoration: underline;", **kwargs)
    pass
  pass
pass
}}
{{pass # end inclusion test}}