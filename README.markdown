This README file contains instructions for installing a private copy of OneZoom, either the tree explorer or the entire website.

Details of how to customize the OneZoom javascript viewer, along with information about the OneZoom APIs, are available by following the instructions below, then opening the compiled markdown file (at `OZprivate/rawJS/OZTreeModule/docs/_compiled.markdown` or if you are running your own private OneZoom web server, at /dev/DOCS - for example, https://127.0.0.1:8000/dev/DOCS). 

If you simply want to run a local copy of OneZoom, but not modify the code yourself, we recommend using our [Docker image](https://hub.docker.com/r/onezoom/oztree-complete). The rest of this README provides details for compiling and running a OneZoom instance (something that is done under the hood when [creating the docker image](https://github.com/OneZoom/OZtree-docker)).

# OneZoom setup

There are two ways in which you can install OneZoom on a personal computer: full installation and partial installation. 

* *Partial installation* does not create a standalone OneZoom site, but simply creates a local web file containing the javascript tree viewer. Instead of your tree viewer getting information from your own computer, it must do so by constantly requesting data from the OneZoom website (via the OneZoom APIs). This restricts your OneZoom viewer in various ways:  you cannot make your own bespoke tree, you cannot change languages in the viewer, and you are dependent upon a permanent, fast internet connection. Also note that this installation method is also relatively untested, and there are unfixed problems with e.g. displaying lists of popular species. However, partial installation may be suitable for developers who simply want to re-program features of the tree viewer, such as colours, branch geometry, etc.

* *Full installation* creates an entire duplicate of the OneZoom website, which is built using the [web2py](http://web2py.com) framework. This creates a fully self-contained local system (apart from the picture files, which can be downloaded separately). This is the most reliable installation method, but requires you to install and run extra software packages, in particular [web2py](http://web2py.com) and a [MySQL](https://www.mysql.com) server. Since this can be quite complicated, the majority of this readme contains instructions for full installation.

## Requirements and packages

For any installation, OneZoom requires node (18+) & python (3.10).

#### Debian/Ubuntu

```
apt install nodejs npm
apt install python3 python3-dev python3-venv
```

#### FreeBSD

```
# NB: rust is required to build the python cryptography package
sudo pkg install lang/python310 node18 npm-node18 rust
```

In addition, for a full installation you also need MySQL:

#### Debian/Ubuntu

```
apt install lsb-release
wget https://dev.mysql.com/get/mysql-apt-config_0.8.29-1_all.deb
dpkg -i mysql-apt-config_0.8.29-1_all.deb
apt update && apt install mysql-server
# NB: Select "Use Legacy Authentication Method (Retain MySQL 5.x Compatibility)"
```

#### Windows

On Windows we recommended downloading the [MSI installer](https://dev.mysql.com/downloads/installer/) as it will make it easier to configure the new server during the installation.
Once mysql is installed, you will need to set a root password, and create a database for web2py to use. See http://dev.mysql.com/doc/refman/5.7/en/default-privileges.html. 
The mysqld program is responsible for running the new database just created. When this program is  running, you can connect to the database.

## Installation

If performing a full installation, you need to create a database for OneZoom to use:

```
mysql -p
CREATE DATABASE OneZoom;
CREATE USER 'oz'@'localhost' IDENTIFIED BY 'passwd-you-should-change-this';
GRANT ALL PRIVILEGES ON OneZoom . * TO 'oz'@'localhost';
```

Firstly, you need to check out the web2py / OneZoom repositories, and run npm:

```
# NB: The path should match the eventual hostname for this installation
export WEB2PY_PATH="/srv/.../onezoom.myhostname.org"
mkdir -p ${WEB2PY_PATH}
chown deploy:staff ${WEB2PY_PATH}
git clone https://github.com/web2py/web2py ${WEB2PY_PATH} --branch v2.27.1
git clone https://github.com/OneZoom/OZtree.git ${WEB2PY_PATH}/applications/OZtree --branch production
cd ${WEB2PY_PATH}/applications/OZtree
npm ci --legacy-peer-deps
```

Next, ``cp private/appconfig.ini.example private/appconfig.ini`` and edit to match your needs, taking care to:

* Use the same database credentials as configured earlier.

Once done, run ``./node_modules/.bin/grunt dev`` for a development installation.

For production installation, see later.

### Partial installation

If you'd like your installation to be a partial installation, run:

```
./node_modules/.bin/grunt partial-install
```

...and open `static/minlife.html` in a web browser.
Note that this file needs to stay within the static directory to work at all.
You may also need to allow your browser to allow local files to be loaded via AJAX (i.e. disabling some local cross-origin checks).
Different browsers do this in different ways: for example in Chrome you can start up your browser with the `--allow-file-access-from-files` option, and in Safari, you can choose "Disable Local File Restrictions" from the "Developer" menu.

Note that the normal `minlife.html` file will use local versions of data files and the javascript treeviewer,
but will get API information form the OneZoom website, *and* also use the OneZoom website as the source for the html page which embeds the viewer.
For developers only, who may wish to create a minlife version not only using modified javascript in the treeviewer but also with bespoke html, you can run `grunt partial-local-install`.
This is much more effort since it requires you to set up a full installation (as below) before creating the minlife scripts, but once created, the files in `static` will be enough for other users to view (and test) your modifications.

## Database set-up / migation

For full installations, you need to setup your database.

To create required tables, use web2py migrate:

* Edit private/appconfig.ini, setting ``migrate=1``
* ``./web2py-run tests/unit/test_modules_embed.py``, on startup this will create tables as necessary
* Edit private/appconfig.ini, migrate=0

A database dump should be used to add species information:

```
# NB: OneZoom.dump.sql can be extracted from https://github.com/OneZoom/OZtree-docker
mysql -p
USE OneZoom
SOURCE /OneZoom.dump.sql
```

Finally, ensure indexes are created:

```
mysql -p
USE OneZoom
SOURCE ${WEB2PY_PATH}/applications/OZtree/OZprivate/ServerScripts/SQL/create_db_indexes.sql
```

## Production installation

For a production installation of OneZoom, you also need nginx & supervisor:

#### Debian/Ubuntu

```
apt install nginx supervisor
```

#### FreeBSD

```
sudo pkg install nginx py39-supervisor lang/python310
```

### Installation

Run grunt to configure onezoom for production use:

```
cd ${WEB2PY_PATH}/applications/OZtree
npm ci --legacy-peer-deps
./node_modules/.bin/grunt prod
```

Edit ``models/db.py``, and set ``is_testing = False``.

Then run the install scripts to set up nginx & supervisord:

```
sudo ./install-nginx.sh
sudo ./install-supervisord.sh
```

If everything works, restart both.

## Database explorer

(optional) We find it useful to have a GUI interface to connect to the database and run SQL scripts, this can be used instead of using MySQL command line (similar to Windows command line) that is installed by default with MySQL.
On Mac OS X we use the (excellent) http://www.sequelpro.com.
On windows you could try http://www.mysql.com/products/workbench/ or https://www.quest.com/products/toad-for-mysql/
Under windows, [SQL Workbench](https://www.mysql.com/products/workbench/) can also be used, even if your MySQL server is installed under WSL2.

installing SQL Workbench on Windows works great to connect to the Ubuntu MySQL instance.

## Starting and shutting down web2py

On the OneZoom main site, web2py is run using a combination of nginx and uwsgi. This is complete overkill if you just want to run a local copy of OneZoom for testing purposes. You can simply run a [temporary and basic web2py server using Python 3](http://www.web2py.com/books/default/chapter/29/03/overview#Startup). The simplest is to open a command-line prompt in the root web2py folder, and run the following (assuming the command `python3` is linked to something like Python 3.7)

```
./node_modules/.bin/grunt start-dev
```

When web2py is run, it will print instructions telling how to shut down the web2py server. For example, on Windows you might use `taskkill /f /pid XXXX`, where `XXXX` is the process id.

## Web2py folder structure

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

The main bulk of the data returned from the API is stored in the rest of the tables in the database, as detailed below. To get the API and the rest of the website working, you will have to obtain a database dump of the OneZoom tables. You can either do this by emailing mail@onezoom.org, or getting it from a Docker setup of OZTree. If you are loading new data on top of old, it is a good idea to truncate all the non-auth tables before loading data.

You can use the following steps to fill up the tables based on a Docker setup. Start by following the [Docker instructions](https://hub.docker.com/r/onezoom/oztree-complete), including the 'Saving the image' section. Then, run these commands one by one:

```sh
# start by stopping/deleting any OZTree container instance that may still be running (your container name may be different):
docker stop oztree

# Create a folder on your local machine to hold the dump
mkdir ~/dbdump

# Run a new OZTree Docker container instance, mounting your local folder
docker run -d -p 8080:80 --name oztree --mount type=bind,source="$(pwd)"/dbdump,target=/dbdump onezoom/oztree-complete-with-iucn

# Start a shell in the container
docker exec -it oztree /bin/bash

# Dump the container's database into your mounted local folder. This is fairly fast. The resulting file is ~1GB.
mysqldump OneZoom > /dbdump/ozdb.sql

# Exit the running OZTree container. We're done with it now, so feel free to delete it.
exit

# Now import the dump into your local OneZoom database (you may need to pass -u & -p based on your MySql configuration)
# WARNING: this is an extremely long step that can take over an hour with no indication of progress!
sudo mysql OneZoom < ~/dbdump/ozdb.sql

# You're done, and your local database should be fully populated. Feel free to delete the dump file /dbdump/ozdb.sql
```

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

**NB:** The server tests are not sandboxed, so have the potential to delete database data.
On run on a personal instance where data loss does not matter.

The server unit tests have no additional dependencies. To run, do:

    grunt test-server

To run individual tests, do:

    grunt exec:test_server:test_modules_username.py

### Client unit tests

The client unit tests have no additional dependencies. To run, do:

    grunt test-client

### Server Selenium-based functional tests

Make sure required python modules are installed with:

    pip3 install -r tests/requirements.txt

You also need chrome/chromium driver installed with, e.g.:

    apt install chromium-driver

You can then run the tests with:

    grunt test-server-functional

## Debugging

If you wish to use your editor's debugger to debug the JavaScript code, you will need to compile source maps. Run the following:

1. Run `grunt dev` to perform the initial dev compilation.
1. Run `npm run compile_js_dev:watch` to compile source maps and automatically recompile if files are changed. Note: this command will continue to run until it is killed.

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
