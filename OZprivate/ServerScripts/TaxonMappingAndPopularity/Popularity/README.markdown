The general idea is to take a list of taxa (e.g. the entire taxonomy.tsv file) and map them to wikidata Q_ids, e.g. for the open tree of life taxon OTT=770315, wikidata Qid=Q15978631

From the wikidata Qid, we can get the name of pages in various language wikipedias. This allows us to get the wikipedia page size (e.g. via 
enwiki-latest-page.sql.gz) and the number of recent visits (e.g. via wikidumps/pagecounts-*totals.bz2)

To map OTT taxa to Qids, we can use the source ids present in the taxonomy.tsv `sourceinfo` column (e.g. ncbi:9593), and map them to wikidata ids by looking through the wikidata dump for the data item that has that ncbi number (and similarly for worms, index fungorum, gbif numbers, etc.)

_more details needed here_ - elaborate on the [popularity web page](../../../../views/popularity/index.html)