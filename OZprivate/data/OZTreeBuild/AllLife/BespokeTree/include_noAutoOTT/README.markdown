Details of tree construction

This visualisation attempts to display all known species of life on earth. The only phylogenetic tree that remotely attempts to do this is the Open Tree of Life (OToL: https://tree.opentreeoflife.org). However, the current 'synthetic tree' available from the OToL project tree has many polytomies and is not up-to-date in some areas. It also lacks date estimates.

For this reason, some specific parts of the tree, mainly on the lineage leading to humans, have been replaced to make the current displayed tree.

In particular, the tetrapods section of the tree has been replaced with the default OneZoom tetrapod tree, which is based on Bininda-Emonds (2007: Mammals), ****. The dates on this tree have been recalibrated using PATHd8 (http://www2.math.su.se/PATHd8/) so that they fit with the estimated 'concestor dates' as described in the Ancestor’s Tale, 2nd ed.

Within the primates, the tree comes from Springer (2012), with dates recalibrated 

The include_files directory should be a symlink to a dir that contain all the bespoke .phy and .PHY files to include.


Removing dups
--------------------

As a one-off, the following steps can be used to remove duplicate taxa due to code in the original OneZoom tree that created multiple identically named nodes

1. using the original OZ tetrapod tree & metadata, run 

`./replace_dups.py oldtree.phy ../include_noAutoOTT/*OneZoom*.phy > newmeta`

this should create ../include_noAutoOTT/PasserinesOneZoom.phy_deduped etc, which will have duplicate nodes relabelled as e.g. 
Thraupidae_1_, Thraupidae_2_ etc and a metadata list (newmeta) that gives these numbers too. 
The script should flag up if there are any problems relabelling the OneZoom trees in the same way as the original oldtree.phy.

2. To find genus names etc, look through the whole tetrapod tree 

`../../../server_scripts/utilities/add_genus_names.py ../include_noAutoOTT/TetrapodsOneZoom.phy_deduped 2> err.out > TetrapodsOneZoom_new_genera.phy`

which should produce data in err.out that will allow you to see what swaps have been done in the file, e.g.

grep '^Overwriting' err.out | less

and these can be copied into a perl hash to be placed in substitute_dup_names.pl

grep '^Overwriting' err.out | perl -pe 's/Overwriting (.+?) with (.+?) .*/$1=>$2,/' | pbcopy

and paste the results into the hash at the top of substitute_dup_names.pl

3) Now substitute these genus names etc into the OZ_yan files

perl -i.orig substitute_dup_names.pl ../include_noAutoOTT/*.phy_deduped newmeta ATlife_selected_meta_NOautoOTT.js

4) Then go through the *OneZoom*_new.phy files to add in genera for unlabelled nodes


`rm err2.out; for f in ../include_noAutoOTT/*.phy_deduped; do ../../../server_scripts/utilities/add_genus_names.py $f > $f.OZnew 2>> err2.out; done;`

This should produce lots of "Adding genus" warning, but NO "Overwriting ..." warnings. So check that

`grep '^Overwriting' err2.out`

is blank.

5) Almost there: move these new files, suffixed with ".phy_deduped.OZnew" to replace the original .phy version, adding back in the original comment lines by hand. Probably a good idea to move the old ones to .phy_old suffixes

Afterwards, we can check that there are no dups or nodes labelled XXX_\d+_ by

`../../../server_scripts/utilities/find_duplicated_nodes.py ../include_noAutoOTT/*OneZoom*.phy`
`grep -o '............_[0-9]*_' ../include_noAutoOTT/*OneZoom*.phy`

5a) For some files (e.g. passerines), we might want to add 'fake' numbers to all nodes. This can be done by 

```
../../../../ServerScripts/TreeBuild/OpenTreeRefine/ResolvePolytomies.py PasserinesOneZoom.phy PasserinesOneZoom2.phy --start_num=1 --end_num=10000
mv PasserinesOneZoom2.phy PasserinesOneZoom.phy 

../../../../ServerScripts/TreeBuild/OpenTreeRefine/ResolvePolytomies.py PoriferaOneZoom.phy PoriferaOneZoom2.phy --start_num=10001 --end_num=20000
mv PoriferaOneZoom.phy PoriferaOneZoom2.phy 

```


6) Now revise the metadata file (NB, we could just concentrate on updating the leaf_nodes)

perl -i.orig substitute_dup_names.pl ../../ATlife_selected_meta_NOautoOTT.js

also make sure to paste all entries from newmeta into the right places
