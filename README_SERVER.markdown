#Server notes

When running OneZoom as a public server, you may wish to note:

* Move the correct handler from the `handlers` directory to the top of the web2py dir (we use wsgihandler.py)


* If the server is running as a different user to the web2py installation, the server will need read access to the web2py installation and write access to the directories `errors`, `databases`, `sessions`, `gluon` (and all subdirectories, for compiled .pyc files) and (optionally) `uploads`, as well as the directory at the top level of web2py (to create the `logs` and `deposit` directories. The easiest way to do this is to place both users in the same group, then set the group ownership of all web2py files to this group. E.g. if the server user is `www`, place your own username and `www` in a new group named `web`, move to the top of the web2py directory, and do

	```
	chgrp -R ./ web applications logs
	chmod g+w ./ applications/*/errors applications/*/databases applications/*/sessions applications/*/uploads
	```

* Nginx: remember not only to turn on gzip, but also [static gzipping](http://nginx.org/en/docs/http/ngx_http_gzip_static_module.html) for stuff in static. We run something like the following nginx.conf

	```
	http {
	  include       mime.types;
	  default_type  application/octet-stream;
	
	  # Enable Gzip
	  gzip  on;
	  gzip_http_version 1.0;
	  gzip_comp_level 2;
	  gzip_min_length 1100;
	  gzip_buffers     4 8k;
	  gzip_proxied any;
	  gzip_types
	    # text/html is always compressed by HttpGzipModule
	    text/css
	    text/javascript
	    text/xml
	    text/plain
	    text/x-component
	    text/json
	    application/javascript
	    application/json
	    application/xml
	    application/rss+xml
	    font/truetype
	    font/opentype
	    application/vnd.ms-fontobject
	    image/svg+xml;
	
	  gzip_proxied        expired no-cache no-store private auth;
	  gzip_disable        "MSIE [1-6]\.";
	  gzip_vary           on;
	
	  keepalive_timeout  65;
	
	  upstream uwsgi_cluster {
	          least_conn;
	          server unix:///var/run/uwsgi/uwsgi_onezoom0.sock;
	          server unix:///var/run/uwsgi/uwsgi_onezoom1.sock;
	          server unix:///var/run/uwsgi/uwsgi_onezoom2.sock;
	          server unix:///var/run/uwsgi/uwsgi_onezoom3.sock;
	          server unix:///var/run/uwsgi/uwsgi_onezoom4.sock;
	  }
	```
	
	Then later:
	
	```
	  server {
	    server_name www.onezoom.org;
	    listen 80 accept_filter=httpready;
	    server_tokens off;
	    access_log XXXXX combined buffer=32k flush=5m;
	    error_log  XXXXX;
	    #cache filehandles on the server side to max 2000 files, hopefully mostly images
	    open_file_cache          max=2000 inactive=20s;
	    open_file_cache_valid    60s;
	    open_file_cache_min_uses 3;
	    open_file_cache_errors   off;
	    index index.htm;
	    location /static/ {
	         # default static goes to the OneZoom web app
	         root ***path_to_OZtree***;
	         include static_include.conf;
	    }
	    
	    location ~ /(\w+)/static/ {
	         root ***path_to_OZtree***;
	         include static_include.conf;
	    }
	
	    location / {
	        location ~ \.json {
	            #don't log API (json) requests
	            access_log        off;
	            uwsgi_pass uwsgi_cluster;
	        }
	        # see http://uwsgi-docs.readthedocs.org/en/latest/Nginx.html
	        uwsgi_pass uwsgi_cluster;
	        include uwsgi_params;                 
	    }
	
	  } # www.onezoom.org
	```
	
	with the file static_include.conf being:
	
	```
	#the directives used for static pages on OneZoom
	location ~ /FinalOutputs/data/ {
	 # add_header 'X-static-gzipping' 'on' always;
	 gzip_static on;
	 #files in /data/ (e.g. the topology) have timestamps, so never change, and browsers can always use cache
	 expires max;
	 add_header Cache-Control "public";
	}
	
	location ~* \.(?:jpg|jpeg|gif|png|ico|gz|svg)$
	{
	  #cache images for a little while, even though we also cache them in the js.
	  #10 mins allows e.g. new crops to show up.
	 expires 10m;
	 access_log off;
	 add_header Cache-Control "public";
	}
	
	location ~ \.(js|css|html)$ {
	 # add_header 'X-static-gzipping' 'on' always;
	 gzip_static on;
	 #cache the static js and html, but only for a bit, in case we implement changes
	 expires 30m;
	 add_header Cache-Control "public";
	}
	
	location ~* /(\w+/)?static/trees/[^/]+/ {
	 # static trees with a trailing slash need to be trimmed so that e.g.
	 # static/trees/AT/@Homo_sapiens is not seen as a request for a file called '@Homo_sapiens'
	 # see http://stackoverflow.com/questions/39519355
	 rewrite ^(.*/static/trees/[^/]+)/ $1 last;
	 return 404;
	}
	```
	
* We run web2py using supervisord, so the following commands will restart web2py and the nginx web server

    ```
    sudo service supervisord restart #e.g. after editing /usr/local/etc/supervisord.conf
    sudo service nginx restart #e.g. after editing /usr/local/etc/nginx/nginx.conf
    ```
    
* We also run an https encrypted version of the site using certificates from letsencypt, which need to be renewed every 3 months e.g. by 

    ```
    sudo service nginx stop
    sudo letsencrypt renew
    sudo service nginx start
    ```