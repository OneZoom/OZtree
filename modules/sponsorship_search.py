from gluon import current

import OZfunc


# - searchType: One of "for" (for someone else) / "by" (for themselves) / "all" (either, default)
def search_sponsor(searchFor, searchType='all', language='en-GB,en;q=0.9', order_by_recent=None, limit=None, start=0, defaultImages=False):
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
    colname_map = {nm:index for index,nm in enumerate(colnames)}
    search_queries = [
        "verified_time IS NOT NULL",
        "(deactivated IS NULL OR deactivated = '')",
    ]
    search_terms = []

    if searchType != "all":
        search_queries.append("verified_kind = " + db.placeholder)
        search_terms.append(searchType)

    for word in ["%"+w+"%" for w in searchFor if w]:
        search_queries.append("(verified_name like " + db.placeholder + 
            " or verified_more_info like " + db.placeholder + ")")
        search_terms.extend([word, word])

    query = "SELECT " + ",".join(colnames) + " FROM reservations"
    query += " WHERE " + " AND ".join(search_queries)
    if order_by_recent:
        query += ' ORDER BY verified_time DESC'

    if limit:
        query += ' LIMIT ' + str(int(limit))
        if start:
            query += ' OFFSET ' + str(int(start))

    reservations = db.executesql(query, search_terms)

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
