from gluon import current


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
        leaf_query = False
    elif not pinpoint.startswith('@'):
        # Doesn't start with @? Treat as OTT
        node_query = db.ordered_nodes.ott == int(pinpoint)
        leaf_query = db.ordered_leaves.ott == int(pinpoint)
    else:
        parts = pinpoint[1:].split("=", 2)
        if len(parts) == 1:  # @(latin) form
            tidy_latin = parts[0].replace("_", " ")
            node_query = db.ordered_nodes.name == tidy_latin
            leaf_query = db.ordered_leaves.name == tidy_latin
        elif parts[0] == '_ancestor':
            sub_pinpoints = [int(x) for x in parts[1].split('-')]
            # NB: Cheat and just return the left branch, don't do the lookup yet
            node_query = db.ordered_nodes.ott == sub_pinpoints[0]
            leaf_query = db.ordered_leaves.ott == sub_pinpoints[0]
        else: # Regular @[latin]=[OTT] form, search for either.
            tidy_latin = parts[0].replace("_", " ")
            node_query = (db.ordered_nodes.name == tidy_latin) | (db.ordered_nodes.ott == int(parts[1]))
            leaf_query = (db.ordered_leaves.name == tidy_latin) | (db.ordered_leaves.ott == int(parts[1]))

    # Look at nodes first
    for r in db(node_query).select(db.ordered_nodes.ALL, orderby="OTT IS NULL"):
        return r, False
    for r in db(leaf_query).select(db.ordered_leaves.ALL, orderby="OTT IS NULL"):
        return r, True
    return None, False
