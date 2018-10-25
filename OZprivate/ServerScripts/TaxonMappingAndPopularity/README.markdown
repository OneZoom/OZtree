Python code contained in this directory allows mapping from OpenTree identifiers to EoL, IUCN, and Wikidata identifiers.

The main script is `CSV_base_table_creator.py`, which reads in a set of files, creates mappings, (optionally) analyses popularity, and outputs the mappings to a set of CSV files, which can be read in to an SQL database.

At a minimum, the script requires

1. a newick format phylogenetic tree containing names and Open Tree Taxonomy identifiers, or OTTs (taxon names should be of the form `Homo_sapiens_ott770315` where `770315` is the OTT).
2. an Open Tree Taxonomy file, `taxonomy.tsv` creating mappings from these identifiers to IDs in other databases, such as NCBI or GBIF. 
3. a file of Encyclopedia of Life identifiers (mapping e.g. GBIF ids to EoL page ids)
4. a bzipped wikidata JSON dump

Additionally, if you wish to calculate popularity measures, you need 

* an SQL dump of wikipedia in a language of your choice, to get current page sizes of relevant wikipedia pages
* a set of pagecount files for different months, to get page visit statistics for relevant wikipedia pages

__File downloads__

Numbers 1. and 2. can be downloaded from the Open Tree of Life, and instructions for getting them are [here](../../data/OpenTree/README.markdown) (note that in OneZoom we don't use the plain OpenTree newick file, but instead a [bespoke Newick file](../TreeBuild/README.markdown)).

Number 3. can be downloaded from the [EoL OpenData site](https://opendata.eol.org/dataset/identifiers-csv-gz)

Number 4. can be downloaded as `latest-all.json.bz2` from http://dumps.wikimedia.org/wikidatawiki/entities/

__Other files__

The `CSV_base_table_creator.py` script also uses routines defined in `OTT_popularity_mapping.py` and `dendropy_extras.py`. It requires version 4+ of the DendroPy python library to be installed.

__Overview__

The script takes the following steps, as defined in the main() routine:

1. `get_tree_and_OTT_list()` - read the newick tree into a DendroPy tree structure, and create a large python dictionary `OTT_ptrs`, keyed by OTT, pointing to each OTT-labelled taxon in the tree. The taxon items pointed to by this dictionary are then augmented by additional identifiers in the steps below.

2. `create_from_taxonomy()` - use the taxonomy file to create a new set of dictionaries, one for each of `nbci`, `index fungorum`, `worms`, `irmng`, and `gbif`. Each dictionary is keyed by the identifier from the respective source, and points to the appropriately matched taxon item via the `OTT_ptrs` dictionary.

3. `add_eol_IDs_from_EOL_table_dump()` - use the EoL identifiers file to add EoL page ids to the items in the source dictionaries as saved in step 2. 

	We then have to call `identify_best_EoLdata()` to resolve conflicts, if e.g. a taxon has an EoL id via both an ncbi identifier and a irmng identifier, and the EoL ids differ.

4. `add_wikidata_info()` - parse through the wikidata dump, identifying wikidata items that are biological taxa, and locating matches against the taxon source IDs saved in step 2. The appropriate taxon item is augmented with a wikidata "Q" id and information about whether there are wikipedia pages ("sitelinks") in different languages for this taxon. We also temporarily create a dictionary pointing to the taxon items, keyed by the wikipedia page name in a specific language (by default, english) for later matching in the script. Note that this step is made more complex by the fact that some species on wikidata (e.g. dog) have two pages, one for the scientific concept ("Canis lupus familiaris"), and one for the popular concept ("Dog"), with the sitelinks often associated with the popular concept rather than the scientific item. There is some complex hacking to make sure that we keep track of this with only a single pass through the (large) wikidata dump file.

	We then have the same problem as for EoL ids, where there may be multiple wikidata Q ids for a taxon, linked through different identifiers. We call the routine `identify_best_wikidata()` to pick the most appropriate.
	
	There is also an additional bonus, in that the wikidata items may provide another route to getting EoL ids, as a supplement to the EoL identifiers file. We include this extra information via the `supplement_from_wikidata()` routine.

5. `populate_iucn()` we also attempt to use information in both the EoL identifiers file and the wikidata file to locate an IUCN id for each taxon, so we can link to conservation status.

6. [If we want to calculate popularity] 
	* `add_pagesize_for_titles()` - use a wikipedia SQL dump to extract page sizes for each of the wikipedia titles in the dictionary created in step 4., and save this size into the taxon item.
	* `add_pageviews_for_titles()` - use a set of wikipedia page visit statistics, over different months, to extract pageview stats for each of the wikipedia titles in the dictionary created in step 4., and also save these numbers into the taxon item.
	* `calc_popularities_for_wikitaxa()` - use the page sizes and visit stats to calculate a raw popularity score for each taxon.
	* `inherit_popularity()` percolate popularity stats through the tree, to create "phylogeneticlaly informaed popularity".

7. `output_simplified_tree()` parse the tree and the taxa (e.g. removing monotomies, adding popularity rankings, etc), then save the results to a csv file, and the final tree to a default location. The tree structure is also present in the CSV file in a ordered_set notation.