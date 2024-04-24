from gluon import current


def tours_related_to_ott(otts, full_meta=False):
    """For given OTTs, return all tours related to it"""
    db = current.db

    out = {}
    for r in db(db.tourstop.ott.belongs(otts)).select(
                db.tourstop.ott,
                (db.tour.ALL if full_meta else db.tour.identifier),
                join=db.tour.on(db.tour.id == db.tourstop.tour),
                orderby=(db.tourstop.ott, db.tourstop.tour),
            ):
        if r.tourstop.ott not in out:
            out[r.tourstop.ott] = []
        out[r.tourstop.ott].append(r.tour)
    return out


def tour_url(tour_row):
    """Convert tour row to a tour URL"""
    return '/tour/data.html/%s' % tour_row.identifier


def tour_search(searchFor, language='en'):
    """Find all tours matching free-text (query)"""
    db = current.db
    lang_primary = language.split(',')[0].split("-")[0].lower()

    query = (db.tour.lang == lang_primary)
    for w in searchFor.replace("%","").replace("_", " ").split():
        if len(w) < 3:
            # Ignore stop words
            next

        # Add query item for each search term
        query = query & (
            # http://web2py.com/books/default/chapter/29/06/the-database-abstraction-layer#like-ilike-regexp-startswith-endswith-contains-upper-lower
            db.tour.title.contains(w, case_sensitive=False) |
            db.tour.description.contains(w, case_sensitive=False) |
            # http://web2py.com/books/default/chapter/29/06/the-database-abstraction-layer#list-type-and-contains
            db.tour.keywords.contains(w, case_sensitive=False) |
            False
        )

    return db(query).select(db.tour.ALL, orderby=(db.tour.title))
