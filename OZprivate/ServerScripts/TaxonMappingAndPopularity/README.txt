Database requirements

1) From OTT id retrieve something like ncbi=9606&gbif=2436436&irmng=10857762
2) From ncbi=9606&gbif=2436436&irmng=10857762 retrieve an OTT id, given a fallback order (e.g. if ncbi=9606 does not match an OTTid, fall back to gbif=2436436, then to irmng, etc.
3) From an OTTid for an internal node, select all descendant leaf nodes (optionally, return a random subset, possibly weighted by popularity)

I suggest adopting a convention that "negative OTT_IDs" are used to index nodes that exist in our OneZoom tree but do not have a place in the taxonomy.tsv file. This allows us to denote any node in the tree. In the tree itself, these numbers can be represented by a number preceeded by an underscore.

This can be done in a flat-field database using the "right-left" model nested sets to represent hierarchical structure in a database.




Given that our sole issue here is to return a set of leaf nodes, we want to keep one table of leaf nodes, arranged in the order of appearance in the newick file, e.g.

"nested_set_leaves"

(((Pan_troglodytes_ott417950:1.596326,Pan_paniscus_ott158484:1.596326)Pan_ott417957:4.403674,Homo_sapiens_ott770315:6.0)_1234:2.0,(Gorilla_beringei_ott351685:1.776755,Gorilla_gorilla_ott417965:1.776755)Gorilla_ott417969:6.223245)Homininae_ott312031:6.0 becomes



+---------+----------------+
| leaf_id | OTT_ID |  ncbi | worms | irmng | gbif | popularity | 
+---------+----------------+
|       0 | 417950 | 
|       1 | 158484 | 
|       2 | 770315 | 
|       3 | 351685 | 
|       4 | 417965 | 
+---------+----------------+

With a reference table for nodes, say "nested_set_nodes" (see https://en.wikipedia.org/wiki/Nested_set_model)

+--------+---------------------+-----+-----+
| OTT_ID | name                | lft | rgt | ncbi | worms | gbif |
+--------+---------------------+-----+-----+
| 417969 | Gorilla             |   0 |   2 |
|  -1234 |                     |   3 |   5 | NULL |  NULL | NULL|
| 417957 | Pan                 |   4 |   5 |
| 312031 | AfricanApes         |   1 |   5 |
+--------+---------------------+-----+-----+

Then we can get all leaves of a given node by


Python scripts for creating these tables from a newick file and a taxonomy.tsv file
