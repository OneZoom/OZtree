from gluon import current

import OZfunc


def search_sponsor(searchFor, searchType, language, order_by_recent=None, limit=None, start=0, defaultImages=False):
    myconf = current.globalenv['myconf']
    T = current.globalenv['T']
    request = current.request
    db = current.db

    if not searchFor:
        return {}

    lang_primary = language.split(',')[0].split("-")[0].lower()
    searchFor = [s for s in searchFor.replace("%","").replace("_", " ").split() if s]
    if len(searchFor) == 0 or all(len(s)==1 for s in searchFor): # disallow single letter searching
        return {}
    verified_name = db.reservations.verified_name
    verified_more_info = db.reservations.verified_more_info
    colnames = [
        'OTT_ID', 'name', 'verified_name', 'verified_more_info', 'verified_kind',
        'verified_url', 'verified_preferred_image_src', 'verified_preferred_image_src_id']
    alt_txt = {"verified_name":T("This leaf has been sponsored", language=language),
               "verified_more_info":T("text awaiting confirmation", language=language),
               "verified_kind": "",
               "verified_preferred_image_src": None,
               "verified_preferred_image_src_id": None,
               "verified_url": None}
    alt_colnames = [(("'"+alt_txt[c]+"'" if alt_txt[c] else "NULL") + " AS " + c) if c in alt_txt else c for c in colnames]     
    colname_map = {nm:index for index,nm in enumerate(colnames)}
    search_query = {'verif':"", 'unverif':""}
    search_terms = []

    if searchType != "all":
        search_query['verif'] = "verified_kind = " + db.placeholder
        search_query['unverif'] = "user_sponsor_kind = " + db.placeholder
        search_terms.append(searchType)

    for word in ["%"+w+"%" for w in searchFor if w]:
        if search_terms:
            search_query['verif'] += " AND "
            search_query['unverif'] += " AND "
        search_query['verif'] += ("(verified_name like " + db.placeholder + 
            " or verified_more_info like " + db.placeholder + ")")
        search_query['unverif'] += ("(user_sponsor_name like " + db.placeholder +
            " or user_more_info like " + db.placeholder + ")")
        search_terms.extend([word, word])

    # The logic here is complex. We might wish to allow people to search either 
    # for their entered text if not yet verified, or their verified text once it
    # appears. If the former, we should put up the holding text in alt_txt.
    # We detect this by looking at verified_time (for verified text) or 
    # user_sponsor_kind (for unverified text).
    # We also need to not return expired or otherwise deactivated leaves

    #The verified ones
    query = "SELECT * FROM (SELECT " + ",".join(colnames) + " FROM reservations"
    query += " WHERE verified_time IS NOT NULL AND (deactivated IS NULL OR deactivated = '')"
    query += " AND (DATE_ADD(verified_time, INTERVAL sponsorship_duration_days DAY) > CURDATE())"
    query += " AND " + search_query['verif']
    if order_by_recent:
        query += ' ORDER BY verified_time DESC'
    query += ") AS t1"

    query += " UNION ALL "

    query += "SELECT * FROM (SELECT " + ",".join(alt_colnames) + " FROM reservations"
    query += " WHERE verified_time IS NULL AND user_sponsor_kind IS NOT NULL AND user_sponsor_kind != ''"
    query += " AND (deactivated IS NULL OR deactivated = '')"
    query += " AND " + search_query['unverif']
    if order_by_recent:
        query += ' ORDER BY user_updated_time DESC'
    query += ") AS t2"

    if limit:
        query += ' LIMIT ' + str(int(limit))
        if start:
            query += ' OFFSET ' + str(int(start))

    reservations = db.executesql(query, search_terms + search_terms)

    reservationsOttArray = []
    for row in reservations:
        reservationsOttArray.append(row[colname_map['OTT_ID']])

    query = db.ordered_leaves.ott.belongs(reservationsOttArray)
    leaves = db(query).select(db.ordered_leaves.id, db.ordered_leaves.ott)

    language=request.vars.lang or request.env.http_accept_language or 'en'
    common_names = OZfunc.get_common_names(reservationsOttArray, lang=language)

    if defaultImages:
        return {
            "common_names": common_names, "lang":language,
            "reservations": reservations,  "leaves": leaves, "headers": colname_map,
            "default_images": {
                row.ott:[row.src, row.src_id]
                for row in db(db.images_by_ott.ott.belongs(reservationsOttArray) & (db.images_by_ott.best_any == True)).select(
                    db.images_by_ott.ott,
                    db.images_by_ott.src,
                    db.images_by_ott.src_id,
                    orderby=~db.images_by_ott.src
                )
            },
        }
    else:
        return {
            "common_names": common_names, "lang": language, 
            "reservations": reservations, "leaves": leaves, "headers": colname_map}
