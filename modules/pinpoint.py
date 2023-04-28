import re

from gluon import current


def common_ancestor_of_otts(otts):
    """
    Given a list of otts, return their common ancestor as ozid
    NB: We don't consider the case where all of otts are identical (or just one)
    """
    db = current.db

    rs = db.executesql("""
        WITH RECURSIVE cte (ozid, real_parent, lvl) AS (
            -- Find start points in nodes table (lvl 0)
            SELECT n.id, n.real_parent, 0 lvl
              FROM ordered_nodes n
             WHERE n.ott IN ({ott_list})
                UNION ALL
            -- Find start points in leaves table (lvl 0)
            SELECT -l.id, l.real_parent, 0 lvl
              FROM ordered_leaves l
             WHERE l.ott in ({ott_list})
                UNION ALL
            -- Recurse, add parent of previous items to our rowset, add one to level
            SELECT n.id, n.real_parent, cte.lvl + 1 lvl
              FROM ordered_nodes n
        INNER JOIN cte ON n.id = cte.real_parent
        ) SELECT ozid -- Debug:, COUNT(*), GROUP_CONCAT(lvl SEPARATOR ':')
            FROM cte
        GROUP BY ozid              -- We have multiple rows for common ancestors, group them together
          HAVING COUNT(*) >= {pl}  -- Only interested in common-ancestor rows (i.e. one for each start-point)
        ORDER BY MIN(lvl) ASC      -- Want to find the row closest to the start
           LIMIT 1                 -- Comment this out to see chain, w/debug above
    """.format(
        ott_list=",".join(db.placeholder for _ in otts),
        pl=db.placeholder,
    ), otts + otts + [len(otts)])
    if len(rs) == 0:
        raise ValueError("Cannot find OTTs: %s" % ",".join(str(x) for x in otts))
    return rs[0][0]


def resolve_pinpoint_to_row(pinpoint):
    """
    Parse a pinpoint string, as defined in src/navigation/pinpoint.js.
    e.g. '@Haematomyzus_elephantis=283963'

    Return the node/leaf row the pinpoint targets, and bool saying if leaf
    """
    db = current.db

    if not pinpoint:
        # No pinpoint, root node
        node_query = db.ordered_nodes.parent < 1
        leaf_query = None
    elif not pinpoint.startswith('@'):
        # Doesn't start with @? Treat as OTT
        node_query = db.ordered_nodes.ott == int(pinpoint)
        leaf_query = db.ordered_leaves.ott == int(pinpoint)
    else:
        parts = pinpoint[1:].split("=")  # NB: Split subsequent = for _ancestor
        if len(parts) == 1:  # @(latin) form
            latin_name = untidy_latin(parts[0])
            node_query = db.ordered_nodes.name == latin_name
            leaf_query = db.ordered_leaves.name == latin_name
        elif parts[0] == '_ancestor':
            otts = [int(x) for x in parts[1:]]
            if all(x == otts[0] for x in otts):
                # All-identical, just an OTT query
                node_query = db.ordered_nodes.ott == otts[0]
                leaf_query = db.ordered_leaves.ott == otts[0]
            else:
                # Find OZid of common ancestor, look up row for that
                ozid = common_ancestor_of_otts([int(x) for x in otts])
                node_query = (db.ordered_nodes.id == ozid) if ozid > 0 else None
                leaf_query = (db.ordered_leaves.id == -ozid) if ozid < 0 else None
        elif parts[0] == '_ozid':
            ozid = int(parts[1])
            node_query = (db.ordered_nodes.id == ozid) if ozid > 0 else None
            leaf_query = (db.ordered_leaves.id == -ozid) if ozid < 0 else None
        else: # Regular @[latin]=[OTT] form, search for either.
            latin_name = untidy_latin(parts[0])
            node_query = (db.ordered_nodes.name == latin_name) | (db.ordered_nodes.ott == int(parts[1]))
            leaf_query = (db.ordered_leaves.name == latin_name) | (db.ordered_leaves.ott == int(parts[1]))

    # Look at nodes first
    if node_query is not None:
        for r in db(node_query).select(db.ordered_nodes.ALL, orderby="OTT IS NULL"):
            return r, False
    if leaf_query is not None:
        for r in db(leaf_query).select(db.ordered_leaves.ALL, orderby="OTT IS NULL"):
            return r, True
    return None, False


def tidy_latin(s):
    """
    Convert latin name to pinpoint-friendly form

    Python version of src/navigation/pinpoint:tidy_latin
    """
    return re.sub(r'[\/=_].*$', '', s).replace(' ', '_')


def untidy_latin(s):
    """
    Revert tidy_latin as much as possible

    Python version of src/navigation/pinpoint:untidy_latin
    """
    return s.replace('_', ' ')
