from gluon import current

def partner_definitions():
    """
    Return a dict of all partners configured in OneZoom, keyed on partner_identifier
    """
    db = current.db
    request = current.request

    out = {}
    for p in db(db.partners).select():
        out[p.partner_identifier] = p
    return out


def partner_identifiers_for_reservation_name(partner_name):
    """
    Extract partner_identifiers from a reservation.partner_name
    """
    return partner_name.split(",") if partner_name else []


def partner_identifiers_to_reservation_name(partner_identifiers):
    """
    Turn partner_identifiers list into a reservation.partner_name
    Extract partner_identifiers from a reservation.partner_name
    """
    return ",".join(partner_identifiers) if len(partner_identifiers) else None
