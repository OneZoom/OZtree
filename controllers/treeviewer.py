### NOTE that the views in views/treeviewer are mostly accessed from default.py, not here
### This allows URLs like onezoom.org/life/ rather than onezoom.org/treeviewer/life/
### but still allows us to place all the tree viewer code in a single directory

from OZfunctions import lang_primary, language, __check_version

def js_strings():
    """
    A json response for all the translatable strings in our javascript, so that we can use translatable
    strings in the viewer ECMAscript without compiling translations into the code
    """
    return dict()

def UI_layer():
    """
    We require any UI to provide the main html code for the UI in a separate page, viewer_UI,
    so the whole skin can be reloaded using a different language, e.g. if we switch to french
    """

    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    tabs = current.OZglobals['tab_definitions']
    tab_defaults = current.OZglobals['tab_defaults']

    if 'tabs' not in request.vars:
        requested_tabs = [tabs[x] for x in tab_defaults if x in tabs]
    else:
        #if tabs specified, then whittle down to the specified tags, in the specified order
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
    A minimum version for restricted installation that does not contain the text tree and disallows language / tree switching
    This version will be downloaded from the main server
    """
    return dict(
        page_info = {'title_name':'Minimal OneZoom page','try_local_treefiles_version':__check_version()})

def about_plus_data():
    """
    Only in the treeviewer
    """
    return dict()

def treetours():
    """
    The page that summarises tours.
    If the tours are stored in another app, we can access this
    using `exec_environment` (http://web2py.com/books/default/chapter/29/04/the-core#Execution-environment) 
    """
    response.view = "treeviewer" + "/" + request.function + "." + request.extension
    if len(request.args):
        # Redirect e.g. /tours/LinnSoc1 to /life/tours/LinnSoc1
        #  so that we use the default view for the tour
        if request.args[0] in ['LinnSoc1']:
            default_viewer = "life"
            default_start_loc = None
            redirect(URL(default_viewer,args=['tour',request.args[0]] + ([default_start_loc] if default_start_loc else []),
                vars=request.vars, url_encode=False))
    else:
        return dict() #should probably return a list of tours

def treetour():
    """
    A demo version: should probably be a function in the default controller of a different app
    """
    return dict()
 
def tourstop():
    """
    A single stop on the tour
    Demo only, for the moment
    Should be called with vars: tour_name and tour_stop_index, from which we can reconstruct
    the next stop on this tour as well as the next stops on other tours
    
    
    commas and double-quotes should be disallowed in tourname_abbreviations
    
    This should probably be a function in the controller of a different TreeTours app, in which
    case we would not have access to db.ordered_leaves and db.ordered_nodes, and would need to
    map otts using an API call (e.g. otts2id) instead
    """
    tourname = request.vars.tourname or ""
    stopnum = int(request.vars.stopnum or 0)
    tourstop = db((db.tourorders.identifier == tourname) & (db.tourorders.stop_number == stopnum)).select(db.tourstops.ALL, join=db.tourstops.on(db.tourorders.stop_id==db.tourstops.id)).first()
    
    if not tourstop:
        return dict(error="No tour")
    #find other tours which cover this point - might want to order here by rating or alphabetical name
    tourstops = db(db.tourorders.stop_id == tourstop.id).select(db.tourorders.ALL, db.tours.ALL, join=db.tours.on(db.tourorders.identifier==db.tours.identifier))
    #find maximum number of stops for each tour, so we know if there is a next
    max = db.tourorders.stop_number.max()
    tourlengths = {r.tourorders.identifier:r[max] for r in db(db.tourorders.identifier.belongs([t.tours.identifier for t in tourstops])).select(db.tourorders.identifier, max, groupby=db.tourorders.identifier)}
    next_array = []
    for s in tourstops:
        if s.tourorders.stop_number < tourlengths[s.tourorders.identifier]:
            next_num = s.tourorders.stop_number+1
            next_array.append({
                'tourabbrev':s.tours.identifier, 
                'tourname':s.tours.name,
                'index': next_num,
                'ott':db((db.tourorders.identifier==s.tours.identifier) & (db.tourorders.stop_number==next_num)).select(db.tourstops.ott, join=db.tourstops.on(db.tourorders.stop_id == db.tourstops.id)).first(),
                'transition':db.tourorders.transition})
    back = {''}
    for n in next_array:
        #lookup what the next OTTs refer to in OneZoom IDs
        if n['ott']:
            row = db(db.ordered_leaves.ott == n['ott'].ott).select(db.ordered_leaves.id).first()
            if row:
                n['id']=-row.id
            else:
                row = db(db.ordered_nodes.ott == n['ott'].ott).select(db.ordered_nodes.id).first()
                if row:
                    n['id']=row.id


    #lookup the single previous OTT, and then what it refers to (as a OneZoom ID)
    prev_id = None
    if stopnum>0:
        prev = db((db.tourorders.identifier==s.tours.identifier) & (db.tourorders.stop_number==(stopnum-1))).select(db.tourstops.ott, join=db.tourstops.on(db.tourorders.stop_id==db.tourstops.id)).first()
        if prev:
            row = db(db.ordered_leaves.ott == prev.ott).select(db.ordered_leaves.id).first()
            if row:
                prev_id=-row.id
            else:
                row = db(db.ordered_nodes.ott == prev.ott).select(db.ordered_nodes.id).first()
                if row:
                    prev_id=row.id
    else:
        prev_id=None

            
    return dict(
        stopnum = stopnum,
        tourname = tourname,
        tour_text = tourstop.description,
        tour_vid = tourstop.video,
        next = next_array,
        prev_id = prev_id,
    )
