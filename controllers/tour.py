# -*- coding: utf-8 -*-
"""
OneZoom Tour endpoints
======================

This controller contains endpoints to produce HTML for the tour engine.
See src/tour/Tour.js for more information about the engine, and what is possible in the HTML.

OneZoom JSON tour definition
----------------------------

A OneZoom tour can be defined as JSON, to then be inserted / fetched into the database via. ``/tour/data.html``.
A document can also be rendered without saving it by POSTing it to ``/tour/preview.html``.
A JSON file hosted on ``*.onezoom.workers.dev`` can be rendered the same way via
``/tour/remote.html/<worker>/<file>`` (login required), e.g.
``/tour/remote.html/test-tour-preview-tours/lava_lamps``.

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

    In the final case, the URL will be expanded to "https://tours.onezoom.workers.dev/frogs/Various_frogs_and_toads.jpeg".

    By default media will autoplay when arriving at the tourstop, and stop when leaving. You can override with:

        media: [
            {"url": "https://commons.wikimedia.org/wiki/File:Turdus_philomelos.ogg", "ts_autoplay": "tsstate-transition_in tsstate-active_wait"}
        ],

    When a media item is visible can be altered by setting ``"visible-transition_in": true``, the rules working the same as "window_text".

"""
import json
import posixpath
import urllib.error
import urllib.request

from pymysql.err import IntegrityError

from OZfunc import (
    add_the,
    get_common_name, get_common_names,
    nice_name,
)
import embed
import tour


def _db_error_message(e):
    """Human-readable message from a DB-API IntegrityError."""
    args = getattr(e, 'args', ())
    if len(args) > 1:
        return args[1]
    if args:
        return args[0]
    return str(e)


def _tourstop_label(ts, index):
    """Identifier if present, otherwise 1-based index."""
    ident = ts.get('identifier') if isinstance(ts, dict) else None
    return ident if ident else str(index)


def _with_table_defaults(table, doc):
    """(doc) padded out with the column defaults of (table), without querying the DB.

    Anything the document leaves out returns to its default, so an unsaved document
    has the same shape as a row read back out of (table).
    """
    return {
        **{f: table.get(f).default for f in table.fields if f not in ('created', 'updated')},
        **doc,
    }


def _merged_tourstop(ts, ts_shared, **extra):
    """One tourstop document, with ``tourstop_shared`` and the DB defaults merged in.

    Shared by ``data`` (before writing) and ``preview`` / ``remote`` (before rendering), so that a
    tourstop resolves to the same values whether or not it was saved first.
    """
    return _with_table_defaults(db.tourstop, {
        **ts_shared,
        **ts,
        # Deep-clone template_data, should always exist
        "template_data": {
            **ts_shared.get("template_data", {}),
            **ts.get("template_data", {}),
        },
        **extra,
    })


def _parse_tourstop_ott(ott, label):
    """Return ``(ott, secondary_ott)`` for a tourstop ott field.

    Accepts an int, numeric string, empty/None (return to start),
    ``@=OTT``, ``@name=OTT``, or ``@_ancestor=OTT=OTT``.
    ``secondary_ott`` is set only for an ancestor pinpoint.
    Raises HTTP(422) for anything else.
    """
    if ott in (None, ''):
        return None, None
    ott_str = str(ott)
    err = "Tourstop %s: ott must be an integer OTT, @=OTT, @name=OTT, or @_ancestor=OTT=OTT, got %r" % (label, ott)
    if ott_str.startswith('@'):
        parts = ott_str[1:].split('=')
        if parts[0] == '_ancestor':
            if len(parts) != 3:
                raise HTTP(422, err)
            try:
                return int(parts[1]), int(parts[2])
            except (TypeError, ValueError):
                raise HTTP(422, err)
        if parts[0].startswith('_') or len(parts) != 2:
            raise HTTP(422, err)
        try:
            return int(parts[1]), None
        except (TypeError, ValueError):
            raise HTTP(422, err)
    try:
        return int(ott_str), None
    except (TypeError, ValueError):
        raise HTTP(422, err)


def _tour_from_document(doc):
    """Build the tour dict ``views/tour/data.html`` expects, without touching the DB."""
    tourstops = doc.get('tourstops') or []
    if len(tourstops) == 0:
        raise HTTP(422, "Must have at least one tourstop")
    ts_shared = doc.get('tourstop_shared', {})

    tour = _with_table_defaults(db.tour, doc)
    tour['lang'] = doc.get('lang') or 'en'
    tour['tourstops'] = []
    for i, ts in enumerate(tourstops):
        label = _tourstop_label(ts, i + 1)
        try:
            if 'symlink_tourstop' in ts:
                raise ValueError("symlinks can only be resolved for a saved tour")
            ts = _merged_tourstop(ts, ts_shared)
            _parse_tourstop_ott(ts.get('ott'), label)
            tour['tourstops'].append(ts)
        except (AttributeError, TypeError, ValueError, KeyError) as e:
            raise HTTP(422, "Tourstop %s: %s" % (label, e))
    return tour


def _tours_url_base_from_slug(slug):
    """``https://{slug}.onezoom.workers.dev/`` from a single DNS label, or HTTP(422)."""
    if not slug or not isinstance(slug, str):
        raise HTTP(422, "Missing tours worker name")
    slug = slug.strip()
    if not slug.replace('-', '').isalnum():
        raise HTTP(422, "tours worker name must contain only letters, digits, and hyphens")
    return 'https://%s.onezoom.workers.dev/' % slug


def _tours_json_url(tours_url_base, filename):
    """Join a relative JSON path onto an already-validated tours base URL."""
    if not filename or not isinstance(filename, str):
        raise HTTP(422, "Missing filename")
    rel = posixpath.normpath(filename.strip())
    if posixpath.isabs(rel) or rel == '.' or rel == '..' or rel.startswith('../'):
        raise HTTP(422, "filename must be relative to the tours worker")
    return tours_url_base + rel + '.json'


def _fetch_tour_json(url):
    """GET (url) and parse it as a tour document object."""
    # User agent required to pass Cloudflare Browser Integrity Check.
    req = urllib.request.Request(url, headers={
        'User-Agent': 'OneZoom/1.0 (+https://www.onezoom.org/)',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise HTTP(502, "Could not fetch tour JSON (%s): %s" % (e.code, url))
    except urllib.error.URLError:
        raise HTTP(502, "Could not fetch tour JSON: %s" % url)

    try:
        doc = json.loads(raw.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        raise HTTP(422, "Tour document is not valid JSON: %s" % url)
    if not isinstance(doc, dict):
        raise HTTP(422, "Tour document must be a JSON object: %s" % url)
    return doc


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
        raise HTTP(422, "Expect a tour identifier at the end of the URL")
    tour_identifier = request.args[0]

    if request.env.request_method == 'PUT':
        auth.basic()
        if not auth.user:
            raise HTTP(403, "Login required to create or update tours")
        if len(request.vars.get('tourstops', [])) == 0:
            raise HTTP(422, "Must have at least one tourstop")

        try:
            # Check that tourstop identifiers are unique within the tour
            # TODO: Ideally we'd make a DB constraint for this, but is beyond the abilities of PyDAL
            for i, ts in enumerate(request.vars['tourstops']):
                if 'symlink_tourstop' not in ts and not ts.get('identifier'):
                    raise HTTP(422, "Tourstop %d: missing identifier" % (i + 1))
            ts_identifiers = [ts['identifier'] for ts in request.vars['tourstops'] if 'symlink_tourstop' not in ts]
            if len(ts_identifiers) != len(set(ts_identifiers)):
                raise HTTP(422, "All tourstops should have a unique identifier")

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
                label = _tourstop_label(ts, i + 1)
                try:
                    # Add DB references alongside the shared/default merge
                    ts = _merged_tourstop(ts, ts_shared, tour=tour_id, ord=i + 1)
                    ts['ott'], secondary_ott = _parse_tourstop_ott(ts.get('ott'), label)
                    ts['secondary_ott'] = secondary_ott or 0
                    if 'symlink_tourstop' in ts:
                        if 'symlink_tour' not in ts:
                            ts['symlink_tour'] = tour_identifier
                        tss_targets[ts['ord']] = ts
                    else:
                        db.tourstop.update_or_insert(
                            (db.tourstop.tour == tour_id) & (db.tourstop.identifier == ts['identifier']),
                            **ts,
                        )
                except (ValueError, TypeError, KeyError) as e:
                    raise HTTP(422, "Tourstop %s: %s" % (label, e))

            # Resolve tss_target dicts to DB entries, now they should be in the database
            for ord in tss_targets.keys():
                target_ts = db(
                    (db.tourstop.tour == db.tour.id) &
                    (db.tour.identifier == tss_targets[ord]['symlink_tour']) &
                    (db.tourstop.identifier == tss_targets[ord]['symlink_tourstop'])).select().first()
                if target_ts is None:
                    raise HTTP(422, "Unknown tourstop %s in tour %s" % (
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
            raise HTTP(422, "Tour invalid: %s" % _db_error_message(e))
        except (ValueError, TypeError, KeyError) as e:
            raise HTTP(422, "Tour invalid: %s" % e)

    # Fetch tour from DB
    tour = db(db.tour.identifier == tour_identifier).select()
    if len(tour) < 1:
        raise HTTP(404, "Tour '%s' not found" % tour_identifier)
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
        tours_url_base=embed.TOURS_URL_BASE,
    )


def preview():
    """Render a POSTed tour document as tour HTML, without saving it

    POST a tour document (see above) as ``application/json``, and get back the HTML
    that ``/tour/data.html/<identifier>`` would return once that document had been
    saved. The tour editor plays unsaved work this way, so ``views/tour/data.html``
    stays the only place tour HTML is generated.

    Nothing is read from or written to the database.
    """
    if request.env.request_method != 'POST':
        raise HTTP(405, "Preview a tour by POSTing a tour document")
    
    # A cross-origin HTML form cannot label a body application/json,
    # so this prevents another site from sending a user to tour HTML of its own making
    # (and thus its own scripts) on our domain.
    if not (request.env.content_type or '').startswith('application/json'):
        raise HTTP(415, "Tour document must be sent as application/json")
    session.forget(response)

    tour = _tour_from_document(request.vars)
    response.view = 'tour/data.html'
    return dict(
        tour_identifier=request.vars.get('identifier') or 'preview',
        tour=tour,
        tours_url_base=embed.TOURS_URL_BASE,
    )


def remote():
    """Render a tour JSON file hosted on ``*.onezoom.workers.dev``, without saving it

    GET ``/tour/remote.html/<worker>/<file>``, the same URL shape as
    ``/tour/data.html/<identifier>``. The JSON is fetched from
    ``https://<worker>.onezoom.workers.dev/<file>.json`` and rendered with
    ``views/tour/data.html``. Relative media paths are resolved against that worker.

    Nested paths work as extra args, e.g. ``/tour/remote.html/tours/frogs/great_apes``.
    Requires a logged-in user. Nothing is read from or written to the database.
    """
    auth.basic()
    if not auth.user:
        raise HTTP(403, "Login required to preview a remote tour")
    if len(request.args) < 2:
        raise HTTP(422, "Expect /tour/remote.html/<worker>/<file>")

    tours_url_base = _tours_url_base_from_slug(request.args[0])
    doc_url = _tours_json_url(tours_url_base, '/'.join(request.args[1:]))
    tour = _tour_from_document(_fetch_tour_json(doc_url))

    response.view = 'tour/data.html'
    return dict(
        tour_identifier=tour.get('identifier') or 'preview',
        tour=tour,
        tours_url_base=tours_url_base,
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
