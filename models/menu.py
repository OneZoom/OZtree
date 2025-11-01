# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## Customize your APP title, subtitle and menus here
#########################################################################

response.logo = A('OneZoom',_class="navbar-brand",_href= URL('default', 'index'),_id="web2py-logo")
# This is the default title: normally it is overridden on a per-page basis
response.title = base_title + " " +T('tree of life explorer')
# response.subtitle = 'some subtitle'

## read more at http://dev.w3.org/html5/markup/meta.name.html
response.meta.author = 'OneZoom Team'
response.meta.description = 'Tree of life explorer'
response.meta.keywords = 'onezoom, one, zoom, fractal, tree, tree of life, phylogeny, explorer, life, species, biology, earth, deep zoom, big data, encyclopedia, evolution, ecology, sponsor'
response.meta.generator = 'Web2py Web Framework'

# videos, 

#OneZoom is committed to heightening awareness about the diversity of life on earth and its evolutionary history. Here you can explore the tree of life in a new way: it's like a map, everything is on one page, all you have to do is use your mouse wheel to zoom in and out.

# link to ZoomPast



#########################################################################
## this is the main application menu add/remove items as required
#########################################################################

# james todo manager only menu?

response.menu = [
                 (T('For Everyone'), False, None , [
                                            (T('A view of all known life'), False, URL('default', 'introduction', extension=False)),
                                            (T('Your name on the tree'), False, URL('default' , 'sponsor', extension=False)),
                                            (T('Send a tr-eCard'), False, URL('default' , 'treecards', extension=False)),
                                            (T('Act for biodiversity'), False, URL('default' , 'otop_intro', extension=False)),
                                            (T('Full user guide'), False, URL('default' , 'full_guide', extension=False)),
                                            (T('My sponsorships'), False, URL('default' , 'sponsor_user_manage', extension=False)),
                                            ]),
                
                 (T('For Education'), False, None , [
                                                    (T('Installations'), False, URL('education' , 'installations', extension=False)),
                                                    (T('Display launcher'), False, URL('education' , 'museum_display_setup', extension=False)),
                                                     (T('Educational materials'), False , URL('education' , 'educational_materials', extension=False)),
                                                    (T('Screenshot tool'), False , URL('education' , 'screenshot_launcher', extension=False)),
                                                   ]),
                 
                 (T('For Science'), False, None , [
                                            (T('Work with us'), False, URL('default' , 'work_with_us', extension=False)),
                                            (T('Embeddable widget'), False, URL('developer' , 'embedding', extension=False)),
                                            (T('Popularity index'), False , URL('popularity' , 'index', extension=False)),
                                            (T('Public APIs'), False , URL('API','index', extension=False)),
                                             (T('Developer tools'), False , URL('developer' , 'index', extension=False)),
                                            (T('Data sources'), False, URL('default' , 'data_sources', extension=False)),
                                            (T('Changelog'), False , URL('developer' , 'changelog', extension=False)),
                                            (T('Legacy trees'), False , URL('default' , 'tree_index', extension=False)),
                                            ]),
                 
                 (T('About us'), False, None , [
                                            (T('Project timeline'), False , URL('default' , 'timeline', extension=False) ),
                                            (T('Endorsements'), False, URL('default' , 'endorsements', extension=False)),
                                            (T('About OneZoom'), False, URL('default' , 'about', extension=False)),
                                            (T('Donors'), False , URL('default' , 'donor_list', extension=False) ),
                                            (T('Team'), False, URL('default' , 'team', extension=False)),
                                            (T('FAQ'), False, URL('default' , 'FAQ', extension=False)),
                                            ]),
                 ]


DEVELOPMENT_MENU = False

#########################################################################
## provide shortcuts for development. remove in production
#########################################################################

def _():
    # shortcuts
    app = request.application
    ctr = request.controller
    # useful links to internal and external resources
    response.menu += [
        (T('My Sites'), False, URL('admin', 'default', 'site')),
          (T('This App'), False, '#', [
              (T('Design'), False, URL('admin', 'default', 'design/%s' % app)),
              LI(_class="divider"),
              (T('Controller'), False,
               URL(
               'admin', 'default', 'edit/%s/controllers/%s.py' % (app, ctr))),
              (T('View'), False,
               URL(
               'admin', 'default', 'edit/%s/views/%s' % (app, response.view))),
              (T('DB Model'), False,
               URL(
               'admin', 'default', 'edit/%s/models/db.py' % app)),
              (T('Menu Model'), False,
               URL(
               'admin', 'default', 'edit/%s/models/menu.py' % app)),
              (T('Config.ini'), False,
               URL(
               'admin', 'default', 'edit/%s/private/appconfig.ini' % app)),
              (T('Layout'), False,
               URL(
               'admin', 'default', 'edit/%s/views/layout.html' % app)),
              (T('Stylesheet'), False,
               URL(
               'admin', 'default', 'edit/%s/static/css/web2py-bootstrap3.css' % app)),
              (T('Database'), False, URL(app, 'appadmin', 'index')),
              (T('Errors'), False, URL(
               'admin', 'default', 'errors/' + app)),
              (T('About'), False, URL(
               'admin', 'default', 'about/' + app)),
              ]),
          ('web2py.com', False, '#', [
             (T('Download'), False,
              'http://www.web2py.com/examples/default/download'),
             (T('Support'), False,
              'http://www.web2py.com/examples/default/support'),
             (T('Demo'), False, 'http://web2py.com/demo_admin'),
             (T('Quick Examples'), False,
              'http://web2py.com/examples/default/examples'),
             (T('FAQ'), False, 'http://web2py.com/AlterEgo'),
             (T('Videos'), False,
              'http://www.web2py.com/examples/default/videos/'),
             (T('Free Applications'),
              False, 'http://web2py.com/appliances'),
             (T('Plugins'), False, 'http://web2py.com/plugins'),
             (T('Recipes'), False, 'http://web2pyslices.com/'),
             ]),
          (T('Documentation'), False, '#', [
             (T('Online book'), False, 'http://www.web2py.com/book'),
             LI(_class="divider"),
             (T('Preface'), False,
              'http://www.web2py.com/book/default/chapter/00'),
             (T('Introduction'), False,
              'http://www.web2py.com/book/default/chapter/01'),
             (T('Python'), False,
              'http://www.web2py.com/book/default/chapter/02'),
             (T('Overview'), False,
              'http://www.web2py.com/book/default/chapter/03'),
             (T('The Core'), False,
              'http://www.web2py.com/book/default/chapter/04'),
             (T('The Views'), False,
              'http://www.web2py.com/book/default/chapter/05'),
             (T('Database'), False,
              'http://www.web2py.com/book/default/chapter/06'),
             (T('Forms and Validators'), False,
              'http://www.web2py.com/book/default/chapter/07'),
             (T('Email and SMS'), False,
              'http://www.web2py.com/book/default/chapter/08'),
             (T('Access Control'), False,
              'http://www.web2py.com/book/default/chapter/09'),
             (T('Services'), False,
              'http://www.web2py.com/book/default/chapter/10'),
             (T('Ajax Recipes'), False,
              'http://www.web2py.com/book/default/chapter/11'),
             (T('Components and Plugins'), False,
              'http://www.web2py.com/book/default/chapter/12'),
             (T('Deployment Recipes'), False,
              'http://www.web2py.com/book/default/chapter/13'),
             (T('Other Recipes'), False,
              'http://www.web2py.com/book/default/chapter/14'),
             (T('Helping web2py'), False,
              'http://www.web2py.com/book/default/chapter/15'),
             (T("Buy web2py's book"), False,
              'http://stores.lulu.com/web2py'),
             ]),
          (T('Community'), False, None, [
             (T('Groups'), False,
              'http://www.web2py.com/examples/default/usergroups'),
              (T('Twitter'), False, 'http://twitter.com/web2py'),
              (T('Live Chat'), False,
               'http://webchat.freenode.net/?channels=web2py'),
              ]),
        ]
if DEVELOPMENT_MENU: _()

if "auth" in locals(): auth.wikimenu()
