***
# NB: the information in this readme may be obsolete.
***


This folder contains all the data used to construct the tree of life. Each tree requires a tree file and a metadata file.

The tree file
-----------------

The tree file (e.g. Life_selected_tree.js) is in a bespoke format which consists of a `$tree = new Tree(basefile)` command, where the 'basefile' is a [newick format](https://en.wikipedia.org/wiki/Newick_format) file consisting of taxa any of which may be followed by an @ sign. This denotes groups which are to be @included from other files. Inclusion is carried out by `$tree.substitute()` commands in the tree file, indicating the newick file to include. There are a large number of these newick files which are @included to form the full tree. The hand-crafted ones are in `BespokeTree/include_files/`, others are produced automatically by extracting parts of the Open Tree of Life, and are saved in `OpenTreeParts/OpenTree_XXX`. This automatic extraction is done by the script `getOpenTreesFromOneZoom.py` in `ServerScripts/TreeBuild`.

The tree file itself, as well as the metadata file (see below) are parsed using `tree_and_meta_parser.pl`.

The metadata file
----------------------------

The metadata file must instantiatied a metadata object

    meta = new Metadata()

This object must then be filled from csv files on-the-fly, then used to populate a tree (see below), but that takes time. 
For speed it is better to do this just once and save the resulting `tree` object (fully populated with metadata & newick string) in a single js file.

Populating the metadata
-----------------------
A whole set of metadata in the same format can be added to the object using

`meta.add(table, schema)`
where `table` is simply a CSV file, which is parsed by PapaParse (http://papaparse.com)

Note that the onezoom code seen by end users need not read CSV files , but can rely on pre-parsed data, so it should not matter that older browsers may not support the PapaParse library.

The CSV file should contain columns

 1. Name (unquoted, with underscores, without ott number, optional but strongly recommended) 
 2. OTT_number (optional)
 3. Other columns, described
    in the 'schema' parameter

The schema parameter is an array of objects, where each object specifies information about each additional column, 
and must at a minimum contain a 'name' property, e.g. for a table like this

    +----------------+---------+-------+----+
    | Homo_sapiens   | 770315  | Human | LC |
    +----------------+---------+-------+----+

which has 2 additional columns, for common name and IUCN, we could have a schema as follows

     [{name:"common", desc:{en:"Common Name", fr:"Nom vernaculaire"}},
      {name:"IUCN", posssible_values:{LC:"Least Concern", EN: "Endangered", ...}}] 

which would be saved as schema_index=1 (schema_index=0 is reserved for nodes with an OTT id but no other data, not even a name) 

When the function is called, each row of the csv file is mapped to an array, and appended to a single 'metadata' array, e.g. for

    +-----------------+---------+--------------------------+----+
    | Pieris_japonica , 238775  , Japanese andromeda bush  , LC |
    +-----------------+---------+--------------------------+----+
    | Homo_sapiens    , 770315  , Modern human             , LC | 
    +-----------------+---------+--------------------------+----+
    | Pieris_japonica , 5028502 , Japanese white butterfly , NA |
    +-----------------+---------+--------------------------+----+

we construct:

    metadata = [
        [schema_index, 238775, Pieris_japonica, Japanese andromeda bush, LC]
        [schema_index, 770315, Homo_sapiens, Modern human, LC]
        [schema_index, 5028502, Pieris_japonica, Japanese white butterfly, NA]
    ]

At the same time, references to that array are stored in dictionaries to allow fast lookups:

    ott_indexed_meta = {  #otts are unique, so each entry simply points to the metadata - this is a dict, so can be in any order
        5028502: 3
        238775: 1, 
        770315: 2
    }
and

    name_indexed_meta = {
        Pieris_japonica:[1, 3]
        Homo_sapiens:[2]
    }

This allows us to match on OTT number, on name, and on both. 

Note that there are two 'special' hardcoded column names: 'PhyloPicID' and 'EoLdataobjectID', which are assumed to provide filenames of .jpg files for leaves or nodes. The first column name is associated with the extra column PhyloPicID_credit. The second is associated with two extra columns: EoLdataobjectID_credit and EoLdataobjectID_rating. If these extra columns exist but are empty, then the metadata parser fills them with information extracted from the appropriate jpg files.

Overwriting metadata
--------------------

It is also possible to overwrite metadata using the overwrite() function. For example to change the Pieris_japonica plant IUCN to NA,
with a csv table in a file 'newtable.csv' as follows

    Pieris_japonica, 238775,,NA 

You can call

    Metadata.overwrite('newtable.csv')

Missing values in newtable.csv will not be overwritten, eg. in this example, the common name will be left as "Japanese andromeda bush".
The overwrite function also takes an optional 'schema' argument, in case you want to change the schema at the same time.

Parsing the metadata
--------------------

The final stage is to link the metadata to a tree, by calling `$tree.fill_with($meta)`, which populates the '$tree' object with
a number of reference arrays, the most important of which are

    leaf_metadata = new Array(n_leaves)
    node_metadata = new Array(n_nodes)

These contain the metadata in the order of appearance of the taxa in the tree. Taxa in $tree.newick_string contain metadata information which can help map them to taxa in the metadata array. In particular, a taxon may look like 'Yan''s_Node_name_ott1234#10', where the Open Tree Taxonomy number follows the _ott string, and the number of species this node stands in for (richness, or number of descendant children of a truncated part of the tree) follows the # sign. 

Schemas are also stored in the $tree object, and enhanced with the name & ottID fields at the start, and (if a leaf) the n_spp / richness value at the end (by default, and most commonly, this takes the value 1; hence usually it need not be specified). E.g. for a schema such as `[{name:"common"}, {name:"IUCN"}]`, we create an enhanced schema

    [{name:"ott"},{name:"name"},{name:"common"}, {name:"IUCN"},{name:"n_spp"}]

The other arrays created in the tree object concern the storage of the enhanced schemas. They are

 1. leaf_metadesc: storing the enhanced schemas for leaves e.g. for two example schemas
	 `[[{name:"ott"},{name:"name"},{name:"common", desc:{en:"Common Name", fr:"Nom vernaculaire"}},{name:"n_spp"}],
	   [{name:"ott"},{name:"name"},{name:"common"}, {name:"IUCN"},{name:"n_spp"}]]`
 2. node_metadesc: storing the enhanced schemas for leaves (these are not enhanced with an n_spp number)
 
The `fill_with()` function goes through the string in $tree.newick_string removing ott numbers and "fake" ott node numbers (of the format "1234_"), and sticks these numbers into the metadata array, where possible (fake numbers are given a negative OTT number, and a new metadata entry added to the 'metadata' table).

Matching the tree entries against the metadata entries involves taking each name in the tree in turn, and looking for a match in the name_indexed_meta and ott_indexed_meta dictionaries. The best match, with a score =3, would be if a metadata entry with both name+ott_number matches this taxon – this is done by looking in the name_indexed_meta dictionary, and look through the OTT numbers in any matching entry (if neither have an OTT number, the match score should still be high, e.g. 2.5). If no joint match can be found, we look for ott number only (in the ott_indexed_meta dictionary), since these are assumed not to suffer from synonym problems. A match here scores 2. If there is still no match, we look at the name only, which deals with the rare occurences where the OTT number has changed). A match here scores 1. Note that matching on names opens up the process to synonymy problems.

The process may result in multiple taxa finding a "best match" to the same metadata row. To avoid duplicating metadata in different species, we allocate the taxon index to each row of a temporary new array. E.g. if Pieris_japonica_ott238775 is the 99th leaf in the tree (matching the 0th row of the metadata with score = 3), we create

`temporary_array[0] = {-99:3, ...}` (NB: to distinguish leaves from nodes, we use negative indices for leaf taxa)

For 'fake' ott numbers, we only insert a single entry in the temporary_array.

Once the entire tree is parsed, we then go through each item in the temporary_array (which should be in the same order as the metadata array), and find the index of the item with the best score (say leafindex1), placing it in tree.leaf_array[-leafindex1] or tree.node_array[nodeindex2]. Note that we must check before deciding on the best score whether leaf[-leafindex1] has already been filled, and if so, discard it. This avoids duplication of metadata items associated with different taxa.

Outputting the tree and metadata
--------------------

When $tree->print() is called, both tree and (if used) metadata is output to a file, along with gzip compressed versions. there are ****
 
 
Other trees
--------------------


