//;# Various hacks allow this javascript code to be included in perl simply using > require ('filename.js');
//;# this  includes using '//;#' as a single-line comment, and prefixing variables by '$'

//;# Base tree for chordates, assuming initial divergence at 550Mya.

$tree = new Tree('BespokeTree/include_files/Base.PHY');

//;# Consult here with Holland group for next 2 dates
//;#  DEEPFIN tree root (Shark + bony-fish) is at 462.4. Guess for Cyclostome divergence = 500Mya

$tree.substitute('APUS@', 'BespokeTree/include_files/Apusozoa_plus.PHY');
$tree.substitute('BIKONTA@', 'BespokeTree/include_files/Bikonts.PHY');
$tree.substitute('CHLOROPLASTIDA@', 'BespokeTree/include_files/GreenPlantsRuhfel2014.PHY');
$tree.substitute('METAZOA@', 'BespokeTree/include_files/Animals.PHY', 150);
$tree.substitute('PORIFERA@', 'BespokeTree/include_files/PoriferaOneZoom.phy', 50);
$tree.substitute('CTENOPHORA@', 'BespokeTree/include_files/CtenophoresPoder2001.PHY', 50);
$tree.substitute('AMBULACRARIA@', 'BespokeTree/include_files/Ambulacraria.PHY', 20, 'Ambulacraria'); //;# base @ 530Ma, C21 = 550Ma
$tree.substitute('CYCLOSTOMATA@', 'BespokeTree/include_files/Cyclostome_full_guess.PHY', 43);
$tree.substitute('LAMPREYS@', 'BespokeTree/include_files/Lampreys_Potter2015.phy', 332.0);
$tree.substitute('GNATHOSTOMATA@', 'BespokeTree/include_files/BonyFishOpenTree.PHY', 65); //;# base @ 
//;# for fewer species but with dates, try 
//;# tree.substitute('GNATHOSTOMATA@', 'BespokeTree/include_files/Deepfin2.phy', 37.6) //;# C20=430Ma

$tree.substitute('CHONDRICHTHYES@', 'BespokeTree/include_files/Chondrichthyes_Renz2013.phy', 40); //;# base @ 420Ma, C21 = 460Ma
$tree.substitute('HOLOCEPHALI@', 'BespokeTree/include_files/Holocephali_Inoue2010.PHY', 250);
$tree.substitute('BATOIDEA@', 'BespokeTree/include_files/Batoids_Aschliman2012.PHY', 100);
//;# sharks are problematic in OToL v3 & 4, hence lots of files included here
$tree.substitute('SELACHII@', 'BespokeTree/include_files/Naylor2012Selachimorpha.PHY', 75); //;# base @ 225Ma, joining point at 300Ma
$tree.substitute('DALATIIDAE@', 'BespokeTree/include_files/Naylor2012Dalatiidae.PHY', 116.1); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('SOMNIOSIDAEOXYNOTIDAE@', 'BespokeTree/include_files/Naylor2012Somniosidae_Oxynotidae.PHY', 110.51); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('ETMOPTERIDAE@', 'BespokeTree/include_files/Naylor2012Etmopteridae.phy', 110.51); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('SQUATINIDAE@', 'BespokeTree/include_files/Naylor2012Squatinidae.phy', 147.59); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('PRISTIOPHORIDAE@', 'BespokeTree/include_files/Naylor2012Pristiophoridae.phy', 147.59); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('SCYLIORHINIDAE3@', 'BespokeTree/include_files/Naylor2012Scyliorhinidae3.PHY', 170); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('SCYLIORHINIDAE2@', 'BespokeTree/include_files/Naylor2012Scyliorhinidae2.PHY', 134.467193); //;# from lengths in Naylor2012Selachimorpha.PHY
$tree.substitute('CARCHARHINICAE_MINUS@', 'BespokeTree/include_files/Naylor2012Carcharhinicae_minus.PHY', 134.467193, 'Most_Carcharhinicae_'); //;# from lengths in Naylor2012Selachimorpha.PHY

//;#  Choanoflagellates: http://www.pnas.org/content/105/43/16641.short 

//;##########  NB: to use the original deepfin tree, substitute these text strings back in instead ##########
//;# 	tree.substitute('TETRAPODA@', '(Xenopus_tropicalis:335.4,(Monodelphis_domestica:129,(Mus_musculus:71.12,Homo_sapiens:71.12):57.88):206.4)Tetrapodomorpha:46.5');
//;# 	tree.substitute('COELACANTHIFORMES@', 'Latimeria_chalumnae:409.4');
//;# 	tree.substitute('DIPNOI@', '(Neoceratodus_forsteri:241.804369,(Protopterus_aethiopicus_annectens:103.2,Lepidosiren_paradoxa:103.2):138.604369)Dipnoi:140.095631');
//;# 	tree.substitute('POLYPTERIFORMES@', '(Erpetoichthys_calabaricus:29.2,(Polypterus_senegalus:16.555114,Polypterus_ornatipinnis:16.555114):12.644886)Polypteriformes:353.4');
//;# 	tree.substitute('ACIPENSERIFORMES@', '(Polyodon_spathula:138.9,(Acipenser_fulvescens:38.592824,(Scaphirhynchus_platorynchus:19.382705,Scaphirhynchus_albus:19.382705):19.210119):100.307176)Acipenseriformes:211.2');


$tree.substitute('COELACANTHIFORMES@', 'BespokeTree/include_files/CoelacanthSudarto2010.phy', 414);  //;# base @6Ma, C19=420Ma
$tree.substitute('DIPNOI@',            'BespokeTree/include_files/LungfishCriswell2011.phy', 138); //;# base @277Ma, C18=415Ma
$tree.substitute('POLYPTERIFORMES@',   'BespokeTree/include_files/BicherSuzuki2010.phy',      353.4, 'Polypteriformes'); //;# base @29.2, C=382.6
$tree.substitute('ACIPENSERIFORMES@',  'BespokeTree/include_files/SturgeonKrieger2008.phy',   166.1, 'Acipenseriformes'); //;# base @184 (Peng)  C=350.1 (deepfin)
$tree.substitute('HOLOSTEI@',          'BespokeTree/include_files/GarsDeepfin.phy', 54.6, 'Holostei');	//;# base @267.9 C=322.5

//;# NB, this might be useful  for Elopiformes: http://www.sciencedirect.com/science/article/pii/S105579031300344#gr1

//;########## TETRAPODS  ###########
//;#  C18 @ 415, ChangedOneZoom tetrapods root @ 340 Mya. Stem = 75Ma
$tree.substitute('TETRAPODA@',      'BespokeTree/include_files/Tetrapods_Zheng_base.PHY', 75);
//;# $tree.substitute('AMPHIBIA@',     'BespokeTree/include_files/AmphibiansOneZoom.phy',                30.0);
$tree.substitute('AMPHIBIA@',       'BespokeTree/include_files/AmphibiansOpenTree.PHY',              30.0);
$tree.substitute('CROCODYLIA@',     'BespokeTree/include_files/Crocodylia_OneZoom.phy', 152.86);
$tree.substitute('TESTUDINES@',     'BespokeTree/include_files/Testudines_OneZoom.phy', 55.77);
$tree.substitute('NEOGNATHAE@',     'BespokeTree/include_files/Neognathae_minus_passerines_OneZoom.PHY', 15.69); 
$tree.substitute('PALAEOGNATHAE@',  'BespokeTree/include_files/PalaeognathaeMitchell2014.PHY', 40.45); 
$tree.substitute('TINAMIFORMES@',   'BespokeTree/include_files/Tinamous_OneZoom.phy', 6.85); 
$tree.substitute('PASSERIFORMES@',  'BespokeTree/include_files/PasserinesOneZoom.phy',      8);
$tree.substitute('GALAPAGOS_FINCHES_AND_ALLIES_@',  'BespokeTree/include_files/GalapagosFinchesLamichhaney2015.phy',      3.6);

//;# for original onezoom tree use 
//;# tree.substitute('EUTHERIA@',          'BespokeTree/include_files/PlacentalsOneZoom.phy');
$tree.substitute('MAMMALIA@',       'BespokeTree/include_files/Mammal_base.phy',            140); //;# base @180, C16=320Ma
$tree.substitute('MARSUPIALIA@',    'BespokeTree/include_files/Marsupial_recalibrated.phy', 73); //;# base@87 C14=160Ma
$tree.substitute('EUTHERIA@',       'BespokeTree/include_files/PlacentalsPoulakakis2010.phy',  70); //;# C13=90Ma
$tree.substitute('BOREOEUTHERIA@',  'BespokeTree/include_files/BoreoeutheriaOneZoom.phy', 5); //;# C12=85Ma
$tree.substitute('XENARTHRA@',      'BespokeTree/include_files/XenarthraOneZoom.phy', 17.8); //;# OZ base @ 71.3, A+X @ 89.1
$tree.substitute('AFROTHERIA@',     'BespokeTree/include_files/AfrotheriaPoulakakis2010.phy', 4.9); //;# base @ 84.2, A+X @ 89.1


//;########## (to use original OneZoom data, try ###############
//;##########	tree.substitute('PRIMATES@', 'BespokeTree/include_files/PrimatesOneZoom.phy', 23.3); #######

//;#  Onezoom colugo-primate @ 90 Mya, Springer primates root @ 66.7065Mya. Here stem = 90 - 66.7065 = 23.3My
//;#  But ancestor's tale colugo-primate @ 70 Ma

//;# tree.substitute('PRIMATES@',      'BespokeTree/include_files/PrimatesSpringer2012.phy',  2.2932); //;# base = 66.7068 C9 @ 69
$tree.substitute('PRIMATES@',      'BespokeTree/include_files/PrimatesSpringer2012_AT.PHY', 5); //;# base = 65 C9 @ 70
$tree.substitute('HYLOBATIDAE@',   'BespokeTree/include_files/GibbonsCarbone2014.phy', 12.6); //;# base = 5.4, C4 @ 18
$tree.substitute('DERMOPTERA@',    'BespokeTree/include_files/DermopteraJanecka2008.phy', 55); //;# base @15Ma, C9 @ 70Ma

//;# STURGEON_TREE from http://onlinelibrary.wiley.com/doi/10.1111/j.1439-0426.2008.01088.x/abstract - should contain approx 30 spp. Base is at 

//;# Needed
//;# Correct Rattite tree
//;# SHARK_TREE??
//;# AMPHIOXUS_TREE_~32SPP - 24 Branchiostoma species, 7 Asymmetron species, 1 Epigonichthys (http://eolspecies.lifedesks.org/pages/63233) see http://www.bioone.org/doi/abs/10.2108/zsj.21.203

//;# Tunicate tree ~ 2,150 spp - see T. Stuck for phylogeny

//;# for dating look at B. Misof, et al. 2014. Phylogenomics resolves the timing and pattern of insect evolution. Science 346 (6210): 763-767.
$tree.substitute('PROTOSTOMIA@', 'BespokeTree/include_files/Protostomes.PHY', 50);
$tree.substitute('ANNELIDA@', 'BespokeTree/include_files/AnnelidsWeigertBleidorn2016.PHY', 0);
$tree.substitute('NUCLETMYCEA@', 'BespokeTree/include_files/Nucletmycea.PHY', 200);
$tree.substitute('OPISTHOSPORIDIA@', 'BespokeTree/include_files/Opisthosporidia_from_draftversion3.PHY', 100);

//;# PHYLOGENIES PART FILLED BY OPEN TREE OF LIFE
//;# Commands output from getOpenTreesFromOneZoom.py


//;#  == Ambulacraria ==, from file BespokeTree/include_files/Ambulacraria.PHY
$tree.substitute('Echinozoa_ott669475@\\d*', 'OpenTreeParts/OpenTree_all/669475.phy');
$tree.substitute('Ophiuroidea_ott197634@\\d*', 'OpenTreeParts/OpenTree_all/197634.phy');
$tree.substitute('Asteroidea_ott451009@\\d*', 'OpenTreeParts/OpenTree_all/451009.phy');
$tree.substitute('Crinoidea_ott732545@\\d*', 'OpenTreeParts/OpenTree_all/732545.phy');
$tree.substitute('Hemichordata_ott100746@\\d*', 'OpenTreeParts/OpenTree_all/100746.phy');

//;#  == Amphibia_ott544595 ==, from file BespokeTree/include_files/AmphibiansOpenTree.PHY
$tree.substitute('Anura_ott991547@\\d*', 'OpenTreeParts/OpenTree_all/991547.phy');
$tree.substitute('Caudata_ott984716@\\d*', 'OpenTreeParts/OpenTree_all/984716.phy');
$tree.substitute('Gymnophiona_ott118027~-3617909@\\d*', 'OpenTreeParts/OpenTree_all/118027.phy');

//;#  == Metazoa_ott691846 ==, from file BespokeTree/include_files/Animals.PHY
$tree.substitute('Tunicata_ott125649@\\d*', 'OpenTreeParts/OpenTree_all/125649.phy');
$tree.substitute('Cephalochordata_ott176555@\\d*', 'OpenTreeParts/OpenTree_all/176555.phy');
$tree.substitute('Acoela_ott283423@\\d*', 'OpenTreeParts/OpenTree_all/283423.phy');
$tree.substitute('Nemertodermatida_ott490210@\\d*', 'OpenTreeParts/OpenTree_all/490210.phy');
$tree.substitute('Anthozoa_ott1084488@\\d*', 'OpenTreeParts/OpenTree_all/1084488.phy');
$tree.substitute('CnidariaMinusAnthozoa__ott641033~-1084488@\\d*', 'OpenTreeParts/OpenTree_all/641033.phy');

//;#  == Annelida_ott941620 ==, from file BespokeTree/include_files/AnnelidsWeigertBleidorn2016.PHY
$tree.substitute('Magelonidae_ott1067344@\\d*', 'OpenTreeParts/OpenTree_all/1067344.phy');
$tree.substitute('Oweniidae_ott166828@\\d*', 'OpenTreeParts/OpenTree_all/166828.phy');
$tree.substitute('Chaetopteridae_ott466487@\\d*', 'OpenTreeParts/OpenTree_all/466487.phy');
$tree.substitute('Sipuncula_ott377817@\\d*', 'OpenTreeParts/OpenTree_all/377817.phy');
$tree.substitute('Amphinomidae_ott884677@\\d*', 'OpenTreeParts/OpenTree_all/884677.phy');
$tree.substitute('Clitellata_ott563197@\\d*', 'OpenTreeParts/OpenTree_all/563197.phy');
$tree.substitute('Alvinellidae_ott386356@\\d*', 'OpenTreeParts/OpenTree_all/386356.phy');
$tree.substitute('Pectinariidae_ott208983@\\d*', 'OpenTreeParts/OpenTree_all/208983.phy');
$tree.substitute('Terebellidae_ott106108@\\d*', 'OpenTreeParts/OpenTree_all/106108.phy');
$tree.substitute('Arenicolidae_ott563193@\\d*', 'OpenTreeParts/OpenTree_all/563193.phy');
$tree.substitute('Maldanidae_ott694247@\\d*', 'OpenTreeParts/OpenTree_all/694247.phy');
$tree.substitute('Echiura_ott954036@\\d*', 'OpenTreeParts/OpenTree_all/954036.phy');
$tree.substitute('Capitellidae_ott966425@\\d*', 'OpenTreeParts/OpenTree_all/966425.phy');
$tree.substitute('Opheliidae_ott336915@\\d*', 'OpenTreeParts/OpenTree_all/336915.phy');
$tree.substitute('Spionidae_ott912396@\\d*', 'OpenTreeParts/OpenTree_all/912396.phy');
$tree.substitute('Sabellariidae_ott336912@\\d*', 'OpenTreeParts/OpenTree_all/336912.phy');
$tree.substitute('Sabellidae_ott992906@\\d*', 'OpenTreeParts/OpenTree_all/992906.phy');
$tree.substitute('Serpulidae_ott440707@\\d*', 'OpenTreeParts/OpenTree_all/440707.phy');
$tree.substitute('Fabriciidae_ott455562@\\d*', 'OpenTreeParts/OpenTree_all/455562.phy');
$tree.substitute('Siboglinidae_ott1057367@\\d*', 'OpenTreeParts/OpenTree_all/1057367.phy');
$tree.substitute('Diurodrilidae_ott301584@\\d*', 'OpenTreeParts/OpenTree_all/301584.phy');
$tree.substitute('Orbiniidae_ott918309@\\d*', 'OpenTreeParts/OpenTree_all/918309.phy');
$tree.substitute('Parergodrilidae_ott638598@\\d*', 'OpenTreeParts/OpenTree_all/638598.phy');
$tree.substitute('Nerillidae_ott911577@\\d*', 'OpenTreeParts/OpenTree_all/911577.phy');
$tree.substitute('Myzostomida_ott260040@\\d*', 'OpenTreeParts/OpenTree_all/260040.phy');
$tree.substitute('Polygordiidae_ott914159@\\d*', 'OpenTreeParts/OpenTree_all/914159.phy');
$tree.substitute('Saccocirridae_ott336933@\\d*', 'OpenTreeParts/OpenTree_all/336933.phy');
$tree.substitute('Protodrilidae_ott222259@\\d*', 'OpenTreeParts/OpenTree_all/222259.phy');
$tree.substitute('Phyllodocidae_ott890240@\\d*', 'OpenTreeParts/OpenTree_all/890240.phy');
$tree.substitute('Tomopteridae_ott798210@\\d*', 'OpenTreeParts/OpenTree_all/798210.phy');
$tree.substitute('Nereididae_ott741326@\\d*', 'OpenTreeParts/OpenTree_all/741326.phy');
$tree.substitute('Nephtyidae_ott1072318@\\d*', 'OpenTreeParts/OpenTree_all/1072318.phy');
$tree.substitute('Syllidae_ott881665@\\d*', 'OpenTreeParts/OpenTree_all/881665.phy');
$tree.substitute('Polynoidae_ott1067347@\\d*', 'OpenTreeParts/OpenTree_all/1067347.phy');
$tree.substitute('Sigalionidae_ott812184@\\d*', 'OpenTreeParts/OpenTree_all/812184.phy');
$tree.substitute('Dorvilleidae_ott989548@\\d*', 'OpenTreeParts/OpenTree_all/989548.phy');
$tree.substitute('Ninoe_ott663397@\\d*', 'OpenTreeParts/OpenTree_all/663397.phy');
$tree.substitute('Onuphis_ott433141@\\d*', 'OpenTreeParts/OpenTree_all/433141.phy');
$tree.substitute('Lumbrineris_ott834687@\\d*', 'OpenTreeParts/OpenTree_all/834687.phy');
$tree.substitute('Diopatra_ott1042378@\\d*', 'OpenTreeParts/OpenTree_all/1042378.phy');
$tree.substitute('Eunice_ott162291@\\d*', 'OpenTreeParts/OpenTree_all/162291.phy');
$tree.substitute('Oenonidae_ott67118@\\d*', 'OpenTreeParts/OpenTree_all/67118.phy');
$tree.substitute('Marphysa_ott260032@\\d*', 'OpenTreeParts/OpenTree_all/260032.phy');

//;#  == PossParaphyleticApusozoaPlus__ott671092 ==, from file BespokeTree/include_files/Apusozoa_plus.PHY
$tree.substitute('Ancyromonadida_ott415970@\\d*', 'OpenTreeParts/OpenTree_all/415970.phy');
$tree.substitute('Nutomonas_ott971869@\\d*', 'OpenTreeParts/OpenTree_all/971869.phy');
$tree.substitute('Planomonadidae_ott494997@\\d*', 'OpenTreeParts/OpenTree_all/494997.phy');
$tree.substitute('Apusomonadidae_ott575898@\\d*', 'OpenTreeParts/OpenTree_all/575898.phy');
$tree.substitute('Breviatea_ott5246141@\\d*', 'OpenTreeParts/OpenTree_all/5246141.phy');

//;#  == AllArchaeaAndEukaryotes_ ==, from file BespokeTree/include_files/Base.PHY
$tree.substitute('Choanoflagellida_ott202765~-5247662@\\d*', 'OpenTreeParts/OpenTree_all/202765.phy');
$tree.substitute('Ichthyosporea_ott623671@\\d*', 'OpenTreeParts/OpenTree_all/623671.phy');
$tree.substitute('Amoebozoa_ott1064655~-5246123@\\d*', 'OpenTreeParts/OpenTree_all/1064655.phy');
$tree.substitute('Collodictyonidae_ott4738986@\\d*', 'OpenTreeParts/OpenTree_all/4738986.phy');
$tree.substitute('Rigifilida_ott973629@\\d*', 'OpenTreeParts/OpenTree_all/973629.phy');
$tree.substitute('Malawimonas_ott935422@\\d*', 'OpenTreeParts/OpenTree_all/935422.phy');
$tree.substitute('Excavata_ott2927065~-935422@\\d*', 'OpenTreeParts/OpenTree_all/2927065.phy');
$tree.substitute('Lokiarchaeota_ott5561807@\\d*', 'OpenTreeParts/OpenTree_all/5561807.phy');
$tree.substitute('Crenarchaeota_ott114216@\\d*', 'OpenTreeParts/OpenTree_all/114216.phy');
$tree.substitute('Thermococci_ott921413@\\d*', 'OpenTreeParts/OpenTree_all/921413.phy');
$tree.substitute('Thaumarchaeota_ott102415@\\d*', 'OpenTreeParts/OpenTree_all/102415.phy');
$tree.substitute('Thermoplasmata_ott921398@\\d*', 'OpenTreeParts/OpenTree_all/921398.phy');
$tree.substitute('Korarchaeota_ott266344@\\d*', 'OpenTreeParts/OpenTree_all/266344.phy');
$tree.substitute('Nanoarchaeota_ott678209@\\d*', 'OpenTreeParts/OpenTree_all/678209.phy');
$tree.substitute('Diapherotrites_ott5205266@\\d*', 'OpenTreeParts/OpenTree_all/5205266.phy');
$tree.substitute('Aenigmarchaeota_ott4795972@\\d*', 'OpenTreeParts/OpenTree_all/4795972.phy');
$tree.substitute('Nanohaloarchaeota_ott5351807@\\d*', 'OpenTreeParts/OpenTree_all/5351807.phy');
$tree.substitute('Micrarchaeum_ott5248238@\\d*', 'OpenTreeParts/OpenTree_all/5248238.phy');
$tree.substitute('Parvarchaeum_ott4796454@\\d*', 'OpenTreeParts/OpenTree_all/4796454.phy');
$tree.substitute('Euryarchaeota_ott635958~996421-5561807-114216-921413-102415-921398-266344-678209-5205266-4795972-5351807-5248234-4796454-5248238@\\d*', 'OpenTreeParts/OpenTree_all/635958.phy');

//;#  == Batoidea_ott195928 ==, from file BespokeTree/include_files/Batoids_Aschliman2012.PHY
$tree.substitute('Rajidae_ott978560@\\d*', 'OpenTreeParts/OpenTree_all/978560.phy');
$tree.substitute('Anacanthobatidae_ott802681@\\d*', 'OpenTreeParts/OpenTree_all/802681.phy');
$tree.substitute('Cruriraja_ott1032964@\\d*', 'OpenTreeParts/OpenTree_all/1032964.phy');
$tree.substitute('Arhynchobatidae_ott406376@\\d*', 'OpenTreeParts/OpenTree_all/406376.phy');
$tree.substitute('Platyrhinodis_ott1032962@\\d*', 'OpenTreeParts/OpenTree_all/1032962.phy');
$tree.substitute('Platyrhina_ott456578@\\d*', 'OpenTreeParts/OpenTree_all/456578.phy');
$tree.substitute('Torpedinidae_ott553102@\\d*', 'OpenTreeParts/OpenTree_all/553102.phy');
$tree.substitute('Hypnidae_ott356637@\\d*', 'OpenTreeParts/OpenTree_all/356637.phy');
$tree.substitute('Narcinidae_ott818997@\\d*', 'OpenTreeParts/OpenTree_all/818997.phy');
$tree.substitute('Narkidae_ott932203@\\d*', 'OpenTreeParts/OpenTree_all/932203.phy');
$tree.substitute('Zapteryx_ott356651@\\d*', 'OpenTreeParts/OpenTree_all/356651.phy');
$tree.substitute('Trygonorrhina_ott1041304@\\d*', 'OpenTreeParts/OpenTree_all/1041304.phy');
$tree.substitute('Rhiniformes2__ott356644~-456585-356651-1041304@\\d*', 'OpenTreeParts/OpenTree_all/356644.phy');
$tree.substitute('Zanobatidae_ott456585@\\d*', 'OpenTreeParts/OpenTree_all/456585.phy');
$tree.substitute('Hexatrygonidae_ott456584@\\d*', 'OpenTreeParts/OpenTree_all/456584.phy');
$tree.substitute('Myliobatiformes_minus_Hexatrygon__ott~706576-456584@\\d*', 'OpenTreeParts/OpenTree_all/Myliobatiformes_minus_Hexatrygon_.phy');

//;#  == Bikonta ==, from file BespokeTree/include_files/Bikonts.PHY
$tree.substitute('Haptophyta_ott151014@\\d*', 'OpenTreeParts/OpenTree_all/151014.phy');
$tree.substitute('Centrohelida_ott755852@\\d*', 'OpenTreeParts/OpenTree_all/755852.phy');
$tree.substitute('Picozoa_ott4738955@\\d*', 'OpenTreeParts/OpenTree_all/4738955.phy');
$tree.substitute('Alveolata_ott266751@\\d*', 'OpenTreeParts/OpenTree_all/266751.phy');
$tree.substitute('Stramenopiles_ott266745@\\d*', 'OpenTreeParts/OpenTree_all/266745.phy');
$tree.substitute('Rhizaria_ott6929~-5247609@\\d*', 'OpenTreeParts/OpenTree_all/6929.phy');
$tree.substitute('Cryptophyceae_ott497055@\\d*', 'OpenTreeParts/OpenTree_all/497055.phy');
$tree.substitute('Glaucophyta_ott664970@\\d*', 'OpenTreeParts/OpenTree_all/664970.phy');
$tree.substitute('Rhodophyceae_ott878953@\\d*', 'OpenTreeParts/OpenTree_all/878953.phy');

//;#  == Gnathostomata_ott278114 ==, from file BespokeTree/include_files/BonyFishOpenTree.PHY
$tree.substitute('Elopiformes_ott329625@\\d*', 'OpenTreeParts/OpenTree_all/329625.phy');
$tree.substitute('Albuliformes_ott133416@\\d*', 'OpenTreeParts/OpenTree_all/133416.phy');
$tree.substitute('Notacanthiformes_ott925748@\\d*', 'OpenTreeParts/OpenTree_all/925748.phy');
$tree.substitute('Anguilliformes_ott854188@\\d*', 'OpenTreeParts/OpenTree_all/854188.phy');
$tree.substitute('Hiodontiformes_ott5521757@\\d*', 'OpenTreeParts/OpenTree_all/5521757.phy');
$tree.substitute('Osteoglossiformes_ott496754@\\d*', 'OpenTreeParts/OpenTree_all/496754.phy');
$tree.substitute('Clupeiformes_ott400458@\\d*', 'OpenTreeParts/OpenTree_all/400458.phy');
$tree.substitute('Alepocephaliformes_ott120101@\\d*', 'OpenTreeParts/OpenTree_all/120101.phy');
$tree.substitute('Gonorynchiformes_ott460873@\\d*', 'OpenTreeParts/OpenTree_all/460873.phy');
$tree.substitute('Cypriniformes_ott1005931@\\d*', 'OpenTreeParts/OpenTree_all/1005931.phy');
$tree.substitute('Characiformes_ott701511@\\d*', 'OpenTreeParts/OpenTree_all/701511.phy');
$tree.substitute('Gymnotiformes_ott216180@\\d*', 'OpenTreeParts/OpenTree_all/216180.phy');
$tree.substitute('Siluriformes_ott701516@\\d*', 'OpenTreeParts/OpenTree_all/701516.phy');
$tree.substitute('Lepidogalaxiiformes_ott5536252@\\d*', 'OpenTreeParts/OpenTree_all/5536252.phy');
$tree.substitute('Argentiniformes_ott757259@\\d*', 'OpenTreeParts/OpenTree_all/757259.phy');
$tree.substitute('Galaxiiformes_ott138716@\\d*', 'OpenTreeParts/OpenTree_all/138716.phy');
$tree.substitute('Esociformes_ott216172@\\d*', 'OpenTreeParts/OpenTree_all/216172.phy');
$tree.substitute('Salmoniformes_ott216171@\\d*', 'OpenTreeParts/OpenTree_all/216171.phy');
$tree.substitute('Osmeriformes_ott496756@\\d*', 'OpenTreeParts/OpenTree_all/496756.phy');
$tree.substitute('Stomiiformes_ott701557@\\d*', 'OpenTreeParts/OpenTree_all/701557.phy');
$tree.substitute('Ateleopodiformes_ott292503@\\d*', 'OpenTreeParts/OpenTree_all/292503.phy');
$tree.substitute('Aulopiformes_ott19307@\\d*', 'OpenTreeParts/OpenTree_all/19307.phy');
$tree.substitute('Myctophiformes_ott19303@\\d*', 'OpenTreeParts/OpenTree_all/19303.phy');
$tree.substitute('Lampriformes_ott617745@\\d*', 'OpenTreeParts/OpenTree_all/617745.phy');
$tree.substitute('Percopsiformes_ott326254@\\d*', 'OpenTreeParts/OpenTree_all/326254.phy');
$tree.substitute('Zeiformes_ott816143@\\d*', 'OpenTreeParts/OpenTree_all/816143.phy');
$tree.substitute('Stylephoriformes_ott5554920@\\d*', 'OpenTreeParts/OpenTree_all/5554920.phy');
$tree.substitute('Gadiformes_ott114162@\\d*', 'OpenTreeParts/OpenTree_all/114162.phy');
$tree.substitute('Polymixiiformes_ott617750@\\d*', 'OpenTreeParts/OpenTree_all/617750.phy');
$tree.substitute('Berycidae_ott118776@\\d*', 'OpenTreeParts/OpenTree_all/118776.phy');
$tree.substitute('Melamphaidae_ott190715@\\d*', 'OpenTreeParts/OpenTree_all/190715.phy');
$tree.substitute('Cetomimidae_ott118790@\\d*', 'OpenTreeParts/OpenTree_all/118790.phy');
$tree.substitute('Gibberichthyidae_ott3631094@\\d*', 'OpenTreeParts/OpenTree_all/3631094.phy');
$tree.substitute('Hispidoberycidae_ott3631092@\\d*', 'OpenTreeParts/OpenTree_all/3631092.phy');
$tree.substitute('Rondeletiidae_ott190706@\\d*', 'OpenTreeParts/OpenTree_all/190706.phy');
$tree.substitute('Barbourisiidae_ott587934@\\d*', 'OpenTreeParts/OpenTree_all/587934.phy');
$tree.substitute('Stephanoberycidae_ott944688@\\d*', 'OpenTreeParts/OpenTree_all/944688.phy');
$tree.substitute('Trachichthyiformes_ott~108719-5551466-564435-118776-190715-118790-3631094-3631092-190706-587934-944688@\\d*', 'OpenTreeParts/OpenTree_all/Trachichthyiformes.phy');
$tree.substitute('Holocentrimorphaceae_ott564435@\\d*', 'OpenTreeParts/OpenTree_all/564435.phy');
$tree.substitute('Ophidiaria_ott5553749@\\d*', 'OpenTreeParts/OpenTree_all/5553749.phy');
$tree.substitute('Batrachoidaria_ott5553752@\\d*', 'OpenTreeParts/OpenTree_all/5553752.phy');
$tree.substitute('Most_percomorphs__ott~5551466-5553749-5553752@\\d*', 'OpenTreeParts/OpenTree_all/Most_percomorphs_.phy');

//;#  == Ctenophora_ott641212 ==, from file BespokeTree/include_files/CtenophoresPoder2001.PHY
$tree.substitute('Beroida_ott570650@\\d*', 'OpenTreeParts/OpenTree_all/570650.phy');
$tree.substitute('Haeckeliidae_ott1583@\\d*', 'OpenTreeParts/OpenTree_all/1583.phy');
$tree.substitute('Cyclocoela_ott956365~-570650@\\d*', 'OpenTreeParts/OpenTree_all/956365.phy');
$tree.substitute('Pleurobrachiidae_ott747323@\\d*', 'OpenTreeParts/OpenTree_all/747323.phy');
$tree.substitute('Platyctenida_ott574291@\\d*', 'OpenTreeParts/OpenTree_all/574291.phy');
$tree.substitute('Mertensiidae_ott1580@\\d*', 'OpenTreeParts/OpenTree_all/1580.phy');

//;#  == CYCLOSTOMATA_ott5424564 ==, from file BespokeTree/include_files/Cyclostome_full_guess.PHY
$tree.substitute('Eptatretus_ott852681~-772588-3644164@\\d*', 'OpenTreeParts/OpenTree_all/852681.phy');
$tree.substitute('Neomyxine_ott3644215@\\d*', 'OpenTreeParts/OpenTree_all/3644215.phy');
$tree.substitute('Myxine_ott34455@\\d*', 'OpenTreeParts/OpenTree_all/34455.phy');

//;#  == Chloroplastida_ott361838 ==, from file BespokeTree/include_files/GreenPlantsRuhfel2014.PHY
$tree.substitute('Chlorophyta_ott979501@\\d*', 'OpenTreeParts/OpenTree_all/979501.phy');
$tree.substitute('Klebsormidiophyceae_ott372052@\\d*', 'OpenTreeParts/OpenTree_all/372052.phy');
$tree.substitute('Streptophyta_minus_first_2_branches__ott~916750-372052-897408-930075@\\d*', 'OpenTreeParts/OpenTree_all/Streptophyta_minus_first_2_branches_.phy');
$tree.substitute('Chlorokybophyceae_ott897408@\\d*', 'OpenTreeParts/OpenTree_all/897408.phy');
$tree.substitute('Mesostigmatophyceae_ott930075@\\d*', 'OpenTreeParts/OpenTree_all/930075.phy');

//;#  == Holocephali_ott550652 ==, from file BespokeTree/include_files/Holocephali_Inoue2010.PHY
$tree.substitute('Callorhinchidae_ott550645@\\d*', 'OpenTreeParts/OpenTree_all/550645.phy');
$tree.substitute('Rhinochimaera_ott886233@\\d*', 'OpenTreeParts/OpenTree_all/886233.phy');
$tree.substitute('Harriotta_ott776014@\\d*', 'OpenTreeParts/OpenTree_all/776014.phy');
$tree.substitute('Neoharriotta_ott195188@\\d*', 'OpenTreeParts/OpenTree_all/195188.phy');
$tree.substitute('Chimaera_ott29488@\\d*', 'OpenTreeParts/OpenTree_all/29488.phy');
$tree.substitute('Hydrolagus_ott29492@\\d*', 'OpenTreeParts/OpenTree_all/29492.phy');

//;#  == None ==, from file BespokeTree/include_files/Naylor2012Carcharhinicae_minus.PHY
$tree.substitute('Parmaturus_ott821052@\\d*', 'OpenTreeParts/OpenTree_all/821052.phy');
$tree.substitute('Asymbolus_ott296645@\\d*', 'OpenTreeParts/OpenTree_all/296645.phy');
$tree.substitute('Figaro_ott105538@\\d*', 'OpenTreeParts/OpenTree_all/105538.phy');
$tree.substitute('Bythaelurus_ott903791@\\d*', 'OpenTreeParts/OpenTree_all/903791.phy');
$tree.substitute('Haploblepharus_ott201994@\\d*', 'OpenTreeParts/OpenTree_all/201994.phy');
$tree.substitute('Holohalaelurus_ott103472@\\d*', 'OpenTreeParts/OpenTree_all/103472.phy');
$tree.substitute('Proscyllium_ott821049@\\d*', 'OpenTreeParts/OpenTree_all/821049.phy');
$tree.substitute('Glyphis_ott541142@\\d*', 'OpenTreeParts/OpenTree_all/541142.phy');
$tree.substitute('Lamiopsis_ott19958@\\d*', 'OpenTreeParts/OpenTree_all/19958.phy');
$tree.substitute('Negaprion_ott450140@\\d*', 'OpenTreeParts/OpenTree_all/450140.phy');
$tree.substitute('Rhizoprionodon_ott846406@\\d*', 'OpenTreeParts/OpenTree_all/846406.phy');
$tree.substitute('Furgaleus_ott401912@\\d*', 'OpenTreeParts/OpenTree_all/401912.phy');
$tree.substitute('Hemitriakis_ott32028@\\d*', 'OpenTreeParts/OpenTree_all/32028.phy');
$tree.substitute('Galeorhinus_ott29487@\\d*', 'OpenTreeParts/OpenTree_all/29487.phy');
$tree.substitute('Hypogaleus_ott1035202@\\d*', 'OpenTreeParts/OpenTree_all/1035202.phy');
$tree.substitute('Iago_ott1037426@\\d*', 'OpenTreeParts/OpenTree_all/1037426.phy');
$tree.substitute('Gollum_ott1037449@\\d*', 'OpenTreeParts/OpenTree_all/1037449.phy');
$tree.substitute('Pseudotriakis_ott261215@\\d*', 'OpenTreeParts/OpenTree_all/261215.phy');
$tree.substitute('Eridacnis_ott73188@\\d*', 'OpenTreeParts/OpenTree_all/73188.phy');

//;#  == Dalatiidae_ott250746 ==, from file BespokeTree/include_files/Naylor2012Dalatiidae.PHY
$tree.substitute('Squaliolus_ott956134@\\d*', 'OpenTreeParts/OpenTree_all/956134.phy');
$tree.substitute('Euprotomicroides_ott3595317@\\d*', 'OpenTreeParts/OpenTree_all/3595317.phy');
$tree.substitute('Euprotomicrus_ott547469@\\d*', 'OpenTreeParts/OpenTree_all/547469.phy');
$tree.substitute('Dalatias_ott1027234@\\d*', 'OpenTreeParts/OpenTree_all/1027234.phy');
$tree.substitute('Isistius_ott277031@\\d*', 'OpenTreeParts/OpenTree_all/277031.phy');

//;#  == None ==, from file BespokeTree/include_files/Naylor2012Scyliorhinidae2.PHY
$tree.substitute('Aulohalaelurus_ott541139@\\d*', 'OpenTreeParts/OpenTree_all/541139.phy');
$tree.substitute('Schroederichthys_ott618631@\\d*', 'OpenTreeParts/OpenTree_all/618631.phy');

//;#  == None ==, from file BespokeTree/include_files/Naylor2012Scyliorhinidae3.PHY
$tree.substitute('Cephaloscyllium_ott481014@\\d*', 'OpenTreeParts/OpenTree_all/481014.phy');

//;#  == Selachii_ott78477 ==, from file BespokeTree/include_files/Naylor2012Selachimorpha.PHY
$tree.substitute('Lamniformes_minus_Mitsukurinidae__ott~32038-801828-760455-3595159@\\d*', 'OpenTreeParts/OpenTree_all/Lamniformes_minus_Mitsukurinidae_.phy');
$tree.substitute('Mitsukurinidae_ott801828@\\d*', 'OpenTreeParts/OpenTree_all/801828.phy');
$tree.substitute('Ginglymostoma_ott400230@\\d*', 'OpenTreeParts/OpenTree_all/400230.phy');
$tree.substitute('Nebrius_ott833444@\\d*', 'OpenTreeParts/OpenTree_all/833444.phy');
$tree.substitute('Stegostomatidae_ott696403@\\d*', 'OpenTreeParts/OpenTree_all/696403.phy');
$tree.substitute('Pseudoginglymostoma_ott356286@\\d*', 'OpenTreeParts/OpenTree_all/356286.phy');
$tree.substitute('Rhincodontidae_ott738324@\\d*', 'OpenTreeParts/OpenTree_all/738324.phy');
$tree.substitute('Hemiscylliidae_ott438189@\\d*', 'OpenTreeParts/OpenTree_all/438189.phy');
$tree.substitute('Brachaeluridae_ott274901@\\d*', 'OpenTreeParts/OpenTree_all/274901.phy');
$tree.substitute('Orectolobidae_ott572732@\\d*', 'OpenTreeParts/OpenTree_all/572732.phy');
$tree.substitute('Parascylliidae_ott154216@\\d*', 'OpenTreeParts/OpenTree_all/154216.phy');
$tree.substitute('Heterodontidae_ott335517@\\d*', 'OpenTreeParts/OpenTree_all/335517.phy');
$tree.substitute('Squalidae_ott856584@\\d*', 'OpenTreeParts/OpenTree_all/856584.phy');
$tree.substitute('Centrophoridae_ott852403@\\d*', 'OpenTreeParts/OpenTree_all/852403.phy');
$tree.substitute('Echinorhiniformes_ott340760@\\d*', 'OpenTreeParts/OpenTree_all/340760.phy');
$tree.substitute('Chlamydoselachidae_ott1093534@\\d*', 'OpenTreeParts/OpenTree_all/1093534.phy');
$tree.substitute('Notorynchidae_plus_Hexanchidae__ott~32032-1093534@\\d*', 'OpenTreeParts/OpenTree_all/Notorynchidae_plus_Hexanchidae_.phy');

//;#  == SomniosidaeOxynotidae ==, from file BespokeTree/include_files/Naylor2012Somniosidae_Oxynotidae.PHY
$tree.substitute('Somniosus_ott442056@\\d*', 'OpenTreeParts/OpenTree_all/442056.phy');
$tree.substitute('Scymnodalatias_ott3595305@\\d*', 'OpenTreeParts/OpenTree_all/3595305.phy');
$tree.substitute('Centroselachus_ott756559@\\d*', 'OpenTreeParts/OpenTree_all/756559.phy');
$tree.substitute('Zameus_ott399864@\\d*', 'OpenTreeParts/OpenTree_all/399864.phy');
$tree.substitute('Scymnodon_ott956139@\\d*', 'OpenTreeParts/OpenTree_all/956139.phy');
$tree.substitute('Oxynotidae_ott250745@\\d*', 'OpenTreeParts/OpenTree_all/250745.phy');

//;#  == Nucletmycea_ott5246132 ==, from file BespokeTree/include_files/Nucletmycea.PHY
$tree.substitute('Discicristoidea_ott5246837@\\d*', 'OpenTreeParts/OpenTree_all/5246837.phy');
$tree.substitute('Chytridiomycota_ott177160@\\d*', 'OpenTreeParts/OpenTree_all/177160.phy');
$tree.substitute('Blastocladiales_ott469418@\\d*', 'OpenTreeParts/OpenTree_all/469418.phy');
$tree.substitute('Mucoromycotina_ott564951@\\d*', 'OpenTreeParts/OpenTree_all/564951.phy');
$tree.substitute('Ascomycota_ott439373@\\d*', 'OpenTreeParts/OpenTree_all/439373.phy');
$tree.substitute('Basidiomycota_ott634628@\\d*', 'OpenTreeParts/OpenTree_all/634628.phy');
$tree.substitute('Glomeromycota_ott385878@\\d*', 'OpenTreeParts/OpenTree_all/385878.phy');
$tree.substitute('Entomophthoromycota_ott97730@\\d*', 'OpenTreeParts/OpenTree_all/97730.phy');
$tree.substitute('Kickxellomycotina_ott759290@\\d*', 'OpenTreeParts/OpenTree_all/759290.phy');
$tree.substitute('Zoopagales_ott956400@\\d*', 'OpenTreeParts/OpenTree_all/956400.phy');

//;#  == None ==, from file BespokeTree/include_files/PrimatesSpringer2012.PHY
$tree.substitute('Phaner_ott323054@\\d*', 'OpenTreeParts/OpenTree_all/323054.phy');

//;#  == Primates_ott913935 ==, from file BespokeTree/include_files/PrimatesSpringer2012_AT.PHY
$tree.substitute('Phaner_ott323054@\\d*', 'OpenTreeParts/OpenTree_all/323054.phy');

//;#  == Protostomia_ott189832 ==, from file BespokeTree/include_files/Protostomes.PHY
$tree.substitute('Nemertea_ott445195@\\d*', 'OpenTreeParts/OpenTree_all/445195.phy');
$tree.substitute('Bryozoa_ott442934@\\d*', 'OpenTreeParts/OpenTree_all/442934.phy');
$tree.substitute('Entoprocta_ott362916@\\d*', 'OpenTreeParts/OpenTree_all/362916.phy');
$tree.substitute('Cycliophora_ott41147@\\d*', 'OpenTreeParts/OpenTree_all/41147.phy');
$tree.substitute('Phoronida_ott612209@\\d*', 'OpenTreeParts/OpenTree_all/612209.phy');
$tree.substitute('Brachiopoda_ott826261~-612209@\\d*', 'OpenTreeParts/OpenTree_all/826261.phy');
$tree.substitute('Mollusca_ott802117@\\d*', 'OpenTreeParts/OpenTree_all/802117.phy');
$tree.substitute('Gastrotricha_ott29723@\\d*', 'OpenTreeParts/OpenTree_all/29723.phy');
$tree.substitute('Platyhelminthes_ott555379@\\d*', 'OpenTreeParts/OpenTree_all/555379.phy');
$tree.substitute('Rotifera_ott471706@\\d*', 'OpenTreeParts/OpenTree_all/471706.phy');
$tree.substitute('Acanthocephala_ott49622@\\d*', 'OpenTreeParts/OpenTree_all/49622.phy');
$tree.substitute('Micrognathozoa_ott435981@\\d*', 'OpenTreeParts/OpenTree_all/435981.phy');
$tree.substitute('Gnathostomulida_ott242963@\\d*', 'OpenTreeParts/OpenTree_all/242963.phy');
$tree.substitute('Onychophora_ott1072433@\\d*', 'OpenTreeParts/OpenTree_all/1072433.phy');
$tree.substitute('Arthropoda_ott632179@\\d*', 'OpenTreeParts/OpenTree_all/632179.phy');
$tree.substitute('Tardigrada_ott111438~-2943021@\\d*', 'OpenTreeParts/OpenTree_all/111438.phy');
$tree.substitute('Nematoda_ott395057@\\d*', 'OpenTreeParts/OpenTree_all/395057.phy');
$tree.substitute('Nematomorpha_ott189836@\\d*', 'OpenTreeParts/OpenTree_all/189836.phy');
$tree.substitute('Scalidophora_ott434620@\\d*', 'OpenTreeParts/OpenTree_all/434620.phy');
$tree.substitute('Chaetognatha_ott570366@\\d*', 'OpenTreeParts/OpenTree_all/570366.phy');

//;#  == Tetrapoda_ott229562 ==, from file BespokeTree/include_files/Tetrapods_Zheng_base.PHY
$tree.substitute('Gekkota_ott190153@\\d*', 'OpenTreeParts/OpenTree_all/190153.phy');
$tree.substitute('Xantusiidae_ott661801@\\d*', 'OpenTreeParts/OpenTree_all/661801.phy');
$tree.substitute('Gerrhosauridae_ott1063741@\\d*', 'OpenTreeParts/OpenTree_all/1063741.phy');
$tree.substitute('Cordylidae_ott269281@\\d*', 'OpenTreeParts/OpenTree_all/269281.phy');
$tree.substitute('Scincidae_ott1091911@\\d*', 'OpenTreeParts/OpenTree_all/1091911.phy');
$tree.substitute('Lacertoidea_ott4945817@\\d*', 'OpenTreeParts/OpenTree_all/4945817.phy');
$tree.substitute('Anguimorpha_ott139516@\\d*', 'OpenTreeParts/OpenTree_all/139516.phy');
$tree.substitute('Acrodonta_ott202365@\\d*', 'OpenTreeParts/OpenTree_all/202365.phy');
$tree.substitute('Pleurodonta_ott608975@\\d*', 'OpenTreeParts/OpenTree_all/608975.phy');
$tree.substitute('Serpentes_ott186816@\\d*', 'OpenTreeParts/OpenTree_all/186816.phy');
