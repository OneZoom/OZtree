# -*- coding: utf-8 -*-

def index():
    return dict()
    
def museum_display_setup():
    return dict()

def treasure_hunt_setup():
    """
    Allow a teacher to type in some otts for a treasure hunt
    """
    return dict()

def installations():
    return dict()

def screenshot_launcher():
    return dict()

def educational_materials():
    quotes = {}
    rows = db().select(db.quotes.ALL, orderby = ~db.quotes.quality | db.quotes.id)
    for r in rows:
        if r.category in quotes:
            quotes[r.category].append(r)
        else:
            quotes[r.category] = [r]
    return dict(quotes=quotes)
