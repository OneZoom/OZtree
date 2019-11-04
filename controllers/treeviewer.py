### NOTE that the views in views/treeviewer are mostly accessed from default.py, not here
### This allows URLs like onezoom.org/life/ rather than onezoom.org/treeviewer/life/
### but still allows us to place all the tree viewer code in a single directory

from OZfunctions import lang_primary, language, __check_version

def js_strings():
    """
    A json response for all the translatable strings in our javascript, so that we can
    use translatable strings in the viewer ECMAscript without compiling translations into
    the code
    """
    return dict()

def UI_layer():
    """
    We require any UI to provide the main html code for the UI in a separate page,
    viewer_UI, so the whole skin can be reloaded using a different language, e.g. if we
    switch to French
    """

    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    tabs = dict(current.OZglobals['tab_definitions'])
    tabs.update(request.vars.get('custom_tabs', {}))
    tab_defaults = current.OZglobals['tab_defaults']

    if 'tabs' not in request.vars:
        requested_tabs = [tabs[x] for x in tab_defaults if x in tabs]
    else:
        # If tabs specified, whittle down to the specified tags, in the specified order
        if not isinstance(request.vars.tabs, list):
            request.vars.tabs = [request.vars.tabs]
        if 'default' in request.vars.tabs:
            requested_tabs=[tabs[x] for x in tab_defaults if x in tabs]
        elif 'all' in request.vars.tabs:
            requested_tabs=tabs.values()
        else:
            requested_tabs = [tabs[x] for x in request.vars.tabs if x in tabs]

    return dict(browser_language=language(lang_primary(request)), tabs=requested_tabs)

def minlife():
    """
    A minimum version for restricted installation that does not contain the text tree and
    disallows language / tree switching. This will be downloaded from the main OZ server
    """
    return dict(
        page_info = {
            'title_name':'Minimal OneZoom page',
            'try_local_treefiles_version':__check_version()})

def about_plus_data():
    """
    Only in the treeviewer
    """
    return dict()
