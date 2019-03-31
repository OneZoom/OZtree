# -*- coding: utf-8 -*-
"""Below are some private functions. NB: https://web2py.wordpress.com/tag/private-function/
Functions that are defined in controllers and that takes arguments are private.
Functions defined in controllers and start with ‘__’ [double underscores] are private.
Functions defined in controllers and having a space after the () and before the ‘:’ are private. 
"""
import re
import os
import random
from gluon import current
from gluon.http import HTTP

def raise_incorrect_url(example_url, info=current.T("Incorrect usage")):
    raise HTTP(400,  info+ "<br />" + current.T("Try e.g. %s") % "<a href='{0}'>{0}</a>".format(example_url), link='<{}>; rel="example"'.format(example_url))

def __check_version(): #this is a private function
    db = current.db
    request = current.request
    try:
        row = db.ordered_nodes[1]
        if row:
            version = -(row.parent) #the version number of the tree is hackily stored as a negative parent of the root
            if not os.path.isfile(os.path.join(request.folder,
                                      "static",
                                      "FinalOutputs",
                                      "data",
                                      "completetree_{}.js".format(version))):
                raise IOError(current.T("completetree file does not exist for version %s") % version)
            return version
        else:
            raise IndexError(current.T("there seems to be no data for tree nodes in the database (the `ordered_nodes` table is not filled out)"))
    except Exception as e:
        return str(e)

def lang_primary(req):
    language=req.vars.lang or req.env.http_accept_language or 'en'
    first_lang = language.split(',')[0]
    return(first_lang.split("-")[0].lower())
    
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
    src_flag_target, prefer_short_name=False, max_src_flag=max(current.OZglobals['inv_src_flags'])):
    if prefer_short_name:
        score = max_src_flag - (0 if src_flag_target==current.OZglobals['src_flags']['short_imprecise_name'] else src_flag_target)
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
    
    TODO - needs internationalization
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
    prefer_short_name=False, include_unpreferred=False, return_all=False):
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
   
    If there are multiple equally good matches, we should prefer names in ascending src order, e.g. src=1 (bespoke)
    then src=2 (onezoom_bespoke), ..., unless prefer_short_name is set, when we put short_imprecise_name first
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
        #return {i: ([[r.vernacular, score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_short_name)] for r in v] if v else None) for i,v in vernaculars.items()}
        return {i: ([r.vernacular for r in sorted(v, key=lambda r: score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_short_name), reverse=True)] if v else None) for i,v in vernaculars.items()}
        
    else:
        for r in rows:
            rscore = score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_short_name)
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
    return current.OZglobals['conversion_table'].get(two_letter)

def punctuation_to_space(unicodetext):
    """
    Convert all space characters, and most punctuation, to normal spaces
    prior to separating search results into words
    """
    return unicodetext.translate(current.OZglobals['unicode_punctuation_to_space_table'])

def is_logographic(word, lang_primary):
    """
    Identify if this search is for logographic (e.g. chinese) characters, in which case 
    we will not want to do a natural language search, and can search for each character 
    independently. Since there is no obvious way to identify logographic characters, we
    only do this if the search is for logographic languages, as described in
    https://en.wikipedia.org/wiki/List_of_writing_systems#Logographic_writing_systems
    which, restricted to extant languages, is only chinese, japanese, and korean
    """
    import string
    if lang_primary not in ["zh", "cnm", "ja", "ko"]:
        return False
    #if the word is in a logographic language but contains any ascii or accented ascii chars, it can be
    #treated as a logographic type, with spaces between words
    return not any(ch in current.OZglobals['logographic_transcriptions'] for ch in word)

def acceptable_sciname(word):
    """
    the following regexp matches characters that are reasonable to accept in scientific name:
    [-./A-Za-z 0-9×αβγδμëüö{}*#]
    (this includes e.g. in bacterial strains etc). If we get a search word containing anything outside these characters, we can treat it as a vernacular name match
    """
    import string
    return all(ch in string.ascii_letters+string.digits+u" -./×αβγδμëüö{}*#" for ch in word) 

def __make_user_code():
    """
    Generate a random string that is unlikely to clash with another. E.g. for the 'ultimate answer' (42)
    100,000 entries 2^42 gives an expected clash rate of 1 in 880.
    
    Eventually, when we also use this to generate registration_ids in the auth_user table, 
    we will want to check here that the random number generated does not exist in the auth_user table
    """
    return '{:x}'.format(random.getrandbits(42))    

def https_redirect() :
    request = current.request
    if not request.is_local and not request.is_https:
        redirect(URL(scheme='https', args=request.args, vars=request.vars))
