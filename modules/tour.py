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
