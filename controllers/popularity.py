# -*- coding: utf-8 -*-
"""
This contains the popularity API functions as used e.g. by Phylotastic.
All code in this file is released under the public domain by the author, Yan Wong
"""

import datetime

def index():
    """
    A few descriptions of the popularity index
    """
    public_constraints = db(db.API_users.API_user_name=="public").select(
        db.API_users.APIkey, db.API_users.max_taxa_per_query, db.API_users.max_returns_per_taxon).first()
    if public_constraints:
        return dict(
            public_key = public_constraints.APIkey,
            public_max_taxa_per_query = public_constraints.max_taxa_per_query,
            public_max_returns_per_taxon =  public_constraints.max_returns_per_taxon
            )
    else:
        return dict(public_key = None)

def raw_value():
    try:
    except:
        raise HTTP(400, "Please pass in a single ott")
    max_otts, max_per_taxa = get_limits(request.vars.get("key"))
    
    db(db.ordered_leaves.ott == 
    
def values():
    """
    Return the raw popularity values for a set of OTTs, and (if leaves) their rank, along with the
    maximum .
    We require an API key. If you don't have one, use key=0.
    """
    max_otts, max_per_taxa = get_limits(request.vars.get("key"))
        ott = int(request.vars.get("ott"))
    
    
def descendants():
    """
    Return the N most popular species descended from this OTT.
    We require an API key. If you don't have one, use key=0.
    """
    max_otts, max_per_taxa = get_limits(request.vars.get("key"))
    try:
        otts = [int(x) for x in (request.vars.get('otts') or "").split(",")]
    except ValueError:
        raise HTTP(400,"Error: set the `otts` parameter to one or more integer OTT ids separated by commas")
    if 0 < len(otts) <= max_otts:
        pass
    else:
        raise HTTP(400,"Error: you must pass in at least 1 and not more than {} OTT ids".format(max_otts))
    try:
        n = int(request.vars.get('n') or 1)
    except ValueError:
        raise HTTP(400,"Error: set the `n` parameter to the maximum number of species returned per ott")
    if 0 < n <= max_n:         
        pass
    else:
        raise HTTP(400,"Error: the `n` parameter must be between 1 and {}".format(max_n))
        
    #test using python to extract
    #or SQL
    #or a join
    result = {}
    rows = db(db.ordered_nodes.ott.belongs()).select(ott,leaf_lft, leaf_rgt, name)
    for row in rows:
        results = db((db.ordered_leaves.id >= row.leaf_lft) & (db.ordered_leaves.id <= row.leaf_rgt)
        result[row.ott]=[]
    else:
        row = db(db.ordered_leaves.ott == ott).select
        
        
def get_limits(API_key):
    """
    Return the max taxa allowed per query, and the max number of return values per taxon
    """
    if API_key is None:
        raise(HTTP(400,"Please use an API key (use 0 for the public API key)")
    results = db(db.API_users.APIkey == API_key).select(db.API_users.ALL)
    if results:
        result = results.first()
        if result.max_taxa_per_query:
            return result.max_taxa_per_query, result.max_returns_per_taxon
        else:
            raise(HTTP(400,"Sorry, the API key {} ({}) is no longer allowed".format(result.APIkey, result.API))
    else: 
        raise(HTTP(400,"Sorry, the API key {} has not been recognised".format(API_key))
    return 20, 2


def record_usage(API_key, API_name, n_taxa, n_returns):
    """
    Record the API use. See https://stackoverflow.com/questions/49722812/web2py-update-or-insert-to-increment-a-counter
    """
    
    if not update_count(API_key, n_taxa, n_returns):
        db.API_use.insert(APIkey=API_key, start_date = datetime.datetime.now()) #could be a race condition causing 2 identical rows here, but if so, both will simple be updated
        update_count(API_key, n_taxa, n_returns)

    
def update_count(API_key, API_name, n_t, n_r):
    return db((db.API_use.APIkey == API_key) & (db.end_date != None) & (db.API == None) & ).update(
        n_calls=db.API_use.n_calls + 1, n_taxa=db.API_use.n_taxa + n_t, n_returns=db.API_use.n_returns + n_r)
