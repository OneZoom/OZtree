This contains the hand-crafted files used to construct Yan's tree, in include_noAutoOTT. All other files & folders are .gitignored - this includes the tree files with OTT numbers automatically added (these should be created automatically added by running)

`ServerScripts/TreeBuild/OTTMapping/Add_OTT_numbers_to_trees.py`

e.g. as

```
cd /data/YanTree/BespokeTree/include_noAutoOTT
../../../../ServerScripts/TreeBuild/OTTMapping/Add_OTT_numbers_to_trees.py --savein ../include_OTT2.9 *.phy *.PHY
```

which should output new files to a new folder, (in this case ../include_OTT2.9), and create a symlink to that folder in 'include_files'.

An output file to check mappings is created in ../include_OTT2.9/info_about_matches.txt
