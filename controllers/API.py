# -*- coding: utf-8 -*-
import itertools
import sys
import re
from numbers import Number

import OZfunc
import img
import sponsorship_search
import pinpoint
"""
This contains the API functions - node_details, image_details, search_names, and search_sponsors. search_node also exists, which is a combination of search_names and search_sponsors.
# request.vars:
# -- node_ids: '1,2,3'
# -- leaf_ids: '2,3,4'
# -- image_source: 'best_any' or 'best_verified' or 'best_pd'
# -- question: should this contain the 'linkouts' functions, which are also a sort of API.

We should probably compile all docstrings in these files into markdown documentation
"""

identifier_cols = ['ott', 'ncbi','ifung', 'worms', 'irmng', 'gbif', 'ipni', 'eol', 'wikidata']
identifier_leaf_cols = identifier_cols + ['iucn']


def index():
    """
    Describe some of the more public APIs (OTT mappings, node_images, otts2vns)
    """
    public_constraints = db(db.API_users.API_user_name=="public").select(
        db.API_users.APIkey, db.API_users.max_taxa_per_query, db.API_users.max_returns_per_taxon).first()
    if public_constraints:
        return dict(
            identifier_cols=identifier_cols,
            identifier_leaf_cols=identifier_leaf_cols,
            public_key=public_constraints.APIkey,
            public_max_taxa_per_query = public_constraints.max_taxa_per_query,
            public_max_returns_per_taxon =  public_constraints.max_returns_per_taxon,
        )
    else:
        return dict(
            identifier_cols=identifier_cols,
            identifier_leaf_cols=identifier_leaf_cols,
            public_key=None,
        )


def error():
    """
    Return a JSONified error string
    """
    #set the default view to JSON, if there is no file extension (override web2py default of .html)
    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension
    response.status = request.vars.code or 400
    return dict(error=request.vars.text)
    

def version():
    v = OZfunc.__check_version()
    try:
        return dict(version=int(v))
    except ValueError:
        return dict(version=None, error=v)

def node_details():
    """
    This is the main API call, and should be optimized to within an inch of its life. Some ideas:
    1) Move it to another process (not web2py). E.g. Falcon. See http://klen.github.io/py-frameworks-bench/
    2) Put some of the load on the SQL server, but adding SQL joins rather than making 7
        queries (but mysql does not support full outer joins, which we would need)
    3) Do not return info about the leaf taxa in the representative image array, as we
        probably end up returning these many times over and over again. Instead, we could
        return the leaf IDs, and get the client to work out if we need to add them to the
        next API call.
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    try:
        language = request.vars.lang or request.env.http_accept_language or 'en'
        return OZfunc.nodes_info_from_string(
            request.vars.leaf_ids or "",
            request.vars.node_ids or "",
            include_names_in=language,
            image_type=request.vars.get('image_source') or "")
    except:  # E.g. if bad data has been passed in
        return {}

def image_details():
    """
    e.g. image_details.json?2=25677433,27724652&1=31925837,1
    where 1 and 2 are values from src_flags
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    try:
        all_cols = ['rights','licence']
        col_names = {nm:index for index,nm in enumerate(all_cols)}
        queries = []
        image_details = {}
        for v in request.vars:
            if v.isdigit() and int(v) in inv_src_flags:
                ids = request.vars[v]
                if re.search("[^-\d,]", ids):
                    raise #list of ids must only consist of digits and commas, otherwise this is a malicious API call
                if re.search("^,|[-,]$|,,|-[-,]|\d-", ids):
                    raise #ban commas at start, and before other commas, ban minus signs and commas at end, 
                #if we get here, ids should only contain numbers (negative or positive) with commas between
                image_details[int(v)]={int(id):None for id in ids.split(",")}
                q = "(SELECT " + ",".join(['src', 'src_id'] + all_cols) + " FROM {} WHERE src = {} AND src_id IN({}))"
                queries.append(q.format('images_by_ott',v, ids))
                queries.append(q.format('images_by_name',v, ids))
        for row in db.executesql(" UNION ALL ".join(queries)):
            image_details[row[0]][row[1]]=row[2:]
        return {'headers':col_names, 'image_details': image_details}
    except: #e.g. if bad data has been passed in
        return {'errors':['Bad data passed in']}

#Search
def search_node():
    """
    searches both taxon name (latin & vernacular) and sponsor text, but only looks for sponsors when the number of taxa returned is low
    So that we don't pollute the taxon searches with lots of sponsorship stuff
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    searchFor = make_unicode(request.vars.query or '')
    res1 = search_for_name()
    if len(res1['leaf_hits']) + len(res1['node_hits']) <15:
        try:
            res2 = sponsorship_search.search_sponsor(searchFor, "all", res1.get('lang'))
        except:
            if is_testing:
                raise
            res2 = {}
    else:
        res2 = {"reservations": {}, "nodes": {}, "leaves": {}}
    return {"nodes": res1, "sponsors": res2}

def pinpoints():
    session.forget(response)
    pinpoints = request.args
    lang = request.vars.lang or request.env.http_accept_language or 'en'

    results = []
    for pp in request.args:
        r, is_leaf = pinpoint.resolve_pinpoint_to_row(pp)
        if not r:
            # No result
            results.append(dict(pinpoint=pp))
            continue
        results.append(dict(
            pinpoint=pp,
            ozid=-r.id if is_leaf else r.id,
            ott=r.ott,
        ))
        if request.vars.get('sciname', None):
            results[-1]['sciname'] = r.name;

    vn_type = request.vars.get('vn', None)
    if vn_type:
        vn_results = OZfunc.get_common_names(
            [r['ott'] for r in results if r.get('ott', None)],
            return_nulls=False,
            prefer_short_name='short' in vn_type,
            include_unpreferred='unpreferred' in vn_type,
            return_all='all' in vn_type,
            lang=lang,
        )
        for r in results:
            if r.get('ott', None):
                r['vn'] = vn_results.get(r['ott'], None)

    return dict(lang=lang, results=results)

def search_init():
    """
    This is called at the very start of loading a tree view page. It looks in
    request.vars to return the OneZoom id of taxa corresponding to:
    -- Number: ott 
    -- String: name
    return a list of leaf (negative) or node ids given ott number or scientific name
    
    The ott number is given priority. If this matches a single leaf, this is the only id
    returned. If it matches a single node, this is the only one returned.
    
    If multiple leaves/nodes match, and names are given, it tries to find a leaf or node
    matching both name and ott. If none match both, it just returns all possible hits
    (or an empty error if no hits at all).
    """
    session.forget(response)
    ids = set()
    try:
        ott = int(request.vars.get('ott'))
        query = db.ordered_leaves.ott == ott
        ids.update([-r.id for r in db(query).select(db.ordered_leaves.id)])
        # Always return the leaf if there is a single hit
        if len(ids) == 1:
            return {"ids": list(ids)}
        
        query = db.ordered_nodes.ott == ott
        ids.update([r.id for r in db(query).select(db.ordered_nodes.id)])
        # If a single node, don't worry about the name
        if len(ids) == 1:
            return {"ids": list(ids)}
    except (TypeError, ValueError) as error:
        pass  # Some problem converting ott to int, try on name
    try:
        sciname = pinpoint.untidy_latin(request.vars.name)
        query = db.ordered_leaves.name == sciname
        name_ids = set([-r.id for r in db(query).select(db.ordered_leaves.id)])
        query = db.ordered_nodes.name == request.vars.name
        name_ids.update([r.id for r in db(query).select(db.ordered_nodes.id)])
    
        # If we already had some ids, use names to refine
        if len(ids & name_ids):
            ids &= name_ids
        elif len(ids | name_ids):
            ids |= name_ids
    except:
        pass #could be a problem with getting a name
    if ids:
        return {"ids": sorted(ids)}
    return {"empty": request.vars.ott}

        
# request.vars contains:
#  -- String: query
#  -- String: 'lang' (default 'en') - used to override the default of request.env.http_accept_language
#  -- Boolean: 'sorted' (default False)
#  -- Number: 'limit'
#  -- Number: 'page' (default 0)
#  -- Boolean: 'include_price' (default False)
#  -- String: 'restrict_tables is one of 'leaves', 'nodes' or None.(default None)
#  Sanitize parameters and then do actually search.
def search_for_name():
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    language = request.vars.lang or request.env.http_accept_language or 'en'
    try:
        searchFor = make_unicode(request.vars.query or "")
        first_lang = language.split(',')[0]
        lang_primary = first_lang.split("-")[0]
        order = True if (request.vars.get('sorted')) else False
        limit=request.vars.get('limit')
        start =request.vars.get('start') or 0
        include_price = True if (request.vars.get('include_price')) else False
        restrict_tables = request.vars.get('restrict_tables')
        return search_by_name(searchFor, language, order_by_popularity = order, limit=limit, start=start, restrict_tables=restrict_tables,include_price=include_price)
    except:
        if is_testing:
            raise
        else:
            return {'lang':language}
    

def search_by_name(searchFor, language, order_by_popularity=False, limit=None, start=0, restrict_tables=None, include_price=False):
    """
    Search in latin and vernacular names for species. To look only in leaves, set restrict_tables to 'leaves'.
    To look only in nodes set it to 'nodes', otherwise we default to searching in both


    We can do fast matches with against the start of words using full test searches in boolean mode, e.g. 
        match(vernacular) against('o*' in boolean mode) and lang_primary='en'
    (note that although you can put an asterisk at the start of the match it is ignored by mysql)
    
    The problem is that the minimum word size is set to innodb_ft_min_token_size = 3, so that one and two-letter
    words are excluded from the index, and since we share databases with other users, we can't change this.
    We can still match *search terms* of one and two letters, e.g. 'ox*' will match some things (e.g. 'oxford')
    but nothing of 2 letters (e.g. 'ox').
    
    So if we want to also match against one or two letter words, we need to use normal text matches
    *in addition* to full text matches. For speed, we are restricted to matching at the start of the 
    entire phrase
    """
    
    
    """
    1) Kill off any searches where all non-chinese words are <= 1 letter
    1. if string length < 3, then it would run a start match. For example, search for 'zz' would return 'zz plant', search for 'ox ox' would
    return 'ox oxon'(if it exists)
    2. all words' length >= 3, then it would run natural language search on each word.
    3. parts of the words' length >= 3, then it would do a natural language search on these words and then do a containing search on the rest words.
    4. TO DO: substitute all punctuation with spaces (except apostrophe, dash, dot & 'times'
    5. TO DO: in English, we should remove apostrophe-s at the end of a word
    """
    lang_primary = language.split(',')[0].split("-")[0].lower()
    base_colnames = ['id','ott','name','popularity']
    if include_price:
        base_colnames += ['price']
    colnames = base_colnames + ['vernacular','extra_vernaculars']
    colname_map = {nm:index for index,nm in enumerate(colnames)}

    ret = {"headers":colname_map, "leaf_hits":[], "node_hits":[], "lang":language}
    try:
        originalSearchFor = searchFor
        searchFor = OZfunc.punctuation_to_space(searchFor).split()
        if (
            len(searchFor)==0 or
            all([
                (len(word)<=1 and not OZfunc.is_logographic(word, lang_primary))
                for word in searchFor]
            )
        ):
            return ret
        longWords = []
        shortWords = []
        for word in searchFor:
            if len(word) >= 3:
                longWords.append(word)
            else:
                shortWords.append(word)
            
        searchForCommon = " ".join(["+*" + word + "*" for word in longWords])
        searchForLatin = searchForCommon
        
        #Double percentage sign to escape %.
        searchForShortContains = " ".join(["and {0} like '%%" + word + "%%'" for word in shortWords])
        names=set()
        otts=set()
        
        #query the matches against latin and vernaculars in one go, and 
        #http://stackoverflow.com/questions/7082522/using-sql-join-and-union-together
        if restrict_tables=="leaves":
            results={'ordered_leaves':[]}
        elif restrict_tables=="nodes":
            results={'ordered_nodes':[]}
        else:
            results={'ordered_leaves':[], 'ordered_nodes':[]}
        
        for tab in results:
            initial_cols = ",".join(base_colnames)
            if tab=="ordered_nodes":
                initial_cols = initial_cols.replace("price", "NULL AS price") #nodes don't have a price
            query = 'select ' + initial_cols + ' from ' + tab + ' {0}'
            query += ' union select ' + initial_cols + ' from ' + tab + ' where ott in (select distinct ott from vernacular_by_ott {1})'
            query += ' union select ' + initial_cols + ' from ' + tab + ' where name in (select distinct name from vernacular_by_name {2})'
            
            if len(longWords)>0:
                query = query.format(
                    'where match(name) against({0} in boolean mode) ' + searchForShortContains.format('name'),
                    'where match(vernacular) against({0} in boolean mode) and lang_primary={0} ' + searchForShortContains.format('vernacular'),
                    'where match(vernacular) against({0} in boolean mode) and lang_primary={0} ' + searchForShortContains.format('vernacular')
                )
            else:
                query = query.format(
                    "where name like {0}",
                    "where lang_primary={0} and vernacular like {0}",
                    "where lang_primary={0} and vernacular like {0}"
                )
            if order_by_popularity:
                query += ' ORDER BY popularity DESC'
            if limit:
                query += ' LIMIT ' + str(int(limit))
                if start:
                    query += ' OFFSET ' + str(int(start))
            
            
            if len(longWords)>0:
                results[tab] = [list(row) for row in db.executesql(query.format(db.placeholder), (searchForLatin, searchForCommon, lang_primary, searchForCommon, lang_primary))]
            else:
                temp = originalSearchFor + "%%"
                results[tab] = [list(row) for row in db.executesql(query.format(db.placeholder), (temp, lang_primary, temp, lang_primary, temp))]
            #search for common name
            for row in results[tab]:
                if row[1]:
                    otts.add(row[1])
                elif row[2]:
                    names.add(row[2])
        #now find the vernacular names for these, so we can  save them in 'vernaculars' and 'extra_vernaculars'
        ott_to_vern = {}
        name_to_vern = {}
        if len(otts):
            #save the match status in the query return, so we can use it later.
            if len(longWords)>0:
                mtch = 'if(match(vernacular) against({} in boolean mode), TRUE, FALSE) as mtch'
                query = ("select ott,vernacular,preferred,mtch from (select ott, vernacular, preferred, src, " + mtch + " from vernacular_by_ott where lang_primary={} and ott in ({})) t where (mtch or preferred) order by preferred DESC,src").format(db.placeholder, db.placeholder, ",".join([db.placeholder]*len(otts)))
                temp = db.executesql(query, [searchForCommon] + [lang_primary] + list(otts))
            else:
                mtch = "if(vernacular like {}, TRUE, FALSE) as mtch"
                query = ("select ott,vernacular,preferred,mtch from (select ott, vernacular, preferred, src, " + mtch + " from vernacular_by_ott where lang_primary={} and ott in ({})) t where mtch order by preferred DESC,src")
                query = query.format(db.placeholder, db.placeholder, ",".join([db.placeholder]*len(otts)))
                temp = db.executesql(query, [originalSearchFor+'%%'] + [lang_primary] + list(otts))                

            for row in temp:
                if row[0] not in ott_to_vern: #nothing saved yet
                    if row[2]: #this is a preferred match, and is the first preferred encountered, so is the standard vernacular
                        if row[3]: #this is a match, so we don't need to store any non-preferred versions
                            ott_to_vern[row[0]]=[row[1]]
                        else:      #save space for non-preferred matches: there must be at least one, unless the match was via sciname
                            ott_to_vern[row[0]]=[row[1],[]]   
                    else:      #this is not preferred: no standard vernacular, save as an extra
                        ott_to_vern[row[0]]=[None,[row[1]]]
                else:
                    #the entry exists, so we must have already filled out some vernaculars
                    if row[3] and len(ott_to_vern[row[0]])==2: #another match, and standard vernacular didn't match: add to extras
                        ott_to_vern[row[0]][1].append(row[1])
        if len(names):
            #same again, but match on name
            query = "select name,vernacular,preferred,mtch from (select name, vernacular, preferred, src, if(match(vernacular) against({} in boolean mode), TRUE, FALSE) as mtch from vernacular_by_name where lang_primary={} and name in ({})) t where (mtch or preferred) order by preferred DESC,src".format(db.placeholder,db.placeholder,",".join([db.placeholder]*len(names)))
            for row in db.executesql(query, [searchForCommon] + [lang_primary] + list(names)):
                if row[0] not in name_to_vern: #nothing saved yet
                    if row[2]: #this is a preferred match, and is the first preferred encountered, so is the standard vernacular
                        if row[3]: #this is a match, so we don't need to store any non-preferred versions
                            name_to_vern[row[0]]=[row[1]]
                        else:      #save space for non-preferred matches: there must be at least one, unless the match was via sciname
                            name_to_vern[row[0]]=[row[1],[]]   
                    else:      #this is not preferred: no standard vernacular, save as an extra
                        name_to_vern[row[0]]=[None,[row[1]]]
                else:
                    #the entry exists, so we must have already filled out some vernaculars
                    if row[3] and len(name_to_vern[row[0]])==2: #another match, and standard vernacular didn't match: add to extras
                        name_to_vern[row[0]][1].append(row[1])
        for tab in results:
            for row in results[tab]:
                try:
                    ott=row[colname_map['ott']]
                    row.extend(ott_to_vern[ott])
                except KeyError:
                    try:
                        name=row[colname_map['name']]
                        row.extend(name_to_vern[name])
                    except:
                        pass #might reach here if the latin name has matched, but no vernaculars
        ret['leaf_hits'] = results.get('ordered_leaves')
        ret['node_hits'] = results.get('ordered_nodes')
    except:
        pass  # Bad form here, but we always want to return *something* (even a blank)

    return ret

        
#find best vernacular name which matches user's query group by ott.
def findMatchMostName(vernacular_hits, searchFor):
    last_ott = -1
    temp_group = []
    vernacular_hit_res = []
    for row in vernacular_hits:
        if last_ott != row.ott:
            last_ott = row.ott
            if len(temp_group) > 0:
                vernacular_hit_res.append(findMatchMostNameInEachOttGroup(temp_group, searchFor))
            temp_group = []
        temp_group.append(row)
    if len(temp_group) > 0:
        vernacular_hit_res.append(findMatchMostNameInEachOttGroup(temp_group, searchFor))
    return vernacular_hit_res
    
def findMatchMostNameInEachOttGroup(group, searchFor):
    preferred_row = None
    preferred_vernacular = None
    
    for row in group:
        if row.preferred:
            preferred_row = row
            preferred_vernacular = row.vernacular
            if doesQueryMatchHit(searchFor, row.vernacular):
                return row                
    
    for row in group:
        if doesQueryMatchHit(searchFor, row.vernacular):
            unpreferred_hit = row.vernacular
            row.vernacular = preferred_vernacular
            row.unpreferred_hit = unpreferred_hit
            return row
                
    if preferred_row is None:
        return group[0]
    else:
        return preferred_row
        
def doesQueryMatchHit(query, hit):
    wordIndex = 0
    for word in query:
        wordIndex = wordIndex+1
        if word.upper() in hit.upper():
            if wordIndex == len(query):
                return True
        else:
            return False
    return False

def search_for_sponsor():
    """
    Searches OneZoom for sponsorship text

    :something?:`parameter1` And then describe the parameter.

    """
    response.headers["Access-Control-Allow-Origin"] = '*'
    language = request.vars.lang or request.env.http_accept_language or 'en'
    try:
        searchFor = make_unicode(request.vars.query)
        #remove initial punctuation, e.g. we might have been passed in 
        searchType = request.vars.type or 'all'
        defaultImages = True if (request.vars.get('default_images')) else False
        limit=request.vars.get('limit')
        start =request.vars.get('start') or 0
        return sponsorship_search.search_sponsor(searchFor, searchType, language, limit, start, defaultImages)
    except:
        if is_testing:
            raise
        else:
            return {'lang':language}

def get_ids_by_ott_array():
    """
    Map a comma-separated list of otts (e.g. popular species) to the leaf (or node) IDs.
    Returns {'leaves':leaf_map, 'nodes':node_map, 'names':name_map} where leaf_map et al
    are dicts of ott:id or ott:sciname mappings (scientific names are returned as
    this is cheap to do)
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    return OZfunc.otts2ids(OZfunc.query_val_to_ints(request.vars.getlast("ott_array", "")))

def update_visit_count():
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    try:
        if request.vars.api_hits:            
            values = []
            for ott in request.vars.api_hits.split(","):
                values.append("(" + ott + ",1,0,0)")
            values = ",\n".join(values)
            query = "insert into visit_count (ott, detail_fetch_count, search_count, leaf_click_count) values \n" + values + "\n"
            query = query + "on duplicate key update detail_fetch_count = detail_fetch_count + 1"
            db.executesql(query)
            
        if request.vars.search_hits:
            values = []
            for ott in request.vars.search_hits.split(","):
                values.append("(" + ott + ",0,1,0)")
            values = ",\n".join(values)
            query = "insert into visit_count (ott, detail_fetch_count, search_count, leaf_click_count) values \n" + values + "\n"
            query = query + "on duplicate key update search_count = search_count + 1"
            db.executesql(query)
            
        if request.vars.leaf_click_count:
            values = []
            for ott in request.vars.leaf_click_count.split(","):
                values.append("(" + ott + ",0,0,1)")
            values = ",\n".join(values)
            query = "insert into visit_count (ott, detail_fetch_count, search_count, leaf_click_count) values \n" + values + "\n"
            query = query + "on duplicate key update leaf_click_count = leaf_click_count + 1"
            db.executesql(query)
            
        return {"status":"success"}
    except:
        return {"status":"failure"}
    
    
def get_id_by_ott():
    """
    A fast single item version of get_ids_by_ott_array
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    ott = request.vars.ott
    query = db.ordered_nodes.ott == ott
    result = db(query).select(db.ordered_nodes.id, db.ordered_nodes.ott)
    if len(result) > 0:
        return {"id": result[0].id}
    else:
        query = db.ordered_leaves.ott == ott
        result = db(query).select(db.ordered_leaves.id, db.ordered_leaves.ott)
        if len(result) > 0:
            return {"id": -result[0].id}
    return {"id": "none"}


def getOTT():
    """
    This is called as a json request with potentially multiple identifiers, e.g.
    http://mysite/getOTT.json?eol=123&eol=456&ncbi=789 
    and should return the OTT ids and scientific names  EOLid in JSON form: {'data':'5678'}
    
    This is useful for common-name searching, where the EoL search API returns EOL identifiers
    which can then be matched against OneZoom leaves.
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    sources = ["eol", "gbif", "ncbi", "iucn"]
    data = {'errors': []}

    for s in sources:
        if not request.vars.get(s, False):
            continue
        id_list = request.vars[s]
        if isinstance(id_list, str) or isinstance(id_list, Number):
            id_list = [id_list]  # Wrap single item in list
        try:
            id_list = [int(id) for id in id_list]
        except ValueError:
            data[s] = {}
            data['errors'].append("%s could not be converted to int" % s)
            continue

        leaf_rows = db(db.ordered_leaves[s].belongs(id_list)).select(db.ordered_leaves[s], db.ordered_leaves.ott)
        if s == 'iucn':
            node_rows = ()
        else:
            node_rows = db(db.ordered_nodes[s].belongs(id_list)).select(db.ordered_nodes[s], db.ordered_nodes.ott)
        data[s] = {r[s]:r.ott for r in itertools.chain(leaf_rows, node_rows)}
    return data

def children_of_OTT():
    """ Return a set of terminal nodes for this OTT taxon: easily done using the nested set representation. The URL is of the form
        http://mysite/children_of_OTT.json/<OTT>?sort=<sortcol>&max=<max>&page=1 which returns <max> leaves sorted by <sortcol>, e.g.
        http://mysite/children_of_OTT.json/13943?sort=popularity&max=10. The parameters <sortcol>, <max> and <page> are optional, with defaults
        <sortcol> = id, <max> = 50 and <page>=1. if <max> is greater than 1000 it is set to 1000, to avoid responding with huge queries.
        The JSON returned should have the ott, name (scientific name), eol, wikidataQ, and popularity  
    """
    try:
        OTTid = int(request.args[0])
        query = OZfunc.child_leaf_query('ott', OTTid)
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
        query = OZfunc.child_leaf_query('eol', EOLid)
        query = query & (db.ordered_leaves.eol!=None)
        rows = select_leaves(query,
                             request.vars.get('page'),
                             request.vars.get('max'),
                             request.vars.get('sort'))
        return(dict(data={'EOL2OTT':{r.eol:r.ott for r in rows}}))
    except ValueError: # probably bad int inputted
        return(dict(errors=['EOL id must be an integer'], data=None))


############################
# Publicly documented APIs #
############################


def search_for_sciname():
    """
    Search for a starting match on the latin name as stored in the ordered_leaves or ordered_nodes tables
    String passed in is ?query=xxxx
    """
    session.forget(response)
    
    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension    
    # Not limited as only one name is searched for
    
    response.headers["Access-Control-Allow-Origin"] = '*'
    try:
        searchFor = " ".join(make_unicode(request.vars.query or "").split())
        result = []
        if searchFor and len(searchFor)>1:
            if not request.vars.nodes_only:
                result += [[r.id, r.ott, r.name] for r in \
                    db(db.ordered_leaves.name.startswith(searchFor)).select(db.ordered_leaves.id, db.ordered_leaves.ott, db.ordered_leaves.name)]
            if not request.vars.leaves_only:
                result += [[r.id, r.ott, r.name] for r in \
                    db(db.ordered_nodes.name.startswith(searchFor)).select(db.ordered_nodes.id, db.ordered_nodes.ott, db.ordered_nodes.name)]
        return dict(result=result)
    except:
        if is_testing:
            raise
        else:
            return {}


def otts2vns():
    '''
    Also used in the OneZoom viewer e.g. to fill out the popular species lists,
    can call with request.vars.lang=XX and with prefer_short=1
    Will return nulls for unmatched otts if return_nulls=1
    Returns e.g. {"770315":"Human","872567":"Brown Bear", "lang":"en-gb"}
    '''
    session.forget(response)

    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension
    
    if request.vars.key is None:
        # As this is used in the OneZoom app with no key, we explcitly allow it, but
        # limit the maximum number of taxa in the viewer to 25
        max_otts = 25
    else:
        max_otts = get_limits(request.vars.getlast("key", ""))

    otts = OZfunc.query_val_to_ints(request.vars.getlast("otts", ""))
    if len(otts) <= max_otts:
        pass
    else:
        redirect(URL('error', vars=dict(
            code=400,
            text=f"You must pass in at least 1 and not more than {max_otts} OTT ids"
        )))

    lang = request.vars.lang or request.env.http_accept_language or 'en'
    response.headers["Access-Control-Allow-Origin"] = '*'

    try:
        ret_otts = OZfunc.get_common_names(
            otts,
            return_nulls=(True if request.vars.nulls else False),
            prefer_short_name=(True if request.vars.prefer_short else False),
            include_unpreferred=(True if (request.vars.include_unpreferred or request.vars.all) else False),
            return_all=(True if request.vars.all else False),
            lang=lang,
        )
        ret_otts['lang']=lang
        return ret_otts
    except (AttributeError, ValueError):
        return {'lang':lang}


def node_images():
    """
    Return the 8 representative images for a set of OTT IDs, along with their license
    info, etc. Note that this API call is not used in the OneZoom viewer: it is
    inefficient because many requested nodes share images.
    This API is placed here for other users of the OneZoom APIs
    """
    session.forget(response)

    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension
    
    if request.vars.key is None:
        redirect(URL('error', vars=dict(
            code=400,
            text="Please use an API key (use 0 for the public API key)"
        )))
    max_otts = get_limits(request.vars.getlast("key", ""))
    otts = OZfunc.query_val_to_ints(request.vars.getlast("otts", ""))
    if 0 < len(otts) <= max_otts:
        pass
    else:
        redirect(URL('error', vars=dict(
            code=400,
            text="You must pass in at least 1 and not more than {max_otts} OTT ids"
        )))

    response.headers["Access-Control-Allow-Origin"] = '*'
    ids = OZfunc.otts2ids(otts)
    # Allowed types == "any", "verified", or "pd"
    type = request.vars.type if request.vars.type in ("any", "verified", "pd") else "any"
    leaf_ids = list(ids['leaves'].values())
    node_ids = list(ids['nodes'].values())
    colnames = OZfunc.nodes_info_from_string("", "", include_pic_details=True, check_malicious=False)
    node_cols = colnames['colnames_nodes']
    node_image_cols = [node_cols["{pic}"+str(x+1)] for x in range(8)] # This may need correcting if we change the pic colname
    leaf_cols = colnames['colnames_leaves']
    pic_cols = colnames['colnames_images']
    results = OZfunc.nodes_info_from_array(
        leaf_ids,
        node_ids,
        include_pics=True,
        include_iucn=False,
        include_sponsorship=False,
        image_type='best_' + type,
        include_pic_details=True,
    )
    headers = {'name':0, 'url':1, 'rights':2, 'licence':3, 'rating':4}
    pics = {}
    for p in results['leafPic']:
        pics[p[pic_cols['ott']]] = [
            None,
            img.thumb_url(p[pic_cols['src']], p[pic_cols['src_id']]),
            p[pic_cols['rights']],
            p[pic_cols['licence']],
            p[pic_cols['rating']],
        ]         
    
    original_taxa = {}
    for l in results['leaves']:
        ott = l[leaf_cols['ott']]
        if ott in pics:
            pics[ott][headers['name']] = l[leaf_cols['name']]
        if ott in otts:
            original_taxa[ott] = {'name': l[leaf_cols['name']], 'otts': [ott]}

    for n in results['nodes']:
        original_taxa[n[node_cols['ott']]] = {
            'name': n[node_cols['name']], 'otts': [n[c] for c in node_image_cols]}

    return dict(taxa=original_taxa, headers=headers, images=pics, type=type)
    

def otts2identifiers():
    """
    Return the identifiers in other databases for the passed-in set of OTT IDs.
    Called as http://mysite/otts2identifiers.json?otts=770315,844192
    """
    session.forget(response)

    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension
    
    if request.vars.key is None:
        redirect(URL('error', vars=dict(
            code=400,
            text="Please use an API key (use 0 for the public API key)"
        )))
    max_otts = get_limits(request.vars.getlast("key", ""))
    otts = OZfunc.query_val_to_ints(request.vars.getlast("otts", ""))
    if 0 < len(otts) <= max_otts:
        pass
    else:
        redirect(URL('error', vars=dict(
            code=400,
            text="You must pass in at least 1 and not more than {max_otts} OTT ids"
        )))
    
    response.headers["Access-Control-Allow-Origin"] = '*'
    colname_map = {name: i for i, name in enumerate(identifier_leaf_cols)}
    ret = {}
    rows = db(db.ordered_leaves.ott.belongs(otts)).select(*identifier_leaf_cols)
    for row in rows:
        ret[row.ott] = [row[c] for c in identifier_leaf_cols]
    rows = db(db.ordered_nodes.ott.belongs(otts)).select(*identifier_cols)
    for row in rows:
        ret[row.ott] = [row[c] for c in identifier_cols]
    return dict(
        headers=colname_map,
        ids=ret)


#PRIVATE FUNCTIONS


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


def make_unicode(input):
    try:
        if input and type(input) != unicode:
            input =  input.decode('utf-8')
    except NameError:
        pass #for python3
    return input


def get_limits(API_key):
    """
    Similar to get_limits in popularity.py but only return the max taxa allowed per query
    """
    results = db(db.API_users.APIkey == API_key).select(db.API_users.ALL)
    if results:
        result = results.first()
        if result.max_taxa_per_query:
            return result.max_taxa_per_query
        else:
            redirect(URL('error', vars=dict(
                code=400,
                text=f"Sorry, the API key {result.APIkey} ({result.API}) is no longer allowed"
            )))
    else:
        redirect(URL('error', vars=dict(
            code=400,
            text=f"Sorry, the API key {API_key} has not been recognised"
        )))
