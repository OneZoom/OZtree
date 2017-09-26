#!/usr/bin/perl -ws
# a quick hack to mine target leaf taxa out of the tree
# uses many horrible hacks to pretend js code is actually perl!
# it will output a list of image IDs

# run e.g. in AT_Data_Set dir as: ../server_scripts/utilities/list_from_includetree.pl ../OZ_yan/user/ATlife_selected_meta.js
use Data::Dumper;
use Tie::IxHash;
use HTML::Entities;
my %count;
tie %count, 'Tie::IxHash';
use vars qw/$v/;
package Tree;
  use Acme::Dot;
  sub new {
  }
  
  sub add_leaf_metadata {
  }
  
  sub add_node_metadata {
  }
  
  sub create_OTT_metadata_arrays {
  }

package main;
$_ = ""; #stops error reporting for javascript comments like //;#
{
    use vars qw/$tree/;
    $LEAF_TALES = {};

    local $SIG{__WARN__} =sub {    my @loc = caller(1); #stop error reporting for Acme::Dot syntax
        unless (($_[0] =~ /Useless use of concatenation \(\.\) or string in void context/) or
                ($_[0] =~ /Use of uninitialized value \$tree in concatenation \(\.\)/)) {
            if (defined $loc[2]) {
                print STDERR "Warning generated at line $loc[2] in $loc[1]:\n", @_, "\n";
            } elsif (defined $loc[1]) {
                print STDERR "Warning generated in $loc[1]:\n", @_, "\n";
            } else {
                print STDERR "Warning generated:\n", @_, "\n";
            }
            return 1;
        };
    };
    $tree = new Tree();
    $tree->{full_arr} = 'test';
    
    open FILE, $ARGV[0] || die "Couldn't open metadata file $ARGV[1]: $!"; 
    my $file_contents = join("", <FILE>);
    close FILE;
    $file_contents =~ s! ((['"]) (?: \\. | .)*? \2) | # skip quoted strings
       /\* .*? \*/ |  # delete C comments
       // [^\n\r]*    # delete C++ comments
     ! $1 || ' '      # change comments to a single space
     !xseg;
     
    $file_contents =~ s|:|=>|g; #convert js hash syntax {a:"b"} to perl {a=>"b"}
    $file_contents =~ s|(?<=[,\[]),|undef,|g; #convert "[," to "[undef," and ",," to ",undef,"
    eval $file_contents;

    my (@index_OZ) = grep {$OZ_leafmetacols->[$_]->{name} eq 'EoLdataobjectID'} 0..$#$OZ_leafmetacols;
    my (@index) = grep {$Basic_leafmetacols->[$_]->{name} eq 'EoLdataobjectID'} 0..$#$Basic_leafmetacols;


    foreach my $k (keys %$LEAF_TALES) {
           if (exists $LEAF_PICTURES->{$k}) {
                print 'cp pics/'.($LEAF_PICTURES->{$k}->[(scalar(@{$LEAF_TALES->{$k}})<6)?$index[0]:$index_OZ[0]]).'.jpg ~/Sites/ancestorstale/pics/'."\n";
        }
    }


    foreach my $k (keys %$LEAF_TALES) {
           if (exists $LEAF_PICTURES->{$k}) {
                print "#".$k." {background: url('pics/".($LEAF_PICTURES->{$k}->[(scalar(@{$LEAF_TALES->{$k}})<6)?$index[0]:$index_OZ[0]]).".jpg') no-repeat center center fixed; background-size: cover;}\n";
           }
    }

    foreach my $k (keys %$LEAF_TALES) {
           if (exists $LEAF_PICTURES->{$k}) {
                print '<li><a href="OZ.html?leaf='.$k.'" id="'.$k.'">The XXX&lsquo;s Tale</a></li>'."\n";
           }
    }

    tie my %LEAF_TALES, 'Tie::IxHash';
    $tmp_lt ='
$LEAF_TALES = {
    "Homo_sapiens":[,,,,,"humanstales.html", "Eight tales about kinship, domestication, culture, human genetics, ancient DNA, fossiliation, brains, &amp; bipedality"],
    "Pan_troglodytes":[,,,,,"chimpstale.html", "On the rate of mutation in our DNA"],
    "Pan_paniscus":[,,,,,"bonobostale.html", "On our genetic links to other animals"],
    "Gorilla_gorilla":[,,,,,"gorillastale.html", "On our attitudes to other apes"],
    "Pongo_pygmaeus":[,,,,,"orangutanstale.html", "On parsimony and migration"],
    "Hylobates_lar":[,,,,,"gibbonstale.html", "How evolutionary trees are constructed"],
    "Alouatta_seniculus":[,,,,,"howler_monkeystale.html","On colour vision and the origin of genes"],
    "Daubentonia_madagascariensis":[,,,,,"aye-ayestale.html", "On Madagascar and island evolution"],
    "Cynocephalus_volans":[,,,,,"colugostale.html", "On uncertainty in the tree of life"],
    "Mus_musculus":[,,,,,"mousestale.html","The analogy between DNA &amp; computer code"],
    "Castor_fiber":[,,,,,"beaverstale.html", "On extended phenotypes"],
    "Hippopotamus_amphibius":[,,,,,"hippostale.html", "On unexpected evolutionary links"],
    "Mirounga_leonina":[,,,,,"sealstale.html","On breeding systems, size, and sex ratios"],
    "Bradypus_tridactylus":[,,,,,"slothstale.html","On continental drift and biogeography"],
    "Notoryctes_typhlops":[,,,,,"marsupial_molestale.html","On convergent evolution"],
    "Ornithorhynchus_anatinus":[,,,,,"duckbillstale.html", "On brains and our perception of the world"],
    "Microlophus_albemarlensis":[,,,,,"lava_lizardstale.html","A tale of surrealism and frozen time"],
    "Geospiza_magnirostris":[,,,,,"galapagos_finchstale.html","On the speed of natural selection"],
    "Pavo_cristatus":[,,,,,"peacockstale.html","On sexual selection and walking on two legs"],
    "Raphus_cucullatus":[,,,,,"dodostale.html","On flight, flightlessness, and islands"],
    "Aepyornis_maximus":[,,,,,"elephant_birdstale.html","On "],
    "Ensatina_eschscholtzii":[,,,,,"salamanderstale.html","On discontinuity and the illusion of species"],
    "Gastrophryne_carolinensis":[,,,,,"narrowmouthstale.html","On isolation and its reinforcement"],
    "Ambystoma_mexicanum":[,,,,,"axolotlstale.html", "On development and neoteny"],
    "Neoceratodus_forsteri":[,,,"lungfishstale.html", "On the colonization of the land"],
    "Latimeria_chalumnae":[,,,"coelacanthstale.html", "On &lsquo;living fossils&rsquo; and hidden evolution"],
    "Phycodurus_eques":[,,,"leafy_sea_dragonstale.html","On phenotypic plasticity"],
    "Esox_lucius":[,,,"pikestale.html", "The buoyant success of fish"],
    "Pundamilia_nyererei":[,,,"cichlidstale.html", "On adaptive radiations"],
    "Astyanax_mexicanus":[,,,"blind_cave_fishstale.html", "On the reversibility of evolution"],
    "Platichthys_flesus":[,,,"flounderstale.html", "On design and imperfection"],
    "Lampetra_fluviatilis":[,,,"lampreystale.html", "On gene trees and genome duplications"],
    "Branchiostoma_lanceolatum":[,,,"lanceletstale.html", "How living things cannot be ancestors"],
    "Nereis_pelagica":[,,,"ragwormstale.html", "On the basic form of animals"],
    "Artemia_salina":[,,,"brine_shrimpstale.html", "On evolution, behaviour, & turning upsidedown"],
    "Atta_cephalotes":[,,,"leaf_cutterstale.html", "On agriculture and delayed gratification"],
    "Chorthippus_brunneus":[,,,"grasshopperstale.html", "On the vexed topic of race"],
    "Drosophila_melanogaster":[,,,"fruit_flystale.html", "On body patterning and HOX genes"],
    "Philodina_roseola":[,,,"rotiferstale.html", "On the puzzle of sex"],
    "Sacculina_carcini":[,,,"barnaclestale.html", "On weird wonders of the animal world"],
    "Peripatoides_novaezealandiae":[,,,"velvet_wormstale.html", "On the Cambrian explosion"],
    "Mastigias_papua":[,,,"jellyfishstale.html", "The allure of things yet to understand"],
    "Pocillopora_damicornis":[,,,"polypiferstale.html", "On communities of organisms and genes"],
    "Euplectella_aspergillum":[,,,"spongestale.html", "On the origin of animals I"],
    "Sphaeroeca_volvox":[,,,"choanoflagellatestale.html", "On the origin of animals II"],
    "Brassica_oleracea":[,,,"cauliflowerstale.html", "On networks to supply the body"],
    "Sequoia_sempervirens":[,,,"redwoodstale.html", "A tale about dating the past"],
    "Utricularia_gibba":[,,,"humped_bladderwortstale.html", "On excess DNA in genomes"],
    "Mixotricha_paradoxa":[,,,"mixotrichstale.html", "Symbiosis and the origin of complex life"],
    "Rhizobium_leguminosarum":[,,,"rhizobiumstale.html", "On alleged unevolvability"],
    "Thermus_aquaticus":[,,,"taqstale.html", "A tale about the true diversity of life"],
};';
    
    $tmp_lt =~ s/:.*,/,/g;
    $tmp_lt =~ s/\$/@/g;
    $tmp_lt =~ s/{/(/g;
    $tmp_lt =~ s/}/)/g;

    eval($tmp_lt);

print(@LEAF_TALES);

    foreach my $k (@LEAF_TALES) {
           if (exists $LEAF_PICTURES->{$k}) {
                $talename = encode_entities($LEAF_TALES->{$k}[-2]);
                if ($talename =~ s/(.*)stale.html$/$1/) {
                    $talename =~ s/grasshopper/grass&shy;hopper/;
                    $talename =~ s/narrowmouth/narrow&shy;mouth/;                    
                    $talename =~ s/choanoflagellate/choano&shy;flagellate/;                    
                    $talename = join " ", map {ucfirst} split "_", $talename;
                    $talename = "$talename&rsquo;s Tale";
                    $talename = "The ".$talename unless ($talename =~ /Taq/);
                } else {
                    $talename =~ s/(.*)tales.html$/$1 Tales/;
                }
                $eolID = $LEAF_PICTURES->{$k}->[(scalar(@{$LEAF_TALES->{$k}})<9)?$index[0]:$index_OZ[0]];
                $pic_loc = encode_entities("pics/$eolID.jpg");
                $copyright = `exiftool -copyright $pic_loc`;
                $copyright =~ s/^\s+|\s+$//g; #trim;
                $copyright =~ s/^Copyright\s+:\s+//i;
                $sp_ = $sp = encode_entities($k);
                $sp =~ s/_/ /g;
                print qq|<li><a href="tree.html?leaf=$k"><h6>$talename</h6><img src="$pic_loc" title="$sp. $copyright" alt="Picture of $sp"></a>$LEAF_TALES->{$k}[-1]</li>\n|;
           }
    }


}