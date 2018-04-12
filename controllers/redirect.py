#Convenience pages that allow anyone to pass in an OTT and get redirected to and EoL, wikidata, or wikipedia page
#We could also add NCBI, IUCN, etc.

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
