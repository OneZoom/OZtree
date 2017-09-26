
routers = dict(
               # base router
               BASE=dict(
                         default_application='OneZoomPublic',
                         ),
               )

routes_in=(
  ('.*:/favicon.ico','/OneZoomPublic/static/images/favicon.ico'),
)

logging = 'off'

if __name__ == '__main__':
    import doctest
    doctest.testmod()
