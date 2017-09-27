
routers = dict(
               # base router
               BASE=dict(
                         default_application='OZtree',
                         ),
               )

routes_in=(
  ('.*:/favicon.ico','/OZtree/static/images/favicon.ico'),
)

logging = 'off'

if __name__ == '__main__':
    import doctest
    doctest.testmod()
