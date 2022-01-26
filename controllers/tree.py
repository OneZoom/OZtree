import datetime
from OZfunc import nice_name_from_otts

def wikipedia_OZpage():
    """
    This creates a page on the local website that uses javascript to request a given wikipedia page
    from a wikidata item, then gets the page using the the wikipedia rest v1 API (e.g https://en.wikipedia.org/api/rest_v1/) 
    and (where appropriate) uses jquery to parse the html, remove non-internal links, etc, etc.
    
    Call as tree/wikipedia_OZpage?Q=1234,wlang=en,name=Species%20name,leaf=1
    
    If no 'name' is given, then do not default to looking up the name if there is no Qid
    """
    try:
        wikilang = request.vars.wlang
        if len(wikilang)>10 or not wikilang.isalpha():
            raise ValueError
        is_leaf = int(request.vars.leaf)
        #double-check that this Qid is in the DB, or if not, that the name is, 
        #so that we can't show non-relevant (potentially dodgy) wikipedia pages on our web site
        Qid = int(request.vars.Q)
        sciname=request.vars.name
        if is_leaf:
            row = db.ordered_leaves(wikidata=Qid)
            if not row:
                raise LookupError("No such wikidata Qid ({}) in the OneZoom leaves table".format(Qid))
            if sciname and not db.ordered_leaves(name=sciname):
                raise LookupError("No such name in the OneZoom leaves table")
        else:
            row = db.ordered_nodes(wikidata=Qid)
            if not row:
                raise LookupError("No such wikidata Qid ({}) in the OneZoom nodes table".format(Qid))
            if sciname and not db.ordered_nodes(name=sciname):
                raise LookupError("No such name in the OneZoom nodes table")
        #check if we have this language present
        return dict(Qid=Qid, wikilang=wikilang, sciname=sciname)
    except (ValueError, TypeError):
        raise HTTP(400,"No valid language, wikidata Q id, or leaf status (0 or 1) provided")
    except LookupError as e:
        raise HTTP(400,e)


def IUCN_OZpage():
    return dict()

def GBIF_OZpage():
    """
    This creates a page on the local website that uses javascript to request map data
    from GBIF (most of the layout is taken from the GBIF v2 map API demo pages, at 
    https://api.gbif.org/v2/map/demo.html.
    
    Call as tree/GBIF_OZpage?gbif=1234,leaf=1
    
    If no 'name' is given, then do not default to looking up the name if there is no gbif ID
    """
    try:
        is_leaf = int(request.vars.leaf)
        gbif_id = int(request.vars.gbif)
        if is_leaf:
            row = db.ordered_leaves(gbif=gbif_id)
            if not row:
                raise LookupError("No such GBIF id ({}) in the OneZoom leaves table".format(gbif_id))
        else:
            row = db.ordered_nodes(gbif=gbif_id)
            if not row:
                raise LookupError("No such GBIF id ({}) in the OneZoom nodes table".format(gbif_id))
        nice_names = nice_name_from_otts([row.ott], html=True, the=True, leaf_only=is_leaf)
        nice_name = nice_names.get(row.ott, "<i>" + row.name + "</i>" if is_leaf else row.name)
        return dict(gbif_id=str(gbif_id), sci_name=row.name, nice_name=nice_name)
    except (ValueError, TypeError):
        raise HTTP(400,"No valid GBIF id, or leaf status (0 or 1) provided")
    except LookupError as e:
        raise HTTP(400,e)
    

def pic_info():
    """
    This is the URL that we use to display copyright information about an image, where we pass in the image ID and image source ID.
    Within the tree viewer, this is always loaded into an iframe, but the embed status determines which iframe to load.
    When embed >= 3 we want to always use our own image info page, but for embed <3 we could potentially use
    an alternative. When called from a jump out link, this will have redirect=1 set
    """
    try:
        src = int(request.args[0])  
        src_id = int(request.args[1])
        embed = int(request.vars.embed) if 'embed' in request.vars else None
    except:
        raise HTTP(400,"No valid ids or embed parameter provided")
    
    param =  inv_src_flags[src] + "_jumpout_url"
    try:
        url = myconf.take('images.' + param).format(src=src, src_id=src_id)
    except:
        url = None
        
    #slight hack here, because we use negative onezoom_via_eol ids to mark eol_old imgs
    if (src == src_flags['onezoom_via_eol']) and (src_id < 0):
        url = URL('tree','eol_old_dataobject_ID', vars=request.vars, scheme=True, host=True)

    else:
        if url is not None and (embed is None or embed < 3):
            redirect(url.format(src=src, src_id=src_id))
    
    #override old eol URLs that don't work any more
    if src == src_flags['eol_old']:
        url = URL('tree','eol_old_dataobject_ID', vars=request.vars, scheme=True, host=True)
    # Use the default OneZoom image page
    row = db((db.images_by_ott.src_id == src_id) & (db.images_by_ott.src == src)).select(db.images_by_ott.src, db.images_by_ott.src_id, db.images_by_ott.url, db.images_by_ott.rights, db.images_by_ott.licence).first()
    if row is None:
        # could be an image by name
        row = db((db.images_by_name.src_id == src_id) & (db.images_by_name.src == src)).select(db.images_by_name.src, db.images_by_name.src_id, db.images_by_name.url, db.images_by_name.rights, db.images_by_name.licence).first()
    if row:
        return dict(image=row, url_override=url)
    else:
        raise HTTP(400,"No such image")

def linkouts(is_leaf, ott=None, id=None, sponsorship_urls=[]):
    """
    E.g. http://mysite/leaf_linkouts.json/1234 for an OTT id 1234 should return
    a JSON response that contains urls to other pages for this taxon, in particular
    1) OpenTree
    2) en.wikipedia (or if one is thought not to exist, the OZ 'wikidata' page which links out to wikidata)
    3) Encyclopedia of Life
    4) IUCN  (this is only output if is_leaf)
    5) NCBI
    6) (injected later) our sponsorship page
    
    we construct a python structure like
    'data':{'opentree':[url1], 'wiki':[url2], 'eol':[url3], 'iucn': [url4], 'ncbi': [url5], 'ozspons':[url6]}
    
    if any url lists are empty, there is no data for that tab (and it can be hidden). If there is a second url,
    e.g. 'ozspons':[url6a, url6b], then the second url is used as the go to action for the 'link out' form button. 
    This can be useful to remove embed information, go to the original wikipage, etc. Any third value in the list
    gives the json passed in the form 'post' request, e.g. {'form_session_id':'blah-blah'} which allows us to pass
    a session id to the leaf sponsorship stuff
    """
    urls = {} #for a list of the keys the UI expect to be returned (e.g. wiki, eol, ozspons) see UI_layer() in treeviewer.py
    name = None
    errors = []
    try:
        core_table = "ordered_leaves" if is_leaf else "ordered_nodes"
        if id is not None:
            query = db[core_table].id == id
        elif ott is not None:
            query = db[core_table].ott == ott
        else:
            raise
        
        row = db(query).select(db[core_table].ALL, db.iucn.iucn, 
            left=db.iucn.on(db.iucn.ott == db[core_table].ott)
            #could also left join with ipni here: see https://github.com/jrosindell/OneZoomComplete/issues/448
            ).first()
        if row:
            id =   row[core_table].id
            ott =  row[core_table].ott
            name = row[core_table].name
            try:
                lang = request.vars.lang or request.env.http_accept_language or 'en'
                first_lang = lang.split(',')[0]
                lang_primary = first_lang.split("-")[0]
            except:
                lang_primary ='en'
            wikilang = lang_primary if lang_primary in wikiflags else 'en'
            if row[core_table].ott:
                urls['opentree'] = opentree_url(row[core_table].ott)
            if row[core_table].wikidata:
                urls['wiki'] = wikipedia_urls(row[core_table].wikidata, row[core_table].wikipedia_lang_flag, wikilang, is_leaf, name, allow_namesearch=False if request.vars.no_wikisearch else True)
            if row[core_table].eol:
                urls['eol']  = eol_url(row[core_table].eol, row[core_table].ott)
            if row[core_table].ncbi:
                urls['ncbi'] = ncbi_url(row[core_table].ncbi)
            if row.iucn.iucn:
                urls['iucn'] = iucn_url(row.iucn.iucn)
            if row[core_table].gbif:
                urls['gbif'] = gbif_url(row[core_table].gbif, is_leaf)
            if row[core_table].ipni:
                urls['powo'] = powo_url(row[core_table].ipni) #would alter here if ipni availability calculated on the fly
        if sponsorship_urls: #always return a sponsorship url, even if e.g. invalid or ott missing
            urls['ozspons'] = sponsorship_urls
    except:
        errors = ["Couldn't get any data"]
    return(dict(data=urls, errors=errors, ott=ott, id=id, name=name))

def leaf_linkouts():
    """
    called with an OTT, since all leaves with info should have an OTT. Any leaves that don't, can't be associated with data
    """
    try:
        ott = int(request.args[0] if len(request.args) else -1) # ott = -1 marks an invalid ott
        vars = dict(request.vars, ott=ott)
    except Exception as e:
        return dict(errors=['Sorry, there was an error getting your leaf data:', str(e)], ott=None, data={}, name="error")

    sponsorship_urls = [
        URL("default","sponsor_leaf", vars=vars, scheme=True, host=True, extension=False),
        #remove the embed functionality when popping out to a new window
        URL("default","sponsor_leaf", vars={k:v for k,v in vars.items() if k not in ('embed', 'form_reservation_code')}, scheme=True, host=True, extension=False)
    ]
    if request.vars.form_reservation_code:
        #pass on the reservation code if possible
        sponsorship_urls.append({'form_reservation_code':request.vars.form_reservation_code})
    return_values = linkouts(is_leaf=True, ott=ott, sponsorship_urls=sponsorship_urls)

    # OZLinks just links back to ourselves
    return_values['data']['ozlinks'] = [URL('tree', 'leaf_linkouts', scheme=True, host=True, extension='html', args=request.args, vars=request.vars)]
    return return_values

def node_linkouts():
    """
    called with a node ID, since it makes sense to ask e.g. for all descendants of a node, even if this node has no OTT
    """
    try:
        id = int(request.args[0])
        vars=dict(request.vars, id=id)
    except Exception as e:
        dict(errors=['Sorry, there was an error getting your node data:', str(e)], ott=None, data={}, name="error")
    sponsorship_urls = [
        URL("default", "sponsor_node", vars=vars, scheme=True, host=True, extension=False),
        #remove the embed functionality when popping out to a new window
        URL("default","sponsor_node", vars={k:v for k,v in vars.items() if k not in ('embed', 'form_reservation_code')}, scheme=True, host=True, extension=False)
    ]
    if request.vars.form_reservation_code:
        #pass on the session if possible
        sponsorship_urls.append({'form_reservation_code':request.vars.form_reservation_code})
    return_values = linkouts(is_leaf=False, id=id, sponsorship_urls=sponsorship_urls)
    request.vars.update({'id':return_values['id']})

    # OZLinks just links back to ourselves
    return_values['data']['ozlinks'] = [URL('tree', 'node_linkouts', scheme=True, host=True, extension='html', args=request.args, vars=request.vars)]
    return return_values


# OneZoom pages that redirect to other sites. These are used to register site visits so we can
# e.g. update the image or common names tables when they are visited (and potentially corrected)

def eol_page_ID():
    """
    Log the eol page visited, and redirect there.
    EoL has no https site currently
    """
    import datetime
    try:
        EOLid = int(request.args[0])
        OTTid = int(request.args[1])
    except:
        raise HTTP(400,"No valid id provided")
    
    #we have inspected this EoL page - log it so we know to check EoL for changes   
    db.eol_inspected.update_or_insert(db.eol_inspected.ott == OTTid,
                               ott=OTTid,
                               via=eol_inspect_via_flags['EoL_tab'],
                               inspected=datetime.datetime.now())
    redirect("//eol.org/pages/{}".format(EOLid))

def eol_dataobject_ID():
    """
    Called when jumping out from an image. Provide the DOid (src_id) as the first arg.
    Log the eol data object visited, and redirect there.
    """
    try:
        src = int(request.args[0]) # for src = 1 or 2, this is an EoL data object ID
        src_id = int(request.args[1]) # for src = 1 or 2, this is an EoL data object ID
    except:
        raise HTTP(400,"No valid id provided")
    
    #can redirect this to EoL, after logging so we can refresh e.g. cropped images
    rows = db(db.images_by_ott.src_id == src_id).select(db.images_by_ott.ott)
    for row in rows:
        db.eol_inspected.update_or_insert(db.eol_inspected.ott == row.ott,
                                   ott=row.ott,
                                   via=eol_inspect_via_flags['image'],
                                   inspected=datetime.datetime.now())
    # might as well also look for this image in the images_by_name table (probably won't find it)
    rows = db(db.images_by_ott.src_id == src_id).select(db.images_by_name.name)
    for row in rows:
        db.eol_inspected.update_or_insert((db.eol_inspected.name != None) & (db.eol_inspected.name == row.name),
                                   name=row.name,
                                   via=eol_inspect_via_flags['image'],
                                   inspected=datetime.datetime.now())
    redirect("//eol.org/media/{}".format(src_id))
        
def eol_old_dataobject_ID():
    """
    For old versions of eol images: the media urls are no longer valid.
    """
    return {}  

# LINKOUT FUNCTIONS: these all return urls used in the popups to embed other resources
# They should all return an array with at least one element (the url used for iframes). If
# there are further elements, they give the URL (and POST params) used for the link out
# button

def opentree_url(ott):
    try:
        return(["//tree.opentreeoflife.org/opentree/argus/@ott{}".format(int(ott))])
    except:
        raise HTTP(400,"No valid OpenTree id provided")

def wikidata_url(Qid):
    try:
        return(["//www.wikidata.org/wiki/Q{}".format(int(Qid))])
    except:
        raise HTTP(400,"No valid wikidata Q id provided")

def iucn_url(IUCNid):
    """
    IUCN has no https site
    """
    try:
        #we only have a single url to return as we haven't bothered to make a local IUCN page
        #see https://github.com/OneZoom/OZtree/issues/67
        IUCNURLarray = [URL('tree','IUCN_OZpage.html',vars=dict(iucnid=int(IUCNid))),"http://www.iucnredlist.org/details/{}/0".format(int(IUCNid))]
        return(IUCNURLarray)
    except:
        raise HTTP(400,"No valid IUCN id provided")

def gbif_url(GBIFid, is_leaf):
    try:
        var = {'embed':request.vars.embed} if 'embed' in request.vars else {}
        return [
            URL('tree','GBIF_OZpage', vars=dict(gbif=int(GBIFid), leaf=1 if is_leaf else 0, **var), scheme=True, host=True, extension=False),
            "//www.gbif.org/species/" + str(int(GBIFid)),
        ]
    except:
        raise HTTP(400,"No valid GBIF id provided")

def powo_url(IPNIid):
    """
    Can either be provided with the normal IPNI, e.g. 391732-1, or an int with the last digit stuck on 
    without the '-' sign: in this example 3917321
    """
    try:
        IPNIs = IPNIid.split("-")
        #powo only has an http site
        return ["http://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:{}-{}".format(int(IPNIs[0]), int(IPNIs[1]))]
    except AttributeError:
        try:
            IPNIs = str(int(IPNIid))
            #powo only has an http site
            return ["http://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:{}-{}".format(int(IPNIs[:-1]), int(IPNIs[-1:]))]
        except:
            raise          
    except:
        raise HTTP(400,"No valid IPNI id provided")

def ncbi_url(NCBIid):
    try:
        return ["//www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id={}".format(int(NCBIid))]
    except:
        raise HTTP(400,"No valid NCBI id provided")

def eol_url(EOLid, OTTid):
    """
    Return a OneZoom URL that redirects to the true EoL url. 
    The returned url should be one that logs the EoL visit on OneZoom
    so we can check if images or common names may have been updated.
    """
    try:
        return [URL('tree','eol_page_ID', args=[int(EOLid), int(OTTid)], scheme=True, host=True), "//eol.org/pages/{}".format(int(EOLid))]
    except:
        raise HTTP(400,"No valid EOL id provided")

def wikipedia_urls(Qid, wikipedia_lang_flag, requested_wikilang, is_leaf, name, allow_namesearch=True):
    """
    This is more complex as a wikipedia page is found through its wikidata Qid, and for a given Qid,
    a wikipedia page may not exist for the requested language - this is stored in the bitfield 
    `wikipedia_lang_flag` (bits correspond to the languages in the global dict `wikiflags`
    
    If it is not given, it assumes the value '', and we always try to get a sitelink from the Qid, even if we believe
    it might be absent. If flag is given and numeric, check against the wikiflags, and return a url that will go to 
    the wikipedia page. If allow_namesearch = True we allow the page to return a url which searches wikipedia for that
    species name. Otherwise we don't give a name at all.
    """
    try:
        if requested_wikilang.isalnum():
            name = name if allow_namesearch else ""
            var = {'embed':request.vars.embed} if 'embed' in request.vars else {}
            OZ_wikipage = URL('tree','wikipedia_OZpage', vars=dict(Q=int(Qid), wlang=requested_wikilang, name=name, leaf=1 if is_leaf else 0, **var), scheme=True, host=True, extension = False)
            try:
                if (int(wikipedia_lang_flag) & int(2**wikiflags[requested_wikilang])):
                    #a wikipedia page is expected in this lang: the linkout button should go to the wikipedia page
                    return([OZ_wikipage, "//www.wikidata.org/wiki/Special:GoToLinkedPage?site={}&itemid=Q{}".format(requested_wikilang, int(Qid))])
            except:
                pass #e.g. if flag == ''
            #no wikipedia page is expected in this lang: the linkout button should go to the wikidata page
            return [OZ_wikipage, "//www.wikidata.org/wiki/Q{}#sitelinks-wikipedia".format(int(Qid))]
    except:
        pass
    raise HTTP(400,"No valid language or wikidata Q id provided")
