#this reads in already-calculated popularity data from nested_set_leaves
#header is name,extinction_date,ott,wikidata,wikipedia_lang_flag,eol,iucn,popularity,price,image_updated,vname_updated,ncbi,ifung,worms,irmng,gbif

pop <- read.delim("~/Documents/Research/OneZoom/OneZoomComplete/applications/OneZoom/OZprivate/data/output_files/ordered_leaves.csv",
                  header=T,
                  sep=",",
                  colClasses=c("NULL", "NULL",'character',"NULL","NULL","NULL","NULL", "NULL","NULL", 'numeric',"NULL","NULL","NULL","NULL","NULL","NULL"),
                  stringsAsFactors=F)
rownames(pop) <- make.names(pop$name, unique=TRUE)

test_spp1 <- c(
Chimp='Pan.troglodytes',
Dog='Canis.lupus',
Giraffe='Giraffa.camelopardalis',
GiantKelp='Macrocystis.pyrifera',
Wombat='Lasiorhinus.latifrons',
Otter='Lutra.lutra',
Axoltyl='Ambystoma.mexicanum',
SaigaAntelope='Saiga.tatarica',
PoisonFrog='Dendrobates.tinctorius',
TimberRattlesnake='Crotalus.horridus',
Starling='Sturnus.vulgaris',
BirdEatingSpider='Theraphosa.blondi',
Ladybird='Coccinella.septempunctata',
GiantSisterLeech='Mimobdella.japonica',
FlyAgaric='Amanita.muscaria',
LionsMane='Cyanea.capillata',
KillerWhale='Orcinus.orca')

test_spp2 <- c(
Ginkgo='Ginkgo.biloba',
GiantSequioa='Sequoiadendron.giganteum',
AustralianPitcherPlant='Cephalotus.follicularis',
YellowMarginOrchid='Cymbidium.floribundum',
GiantSquid='Architeuthis.dux',
Banana='Musa.acuminata',
Tea='Camellia.sinensis',
NepenthesRajah='Nepenthes.rajah',
VenusFlyTrap='Dionaea.muscipula',
Coffee='Coffea.arabica'
)

#pop_metric = pop$raw_pop
#pop[,'metric'] = (pop$ancst_pop + pop$dscdt_pop) / log(pop$n_ancst) * (c(1,1.5)[pop$seedplant+1])
pop_spp1 = sort(sapply(test_spp1, function(sci_name) {pop[sci_name,'popularity']}))
pop_spp2 = sort(sapply(test_spp2, function(sci_name) {pop[sci_name,'popularity']}))
plot(ecdf(pop$popularity), xlim=c(20000,150000))

abline(v=pop_spp1, col="grey")
abline(v=pop_spp2, col="green")
text(c(pop_spp1, pop_spp2), seq_along(c(pop_spp1, pop_spp2))%%10/10, names(c(pop_spp1, pop_spp2)), srt=90, cex=0.7)

c(43000, 83200, 97000, 130500, 145400)


q <- quantile(pop$popularity, c(0.02, 0.5, .95, 0.9935, 0.9985), na.rm=T)
q
abline(v=q, col="red")

            