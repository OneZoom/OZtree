from sponsorship import (
    sponsorable_children_query,
)

def find_unsponsored_otts(db, count):
    root_ott = db(db.ordered_nodes.id == 1).select(db.ordered_nodes.ott).first().ott
    assert root_ott is not None  # normally this is all life ("biota") 
    query = sponsorable_children_query(root_ott, qtype="ott")
    rows = db(query).select(limitby=(0, count))
    prices = {}
    for r in db(db.ordered_leaves.ott.belongs([r.ott for r in rows])).select(
        db.ordered_leaves.ott,
        db.ordered_leaves.price,
        db.banned.ott,
    ):
        prices[r.ordered_leaves.ott] = r

    if len(rows) < count:
        raise ValueError("Can't find available OTTs")
    rows = [r for r in rows if r.ott in prices and prices[r.ott].ordered_leaves.price > 0]
    if len(rows) < count:
        raise ValueError("Rows don't have associated prices set, visit /manage/SET_PRICES/")
    return [r.ott for r in rows]


def find_unsponsored_ott(db):
    return find_unsponsored_otts(db, 1)[0]
