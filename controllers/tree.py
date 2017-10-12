#from OZfunctions import 

""" language-type functions and controllers"""
def js_strings():
    """
    a json response for all the translatable strings in our javascript
    """
    return dict()

""" Controllers for searching """

# LINKOUTS: these all specify urls that can be used to link out to other resources, given an OTT id

def opentree_url(ott):
    try:
        return("//tree.opentreeoflife.org/opentree/argus/ottol@{}".format(int(ott)))
    except:
        raise HTTP(400,"No valid OpenTree id provided")


def wikidata_url(Qid):
    try:
        return("//www.wikidata.org/wiki/Q{}".format(int(Qid)))
    except:
        raise HTTP(400,"No valid wikidata Q id provided")

def wikidata_sitelinks(Qid):
    try:
        return("//www.wikidata.org/wiki/Q{}#sitelinks-wikipedia".format(int(Qid)))
    except:
        raise HTTP(400,"No valid wikidata Q id provided")

def wikipedia_url(Q, lang='en', flag='', flags=wikiflags, only_wikipedia=False, is_leaf=True, name=""):
    """
    returns a url that redirects to the wikipedia page for this wikidata Qid and this lang. Flag should be a
    number: if it is not given, it assumes the value '', and the wikipedia URL is always provided, even if we believe
    it might be absent. If flag is given and numeric, check against the wikiflags, and return a url that will go to 
    the wikipedia page (or no wikipedia page in that lang exists AND only_wikipedia==False, return a url which embeds the wikidata page)
    """
    try:
        if flag is None:
            return(None)
        if lang.isalnum():
            try:
                if (int(flag) & int(2**flags[lang])) == 0:
                    if only_wikipedia:
                        return None
                    else:
                        #this lang not present, provide WD page
                        if is_leaf:
                            return(URL("wikipedia_absent_from_wikidata", vars=dict(leaf=Q, name=name), scheme=True, host=True, extension=False))
                        else:
                            return(URL("wikipedia_absent_from_wikidata", vars=dict(node=Q, name=name), scheme=True, host=True, extension=False))
            except:
                pass #e.g. if flag == ''
            return("//www.wikidata.org/wiki/Special:GoToLinkedPage?site={}&itemid=Q{}".format(lang, int(Q)))
    except:
        pass
    raise HTTP(400,"No valid language or wikidata Q id provided")

def iucn_url(IUCNid):
    """
    IUCN has no https site
    """
    try:
        return("http://www.iucnredlist.org/details/{}/0".format(int(IUCNid)))
    except:
        raise HTTP(400,"No valid IUCN id provided")

def powo_url(IPNIid):
    """
    Can either be provided with the normal IPNI, e.g. 391732-1, or an int with the last digit stuck on 
    without the '-' sign: in this example 3917321
    """
    try:
        IPNIs = IPNIid.split("-")
        return("http://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:{}-{}".format(int(IPNIs[0]), int(IPNIs[1])))
    except AttributeError:
        try:
            IPNIs = str(int(IPNIid))
            return("http://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:{}-{}".format(int(IPNIs[:-1]), int(IPNIs[-1:])))
        except:
            raise          
    except:
        raise HTTP(400,"No valid IPNI id provided")

def ncbi_url(NCBIid):
    try:
        return("//www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id={}".format(int(NCBIid)))
    except:
        raise HTTP(400,"No valid NCBI id provided")

def eol_url(EOLid, OTTid):
    """
    Return a OneZoom URL that redirects to the true EoL url. 
    The returned url should be one that logs the EoL visit on OneZoom
    so we can check if images or common names may have been updated.
    """
    try:
        return(URL('eol_ID', args=[int(EOLid), int(OTTid)], scheme=True, host=True))
    except:
        raise HTTP(400,"No valid EOL id provided")


def linkout_via_picID():
    try:
        src = int(request.args[0])  
        src_id = int(request.args[1]) # for src = 1 or 2, this is an EoL data object ID
        external_url = None
    except:
        raise HTTP(400,"No valid id provided")
    
    if  request.vars.get('method') and (\
        (src==src_flags['eol']) or \
        ((src==src_flags['onezoom']) and (src_id>=0))\
    ): #this is an EoL picture
        #we have inspected this EoL data object page - log all OTTs that use this data object
        rows = db((db.images_by_ott.src == src) & (db.images_by_ott.src_id == src_id)).select(db.images_by_ott.ott)
        for row in rows:
            db.eol_inspected.update_or_insert(db.eol_inspected.ott == row.ott,
                                       ott=row.ott,
                                       via=eol_inspect_via_flags['copyright_symbol'],
                                       inspected=datetime.datetime.now())
        # might as well also look for this image in the images_by_name table (probably won't find it)
        rows = db((db.images_by_name.src == src) & (db.images_by_name.src_id == src_id)).select(db.images_by_name.name)
        for row in rows:
            db.eol_inspected.update_or_insert((db.eol_inspected.name != None) & (db.eol_inspected.name == row.name),
                                       name=row.name,
                                       via=eol_inspect_via_flags['copyright_symbol'],
                                       inspected=datetime.datetime.now())
        external_url = "http://eol.org/data_objects/{}".format(src_id)
        if request.vars.get('method')=="redirect":
            redirect(external_url)
        else:
            #method == 'iframe_if_possible' or similar, so we simply fall though and allow `external_url` to specify what to do
            pass
    #we do not want to jump or we do but this is not an EoL image, so return a stand-in page
    rows = db((db.images_by_ott.src_id == src_id) & (db.images_by_ott.src == src)).select(db.images_by_ott.src, db.images_by_ott.src_id, db.images_by_ott.url, db.images_by_ott.rights, db.images_by_ott.licence)
    if len(rows) == 0:
        rows = db((db.images_by_name.src_id == src_id) & (db.images_by_name.src == src)).select(db.images_by_name.src, db.images_by_name.src_id, db.images_by_name.url, db.images_by_name.rights, db.images_by_name.licence)
    return dict(images_info=rows, iframe_src=external_url)
        
def eol_ID():
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
    redirect("http://eol.org/pages/{}".format(EOLid))


def wikipedia_absent_from_wikidata():
    try:
        if (request.vars.get('leaf')):
            return(dict(url = wikidata_sitelinks(int(request.vars.get('leaf'))), Q=request.vars.get('leaf'), type='leaf', name=request.vars.get('name')))
        else:
            return(dict(url = wikidata_sitelinks(int(request.vars.get('node'))), Q=request.vars.get('node'), type='node', name=request.vars.get('name')))
    except:
        raise HTTP(400,"No valid wikidata Qid provided")

def eol():
    """ e.g. http://mysite/eol.html/1234 for an OTT id 1234 redirects to the eol page for OTT id 1234
         and http://mysite/eol.json/1234 returns the EOLid in JSON form: {'data':'5678'}"""
    try:
        OTTid = int(request.args[0])
        row = db(db.ordered_leaves.ott == OTTid).select(db.ordered_leaves.eol).first()
        if row is None:
            row = db(db.ordered_nodes.ott == OTTid).select(db.ordered_nodes.eol).first()
        return(dict(data={'eol':int(row.eol)}))
    except AttributeError:
        return(dict(errors=["Sorry, no EOL id found for this OpenTree id.", request.args[0] if len(request.args) else None], data=None))
    except:
        return(dict(errors=["Sorry, could not find OpenTree id in our database.", request.args[0] if len(request.args) else None], data=None))

def wikidata():
    """ e.g. http://mysite/wikidata.html/1234 for an OTT id 1234 redirects to the wikidata page for OTT id 1234
         and http://mysite/wikidata.json/1234 returns the wikidata Qid in JSON form: {'data':'Q9101'}"""
    try:
        OTTid = int(request.args[0])
        row = db(db.ordered_leaves.ott == OTTid).select(db.ordered_leaves.wikidata).first()
        if row is None:
            row = db(db.ordered_nodes.ott == OTTid).select(db.ordered_nodes.wikidata).first()
        return(dict(data={'Q':int(row.wikidata)}))
    except AttributeError:
        return(dict(errors=["Sorry, no wikidata id found for this OpenTree id", request.args[0] if len(request.args) else None], data=None))
    except:
        return(dict(errors=["Sorry, could not find the OpenTree id in our database.", request.args[0] if len(request.args) else None], data=None))

def wikipedia():
    """ e.g. http://mysite/wikipedia.html/enwiki/1234 for an OTT id 1234 redirects to the wikidata redirection page for OTT id 1234
             which is of the form (http://www.wikidata.org/wiki/Special:GoToLinkedPage?site=enwiki&itemid=Q5678)
    """
    try:
        if not request.args[0].isalnum():
            raise NameError("Bad wiki name")
        wikisite = request.args[0]
        OTTid = int(request.args[1])
        row = db(db.ordered_leaves.ott == OTTid).select(db.ordered_leaves.wikidata).first()
        if row is None:
            row = db(db.ordered_nodes.ott == OTTid).select(db.ordered_nodes.wikidata).first()
        return(dict(data={'site':wikisite,'Q':int(row.wikidata)}))
    except AttributeError:
        return(dict(errors=["Sorry, no wikidata id found for the OpenTree id, so cannot find link.",
                            request.args[1] if len(request.args)>1 else None,
                            request.args[0] if len(request.args) else None],
                    data=None))
    except NameError:
        return(dict(errors=["Sorry, invalid wiki name.",
                            request.args[1] if len(request.args)>1 else None,
                            request.args[0] if len(request.args) else None],
                    data=None))
    except:
        return(dict(errors=["Sorry, could not find this OpenTree id in our database.",
                            request.args[1] if len(request.args)>1 else None,
                            request.args[0] if len(request.args) else None],
                    data=None))

def linkouts(is_leaf, ott=None, id=None):
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
    'data':{'opentree':url1, 'wiki':url2, 'eol':url3, 'iucn': url4, 'ncbi': url5, 'ozspons':url6}
    """
    urls = {'opentree':None, 'wiki':None, 'eol':None, 'iucn': None, 'ncbi': None, 'powo': None, 'ozspons': None}
    name = None
    errors = []

    try:
        #if id is not None:
        #    query = db.ordered_leaves.ott == OTTid
        #OTTid = int(OTT)
        #urls['opentree'] = opentree_url(OTTid)
        core_table = "ordered_leaves" if is_leaf else "ordered_nodes"
        if id is not None:
            query = db[core_table].id == int(id)
        elif ott is not None:
            query = db[core_table].ott == int(ott)          
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
                first_lang = (request.env.http_accept_language or 'en').split(',')[0]
                lang_primary = first_lang.split("-")[0]
            except:
                lang_primary ='en'
            wikilang = request.vars.get('wikilang') or lang_primary
            if row[core_table].wikidata:
                urls['wiki'] = wikipedia_url(row[core_table].wikidata, wikilang, row[core_table].wikipedia_lang_flag, wikiflags, request.vars.only_wikipedia, is_leaf=is_leaf, name=name)
            if row[core_table].eol:
                urls['eol']  = eol_url(row[core_table].eol, row[core_table].ott)
            if row[core_table].ncbi:
                urls['ncbi'] = ncbi_url(row[core_table].ncbi)
            if row.iucn.iucn:
                urls['iucn'] = iucn_url(row.iucn.iucn)
            if row[core_table].ipni:
                urls['powo'] = powo_url(row[core_table].ipni) #would alter here if ipni availability calculated on the fly
    except:
        errors = ["Couldn't get any data"]
        raise
    return(dict(data=urls, errors=errors, ott=ott, id=id, name=name))

def leaf_linkouts():
    """
    called with an OTT, since all leaves with info should have an OTT. Any leaves that don't, can't be associated with data
    """
    try:
        return_values = linkouts(is_leaf=True, ott=request.args[0])
    except:
        return_values = {'ott':None, 'data':{}}

    request.vars.update({'embed':True, 'ott':return_values['ott']})
        
    return_values['data']['ozspons'] = URL("default","sponsor_leaf", vars=request.vars, scheme=True, host=True, extension=False)
    return(return_values)

def node_linkouts():
    """
    called with a node ID, since it makes sense to ask e.g. for all descendants of a node, even if this node has no OTT
    """
    return_values = linkouts(is_leaf=False, id=request.args[0])
    request.vars.update({'embed':True, 'id':return_values['id']})
    return_values['data']['ozspons'] = URL("default", "sponsor_node", vars=request.vars, scheme=True, host=True, extension=False)
    return(return_values)
    
def getOTT():
    """ this is called as a json request with potentially multiple identifiers, e.g.
        http://mysite/getOTT.json?eol=123&eol=456&ncbi=789 
        and should return the OTT ids and scientific names  EOLid in JSON form: {'data':'5678'}
        
        This is useful for common-name searching, where the EoL search API returns EOL identifiers
        which can then be matched against OneZoom leaves.
    """
    sources = ["eol", "ncbi", "iucn"]
    data = {}
    from numbers import Number
    try:
        for s in sources:
            if s in request.vars:
                if isinstance(request.vars[s], basestring) or isinstance(request.vars[s], Number):
                    id_list = [int(request.vars[s])] #put it in an array anyway
                else:
                    id_list = [int(id) for id in request.vars[s]]
                response.flash = id_list
                rows = db(db.ordered_leaves[s].belongs(id_list)).select(db.ordered_leaves[s], db.ordered_leaves.ott)
                data[s] = {r[s]:r.ott for r in rows}
        return(dict(data=data, errors=[]))
    except ValueError:
        return(dict(data=None, errors=["Some of the passed-in ids could not be converted to numbers"]))

def children_of_OTT():
    """ Return a set of terminal nodes for this OTT taxon: easily done using the nested set representation. The URL is of the form
        http://mysite/children_of_OTT.json/<OTT>?sort=<sortcol>&max=<max>&page=1 which returns <max> leaves sorted by <sortcol>, e.g.
        http://mysite/children_of_OTT.json/13943?sort=popularity&max=10. The parameters <sortcol>, <max> and <page> are optional, with defaults
        <sortcol> = id, <max> = 50 and <page>=1. if <max> is greater than 1000 it is set to 1000, to avoid responding with huge queries.
        The JSON returned should have the ott, name (scientific name), eol, wikidataQ, and popularity  
    """
    try:
        OTTid = int(request.args[0])
        query = child_leaf_query('ott', OTTid)
        query = query & (db.ordered_leaves.eol!=None)
        rows = select_leaves(query,
                             request.vars.get('page'),
                             request.vars.get('max'),
                             request.vars.get('sort'))
        return(dict(data={'rows':rows.as_list(), 'EOL2OTT':{r.eol:r.ott for r in rows}}))
    except ValueError: # probably bad int inputted
        return(dict(errors=['OTT id must be an integer'], data=None))

def children_of_EOL():
    """ Return a set of terminal nodes for this OTT taxon: easily done using the nested set representation. The URL is of the form
        http://mysite/descendant_leaves.json/<OTT>?sort=<sortcol>&max=<max>&page=1 which returns <max> leaves sorted by <sortcol>, e.g.
        
        http://mysite/descendant_leaves.json/2684257?sort=popularity&max=10. The parameters <sortcol>, <max> and <page> are optional, with defaults
        <sortcol> = id, <max> = 50 and <page>=1. if <max> is greater than 1000 it is set to 1000, to avoid responding with huge queries.
        The JSON returned should have the ott, name (scientific name), eol, wikidataQ, and popularity  
    """
    try:
        EOLid = int(request.args[0])
        query = child_leaf_query('eol', EOLid)
        query = query & (db.ordered_leaves.eol!=None)
        rows = select_leaves(query,
                             request.vars.get('page'),
                             request.vars.get('max'),
                             request.vars.get('sort'))
        return(dict(data={'EOL2OTT':{r.eol:r.ott for r in rows}}))
    except ValueError: # probably bad int inputted
        return(dict(errors=['EOL id must be an integer'], data=None))

def select_leaves(query, page=None, limit=None, sortcol=""):
    """ Selects on a query. If 'sortcol' is entered as uppercase, sort descending (requires all sortable cols to be lowercase names) """
    limitby=(0,40)
    orderby = ""
    try:
        select = [db.ordered_leaves[field] for field in ['ott', 'name', 'eol', 'wikidata', 'popularity']]
        page = int(page or 1)
        limit = min(int(limit or limitby[1]), 1000)
        limitby = (limit*(page-1), limit*page)
        if sortcol.lower() in db.ordered_leaves.fields:
            if sortcol.lower() == sortcol:
                orderby = "ordered_leaves." + sortcol.lower()
            else:
                orderby = "ordered_leaves." + sortcol.lower() + " DESC"
    except:
        pass
    return db(query).select(limitby=limitby, orderby=orderby, *select)

