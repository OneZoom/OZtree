# Data files
 
## Tree building

### Input files

To build a tree, you will need to download various files from the internet. These are not provided by OneZoom directly as they are (a) very large and (b) regularly updated. The files you will need are 

* Open Tree of Life files (see [OpenTree/README.markdown](OpenTree/README.markdown)
	* `labelled_supertree_simplified_ottnames.tre` (subsequently converted to `draftversionXXX.tre`, as detailed in the [OneZoom instructions](../ServerScripts/TreeBuild/README.markdown))
	* `ottX.Y/taxonomy.tsv` (where X.Y is the OT_TAXONOMY_VERSION)
* Wikimedia files (see [Wiki/README.markdown](Wiki/README.markdown))
	* `wd_JSON/latest-all.json.bz2`
	* `wp_SQL/enwiki-latest-page.sql.gz`
	* `wp_pagecounts/pagecounts-YYYY-MM-views-ge-5-totals.bz2` (several files for different months)
* EoL files (see [EOL/README.markdown](EOL/README.markdown))
	* `identifiers.csv`

### Output files

The output files created by the tree building process (database files and files to feed to the js , and which can be loaded into the database and for the tree viewer are  saved in `output_files`
