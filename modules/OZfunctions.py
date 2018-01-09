# -*- coding: utf-8 -*-
"""Below are some private functions. NB: https://web2py.wordpress.com/tag/private-function/
Functions that are defined in controllers and that takes arguments are private.
Functions defined in controllers and start with ‘__’ [double underscores] are private.
Functions defined in controllers and having a space after the () and before the ‘:’ are private. 
"""
import re
from gluon import current


def sponsorable_children_query(target_id, qtype="ott"):
    """
    A function that returns a web2py query selecting the sponsorable children of this node.
    TO DO: change javascript so that nodes without an OTT use qtype='id'
    """
    db = current.db
    query = child_leaf_query(qtype, target_id)

    #nodes without an OTT are unsponsorable
    query = query & (db.ordered_leaves.ott != None) 

    #nodes without a space in the name are unsponsorable
    query = query & (db.ordered_leaves.name.contains(' ')) 

    #check which have OTTs in the reservations table
    unavailable = db((db.reservations.verified_time != None))._select(db.reservations.OTT_ID)
    #the query above ony finds those with a name. We might prefer something like the below, but I can't get it to work
    #unavailable = db((db.reservations.user_sponsor_name != None) | ((db.reservations.reserve_time != None) & ((request.now - db.reservations.reserve_time).total_seconds() < reservation_time_limit)))._select(db.reservations.OTT_ID)
    
    query = query & (~db.ordered_leaves.ott.belongs(unavailable))
    return(query)

def child_leaf_query(colname, search_for):
    """Queries the db to get child leaves, and returns the basis for another query """
    db = current.db
    try:
        bracket = db(db.ordered_nodes[colname] == search_for).select(db.ordered_nodes.leaf_lft,db.ordered_nodes.leaf_rgt).first()
        if bracket is not None:
            return ((db.ordered_leaves.id >= bracket.leaf_lft) & (db.ordered_leaves.id <= bracket.leaf_rgt))
    except:
        pass
    #if no descendant children, just return this leaf
    return (db.ordered_leaves[colname] == search_for)



def score(lang_full_search, lang_primary_search, lang_full_target, preferred_status, 
    src_flag_target, prefer_oz_specialname=False, max_src_flag=max(current.OZglobals['inv_src_flags'])):
    if prefer_oz_specialname:
        score = max_src_flag - src_flag_target % current.OZglobals['src_flags']['onezoom_special']
    else:
        score = max_src_flag - src_flag_target
    if (lang_full_target == lang_full_search):
        score += 10000
    if (lang_full_target == lang_primary_search):
        score += 1000
    if (preferred_status):
        score += 100
    return score

def nice_species_name(scientific=None, common=None, the=False, html=False, leaf=False, first_upper=False, break_line=None):
    """
    Constructs a nice species name, with common name in there too.
    If leaf=True, add a 'species' tag to the scientific name
    If break_line == 1, put a line break after common (if it exists)
    If break_line == 2, put a line break after sciname, (even if common exists)
    """
    from gluon.html import CAT, I, SPAN, BR
    db = current.db
    species_nicename = (scientific or '').replace('_',' ').strip()
    common = (common or '').strip()
    if the and common and not re.match(r'[Aa] ',common):
        common = "the " + common #"common tern" -> "the common tern", but 'a nematode' kept as is
    if first_upper:
        common = common.capitalize()
    if html:
        if species_nicename:
            if leaf: #species in italics
                species_nicename = I(species_nicename, _class=" ".join(["taxonomy","species"]))
            else:
                species_nicename = SPAN(species_nicename, _class="taxonomy")
            if common:
                if break_line:
                    return CAT(common, BR(), '(', species_nicename, ')')
                else:
                    return CAT(common, ' (', species_nicename, ')')                
            else:
                if break_line == 2:
                    return CAT(BR(), species_nicename)
                else:
                    return species_nicename
        else:
            return common
    else:
        if common and species_nicename:
            if break_line:
                return common +'\n(' + species_nicename + ')'
            else:
                return common +' (' + species_nicename + ')'
        else:
            if break_line == 2:
                return common + "\n" + species_nicename
            else:
                return common + species_nicename

def get_common_names(identifiers, return_nulls=False, OTT=True, lang=None,
    prefer_oz_special_names=False, include_unpreferred=False, return_all=False):
    """
    Given a set of identifiers (by default, OTTs, but otherwise names), get one best vernacular for each id. 
    'best' is defined as the vernacular that has preferred == True, and which has the best language match.
    Language matches rely on languages specified as http://www.w3.org/International/articles/language-tags/
    A language tag can consist of subtags, e.g. en-gb, fr-ca (these have been made lowecase)
    We call the first subtag the 'primary language', and only match vernaculars where the primary language matches
    However, if there are multiple matches on primary language, we prefer (in order)
    1) Most preferred: a match on full name (e.g. browser language = en-gb, vernacular tagged as en-gb)
    2) Intermediate: the vernacular is tagged as generic (e.g. browser language = en-gb, vernacular tagged as en)
    3) Least preferred: only matches on primary lang (e.g. browser language = en-gb, vernacular tagged as en-us)
   
    If there are multiple equally good matches, we should prefer names in ascending src order, e.g. src=1 (onezoom)
    then src=2 (eol) then src=8 (onezoom_special), unless prefer_oz_special_names is set, when we take src=8 
    (oz special) - we do this by ordering by src % 8
    """
    db = current.db
    request = current.request
    lang_full = (lang or request.vars.lang or request.env.http_accept_language or 'en').split(',')[0].lower()
    lang_primary = lang_full.split("-")[0]
    
    if OTT:
        table = 'vernacular_by_ott'
        col = 'ott'
    else:
        table = 'vernacular_by_name'
        col = 'name'
    query = (db[table][col].belongs(identifiers)) & (db[table].lang_primary == lang_primary)
    if include_unpreferred == False:
        query = query & (db[table].preferred)
    rows = db(query).select(db[table][col], db[table].src, db[table].lang_full, db[table].preferred, db[table].vernacular)
    if return_nulls:
        vernaculars = {i:None for i in identifiers}
    else:
        vernaculars = {}
    
    if return_all:
        for r in rows:
            try:
                vernaculars[r[col]].append(r)
            except:
                vernaculars[r[col]] = [r]
        #sort arrays for each value in vernaculars
        #return {i: ([[r.vernacular, score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names)] for r in v] if v else None) for i,v in vernaculars.items()}
        return {i: ([r.vernacular for r in sorted(v, key=lambda r: score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names), reverse=True)] if v else None) for i,v in vernaculars.items()}
        
    else:
        for r in rows:
            rscore = score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names)
            #find max while looping
            try:
                if vernaculars[r[col]][1] < rscore:
                    raise
            except:
                vernaculars[r[col]] = [r.vernacular,rscore]
        return({v: (vernaculars[v][0] if vernaculars[v] else None) for v in vernaculars})

def get_common_name(ott, name=None, lang=None, include_unpreferred=False):
    """
    The same as get_common_names, but only for a single ott, or if ott is empty, none, etc, use name
    """
    db = current.db
    request = current.request
    lang_full = lang or (request.env.http_accept_language or 'en').lower()
    lang_primary = lang_full.split("-")[0]
    if ott:
        rows =  db((db.vernacular_by_ott.ott == ott) &
                  (db.vernacular_by_ott.preferred == True) &
                  (db.vernacular_by_ott.lang_primary == lang_primary)
                 ).select(
                      db.vernacular_by_ott.src,
                      db.vernacular_by_ott.lang_full,
                      db.vernacular_by_ott.vernacular,
                      db.vernacular_by_ott.preferred
                  )
    elif name:
        rows = db((db.vernacular_by_name.name == name) &
                  (db.vernacular_by_name.preferred == True) &
                  (db.vernacular_by_name.lang_primary == lang_primary)
                 ).select(
                      db.vernacular_by_name.src,
                      db.vernacular_by_name.lang_full,
                      db.vernacular_by_name.vernacular,
                      db.vernacular_by_name.preferred
                  )
    else:
        return None
    if len(rows) == 1:
        return rows[0].vernacular
    else:
        vernacular = None
        for r in rows:
            rscore = score(lang_full, lang_primary, r.lang_full, r.preferred, r.src)
            if vernacular is None or vernacular[1] < rscore:
                vernacular = [r.vernacular, rscore]
        return vernacular[0] if vernacular else None
    
def language(two_letter):
    """
    Cribbed from wikipedia: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    """
    return current.OZglobals['conversion_table'].get(two_letter)

