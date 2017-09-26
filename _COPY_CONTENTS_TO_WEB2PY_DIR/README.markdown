### Making OneZoom the default application

To make OneZoom the default web2py app, a copy of the accompanying routes.py file can placed at the root of the web2py folder (at the same level as the `applications` folder).

### Disabling other applications
You may also wish to delete the `welcome` and `examples` apps (just delete the folders), or disable them from the web2py admin web page (e.g. at http://127.0.0.1:8000/admin).

You probably shouldn't disable the admin app, as this is the main way of adding users etc to the OneZoom app. It should only be accessible over https (and maybe only locally) anyway, so is not that much of a security risk.