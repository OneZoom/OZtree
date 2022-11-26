This README file contains instructions for installing a private copy of OneZoom, either the tree explorer or the entire website. For gory details on running a *public* OneZoom server, see [README_SERVER.markdown](README_SERVER.markdown). Details of how to customize the OneZoom javascript viewer, along with information about the OneZoom APIs, are available by following the instructions below, then opening the compiled markdown file (at `OZprivate/rawJS/OZTreeModule/docs/_compiled.markdown` or if you are running your own private OneZoom web server, at /dev/DOCS - for example, https://127.0.0.1:8000/dev/DOCS). 

If you simply want to run a local copy of OneZoom, but not modify the code yourself, we recommend using our [Docker image](https://hub.docker.com/r/onezoom/oztree-complete). The rest of this README provides details for compiling and running a OneZoom instance (something that is done under the hood when [creating the docker image](https://github.com/OneZoom/OZtree-docker)).

# OneZoom setup

There are two ways in which you can install OneZoom on a personal computer: full installation and partial installation. 

* *Partial installation* does not create a standalone OneZoom site, but simply creates a local web file containing the javascript tree viewer. Instead of your tree viewer getting information from your own computer, it must do so by constantly requesting data from the OneZoom website (via the OneZoom APIs). This restricts your OneZoom viewer in various ways:  you cannot make your own bespoke tree, you cannot change languages in the viewer, and you are dependent upon a permanent, fast internet connection. Also note that this installation method is also relatively untested, and there are unfixed problems with e.g. displaying lists of popular species. However, partial installation may be suitable for developers who simply want to re-program features of the tree viewer, such as colours, branch geometry, etc.

* *Full installation* creates an entire duplicate of the OneZoom website, which is built using the [web2py](http://web2py.com) framework. This creates a fully self-contained local system (apart from the picture files, which can be downloaded separately). This is the most reliable installation method, but requires you to install and run extra software packages, in particular [web2py](http://web2py.com) and a [MySQL](https://www.mysql.com) server. Since this can be quite complicated, the majority of this readme contains instructions for full installation.


## Requirements and packages
For all installation methods, you will need to install node.js (and npm, the node package manager), and the webpack package. To compile the OneZoom javascript codebase automatically, you will then need to install grunt. To generate documentation or make a partial install, you will also need perl installed on your system.

For full installation, you will additionally need to install web2py, and ensure that you have the programming language python installed on your system, which is what web2py uses. You will also need access to a database backend (e.g. mySQL running on your own computer, or on a remote server which you can administer).

To create trees, you will need python and perl, along with a number of libraries, as listed below.

### Required packages (you will need these even if you're not creating trees)
The OneZoom codebase uses the following software (licenses for each listed in braces). The first three are programming languages which may well already be installed on your computer.

* [Python](https://www.python.org) (assumed version 3.7) with the following libraries installed:
	* mysql-connector-python
	* pymysql (needed even if not creating trees)
	* piexif
	* requests
	* Dendropy
	* (for functional testing) nose + js2py + selenium +  e.g. chromedriver_installer 
* [Perl](https://www.perl.org) with the following libraries installed
 	* File::ReadBackwards
 	* LWP::Simple
 	* JSON
 	* DBI
 	* Try::Tiny
 	* Text::CSV
 	* Image::ExifTool
 	* DBD::mysql
* [web2py](http://web2py.com) (LGPL license)
* [npm](https://www.npmjs.com/get-npm), part of node.js which, when run will install a large number of other packages including
	* [grunt](https://gruntjs.com) (MIT licence): to automate creating the OneZoom website files
	* [webpack](https://webpack.js.org) (MIT licence): to package the OneZoom javascript tree viewer into a library
	* jsdoc-to-markdown (MIT licence): to produce documentation from source code
* [ImageMagick](https://www.imagemagick.org/script/index.php) (Apache 2.0) for processing thumbnails
* [curl](https://curl.haxx.se) (MIT-like licence) to download partial installs (`curl` is probably already installed on your computer)
* [UIkit 3](https://getuikit.com) (MIT licence) for the User Interface (this code is included in the OneZoom github repo, and does not need downloading)

## Quick installation steps

Before anything else, get the OZtree app from [github](https://github.com/OneZoom/OZtree) - see *"Downloading the OZtree app"*. You should also make sure you have node.js and the node package manager (npm), see *"Building the OneZoom tree viewer"*


### For a partial installation (less tested):

1. Install the command-line version of `grunt` using `npm install -g grunt-cli`. You may need to have administrator privileges to do this. 
2. From anywhere within the OZtree download, run `npm install` to install all the packages for automation.
3. Create a partial installation by running `grunt partial-install`. This downloads the "minlife" and "minlife_tour" pages from the central OneZoom website, modifies links within them, and places appropriately named html files into the `static` directory of your OZtree distribution.
4. Open e.g. `static/minlife.html` with a web browser of your choice (we recommend Chrome or Safari). Note that this file needs to stay within the static directory to work at all. You may also need to allow your browser to allow local files to be loaded via AJAX (i.e. disabling some local cross-origin checks). Different browsers do this in different ways: for example in Chrome you can start up your browser with the `--allow-file-access-from-files` option, and in Safari, you can choose "Disable Local File Restrictions" from the "Developer" menu.
5. Note that the normal `minlife.html` file will use local versions of data files and the javascript treeviewer, but will get API information form the OneZoom website, *and* also use the OneZoom website as the source for the html page which embeds the viewer. For developers only, who may wish to create a minlife version not only using modified javascript in the treeviewer but also with bespoke html, you can run `grunt partial-local-install`. This is much more effort since it requires you to set up a full installation (as below) before creating the minlife scripts, but once created, the files in `static` will be enough for other users to view (and test) your modifications.

### For a full installation (recommended):
	
1. Install a source code version of [web2py](http://www.web2py.com), placing your [OZtree repository](https://github.com/OneZoom/OZtree) within the web2py `applications` directory.
2. Install command-line software by running `npm install -g grunt-cli` (you may need to do all this with administrator privileges).
3. Run `npm install` from within the OZtree folder you moved in step 1. then run `grunt dev` (or `grunt prod` if in production mode) - see *"[Building the OneZoom tree viewer](#building-the-onezoom-tree-viewer)"*.
3. [Install](http://dev.mysql.com/downloads/mysql/) & start MySQL, then create a new database (see *"[Setting up the database backend](#setting-up-the-database-backend)"*)
4. Create a appconfig.ini file in `OZtree/private`, with `migrate=1` and which references this database with the appropriate username and password. We also recommend copying the `routes.py` file from `OZtree/_MOVE_CONTENTS_TO_WEB2PY_DIR` to the top level of your web2py installation - see *"[Web2py installation](#web2py-installation)"*
5. Fire up a temporary web2py server and visit the main page to create the (empty) database tables - see *"[Starting and shutting down web2py](#starting-and-shutting-down-web2py)"*
6. Load up data into the tables: first create a user and assign it a 'manager' role in the `auth_` tables using the web2py database admin pages, then load the other tables using data from the original OneZoom site (e.g. sent to you via file transfer) - see *"[Filling the database](#filling-the-database)"*.
7. Optimise your installation:
	* create indexes on the tables by running the SQL script in `OZtree/OZprivate/ServerScripts/SQL/create_db_indexes.sql`. You can do this, for example, by running `SOURCE /path/to/OZtree/OZprivate/ServerScripts/SQL/create_db_indexes.sql` within a mysql client.
	* set `is_testing = False` in `models/db.py` and `migrate=0` in appconfig.ini.


## Downloading the OZtree app

Download a copy of the OZtree application from GitHub at [https://github.com/OneZoom/OZtree](https://github.com/OneZoom/OZtree), either as a zip file (not recommended), or probably better (easier to update), by cloning the repository (e.g. using `git clone https://github.com/OneZoom/OZtree` or if you have [GitHub Desktop](https://desktop.github.com) installed, click "Open in Desktop" from the [OZtree repo](https://github.com/OneZoom/OZtree)). Make sure the git folder is called "OZtree" (this is the default when you clone the repo, but not if you download it as a zip file).

For full installation, you will also need to download the source code version of web2py, either via git (https://github.com/web2py/web2py/) or simply from the download link at http://www.web2py.com/. You can then place the OZtree directory into the `applications` directory of the web2py folder.


## Building the OneZoom tree viewer

Compiling and creating the OneZoom explorer javascript code requires grunt to be installed. This compiles javascript code from multiple sources into a single file. You will need to install the node package manager, npm, then do 

```
npm install -g grunt-cli
```

To install this is likely to require administrator privileges. Other required packages can then be installed from within the OZtree folder by simply typing the following (which may take a while to complete!)

```
npm install
```

Once these are installed you can run grunt as follows (feel free to examine the configuration options which are stored in `Gruntfile.js` in the main OZtree directory):

#### Compile documentation
`grunt docs`: Use this command to generate a compiled documentation file. This will generate a large compiled markdown file in `OZprivate/rawJS/OZTreeModule/docs/_compiled.markdown`, which is best viewed once you have got web2py running, by pointing your browser to `dev/DOCS` (e.g. at `http://127.0.0.1:8000/dev/DOCS`).  Note that viewing this page requires a working internet connection to get various formatting files)

#### In development mode:
`grunt dev`: This command bundles multiple js files into one.

#### In production mode:
`grunt prod`: This command does three things. Firstly, it pre-compiles python code. Then it bundles multiple js files into one. Lastly, it minifies bundled js files.


## The server-side database

### Setting up the database backend

The web2py instance requires a database to be running. We previously used sqllite, and code for interfacing with sqllite is still present in the codebase, but probably will not work, as we have switched to using mySQL.

So a major step when installing OneZoom is:

1. Install a locally running copy of mySQL. Make sure the server is installed and not only the client
	There are many ways to do this: see http://dev.mysql.com/downloads/mysql/.

	On Windows we recommended downloading the MSI installer as it will make it easier to configure the new server during the installation

	Once mysql is installed, you will need to set a root password, and create a database for web2py to use. See http://dev.mysql.com/doc/refman/5.7/en/default-privileges.html. 

	The mysqld program is responsible for running the new database just created. When this program is  running, you can connect to the database.

2. (optional) We find it useful to have a GUI interface to connect to the database and run SQL scripts, this can be used instead of using MySQL command line (similar to Windows command line) that is installed by default with MySQL. On Mac OS X we use the (excellent) http://www.sequelpro.com. On windows you could try http://www.mysql.com/products/workbench/ or https://www.quest.com/products/toad-for-mysql/

3. 	Once mysql is installed, you will need to set a root password, and create a database for web2py to use. See http://dev.mysql.com/doc/refman/5.7/en/default-privileges.html. So once mysqld is running, you need to log in to the sql server with the root name and password (if you are using the command line, log in using `mysql -u root -p`), and issue the following SQL commands (the text after the `mysql>` prompt) to create a database for web2py to use: feel free to use a different *'passwd'*.

	```
	mysql> create database OneZoom;
		Query OK, 1 row affected (0.09 sec)
	
	mysql> CREATE USER 'oz'@'localhost' IDENTIFIED BY 'passwd';
		Query OK, 0 rows affected (0.19 sec)
	
	mysql> GRANT ALL PRIVILEGES ON OneZoom . * TO 'oz'@'localhost';
		Query OK, 0 rows affected (0.09 sec)
	```

The database is now up and running. We recommend that you do *not* load data into it immediately, but first create the tables by installing web2py with `migrate=1` set in the appconfig.ini file. After running an instance of web2py and visiting the new site, the correct table structure should be automatically created (see below). After that you can populate the data into the tables using downloaded files.

## Web2py installation

Configuring the OneZoom application to use the database involves creating a file called 'appconfig.ini' in the `private` folder within the OZtree app, modified to use the username and password that you supplied above. A minimal appconfig.ini file to get the site working is

```
; App configuration

; db configuration - set migrate=0 once installed
[db]
uri       = mysql://oz:passwd@127.0.0.1/OneZoom?set_encoding=utf8mb4
migrate   = 1
pool_size = 1

; smtp address and credentials
[smtp]

[twitter]

[forms]
; form styling
formstyle = bootstrap3_inline
separator =

[paypal]
url        = https://www.sandbox.paypal.com

[general]

[images]
; * url_base: get thumbnail images from this source. If not
;    defined, will default to the local version, but that
;    means you will need to download >100,000 thumbnail images
;    onto your machine. If you want to use the images on the
;    OneZoom server, set this to `//images.onezoom.org/`
url_base = //images.onezoom.org/

[sponsorship]
; * allow. Should we allow the sponsorship page to be
;    shown on this machine? Usually not allowed, except on the
;    main OneZoom site (on museum displays people will not want
;    to enter paypal etc details).
; * maintenance_mins: to enable maintenance mode (e.g. when 
;    switching beta and production to enable a new website version)
;    set to the number of minutes you expect the site to be down
;    note that if is_testing=False then you will probably need to 
;    restart the server for changes to this to take effect
; * reservation_time_limit_mins: how long to reserve a leaf while a 
;    user is looking at the sponsor page
; * unpaid_time_limit_mins: how long before a sponsored leaf becomes 
;    free again if we receive no payment notification
allow_sponsorship = 0
maintenance_mins = 0

[api]
;If you want to get data from the Encyclopedia of Life, you need to put your own API key here. 
;Fill it in using instructions at http://eol.org/info/api_overview 
;eol_api_key = 11111111111
```

In order to use web2py you need to have a python v3 installed, the latest version can be found at
[https://www.python.org/downloads/](https://www.python.org/downloads/)

NB: on Windows, make sure that you add `python` (and ideally `python3`) to the windows path during install, or the commands below will not work

Assuming you have python version 3 installed, should now try starting web2py as follows.

### Starting and shutting down web2py

On the OneZoom main site, web2py is run using a combination of nginx and uwsgi. This is complete overkill if you just want to run a local copy of OneZoom for testing purposes. You can simply run a [temporary and basic web2py server using Python 3](http://www.web2py.com/books/default/chapter/29/03/overview#Startup). The simplest is to open a command-line prompt in the root web2py folder, and run the following (assuming the command `python3` is linked to something like Python 3.7)

`python3 web2py.py -i 127.0.0.1 -p 8000 -a pass`

* (NB: it is possible to run a secure OneZoom site over https. To try this using the basic web2py server, create a `.crt` and `.key` file, e.g. by running the following in the web2py root directory: `openssl req -newkey rsa:2048 -x509 -days 365 -nodes -keyout oz.key -out oz.crt`, then use them when running web2py, as in: `python3 web2py.py -c oz.crt -k oz.key -i 127.0.0.1 -p 8000 -a pass`)


When web2py is run, it will print instructions telling how to shut down the web2py server. For example, on Windows you might use `taskkill /f /pid XXXX`, where `XXXX` is the process id.

**If this is a new installation** you should now visit `http://127.0.0.1:8000/OZtree/default/` or `https://127.0.0.1:8000/OZtree/default/` to force web2py to create database tables. To load data into the tables, see "Loading Data", below.

Also, if you want to make OneZoom the default application, make a copy of the routes.py file in the folder labelled `_MOVE_CONTENTS_TO_WEB2PY_DIR` and place it in the top level web2py directory (see `_MOVE_CONTENTS_TO_WEB2PY_DIR/README.markdown`).

Once tables are created, and everything is working, you can set `is_testing = False` in `models/db.py` and `migrate=0` in `private/appconfig.ini`. This will mean that web2py will not make any changes to table structures in the DB, and also that changes to appconfig.ini will require a web2py restart.

### Web2py folder structure

#### Standard folders
`databases` stores all the database structure.

`controllers` is where most of the bespoke web2py code that runs the site lives. The public pages are in `controllers/default.py`.

`models` stores the python back end server code.

`static` stores all static files including images, css, and compiled js. Files which are output by various server processes are stored in `FinalOutputs`. This includes very large numbers of thumbnail images (stored in `FinalOutputs/pics`) and static data files such as the tree topology and the tree cut positions (stored in `FinalOutputs/data`). The OZTreeModule folder contains the compiled version of most of the core OneZoom code. `static/OZLegacy` contains most of the old trees.

`views` is where all the html is stored - it's OK to just use raw html in here if no server side functions are needed for that particular page.

#### OneZoom special folders

`OZprivate` stores external files that are not formally part of web2py, such as the tree viewer code itself, and scripts which we use for updating the tree and our own database tables. The most important are:

1. `data`, which contains most of the data used to build the tree (e.g. EoL mappings, OpenTree components, Yan's specific tree-building code
2. `rawJS`, which contains the uncompiled javascript that when compiled, creates the OneZoom viewer
3. `ServerScripts`, which contains scripts that the server can run to compile a tree, grab images from EoL, percolate images throughout the tree, etc.


## Filling the database

### Creating auth users & groups

Web2py uses an `auth_` based system, which has tables for users, roles, and a mapping table assigning roles to users. This can be edited through the web interface: assuming you are running a temporary version of web2py on localhost, you can access the admin pages through http://127.0.0.1:8000/admin/default/design/OZtree, which will require you to enter the temporary administrator password ('pass', above) that you used in the web2py startup command. The database tables can be seen at the url http://127.0.0.1:8000/OZtree/appadmin. You need to click to edit the `db.auth_user` table, from where you can click to add a "New Record", and submit a first name, last name, email, username, and password. You then need to go back to the appadmin page and create a "manager" role by adding a New Record to `db.auth_group` table (you can type anything in the description box). Finally, you need to create a New Record in the `db.auth_membership` table, and assign the "manager" group ID to your user ID in the resulting page.

### Other tables

The main bulk of the data returned from the API is stored in the rest of the tables in the database, as detailed below. To get the API and the rest of the website working, you will have to obtain a database dump of the OneZoom tables by emailing the normal OneZoom address. If you are loading new data on top of old, it is a good idea to truncate all the non-auth tables before loading data.

Note that mySQL stupidly has a restricted version of the unicode character set, so fields that could contain e.g. chinese characters  need to be set to utf8mb4 (which is not the default). These are the `vernacular` field in the `vernacular_by_ott` and `vernacular_by_name` tables, the `rights` field in the `images_by_ott` and `images_by_name` tables, and the following fields in the `reservations` table: `e_mail`, `twitter_name`, `user_sponsor_name`, `user_donor_name` `user_more_info`, `user_message_OZ`, `verified_sponsor_name`, `verified_donor_name` `verified_more_info`. When we send you the tables, they should contain `create` syntax which makes sure the tables are correctly defined, but it may be worth checking too.

### Optimising tables (IMPORTANT)

To get any decent performance out of your OneZoom instance, you will need to create indexes on the resulting tables. The commands for doing this are listed in `OZtree/OZprivate/ServerScripts/SQL/create_db_indexes.sql`, from where they can be copied and pasted into a mysql client.

The commands to create indices also include commands to convert some of the columns to 4-byte unicode if necessary (to incorporate e.g. full Japanese/Chinese common names), and to drop the indexes if they already exist. Some of these commands may cause SQL errors (e.g. "Can't DROP XXX") if you have not previously created any indices. These errors can be safely ignored. If you are using mysql workbench you may want to untick the option under Query to "Stop Script Execution on Errors", so that the index creation continues after each error.



### Table information, for reference 

OneZoom data list - this is data that's not stored anywhere else outside OneZoom and so should be treated with greater care

1. Auth_* (see above: ours but easy to recreate)
2. Banned is ours and is important but could be recreated
3. eol_inspected is ours but is not important at all so could be lost and we wouldn't care
4. eol_updated is ours but is not critical
5. images_by_name and images_by_ott - entries put in by us where src=1 are ours and are *semi critical* because they include things like special images of sponsors etc. also includes hacked ratings and hacked pictures in general.
6. IUCN - not ours at all
7. leaves_in_unsponsored_tree - now not used any more can be deleted
8. Ordered leaves and ordered nodes - can be recreated, but include derived products like popularity, matched IDs and Yan's curation of the tree. This can be regenerated any time provided our codebase and algorithms are fine
9. PoWo - Kew list of things (for later in Kew tree)
10. prices is ours *semi critical* we can recreate but includes our subjective choices.
11. Reservations table *THE MOST critical*
12. vernacular_by_name and vernacular_by_ott is the same as images - so src=1 means it's ours as before *semi critical*
13. visit_count *medium level of criticality* it's our visit information, but we don't know if it's running. We may later split this up but tree. at the moment it's not really functioning as we want it.

Notes

* there is a question mark over tours information and associated things
* there are many critical source files in OZ_private, including tree sources.

## Running tests

### Server unit tests

The server unit tests have no additional dependencies. To run, do:

    grunt test-server

To run individual tests, do:

    grunt exec:test_server:test_modules_username.py

### Server Selenium-based functional tests

Make sure required python modules are installed with:

    pip3 install -r tests/requirements.txt

You also need chrome/chromium driver installed with, e.g.:

    apt install chromium-driver

You can then run the tests with:

    grunt test-server-functional

# Documentation

Documentation is partially compiled from the source code using Grunt, and lives in `OZprivate/rawJS/OZTreeModule/docs`. Once compiled, it can be viewed online using your web2py server. For example, if you are running web2py on http://127.0.0.1:8000, you should be able to visit [http://127.0.0.1:8000/OZtree/dev/DOCS](http://127.0.0.1:8000/OZtree/dev/DOCS), or (if you have manager access to the OneZoom site) at [http://onezoom.org/dev/DOCS](http://onezoom.org/dev/DOCS).

# Keeping OneZoom updated

If you wish to make sure your OneZoom data is up-to-date, there are a few steps you can take:

1. Make sure the "representative species" for each node (the 4x2 pictures in the middle of each internal node) are up-to-date. To do this, run 

	```
	OZprivate/ServerScripts/Utilities/picProcess.py
	```
	Note that these representative pictures can be customized too (see below)
2. Update IUCN statuses, from the IUCN API. This can be done by

	```
	OZprivate/ServerScripts/Utilities/IUCNquery.py
	```
3. Keep a running script that mines data from the Encyclopedia of Life (EoL). This will ensure that new images on EoL are eventually downloaded to OneZoom, but it does mean that your server will continuously be sending online requests to EoL. You wll need to obtain an EoL API key (http://eol.org/info/api_overview) and add it into your appconfig.ini file. Then you can run the script as follows:

	```
	OZprivate/ServerScripts/Utilities/EoLQueryPicsNames.py
	```
	
4. Recompile your own tree and database tables. Instructions for creating your own tree are in [OZprivate/ServerScripts/TreeBuild/README.markdown](OZprivate/ServerScripts/TreeBuild/README.markdown).
 
# Customising OneZoom
A few suggestions about ways to customize OneZoom

### Easy customization possibilities

* Change the colour schemes: the code in `rawJS/OZTreeModule/src/themes` gives examples of how to create new colour schemes for branches, leaves, etc of the tree. They can be gathered together into themes (including different leaf styles, default fractal views etc) by adding to the code in `rawJS/OZTreeModule/src/tree_settings.js`.

### Harder customization possibilities

* Customizing pictures: by running alternative versions of `picProcess.py`, you can choose different pictures to represent taxonomic groups. This is left as an exercise to the customiser.

* Alternative UI layer: the current OneZoom viewer uses the UIkit framework to layer a user interface on top of the viewing canvas. The UI can send commands to the viewing canvas, and the canvas is instatiated with UI callbacks, so it is quite possible to write alternative user interfaces (e.g. using different UI toolkits)

* Alternative projections: the code in `rawJS/OZTreeModule/src/projection` can be supplemented with alternative "projections" of the tree, such as treemaps, other fractal layouts, etc.
