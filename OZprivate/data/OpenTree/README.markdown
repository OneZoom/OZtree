### Directory contents
Files herein are .gitignored. To get the site working, this folder should contain the following files (or symlinks to them)
	
* `draftversionXXX.tre`
* `ottX.Y/taxonomy.tsv`

### How to get the files
* `draftversionXXX.tre` should contain an OpenTree newick file with simplified names and `mrca***` labels removed. This can be created from the OpenTree download file `labelled_supertree_simplified_ottnames.tre`. To get this file, you can either download the complete OpenTree distribution, or get the single necessary file by following the link from [https://tree.opentreeoflife.org/about/synthesis-release/](https://tree.opentreeoflife.org/about/synthesis-release/) to 'browse full output' then 'labelled_supertree/index.html'. Make sure that you *don't* get the `...without_monotypic.tre` version, otherwise you will be missing some intermediate nodes, and the popularity ratings may suffer.
	
	Removing the `mrca***` labels can be done by using a simple regular expression substitution, as in the following perl command:

	```
	OT_VERSION=10_4
	perl -pe 's/\)mrcaott\d+ott\d+/\)/g; s/[ _]+/_/g;' labelled_supertree_simplified_ottnames.tre > draftversion${OT_VERSION}.tre
	```

* The OpenTree taxonomy, in a subfolder called ott/ (the only important file is ott/taxonomy.tsv). Get the version corresponding to the tree from [http://files.opentreeoflife.org/ott](http://files.opentreeoflife.org/ott/) or [https://tree.opentreeoflife.org/about/taxonomy-version](https://tree.opentreeoflife.org/about/taxonomy-version).

### Use

These files are processed by the scripts in ServerScripts/TreeBuild/OpenTreeRefine to create an OpenTree without subspecies, with polytomies resolved, and with all nodes named.

Note that the `ott/taxonomy.tsv` file is also used by other scripts e.g. for popularity, TaxonMapping, etc.

NB: for the rationale of using `...simplified_ottnames` see
 [https://github.com/OpenTreeOfLife/treemachine/issues/147#issuecomment-209105659](https://github.com/OpenTreeOfLife/treemachine/issues/147#issuecomment-209105659) and also [here](https://groups.google.com/forum/#!topic/opentreeoflife/EzqctKrJySk)
