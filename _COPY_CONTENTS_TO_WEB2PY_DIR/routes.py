
routers = dict(
               # base router
               BASE=dict(
                         default_application='OZtree',
                         ),
               )

routes_in=(
  ('.*:/favicon.ico','/OZtree/static/images/favicon.ico'),
)

routes_onerror = [('OZtree/404', '/OZtree/default/custom_404.html')]

logging = 'off'

if __name__ == '__main__':
    import doctest
    doctest.testmod()
