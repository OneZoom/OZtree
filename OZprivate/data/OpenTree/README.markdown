### Directory contents
Most files herein are .gitignored. To get the site working, this folder should contain the following files (or symlinks to them)
	
* `X.Y/labelled_supertree.tre`
* `ottV.W/taxonomy.tsv`

Where `X.Y` is the version of the Open Tree of Life (e.g. `12.3`), and `V.W` is the corresponding version of the Open Tree Taxonomy (e.g. `3.2`).

### How to get the files
* `labelled_supertree.tre` is the OpenTree newick file with ott numbers (but not scientific names), and should be placed in a directory named with the OpenTree version number. To get this file, you can either download the complete OpenTree distribution, or get the single necessary file by following the link from [https://tree.opentreeoflife.org/about/synthesis-release/](https://tree.opentreeoflife.org/about/synthesis-release/) to 'browse full output' then 'labelled_supertree/index.html'.
	

* The OpenTree taxonomy, in a subfolder called ott`V.W` (the only important file is `ottV.W/taxonomy.tsv`). Get the version corresponding to the tree from [http://files.opentreeoflife.org/ott](http://files.opentreeoflife.org/ott/) or [https://tree.opentreeoflife.org/about/taxonomy-version](https://tree.opentreeoflife.org/about/taxonomy-version).

### Use

These files are processed by the scripts in ServerScripts/TreeBuild/OpenTreeRefine to create an OpenTree without subspecies, with polytomies resolved, and with all nodes named.

Note that the `ottV.W/taxonomy.tsv` file is also used by other scripts e.g. for popularity, TaxonMapping, etc.