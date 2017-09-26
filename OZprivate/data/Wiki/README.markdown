Files here are git ignored. To get the site working, this folder should contain large files in the following three directories (NB: these could be symlinks to versions on external storage)

* The wikidata JSON dump, in a directory called `wd_JSON`, as `wd_JSON/latest-all.json.bz2` (download from [http://dumps.wikimedia.org/wikidatawiki/entities/](http://dumps.wikimedia.org/wikidatawiki/entities/))
* The en.wikipedia SQL dump file, in a directory called `wp_SQL`, as `wp_SQL/enwiki-latest-page.sql.gz` (download from [http://dumps.wikimedia.org/enwiki/latest/](http://dumps.wikimedia.org/enwiki/latest/))
* The wikipedia pagevisits dump files in in a directory called `wp_pagecounts`, as files such as `wp_pagecounts/pagecounts-2015-01-views-ge-5-totals.bz2` etc... (download from [http://dumps.wikimedia.org/other/pagecounts-ez/merged/](http://dumps.wikimedia.org/other/pagecounts-ez/merged/))
