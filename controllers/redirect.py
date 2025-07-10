#Pages that end up redirecting the user somewhere else. These include convenience pages
# to pass in an OTT and get redirected to and EoL, wikidata, or wikipedia page (could also add NCBI, IUCN, etc.
# and also pages that allow us to log visits to external sites, such as the EoL or wikidata pages.
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
    """ e.g. http://mysite/tree/wikidata.html/1234 for an OTT id 1234 redirects to the wikidata page for OTT id 1234
         and http://mysite/tree/wikidata.json/1234 returns the wikidata Qid in JSON form: {'data':'Q9101'}"""
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
    """ e.g. http://mysite/tree/wikipedia.html/enwiki/1234 for an OTT id 1234 redirects to the wikidata redirection page for OTT id 1234
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
    assert src in [src_flags['onezoom_via_eol'], src_flags['eol']]
    #can redirect this to EoL, after logging so we can refresh e.g. cropped images
    rows = db((db.images_by_ott.src == src_flags['onezoom_via_eol'] | db.images_by_ott.src == src_flags['eol']) &
              (db.images_by_ott.src_id == src_id)).select(db.images_by_ott.ott)
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


def wikimedia_commons_QID():
    # when passed a QID, look it up in the images_by_ott table, and jump there
    src_id = int(request.args[0])  # This should be a QID
    row = db((db.images_by_ott.src == src_flags['wiki']) & (db.images_by_ott.src_id == src_id)).select(
        db.images_by_ott.url).first()
    # Could update the inspected field here, which would give a clue to the harvester which pictures
    # might benefit from reharvesting
    if row:
        redirect(row.url)
    else:
        raise HTTP(
            400,
            f"Could not find a Wikimedia Commons image (src={src_flags['wiki']} with QID {src_id}."
        )
    
