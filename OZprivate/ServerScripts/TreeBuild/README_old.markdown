#NB - these instructions are obsolete. See https://github.com/jrosindell/OneZoomComplete/issues/254 for more recent ones

# TreeBuild scripts

These scripts will only work if you download a [newick format file](http://files.opentreeoflife.org/trees/) of the [Open Tree of Life](http://tree.opentreeoflife.org/) (OToL), and an associated [taxonomy file](http://files.opentreeoflife.org/ott/). These should be placed in OZprivate/data/OpenTree, i.e. in `../../data/OpenTree/draftversion4.tre` and `../../data/OpenTree/ott/taxonomy.tsv`.


## Quickstart

To get everything working, place draftversion4.tre in the `../../data/OpenTree/` directory, and place taxonomy.tsv in a subfolder called `ott`. Then follow the instructions immediately below to create `OpenTree/draftversion4_nosubsp_bifurcating.tre`, then cd into the OneZoom directory and run `ServerScripts/TreeBuild/generate_crowdfunding_files.py -v -db sqlite://../databases/storage.sqlite` (or `ServerScripts/TreeBuild/generate_crowdfunding_files.py -v -db mysql://OZ:pass@127.0.0.1/oz` if using mysql. The tree should be viewable at `OneZoomTouch/AT_life.htm`. To add more species, edit include_taxa.txt.

## Tree creation

The top-level tree is constructed from files in OZ_yan. These files provide a backbone framework for the tree of all Eukaryotes & Archaea (eubacteria are excluded for the time being).

The files used here are a tree file (here taken to be `data/YanTree/Life_selected_tree.js`) and a metadata file (say `data/YanTree/Life_selected_meta.js`). 

The tree file is in a bespoke format which consists of a `$tree = new Tree(basefile)` command, where the 'basefile' is a [newick format](https://en.wikipedia.org/wiki/Newick_format) file consisting of taxa any of which may be followed by an @ sign. This denotes groups which are to be @included from other files. Inclusion is carried out by `$tree.substitute()` commands in the tree file, indicating the newick file to include. There are a large number of these newick files which are @included to form the full tree. The hand-crafted ones are in `BespokeTree/include_files/`, others are produced automatically by extracting parts of the Open Tree of Life, and are saved in `OpenTreeParts/OpenTree_XXX`. This automatic extraction can be done using the following commands.

### Setup
These scripts take the Open Tree of Life (in newick format from http://files.opentreeoflife.org/trees/) and refine it for use in OneZoom. The following steps only need to be carried out when a new synthetic open tree is released (you should also revise the version specified in the 'about' box in `/static/OZSite/Sources.md` which is translated into html in `OZTree/Options.js`. 

The following scripts all need to all be run from within `applications/OneZoom/OZprivate`.

1. Remove subspecies (`subspecies_delete.pl`, requires [ott/taxonomy.tsv](http://files.opentreeoflife.org/ott/), but is relatively fast: see https://yanwong.me/?page_id=1226). Call this, e.g. as 

   ```
   OT_VERSION=6
   ServerScripts/TreeBuild/OpenTreeRefine/subspecies_delete.pl data/OpenTree/draftversion${OT_VERSION}.tre data/OpenTree/ott/taxonomy.tsv data/OpenTree/draftversion${OT_VERSION}_no_subsp.tre
   ```
   
2. resolve polytomies and remove blank leaves (`ResolvePolytomies.py`, this reads the entire tree using the [DendroPy library](https://pythonhosted.org/DendroPy/), so takes an hour or so to run). Branches created by random polytomy creation are given a 'length' of 0, which should distinguish them from branches with no length information (these have a 'null' branch length). If `--blank_node_labelling` is non-zero it will  also add temporary numbers to all unnamed nodes on the tree, in the format "_1234" (by OneZoom convention, these are ignored or sometimes (in non-filled out trees) interpreted as 'negative' OTT numbers. Numbers 1-19999 are not used, and reserved in case they are needed to be used in any of the user-generated trees (the trees that might require them are the unexpanded OneZoom trees in the crowdfunding site, wich are passerines (5507 unlabelled nodes) & porifera ( unlabelled nodes)). Call this, e.g. as 

   ```
   OT_VERSION=6
   ServerScripts/TreeBuild/OpenTreeRefine/ResolvePolytomies.py -v data/OpenTree/draftversion${OT_VERSION}_no_subsp.tre data/OpenTree/draftversion${OT_VERSION}_nosubsp_bifurcating.tre
   ```

   This should produce a refined OpenTree (e.g. `draftversion4_nosubsp_bifurcating.tre`) from which subtrees can be extracted for use in constructing the top-level tree.

3. review taxonomy changes
    Changes to the taxonomy file may result in changes to the OTT ids for taxa that existed in the original OneZoom tetrapods tree, or in the taxa added by hand (i.e. not taken from Open Tree of Life subtrees), It may therefore be necessary to run a script to update the IDs, such as `Add_OTT_numbers_to_trees.py`, e.g. 

        ```
        cd data/YanTree/BespokeTree/include_noAutoOTT
        ../../../../ServerScripts/TreeBuild/OTTMapping/Add_OTT_numbers_to_trees.py --savein ../include_OTT2.9_d12 *.phy *.PHY
        ```

WHEN THIS HAPPENS, WE RISK LOSING TRACK OF SOME TAXA WHICH WERE PREVIOUSLY IN THE TREE, therefore it may be necessary to check the metadata files (in `data/Metadata`) and check that we have not lost any sponsored nodes. Once the data has been loaded into the DB, we can do this by issuing the following SQL command:

	SELECT ott FROM reservations LEFT JOIN ordered_leaves ON reservations.OTT_ID = ordered_leaves.ott WHERE ordered_leaves.ott IS NULL AND reservations.user_sponsor_name IS NOT NULL AND (reservations.deactivated IS NULL OR reservations.deactivated = '') AND TIMESTAMPDIFF(DAYS, reservations.live_time, NOW()) < reservations.sponsorship_duration_days;
    
    To create a full list of all allowable OTT IDs, the full OToL subtrees should be placed somewhere, say `user/OpenTree_all/`, e.g.
    ```
    OT_VERSION=6
    cd data/YanTree/
    ../../ServerScripts/TreeBuild/getOpenTreesFromOneZoom.py -v ../OpenTree/draftversion${OT_VERSION}_nosubsp_bifurcating.tre OpenTreeParts/OpenTree_all/ -- -Inf BespokeTree/include_files/*.PHY > AdditionalFiles/substitute_commands_to_include_in_full_tree_js_file.txt
    ```

    (This gives verbose output which can be turned of by omitting the -v flag. Also note the double-dash to allow -inf to be treated as a positional argument, see `getOpenTreesFromOneZoom.py --help`).
    
    A full newick tree can be created from these files by 
    
    ```
    cat AdditionalFiles/Life_full_tree_start.js AdditionalFiles/substitute_commands_to_include_in_full_tree_js_file.txt > Life_full_tree.js
    
    ../../ServerScripts/TreeBuild/tree_and_meta_parser.pl -v Life_full_tree.js > ../../../static/FinalOutputs/Life_full_tree.phy
    ```
    
    As a check, you can look to see if there are any duplicated OTT values (there shouldn't be)
    
    ```
	 grep -o '_ott[0-9]*' ../static/FinalOutputs/Life_full_tree.phy | sort | uniq -d
	 #or list number of repeats
	 grep -o '_ott[0-9]*' ../static/FinalOutputs/Life_full_tree.phy | sort | uniq -c | grep -v '1 '
	 
    ```
    
And you can output a list of all taxa in the tree

	```
	ServerScripts/Utilities/print_taxa.py ../static/FinalOutputs/Life_full_tree.phy > ../static/FinalOutputs/all_taxa.txt
	```

4. Update the database tables. There are 3 tables to update, ordered_leaves, ordered_nodes, and leaves_in_unsponsored_tree.

we can create files to import to the databases by

```
OT_VERSION=6

ServerScripts/TreeBuild/generate_crowdfunding_files.py -v -m '' \
	-o ../static/FinalOutputs/Life_unsponsored

ServerScripts/Utilities/print_leaf_OTTs.py \
 	--ott ../static/FinalOutputs/Life_unsponsored.nwk \
 	> data/DBinputs/leaves_in_unsponsored_tree.csv
 	
ServerScripts/TaxonMappingAndPopularity/CSV_base_table_creator.py \
	../static/FinalOutputs/Life_full_tree.phy \
	data/OpenTree/ott/taxonomy.tsv \
	data/EOL/identifiers.csv \
	data/Wiki/wd_JSON/*.bz2 \
	data/Wiki/wp_SQL/*.gz \
	data/Wiki/wp_pagecounts/pagecount*.bz2 \
	--OpenTreeFile data/OpenTree/draftversion${OT_VERSION}.tre \
	-o data/DBinputs/ordered -v \
	--exclude Archosauria_ott335588 Dinosauria_ott90215 \
	> data/DBinputs/ordered_output.log
```


### OneZoom tree creation

To create OneZoom trees from the tree.js, meta.js, and the refined OpenTree newick file, two processes must be carried out. Firstly, we must extract subtrees from the huge newick file of the entire synthetic tree, and (optionally) whittle each one down in size to contain just a selected list of taxa. Secondly we must interpret the tree parsing commands to create a tree and associated metadata, either in the new or the old OneZoom format. Both steps can be done using the function below (they can also be called as individual shell scripts). 

A simple high-level script called `generate_crowdfunding_files.py`  automatically calls the python functions with the right parameters to produce the basic tree used for the crowdfunding website (i.e. with a few filled out taxa as listed in the file `OZprivate/data/YanTree/added_taxa.txt`). Assuming that your base trees are in `OZprivate/data/YanTree/Life_selected_tree.js` and `OZprivate/data/YanTree/Life_selected_meta.js`, you can simply run this from within the OZprivate directory. Assuming that the database has been primed as in 4) above, by importing `leaves_in_unsponsored_tree.csv`, you should be able to give the path to the db and the script will automatically find the sponsored leaves and add them, by

```
ServerScripts/TreeBuild/generate_crowdfunding_files.py \
             -v -db sqlite://../databases/storage.sqlite
```
or for a mySQL database
```
ServerScripts/TreeBuild/generate_crowdfunding_files.py \
             -v -db mysql://user:pass@server/dbname
```




The `-v` or `--verbose` flag to this script outputs more information on what it is doing. For a more silent run, omit the `-v`. For even more detail, try `-vv`. This script calls the functions listed below. Unless you are creating a bespoke tree, you can ignore the shell command examples which follow: they are automatically carried out for you by `generate_crowdfunding_files.py`. 

#### OpenTree extraction
This function takes the refined OpenTree and extracts subtrees that can be incorporated into the top-level tree. If it cannot find the OpenTree, it will download a copy, together with the OpenTree taxonomy.

Extraction is done by `getOpenTreesFromOneZoom()` in the file `getOpenTreesFromOneZoom.py`. This process relies upon an extraction script written in perl (`subtree_extract.pl`, see https://yanwong.me/?page_id=1090). The module `prune_trees_from_list.py` also provides the facility to whittle down the @included trees according to an whitelist of species to keep. Both `subtree_extract.pl` and `prune_trees_from_list.py` are expected to reside in the same directory as `getOpenTreesFromOneZoom.py`.

The subtrees that are extracted are all specified by the contents of files in the user/ subdirectory (by convention, files with @included taxa from the OpenTree have been given an uppercase .PHY extension). These \*.PHY files contain newick-formatted bifurcating trees in which some taxa have been specified as XXX_ottYYYY@. The YYYY specifies an OTT node ID, and the script extracts the subtree descending from that node into the file YYYY.phy, as well as outputting some javascript commands which can be incorporated into the base_tree.js file to ensure these YYYY.phy files are @included in the final tree. For these javascript outputs to be used in a tree file, the script should be run from the same directory as the OneZoom html file (usually OZ_yan)

To create a managable-sized tree, the extraction process can do one of two things: it can extract OToL subtrees down to a certain depth. Alternatively, it can only include taxa present in an include list (here taken to be the file `include_taxa.txt`). The first option is used to create publication-quality trees for the Ancestor's Tale. The second can create trees that include a set of selected nodes (for use on the crowdfunding website, where only leaves that have been sponsored are included). To extract OToL subtrees to the depth specified in the @include files (or using the full OpenTree if no depth specified), the following shell command can be used, which directly calls the `getOpenTreesFromOneZoom()` function:

```
OT_VERSION=5
cd data/YanTree/
../../ServerScripts/TreeBuild/getOpenTreesFromOneZoom.py ../OpenTree/draftversion${OT_VERSION}_nosubsp_bifurcating.tre OpenTreeParts/OpenTree_print/ Inf BespokeTree/include_files/*.PHY > commands.js
```

Alternatively, to weed the trees down to included only a small subset of taxa, try something like
    
```
cd data/YanTree/
../../ServerScripts/TreeBuild/getOpenTreesFromOneZoom.py ../OpenTree/draftversion${OT_VERSION}_nosubsp_bifurcating.tre OpenTreeParts/OpenTree_selected/ added_taxa.txt BespokeTree/include_files/*.PHY > commands.js
```

To make the tree even smaller, a few subtrees that have not been extracted from the OpenTree can also be whittled down using the include_taxa.txt list. In particular, this includes the passerines and the sponges. The crowdfunding tree (OZ_yan/user/ATlife_selected_tree.js) thus differs from the print version by @including user/OneZoom_selected/PasserinesOneZoom_selected.phy and user/OneZoom_selected/PoriferaOneZoom_selected.phy
This is automatically done by `generate_crowdfunding_files.py`, but if you wish to carry out the process separately, you can execute the following shell commands:
    
```
cd data/YanTree/
../../ServerScripts/TreeBuild/prune_trees_from_list.py user/include_files/PasserinesOneZoom.phy ../include_taxa.txt > OpenTreeParts/OneZoom_selected/PasserinesOneZoom_selected.phy
../../ServerScripts/TreeBuild/prune_trees_from_list.py user/include_files/PoriferaOneZoom.phy ../include_taxa.txt > OpenTreeParts/OneZoom_selected/PoriferaOneZoom_selected.phy
```
    
    
#### Parsing and conversion

The large set of .phy files created by the extraction script can be used directly by any trees built upon the javascript code in OZ_yan. But parsing these files in javascript takes time, so there is an option to take a *tree.js* and *meta.js* file and pre-parse the include files into a single large tree with associated metadata. In javascript this can be done by loading a file such as `process_life.html`, which prints the fully parsed tree and metadata to a web page. The text produced by that page can be copied and pasted into a parsed_tree.js file (the associated parsed_meta.js file can be left empty).

This method of copying and pasting text from a web page can be inconvenient for automation. Moreover, the parsed javascript is in the format used by the OneZoom codebase present in OZ_yan. This is a new and different format from that required by the original OneZoom touch. The script `tree_and_meta_parser.pl` addresses both these problems. It uses the perl language to parse the javascript commands in a pair of tree.js and meta.js files and outputs two equivalent files in the old onezoom format, suitable for use in the crowdfunding tree. It is a horrible unportable hack, which requires comments in the tree.js file to be compatible with both perl and javascript (line comments must start with `//;#`). 

The full tree of life, as created by Yan from a mix of referenced phylogenies and OToL subtrees is present in two forms, corresponding to the two getOpenTreesFromOneZoom.py calls above. They are

1. An tree which loads up OpenTree subtrees from the *OpenTreeParts/OpenTree_print* subdirectory, which have subtrees extracted to a reasonable depth, so that all nodes leading from humans to the root of the tree appear fully filled out. This tree contains about 300,000 taxa, so is unsuitable for online use. It is loaded from the file *xxxxxATlife_large.html*, which obtains the tree and metadata from the files `data/YanTree/Life_large_tree.js` + `data/YanTree/ATlife_large_meta.js`.

2. An almost identical tree whose included subtrees are present as unexpanded leaves, apart from the leaves listed in the *YanTree/added_taxa.txt* file, and (if present) species which have been found by querying a database of sponsored species. This tree has a few tens of thousands of taxa, which makes it suitable for online use on the crowdfunding website. It is loaded from the file *views/default/life.html*, which obtains the tree from Life_selected_tree.js

It is the second tree which is commonly referred to here. A version for use on the crowdfunding website can be created by

```
DBSTRING=""
cd data/YanTree/
../../ServerScripts/TreeBuild/tree_and_meta_parser.pl -v -info_for_pics=../../../static/FinalOutputs/pics/ Life_selected_tree.js Life_selected_meta.js ${DBSTRING} ../../../static/FinalOutputs/OZlife_oldformat_selected
```

This should create `../../../static/FinalOutputs/OZlife_oldformat_selected.js`. To load in sponsored trees from the db, you'll want to set `$DBSTRING` to 'sqlite://../databases/sqlite.database' or 'mysql://user:pw@ip.addr/dbname'

Note that if called with just a single argument, `tree_and_meta_parser.pl` simply prints out the fully parsed newick tree. This can be used e.g. as below to create a comprehensive newick tree (too large to be viewed in OneZoom, but useful for reference).

##### Parsing into a basic newick tree
To get a tree with millions of species, simple @include the OpenTree files in OpenTree_all (as created in OpenTree parsing scripts #3). The simplest way to do this is to use user/Life_selected_tree.js as a base, but change all the references to `OpenTree_selected` to `OpenTree_all`. To @include all the passerines and sponges, we also need to replace `OneZoom_selected/PoriferaOneZoom_selected.phy` with `include_files/PoriferaOneZoom.phy` and `OneZoom_selected/PasserinesOneZoom_selected.phy` with `include_files/PasserinesOneZoom.phy`. The following hack should work:



A reasonably large tree
-------------------

To get a tree that looks reasonably large, e.g. for print or display purposes, try the following 400,000 node tree.

```
OT_VERSION=5
cd data/YanTree/
../../ServerScripts/TreeBuild/getOpenTreesFromOneZoom.py \
     -v ../OpenTree/draftversion${OT_VERSION}_nosubsp_bifurcating.tre \
     OpenTreeParts/OpenTree_large/ Inf BespokeTree/include_files/*.PHY \
     > AdditionalFiles/substitute_commands_to_include_in_large_tree_js_file.txt

cat AdditionalFiles/Life_large_tree_start.js AdditionalFiles/substitute_commands_to_include_in_large_tree_js_file.txt > Life_large_tree.js

../../ServerScripts/TreeBuild/tree_and_meta_parser.pl -v \
    -info_for_pics=../../../static/FinalOutputs/pics/ \
    Life_large_tree.js ATlife_large_meta.js '' \
    ../../../static/FinalOutputs/ATlife_oldformat_large

```
Ancestor's Tale tree
-------------------

To get a tree with numbers etc. as in the Ancestor's Tale chapters, after you have run the generating script with the default settings (which prunes the tree), issue the following command:


```
ServerScripts/TreeBuild/generate_crowdfunding_files.py -v \
    -m ATlife_selected_meta.js \
    -p ATlife_oldformat_selected \
    --noPrune -db mysql://onezoom:*****@db.sundivenetworks.net/onezoom_prod

```

You might then want to create a static version of the AT page so that it can run even if web2py is not running (e.g. from a different domain). Something like this

```
PORT=8000
curl -o ../static/trees/AT.html http://www.onezoom.org/AT.html
gzip -7kf ../static/trees/AT.html