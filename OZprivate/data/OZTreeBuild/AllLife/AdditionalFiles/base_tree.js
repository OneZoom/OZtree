//;# Various hacks allow this javascript code to be included in perl simply using > require ('filename.js');
//;# this  includes using '//;#' as a single-line comment, and prefixing variables by '$'

//;# Base tree for chordates, assuming initial divergence at 550Mya.

$tree = new Tree('BespokeTree/include_files/Base.PHY');

$tree.substitute('AMORPHEA@', 'BespokeTree/include_files/Amorphea.PHY', 50);
$tree.substitute('CRUMS@', 'BespokeTree/include_files/CRuMs.PHY');
$tree.substitute('DIAPHORETICKES@', 'BespokeTree/include_files/Diaphoretickes.PHY', 100);
$tree.substitute('METAZOA@', 'BespokeTree/include_files/Animals.PHY', 150);
$tree.substitute('PORIFERA@', 'BespokeTree/include_files/PoriferaOneZoom.phy', 50);
$tree.substitute('CTENOPHORA@', 'BespokeTree/include_files/CtenophoresPoder2001.PHY', 50);
$tree.substitute('AMBULACRARIA@', 'BespokeTree/include_files/Ambulacraria.PHY', 20, 'Ambulacraria'); //;# base @ 530Ma, C21 = 550Ma
//;#  DEEPFIN tree root (Shark + bony-fish) is at 462.4. Guess for Cyclostome divergence = 500Mya
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
$tree.substitute('BOREOEUTHERIA@',  'BespokeTree/include_files/BoreoeutheriaOneZoom_altered.phy', 5); //;# C12=85Ma
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
$tree.substitute('HOLOMYCOTA@', 'BespokeTree/include_files/Holomycota.PHY', 300);
$tree.substitute('APHELIDA@', 'BespokeTree/include_files/Aphelida_rough.PHY', 100);

//;# PHYLOGENIES PART FILLED BY OPEN TREE OF LIFE
//;# Commands output from getOpenTreesFromOneZoom.py

