pop <- read.delim("~/Documents/Research/OneZoom/OneZoomComplete/applications/OneZoom/OZprivate/data/DBinputs/Data_phylo_new.csv", 
                  stringsAsFactors=F,
                  check.names=TRUE)
rownames(pop) <- make.names(pop$name, unique=TRUE)

test_spp1 <- c(
Dog='Canis_lupus',
Giraffe='Giraffa_camelopardalis',
GiantKelp='Macrocystis_pyrifera',
Wombat='Lasiorhinus_latifrons',
Otter='Lutra_lutra',
Axoltyl='Ambystoma_mexicanum',
SaigaAntelope='Saiga_tatarica',
PoisonFrog='Dendrobates_tinctorius',
TimberRattlesnake='Crotalus_horridus',
Starling='Sturnus_vulgaris',
BirdEatingSpider='Theraphosa_blondi',
Ladybird='Coccinella_septempunctata',
GiantSisterLeech='Mimobdella_japonica',
FlyAgaric='Amanita_muscaria',
LionsMane='Cyanea_capillata',
KillerWhale='Orcinus_orca')

test_spp2 <- c(
Ginkgo='Ginkgo_biloba',
GiantSequioa='Sequoiadendron_giganteum',
AustralianPitcherPlant='Cephalotus_follicularis',
YellowMarginOrchid='Cymbidium_floribundum',
GiantSquid='Architeuthis_dux',
Banana='Musa_acuminata',
Tea='Camellia_sinensis',
NepenthesRajah='Nepenthes_rajah',
VenusFlyTrap='Dionaea_muscipula',
Coffee='Coffea_arabica'
)

#pop_metric = pop$raw_pop
pop[,'metric'] = (pop$ancst_pop + pop$dscdt_pop) / log(pop$n_ancst) * (c(1,1.5)[pop$seedplant+1])
pop_spp1 = sort(sapply(test_spp1, function(sci_name) {pop[sci_name,'metric']}))
pop_spp2 = sort(sapply(test_spp2, function(sci_name) {pop[sci_name,'metric']}))
plot(ecdf(pop$metric))

abline(v=pop_spp1, col="grey")
abline(v=pop_spp2, col="green")
text(c(pop_spp1, pop_spp2), seq_along(c(pop_spp1, pop_spp2))%%10/10, names(c(pop_spp1, pop_spp2)), srt=90, cex=0.7)

c(43000, 83200, 97000, 130500, 145400)


q <- quantile(pop$metric, c(0.02, 0.5, .95, 0.97, 0.98, 0.99))
q
abline(v=q, col="red")

write.csv(pop[,c('id','metric')], file = "/tmp/pop_metrics.csv", na="\\N", row.names=FALSE, col.names=FALSE)
            
read_into_sql_with <- "
UPDATE nested_set_leaves SET popularity = NULL;
CREATE TEMPORARY TABLE pop ( id INT(11), metric FLOAT NULL);
LOAD DATA LOCAL INFILE '/home/web2py/pop_metrics.csv' INTO TABLE pop FIELDS TERMINATED BY ','  IGNORE 1 LINES (id, metric); 
UPDATE nested_set_leaves INNER JOIN pop on pop.id = nested_set_leaves.ott SET nested_set_leaves.popularity = pop.metric;
DROP TEMPORARY TABLE pop;
"
            
       
