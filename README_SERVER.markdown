#Server notes

When running OneZoom as a public server, you may wish to note:

* Move the correct handler from the `handlers` directory to the top of the web2py dir (I use wsgihandler.py)


If the server is running as a different user to the web2py installation, the server will need read access to the web2py installation and write access to the directories `errors`, `databases`, `sessions`, `gluon` (and all subdirectories, for compiled .pyc files) and (optionally) `uploads`, as well as the directory at the top level of web2py (to create the `logs` and `deposit` directories. The easiest way to do this is to place both users in the same group, then set the group ownership of all web2py files to this group. E.g. if the server user is `www`, place your own username and `www` in a new group named `web`, move to the top of the web2py directory, and do

```
chgrp -R ./ web applications logs
chmod g+w ./ applications/*/errors applications/*/databases applications/*/sessions applications/*/uploads
```

