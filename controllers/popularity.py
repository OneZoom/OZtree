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

def test():
    """
    Pass in an OTT and get a list of the popularity ratings of the parents plus 
    a wikidata identifiers, so that we can query the current values using the wiki APIs
    
    Uses a stored procedure in the DB like this:
    
    DELIMITER $$
    DROP PROCEDURE IF EXISTS GetParents $$
    CREATE PROCEDURE GetParents (GivenID INT, ColumnsReturned TEXT, WhereCondition TEXT)
    /* This gets all the parents with wikidata IDs up to the root for a ordered_node ID */
    BEGIN
        DECLARE rv TEXT;
        DECLARE cm CHAR(1);
        DECLARE ch INT;
        DECLARE loop_max INT;
    
        SET rv = '';
        SET cm = '';
        SET ch = GivenID;
        SET loop_max = 5000; /* to avoid infinite loops - shouldn't have >5000 real parents in a tree */
        WHILE ch <> 0  AND loop_max > 0 DO
        	set loop_max = loop_max-1;
            SELECT IFNULL(real_parent,0) INTO ch FROM
            (SELECT real_parent, name FROM ordered_nodes WHERE id = ABS(ch)) A;
            IF ch <> 0 THEN
                SET rv = CONCAT(rv,cm,ch);
                SET cm = ',';
            END IF;
        END WHILE;
        SET @s = CONCAT('SELECT ', ColumnsReturned, ' FROM ordered_nodes');
        IF WhereCondition = '' THEN
            SET @s = CONCAT(@s, ' WHERE id IN (',rv,')');
        ELSE
            SET @s = CONCAT(@s, ' WHERE id IN (',rv,') AND (', WhereCondition, ')');
        END IF;
        SET @s = CONCAT(@s, ' ORDER BY id DESC');
        PREPARE stmt1 FROM @s;
        EXECUTE stmt1;
    	DEALLOCATE PREPARE stmt1;
        
    END $$
    DELIMITER ;

    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'

    if request.vars.key:
        API_user = db(db.API_users.APIkey == request.vars.key).select(db.API_users.API_user_name).first()
    else:
        API_user = None
        
    if auth.is_logged_in() or API_user and API_user.API_user_name != 'public':
        if request.vars.ott:
            try:
                headers = ['ott', 'name', 'wikidata', 'popularity', 'raw_popularity']
                headers_index = {h:i for i,h in enumerate(headers)}
                ott = int(request.vars.ott)
                taxon = db.executesql("SELECT {} FROM ordered_leaves WHERE ott = {}".format(
                    ",".join(headers + ['real_parent']), db.placeholder), ott)
                if len(taxon)==0:
                    taxon = db.executesql("SELECT {} FROM ordered_nodes WHERE ott = {}".format(
                        ",".join(headers + ['real_parent']), db.placeholder), ott)
                
                if len(taxon):
                    taxon_parent = taxon[0][len(headers)]
                    parents = db.executesql("CALL GetParents({}, '{}', '{}')".format(
                        taxon_parent, ",".join(headers), 'wikidata is not NULL'))
                    return {
                        'error':'' if len(taxon)==1 else 'Caution: the ott {} matched against {} taxa'.format(ott, len(taxon)), 
                        'taxa': [taxon[0]] + [p for p in parents], 'headers_index':headers_index
                        }
                return {'error':'', 'taxa': [], 'headers_index':headers_index}
            except ValueError:
                return {'error':"Something's not right: you need to provide an integer ott", 'taxa':[]}
            except:
                raise
                return {'error':"Something's not right - have you defined the `GetParents()` stored procedure in your database?", 'taxa':[]}
        else:
            return {'error':'', 'taxa':False}
    else:
        response.view = request.controller + "/needs_authentication." + request.extension
        return {}


def list():
    """Return popularity information for a list of Open Tree Taxonomy identifiers
    Valid calls will return a JSON dict of 
    {"data":[[...],[...]], "header": [...], "n_taxa":X, "tot_spp":Y}, 
    where:
      "data" is a 2D array containing rows of information, one per taxon, with values in each row 
      corresponding to Open Tree Taxonomy identifier, scientific name (if requested), 
      popularity, and popularity rank (only for species)
      "header" gives an integer column number for a given column header: for instance, the robust
      way to obtain the Open Tree Taxonomy identifier for row 2 is data[2][header['ott']]
      "n_taxa" is the total number of taxa that would have been returned by the query if it hadn't been limited
      "tot_spp" is the total number of species that would have been returned by the query if it hadn't been limited
    Parameters:
    Required:
        * key (an API key - use the "public API key" if you have none - see index.html)
        * otts (a comma-separated list of positive integer OTT ids)
    Optional:
        * max (positive integer, (default = the number of taxa passed in): the maximum number of taxa to return)
        * expand_taxa (boolean (e.g. 0 or 1) should OTTs corresponding to taxa above the species level
            be "unpacked" into all their descendant species, e.g. all mammal species)
        * spread_taxa_evenly (boolean (e.g. 0 or 1) should we divide the max number of taxa to return so that each of 
            the N taxa that are passed in are limited to floor(max/N) species (with the results being combined). 
            Note that the combined list of taxa returned will therefore often be less than the "max" parameter.
            This only really makes sense when expand_taxa is set to 1
        * names (boolean (e.g. 1 or 0 default) should scientific names be included in the row)
        * sort ("rank" or "true" (default)). Note that if expand_taxa is false, the default sorting order may interleave 
            species and higher-level taxa, depending on their popularity values
        * db_seconds (boolean (e.g. 1 or 0 default) also return the number of seconds for the database to process this query
        
    
    If no otts, or invalid otts are given, return {"error":XXX} and set HTTP return to 400
    """
    session.forget(response)
    response.headers["Access-Control-Allow-Origin"] = '*'
    
    #set the default view to JSON, if there is no file extension (override web2py default of .html)
    if "." not in request.env.path_info.split('/')[2]:
        request.extension = "json"
    response.view = request.controller + "/" + request.function + "." + request.extension
    
    if request.vars.key is None:
        raise(HTTP(400,"Please use an API key (use 0 for the public API key)"))
    max_otts, max_n = get_limits(request.vars.getlast("key", ""))
    try:
        otts = set([int(x) for x in request.vars.getlast("otts", "").split(",")])
    except ValueError:
        raise HTTP(400,"Error: set the `otts` parameter to one or more integer OTT ids separated by commas")
    if 0 < len(otts) <= max_otts:
        pass
    else:
        raise HTTP(400,"Error: you must pass in at least 1 and not more than {} OTT ids".format(max_otts))
    try:
        n = int(request.vars.getlast('max') or len(otts))
    except ValueError:
        raise HTTP(400,"Error: set the `max` parameter to the maximum number of species returned per ott")
    if 0 < n <= max_n:         
        pass
    else:
        raise HTTP(400,"Error: the `max` parameter must be between 1 and {}".format(max_n))
    if queryvar_is_true("spread_taxa_evenly"):
        max_per_input_taxon = n//len(otts)
        if max_per_input_taxon < 1:
            raise HTTP(400,"Error: when spreading results evenly over input taxa, there must be equal or fewer"
            "input taxa than the maximum number of returned values" 
            "(you had {0} input taxa but a maximum of {1} return values, and {1}/{0} < 1)".format(len(otts), n))

    sort = request.vars.getlast("sort", "").lower()
    if sort == "rank":
        orderby = "popularity_rank ASC, popularity DESC, ott ASC"
    elif sort == "raw":
        orderby = "raw_popularity DESC, popularity DESC, ott ASC"
    else:
        orderby = "popularity DESC, ott"

    colnames= ["ott","popularity","popularity_rank"]
    if queryvar_is_true("include_raw") or orderby.startswith("raw_popularity"):
        colnames.append("raw_popularity") 
    if queryvar_is_true("names"):
        colnames.append("name") 


    db_seconds = 0

    ret = dict(
        header = {k:i for i,k in enumerate(colnames)},
        max_taxa_in = max_otts,
        max_taxa_out = max_n,
        tot_spp = db.executesql("SELECT leaf_rgt FROM ordered_nodes WHERE id = 1;")[0][0]
    )
    
    if queryvar_is_true("expand_taxa"):
        #convert to a series of leaf constraints
        n_taxa = 0
        expanded_intervals = {} #save the left=>right spans of any nodes, so we can work out how many tips should have been returned
        query = db.ordered_leaves.ott.belongs(otts)
        sql_select = "SELECT `" + "`,`".join(colnames) + "` FROM ordered_leaves"
        sql_template = sql_select + " WHERE {q} ORDER BY {o} LIMIT {n} OFFSET 0"
        #select_columns = [getattr(db.ordered_leaves, a) for a in colnames]
        #get the leaf_ids of any leaves in the set of otts, so we can count the max number returned
        leaf_ids = sorted([row.id for row in db(query).select(db.ordered_leaves.id)])
        results = db(db.ordered_nodes.ott.belongs(otts)).select(db.ordered_nodes.leaf_lft, db.ordered_nodes.leaf_rgt)
        if queryvar_is_true("db_seconds"):
            db_seconds += db._lastsql[1]
        if len(leaf_ids) == 0:
            query = None
            sql_parts = []
        else:
            if queryvar_is_true("spread_taxa_evenly"):
                sql_parts = ["{s} WHERE {q}".format(s=sql_select, q=str(query))]
            else:
                sql_parts = [str(query)]
        if results:
            for row in results:
                #if query:
                #    query = query | ((db.ordered_leaves.id >= row.leaf_lft) & (db.ordered_leaves.id <= row.leaf_rgt))
                #else:
                #    query = ((db.ordered_leaves.id >= row.leaf_lft) & (db.ordered_leaves.id <= row.leaf_rgt))
                sql_where = "(ordered_leaves.id >= {:d}) AND (ordered_leaves.id <= {:d})".format(row.leaf_lft, row.leaf_rgt)
                if queryvar_is_true("spread_taxa_evenly"):
                    sql_parts.append(sql_template.format(q=sql_where, o=orderby, n=max_per_input_taxon))
                else:
                    sql_parts.append(sql_where)
                #now count the number of results that we would return, if not expanded
                try:
                    expanded_intervals[row.leaf_lft] = max(expanded_intervals[row.leaf_lft], row.leaf_rgt)
                except KeyError:
                    expanded_intervals[row.leaf_lft] = row.leaf_rgt
        #count number of expands
        leaf_idx = prev_rgt = 0
        for lft, rgt in sorted(expanded_intervals.items()):
            while leaf_idx < len(leaf_ids): #check none of the existing leaves are included
                if leaf_ids[leaf_idx] < lft:
                    n_taxa += 1
                else:
                    break
                leaf_idx += 1
                
            if lft > prev_rgt: #only count the tips if it is not nested in a previous clade
                while leaf_idx < len(leaf_ids):
                    if lft <= leaf_ids[leaf_idx] <= rgt:
                        leaf_idx += 1
                    else:
                        break
                n_taxa += rgt-lft+1
                prev_rgt = rgt
        
        ret['n_taxa']=n_taxa + (len(leaf_ids)-leaf_idx)
        if queryvar_is_true("spread_taxa_evenly"):
            sql = "(" + ") UNION (".join(sql_parts) + ") ORDER BY {o}".format(o=orderby)
        else:
            sql = sql_template.format(q=("(" + ") OR (".join(sql_parts) + ")"), n=n, o=orderby)
        ret['data'] = db.executesql(sql)

    else:
        #this turns out to be a little more complicated in SQL terms, because for speed we probably want to sort 
        #ordered_nodes and ordered_leaves separately then UNION them together. This is easier to do in vanilla SQL
        if queryvar_is_true("names"):
            extracol = ", name"
            ret['header']={k:i for i,k in enumerate(["ott","popularity","popularity_rank","name"])}
        else:
            extracol = ""
            ret['header']={k:i for i,k in enumerate(["ott","popularity","popularity_rank"])}
        order_limit = " ORDER BY " + orderby + " LIMIT {}".format(n)
        ottstr = ",".join([str(i+0) for i in otts]) #these should have all been sanitized
        OL_SQL = "SELECT {OLcols} FROM ordered_leaves WHERE ott IN ({otts})"
        ON_SQL = "SELECT {ONcols} FROM ordered_nodes WHERE ott IN ({otts})"
        SQL = "SELECT (" + OL_SQL + ") + (" + ON_SQL + ") AS SumCount"
        ret['n_taxa'] = db.executesql(SQL.format(
            OLcols="COUNT(*)", 
            ONcols="COUNT(*)", 
            otts = ottstr))[0][0]
        if queryvar_is_true("db_seconds"):
            db_seconds += db._lastsql[1]

        SQL = "SELECT * FROM (" + OL_SQL + order_limit + ") as L UNION ALL SELECT * FROM (" + ON_SQL + order_limit + ") as N " + order_limit
        ret['data'] = db.executesql(SQL.format(
            OLcols=", ".join(['`' + n + '`' for n in colnames]),
            ONcols=", ".join([('`' + n + '`' if n!='popularity_rank' else 'NULL AS `popularity_rank`') for n in colnames]),
            otts = ottstr))
    if queryvar_is_true("db_seconds"):
        ret['db_seconds'] = db_seconds + db._lastsql[1]
    
    record_usage(request.vars.getlast("key"), request.controller + "/" + request.function, len(otts), len(ret['data']))
    return ret
        
#useful functions

def queryvar_is_true(queryvar):
    return request.vars.getlast(queryvar) and request.vars.getlast(queryvar).lower() not in ("0", "false")
        
def get_limits(API_key):
    """
    Return the max taxa allowed per query, and the max number of return values per taxon
    """
    results = db(db.API_users.APIkey == API_key).select(db.API_users.ALL)
    if results:
        result = results.first()
        if result.max_taxa_per_query:
            return result.max_taxa_per_query, result.max_returns_per_taxon
        else:
            raise(HTTP(400,"Sorry, the API key {} ({}) is no longer allowed".format(result.APIkey, result.API)))
    else: 
        raise(HTTP(400,"Sorry, the API key {} has not been recognised".format(API_key)))


def record_usage(API_key, API_name, n_taxa, n_returns):
    """
    Record the API use. See https://stackoverflow.com/questions/49722812/web2py-update-or-insert-to-increment-a-counter
    """
    
    if not update_count(API_key, API_name, n_taxa, n_returns):
        #could be a race condition causing 2 identical rows here, but if so, both will simply be updated
        db.API_use.insert(APIkey=API_key, API=API_name, start_date=datetime.datetime.now(), end_date=None, n_calls=0, n_taxa=0, n_returns=0) 
        update_count(API_key, API_name, n_taxa, n_returns)

    
def update_count(API_key, API_name, n_t, n_r):
    """
    Update the number of taxa and number of returns for this call
    There may be multiple entries in API_use for a given API key, 
    but should only be one where the end_date is None
    """
    return db((db.API_use.APIkey == API_key) & (db.API_use.API == API_name) & (db.API_use.end_date == None)).update(
        n_calls=db.API_use.n_calls + 1, n_taxa=db.API_use.n_taxa + n_t, n_returns=db.API_use.n_returns + n_r)
