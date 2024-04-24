# -*- coding: utf-8 -*-
"""
OneZoom Tour endpoints
======================

This controller contains endpoints to produce HTML for the tour engine.
See src/tour/Tour.js for more information about the engine, and what is possible in the HTML.

OneZoom JSON tour definition
----------------------------

A OneZoom tour can be defined as JSON, to then be inserted / fetched into the database via. ``/tour/data.html``.

A library of tour documents is available at https://github.com/OneZoom/tours.

The document is structured as follows::

    {
        "title": "Tour title",
        "description": "Tour description",
        "author": "OneZoom",
        "tourstop_shared": { ...common tourstop definitions... }
        "tourstops": [
            {
                "identifier": "tourstop_a",
                "ott": "566397",
                "template_data": { ...unique tourstop definitions... },
            }, {
            }
        ],
    }

Both ``template_data`` and ``tourstop_shared`` can have the same content;
``tourstop_shared`` is merged into every ``template_data`` section. Possible options are:

title
    Title of tourstop, included at top of pop-up.
window_text
    Body text of tourstop. Can either be a single string, or an array of multiple items, which can also include visibility:

        "window_text": [
            "This text is visible whenever the tourstop is visible",
            { "visible-transition_in": true, "text": "This text is only visible on transition_in" },
            { "visible-transition_in": true, "visible-active_wait": true, "text": "This text is visible both transition_in and active_wait" }
        ],
comment
    Ignored comment section, for tour authors.
visible-transition_in / visible-transition_out / hidden-active_wait
    If ``true``, the tourstop pop-up will be visible when transitioning into / away from of the tourstop OTT.
ott
    The OTT that this tourstop heads to.
qs_opts
    Tree state to apply when visiting this tourstop, e.g. colour-scheme or highlights. See ``src/navigation/state.js``.
    You can do ``"qs_opts": "?into_node=max"``, to zoom into a node (rather than seeing it's children).
transition_in
    The type of transition to use when navigating to ``ott``. Either ``leap``, ``fly_straight`` or ``flight``.
fly_in_speed
    Relative flight speed to global setting, default is 1
transition_in_wait
    Delay start of flight, in milliseconds. Defaults to 0
stop_wait
    Wait at tourstop for (stop_wait) milliseconds, then automatically move on. By default wait for user to press "next"
media
    An array of media_embed strings as defined by :py:meth:`modules.embed.media_embed`, for example::

        media: [
            "https://www.youtube.com/embed/ayOmAJwCMlM",
            "https://commons.wikimedia.org/wiki/File:Rose_of_Jericho.gif",
            "frogs/Various_frogs_and_toads.jpeg"
        ],

    In the final case, the URL will be expanded to "https://onezoom.github.io/tours/frogs/Various_frogs_and_toads.jpeg".

    By default media will autoplay when arriving at the tourstop, and stop when leaving. You can override with:

        media: [
            {"url": "https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg", "ts_autoplay": "tsstate-transition_in tsstate-active_wait"}
        ],

    When a media item is visible can be altered by setting ``"visible-transition_in": true``, the rules working the same as "window_text".

"""
from pymysql.err import IntegrityError

from OZfunc import (
    add_the,
    get_common_name, get_common_names,
    nice_name,
)
import tour


def homepage_animation():
    # OTTs from the tree_startpoints table
    startpoints_ott_map, hrefs, titles, text_titles = {}, {}, {}, {}
    anim = []
    for r in db(
            (db.tree_startpoints.category == 'homepage_anim') &
            (db.tree_startpoints.partner_identifier == None)
        ).select(
            db.tree_startpoints.ott, db.tree_startpoints.category,
            db.tree_startpoints.image_url, db.tree_startpoints.tour_identifier,
            orderby = db.tree_startpoints.id):
        key = r.tour_identifier or str(r.ott)
        anim.append(key)
        if r.tour_identifier:
            hrefs[key] = URL('default', 'life/' + r.tour_identifier)
            title = db(db.tours.identifier == r.tour_identifier).select(db.tours.name).first()
            text_titles[key] = title.name if title else r.tour_identifier
        else:
            text_titles[key] = ""
        if r.ott:
            # We might still want to find e.g. an image, even if we are looking at a tour
            startpoints_ott_map[r.ott] = key

    for ott, key in startpoints_ott_map.items():
        if key not in hrefs:
            hrefs[key] = URL('default', 'life/@=%d' % ott, url_encode=False)

    # Names
    st_node_otts, has_vernacular = set(), set()
    # Look up scientific names for startpoint otts
    for r in db(db.ordered_leaves.ott.belongs(startpoints_ott_map.keys())).select(
            db.ordered_leaves.ott, db.ordered_leaves.name):
        titles[r.ott] = r.name
    # Look up scientific names and best PD image otts for all startpoint otts
    for r in db(db.ordered_nodes.ott.belongs(startpoints_ott_map.keys())).select(
            db.ordered_nodes.ott, db.ordered_nodes.name, db.ordered_nodes.rpd1):
        st_node_otts.add(r.ott)
        titles[r.ott] = r.name
    # Add or change to vernacular names in the titles
    for ott, vn in get_common_names(titles.keys(), return_nulls=True).items():
        # Do one thing for the startpoints (simple names) ...
        startpoint_key = startpoints_ott_map.get(ott, None)
        if startpoint_key:
            if not text_titles[startpoint_key]:
                if vn is not None:
                    has_vernacular.add(startpoint_key)
                text_titles[startpoint_key] = nice_name(
                    (titles[ott] if vn is None else None), vn, html=True,
                    is_species=ott not in st_node_otts, break_line=2)
        # ... and another for the sponsored items (both common and sci in the string)
        if vn is not None:
            has_vernacular.add(ott)
        titles[ott] = nice_name(
            titles[ott], vn, html=True, is_species=ott not in st_node_otts,
            first_upper=True, break_line=1)
    titles.update(text_titles)

    return dict(
        anim=anim,
        hrefs=hrefs,
        has_vernacular=has_vernacular,
        html_names=titles,
        add_the=add_the,
    )


def tutorial_MDmouse():
    """Mouse variant of museum display tutorial"""
    response.view = request.controller + "/tutorial_MD." + request.extension
    return dict()


def tutorial_MDtouch():
    """Touch variant of museum display tutorial"""
    response.view = request.controller + "/tutorial_MD." + request.extension
    return dict()


def screensaver():
    """Screensaver tour"""
    return dict(
        screensaver_otts=[991547, 81461, 99252, 770315],
    )


def data():
    """Fetch generic tour name from database"""
    if len(request.args) < 1:
        raise HTTP(400, "Expect a tour identifier at the end of the URL")
    tour_identifier = request.args[0]

    if request.env.request_method == 'PUT':
        # Need to be logged in before you can create tours
        auth.basic()
        if not auth.user:
            raise HTTP(403)
        if len(request.vars.get('tourstops', [])) == 0:
            raise HTTP(400, "Must have at least one tourstop")

        try:
            # Check that tourstop identifiers are unique within the tour
            # TODO: Ideally we'd make a DB constraint for this, but is beyond the abilities of PyDAL
            ts_identifiers = [ts['identifier'] for ts in request.vars['tourstops'] if 'symlink_tourstop' not in ts]
            if len(ts_identifiers) != len(set(ts_identifiers)):
                raise HTTP(400, "All tourstops should have a unique identifier")

            # Upsert the tour data
            db.tour.update_or_insert(
                db.tour.identifier == tour_identifier,
                identifier=tour_identifier,
                lang=request.vars.get('lang', 'en'),
                author=request.vars.get('author'),
                image_url=request.vars.get('image_url'),
                title=request.vars.get('title'),
                description=request.vars.get('description'),
                keywords=request.vars.get('keywords'),
            )
            tour_id = db.tour(db.tour.identifier == tour_identifier).id

            # Remove any no-longer extant tourstops
            db((db.tourstop.tour == tour_id) & ~db.tourstop.identifier.belongs(ts_identifiers)).delete()

            # Upsert each tourstop
            ts_shared = request.vars.get('tourstop_shared', {})
            tss_targets = {}
            for i, ts in enumerate(request.vars['tourstops']):
                ts = {
                    # All fields not otherwise specfied return to their default
                    **{k:db.tourstop.get(k).default for k in db.tourstop.fields if k not in ['created', 'updated']},
                    **ts_shared,
                    **ts,
                    # Deep-clone template_data, should always exist
                    "template_data": {**ts_shared.get("template_data", {}), **ts.get("template_data", {})},
                    # Add DB references
                    "tour": tour_id,
                    "ord": i + 1,
                }
                if str(ts.get('ott', "")).startswith('@_ancestor'):
                    parts = ts['ott'].split("=")
                    assert len(parts) == 3
                    ts['ott'] = int(parts[1])
                    ts['secondary_ott'] = int(parts[2])
                if 'symlink_tourstop' in ts:
                    if 'symlink_tour' not in ts:
                        ts['symlink_tour'] = tour_identifier
                    tss_targets[ts['ord']] = ts
                else:
                    db.tourstop.update_or_insert(
                        (db.tourstop.tour == tour_id) & (db.tourstop.identifier == ts['identifier']),
                        **ts,
                    )

            # Resolve tss_target dicts to DB entries, now they should be in the database
            for ord in tss_targets.keys():
                target_ts = db(
                    (db.tourstop.tour == db.tour.id) &
                    (db.tour.identifier == tss_targets[ord]['symlink_tour']) &
                    (db.tourstop.identifier == tss_targets[ord]['symlink_tourstop'])).select().first()
                if target_ts is None:
                    raise HTTP(400, "Unknown tourstop %s in tour %s" % (
                        tss_targets[ord]['symlink_tourstop'],
                        tss_targets[ord]['symlink_tour'],
                    ))
                tss_targets[ord] = target_ts.tourstop

            # Upsert each tourstop_symlink
            for tss in db(db.tourstop_symlink.tour == tour_id).select(db.tourstop_symlink.ALL):
                if tss.ord in tss_targets:
                    if tss.tourstop.id != tss_targets[tss.ord].id:
                        # Same ord, new location, update record
                        tss.update_record(tourstop=tss_targets[tss.ord].id)
                    del tss_targets[tss.ord]
                else:
                    # A no-longer-used symlink, remove it.
                    tss.delete_record()
            # Insert any remaining symlinks
            for ord, ts_target in tss_targets.items():
                db.tourstop_symlink.insert(tour=tour_id, tourstop=ts_target, ord=ord)
        except IntegrityError as e:
            # Assume any IntegrityError is the user's fault
            raise HTTP(400, "Tour invalid: %s" % e.args[1])

    # Fetch tour from DB
    tour = db(db.tour.identifier == tour_identifier).select()
    if len(tour) < 1:
        raise HTTP(404)
    tour = tour[0]

    def munge_tourstop(ts):
        if ts.secondary_ott:
            ts.ott = "@_ancestor=%d=%d" % (ts.ott, ts.secondary_ott)
        return ts

    # Combine lists of associated tourstops, add to tour object
    tourstops = {}
    for ts in tour.tourstop.select():
        tourstops[ts.ord] = ts
    for tss in tour.tourstop_symlink.select():
        tourstops[tss.ord] = tss.tourstop
    tour['tourstops'] = [munge_tourstop(tourstops[ord]) for ord in sorted(tourstops.keys())]

    # Reconstitute tour JSON
    return dict(
        tour_identifier=tour_identifier,
        tour=tour,
    )


def list():
    tour_identifiers = [x for x in request.vars.get("tours", "").split(",") if x]
    include_rest = bool(request.vars.get("include_rest", ""))
    out = dict()

    # Fetch all tours, put into dict with order matching tour_identifiers
    tours = {t:None for t in tour_identifiers}
    for t in db(db.tour.identifier.belongs(tours.keys())).select(db.tour.ALL):
        # Splice in tour_url to DB row
        t['url'] = tour.tour_url(t)
        tours[t.identifier] = t
    out['tours'] = [*tours.values()]

    if include_rest:
        out['rest'] = []
        for t in db(~(db.tour.identifier.belongs(tours.keys()))).select(db.tour.ALL):
            # Splice in tour_url to DB row
            t['url'] = tour.tour_url(t)
            out['rest'].append(t)

    return out


def search():
    session.forget(response)
    language = request.vars.lang or request.env.http_accept_language or 'en'
    searchFor = request.vars.query

    results = tour.tour_search(searchFor, language)
    for t in results:
        # Splice in tour_url to DB row
        t['url'] = tour.tour_url(t)

    return dict(
        lang=language,
        results=results.as_list(),
    )
