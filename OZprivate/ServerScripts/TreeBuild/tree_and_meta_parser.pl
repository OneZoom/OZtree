#!/usr/bin/perl -ws
use strict;
use JSON;
use utf8;

# perl equivalent of Tree class from OZ_script_V2.0.yan.js, which parses a tree with @include commands into one huge
# set of javascript variables. This should be exactly equivalent to running process_XXX.html, but without using javascript
#
# uses many horrible hacks to pretend js code is actually perl!
# it will output javascript that can be placed directly into a tree.js file

# run e.g. as tree_and_meta_parser.pl Life_selected_tree.js ATlife_selected_meta.js outname
# or without a metafile to simply parse the #include commands into a newick file
# i.e. tree_and_meta_parser.pl Life_selected_tree.js > outtree.nwk

# use the -v switch to output verbose messages
# tree_and_meta_parser.pl -v Life_selected_tree.js ATlife_selected_meta.js outprefix backup_outprefix

# tree_and_meta_parser.pl -v Life_selected_tree.js ATlife_selected_meta.js outprefix backup_outprefix

# use the -info_for_pics switch to specify a folder of images, from which to try and extract EXIF copyright & rating info 

# ../../ServerScripts/TreeBuild/tree_and_meta_parser.pl Life_selected_tree.js ATlife_selected_meta.js info_for_pics=../../../static/FinalOutputs/pics/ ../../../static/FinalOutputs/Life_OZoldformat_selected ../../data/TreeArchive/Life_OZoldformat_selected_2016-04-30 

# use the -yan switch to output a single file containing both tree string and metadata which can be used in yan's version of the onezoom web code (this is a more flexible format which allows multiple schemas within a single tree)

use vars qw/$v $vv $info_for_pics $yan/;

package General;
use utf8;

sub dissect_leafname {
    my $leafname = shift;
    my $ott = undef;
    my $leaf_richness = 1;
    #look for leaves which are stand-ins for multiple children (#num_children)
    if ($leafname =~ s/\#(\d+)('?)$/$2/) { #cut #XX from name (should be inside any quotes)
        $leaf_richness = int($1);
    }
    
    if ($leafname =~ /^(\d+)_$/) {
        #this is a temporary 'fake' label for an unnamed leaf with no extra metadata but with a negative OTTid, used to find children
        $ott = - int($1);
    } elsif ($leafname =~ s/(_ott(\d+))('?)$/$3/) {
        $ott = int($2);
    }
    return ($leafname, $ott, $leaf_richness);
}

package Tree;
  use Acme::Dot;
  use JSON;
  use Data::Dumper;
  use utf8;
  use File::Copy qw(copy);  
  use POSIX 'strftime';


  sub new {
        my $class = shift;
        my $phy_file = shift;
        my $self = {
            'newick' => undef,
            'leaf_metadata' => undef,
            'node_metadata' => undef,
            'md_schemas' => undef,
            'leafcount' => 0,
            'nodecount' => 0
        };
        bless $self, $class;
        $self->{newick} = $self->read_newick($phy_file);
        return $self;
  }
  
  sub read_newick {
    my ($self) = shift;
    my $tree_or_file = shift;
	if ($tree_or_file =~ /\.(txt|phy|nwk)\s*$/i) {
        open(FILE, "<:utf8", $tree_or_file) || die "Couldn't open $tree_or_file: $!";
        my $newick = join("", <FILE>);
        close FILE;
        $newick =~ s/^\s*\[.*]\s*//s; # allow initial comments: if first line begins with a square bracket, skip to close square bracket
        return $newick;
	} else {
	   return $tree_or_file;
	}
  }
  
  sub leaf_suffix() {
    my $self = shift;
    return (defined $main::yan)?"":'['.$self->{leafcount}.']'
  }

  sub node_suffix() {
    my $self = shift;
    return (defined $main::yan)?"":'['.$self->{nodecount}.']'
  }

  sub create_lookup_table {
    #turn [{name=>'a'}, {name=>'z'}, {name=>'c'}] into {a=>1,z=>2,c=>3}
    my $arr = shift; 
    return {map {$arr->[$_]->{name} => 1+$_} 0..$#$arr};
  }
  
  sub minify_json_to_js {
    #hack to remove nulls from JSON (not acceptable for strict json, but OK for javascript)
    $_ = shift; 
    s/(?<=[\[,])null(?=[,\]])//g; #remove nulls
    s/,+(?=\])//g; #remove trailing ,,,]
    $_;
  }

  sub leaves_as_list_of_otts {
    #return the existing ott ids from the current newick file as [ott1,ott2,ott3,...]
    my $self = shift;
    my $otts = [];
    if (defined $self->{leaf_metadata}) {
        die("Sorry, for obscure reasons you cannot return the leaves in a tree once it has been filled with metadata!");
    } else {
        open(TREESTR, '<', \$self->{newick}) || die "Couldn't access newick string";
        local $/=")"; #lines are separated by a closing brace
        while (my $nwkline = <TREESTR>) {
          #NB: all leaves have numbers (sequential), and cannot be blank (this is not 100% newick compatible)
          while($nwkline =~ /(?<=[,(])([^,:()]+)/gx) {
            my $ott = (General::dissect_leafname($1))[1];
            push(@$otts, $ott) if ($ott);
          };
        };
        close TREESTR;
    };
    return $otts;
  }

  sub leaves_as_list_of_name_then_ott_arrays {
    #return the existing leaves from the current newick file as [[name1,ott1],[name2,ott2],...]
    my $self = shift;
    my $leafnames = [];
    if (defined $self->{leaf_metadata}) {
        die("Sorry, for obscure reasons you cannot return the leaves in a tree once it has been filled with metadata!");
    } else {
        open(TREESTR, '<', \$self->{newick}) || die "Couldn't access newick string";
        local $/=")"; #lines are separated by a closing brace
        while(my $nwkline = <TREESTR>) {
          #NB: all leaves have numbers (sequential), and cannot be blank (this is not 100% newick compatible)
          while($nwkline =~ /(?<=[,(])([^,:()]+)/gx) {
            push @$leafnames, [(General::dissect_leafname($1))[0..1]];
          };
        };
        close TREESTR;
    };
    return $leafnames;
  }
        

  sub print {
    my $self = shift;
    my $outname = shift;
    my $backup_name = shift;
    
    unless (defined $self->{leaf_metadata}) {
        #we have not called $tree->fill_with($meta), so we should simply output the newick file
        print STDERR "Skipped metadata parsing: simply outputting newick file\n" if (defined $main::v || defined $main::vv);
        if (defined $backup_name) {
            $backup_name .= '.nwk';
            $outname .= '.nwk';
            open(my $fh, ">:utf8", $backup_name) || die "Couldn't open $backup_name: $!";
            select $fh;
        } elsif (defined $outname) {
            $outname .= '.nwk';
            open(my $fh, ">:utf8", $outname) || die "Couldn't open $outname: $!";
            select $fh;
        } else {
            binmode(STDOUT, ":utf8");
        }
        print $self->{newick};
        close;       
    } else {
        #print both tree and metadata to a js file
                
        if (defined $backup_name) {
            $backup_name .= '.js';
            $outname .= '.js';
            open( my $fh, ">:utf8", $backup_name) || die "Couldn't open $backup_name: $!";
            select $fh
        } elsif (defined $outname) {
            $outname .= '.js';
            open( my $fh, ">:utf8", $outname) || die "Couldn't open $outname: $!";
            select $fh
        } else {
            binmode(STDOUT, ":utf8");
        }

        if (defined $main::yan) {
            #tally separate schemas used in leaves and nodes
            my $leaf_schemas = [];
            my $schema_mapping_for_leaves = {};
            
            foreach my $meta (@{$self->{leaf_metadata}}) {
                $schema_mapping_for_leaves->{$meta->[0]}=undef if (defined $meta && defined $meta->[0])
            }
            my $new_leaf_index=0;
            foreach my $s (sort keys(%$schema_mapping_for_leaves)) {
                $schema_mapping_for_leaves->{$s}=$new_leaf_index;
                $leaf_schemas->[$new_leaf_index] = $self->{md_schemas}->[$s];
                $new_leaf_index ++;
            }
            foreach my $meta (@{$self->{leaf_metadata}}) {
                $meta->[0]=$schema_mapping_for_leaves->{$meta->[0]} if (defined $meta && defined $meta->[0]);
            }
            
            my $node_schemas = [];
            my $schema_mapping_for_nodes = {};
            foreach my $meta (@{$self->{node_metadata}}) {
                $schema_mapping_for_nodes->{$meta->[0]}=undef if (defined $meta && defined $meta->[0]);
            }
            
            my $new_node_index =0;
            foreach my $s (sort keys(%$schema_mapping_for_nodes)) {
                $schema_mapping_for_nodes->{$s}=$new_node_index;
                my $schema = $self->{md_schemas}->[$s];
                $node_schemas->[$new_node_index] = [@$schema[0..$#$schema-1]]; #remove the last ("n_spp") entry
                $new_node_index ++;
            }
            foreach my $meta (@{$self->{node_metadata}}) {
                $meta->[0]=$schema_mapping_for_nodes->{$meta->[0]} if (defined $meta && defined $meta->[0]);
            }

            # for outputting to the new format, we need a function to construct some simple index arrays
            
            
            
            print '$tree = {'."\n";
            print 'newick_string: "'.$self->{newick}.'"'.",\n";
            print 'leaf_metadesc: '.to_json($leaf_schemas).",\n";
            print 'leaf_metacols: '.to_json([map {create_lookup_table($_)} @$leaf_schemas]).",\n";
            print 'node_metadesc: '.to_json($node_schemas).",\n";
            print 'node_metacols: '.to_json([map {create_lookup_table($_)} @$node_schemas]).",\n";
            print 'leaf_metadata: '.minify_json_to_js(to_json($self->{leaf_metadata})).",\n";
            print 'node_metadata: '.minify_json_to_js(to_json($self->{node_metadata}))."\n";
            print '};';
           
        } else {
            #output old-style OZ format, which unifies all the separate schemas into a single leaf schema and single node schema
            #       e.g. $self->{leaf_schemas} = [['common', 'ID'],['common', 'IUCN']]
            #unite these into a single set of headings 
            #       e.g. ['common', 'ID', 'IUCN']
            # and the first row of the metadata gives the column names, rather than a blank as at present
            #for each schema we need a list of indices that map index in that schema to the new indicies in the single unified schema
            #e.g. in this case $schema_mapping_for_leaves = {0=>[1,2,x1],1=>[0,x2,2]} where x is a index that does not exist in the schema
            #so that we can call e.g. $new_meta->[$i] = @{$metadata->[$i]}[$schema_mapping_for_leaves->{$metadata->[$i]->[0]}];

            my $schema_mapping_for_leaves = {};
            foreach my $meta (@{$self->{leaf_metadata}}) {
                $schema_mapping_for_leaves->{$meta->[0]}=undef if (defined $meta && defined $meta->[0])
            }
            my @leaf_colnames = ();
            foreach my $orig_schema_num (sort keys(%$schema_mapping_for_leaves)) {
                foreach my $column (@{$self->{md_schemas}->[$orig_schema_num]}) {
                    push(@leaf_colnames, $column->{name}) unless (grep(/^$column->{name}$/, @leaf_colnames));
                }
            }
            foreach my $orig_schema_num (sort keys(%$schema_mapping_for_leaves)) {
                my $lookup = create_lookup_table($self->{md_schemas}->[$orig_schema_num]);
                my $non_existing_index = scalar(@{$self->{md_schemas}->[$orig_schema_num]})+1;
                $schema_mapping_for_leaves->{$orig_schema_num}=[map {exists($lookup->{$_})?$lookup->{$_}:$non_existing_index} @leaf_colnames];
            }

            my $schema_mapping_for_nodes = {};
            foreach my $meta (@{$self->{node_metadata}}) {
                $schema_mapping_for_nodes->{$meta->[0]}=undef if (defined $meta && defined $meta->[0])
            }
            my @node_colnames = ();
            foreach my $orig_schema_num (sort keys(%$schema_mapping_for_nodes)) {
                foreach my $column (@{$self->{md_schemas}->[$orig_schema_num]}) {
                    unless ($column->{name} eq 'n_spp') {
                        push(@node_colnames, $column->{name}) unless (grep(/^$column->{name}$/, @node_colnames));
                    }
                }
            }
            foreach my $orig_schema_num (sort keys(%$schema_mapping_for_nodes)) {
                my $lookup = create_lookup_table($self->{md_schemas}->[$orig_schema_num]);
                my $non_existing_index = scalar(@{$self->{md_schemas}->[$orig_schema_num]})+1;
                $schema_mapping_for_nodes->{$orig_schema_num}=[map {exists($lookup->{$_})?$lookup->{$_}:$non_existing_index} @node_colnames];
            }


            print 'var rawData = "'.($self->{newick} =~  s/"/\\"/gr).'";'."\n";

            print "var metadata = {\n";
            print "'leaf_meta': [";
            my $firstrow = 1;
            foreach my $metarow (@{$self->{leaf_metadata}}) {
                if ($firstrow) {
                    print to_json([@leaf_colnames]).",\n";
                    $firstrow = 0;
                } else {
                    if (defined $metarow && scalar(@$metarow)) {
                        print minify_json_to_js(to_json([@$metarow[@{$schema_mapping_for_leaves->{$metarow->[0]}}]])).",\n";
                    } else {
                        print "[],\n";
                    }
                }
            }
            print "],\n'node_meta': [";
            $firstrow = 1;
            foreach my $metarow (@{$self->{node_metadata}}) {
                if ($firstrow) {
                    print to_json([@node_colnames]).",\n";
                    $firstrow = 0;
                } else {
                    if (defined $metarow && scalar(@$metarow)) {
                        print minify_json_to_js(to_json([@$metarow[@{$schema_mapping_for_nodes->{$metarow->[0]}}]])).",\n";
                    } else {
                        print "[],\n";
                    }
                }
            }
            print "]};\n";
        }
        #if a backup file was output, move it to $outname
        close;
        if (defined $backup_name) {
            copy($backup_name, $outname);
            my $err = system('gzip', '-9kf', $outname);
            die "Could not gzip compress file $outname for web serving using gz_static: $!" if $err;
            $err = system('bzip2', '-9f', $backup_name);
            die "Could not bzip2 compress file $backup_name for archiving: $!" if $err;
        } elsif (defined $outname) {
            my $err = system('gzip', '-9kf', $outname);
            die "Could not gzip compress file $outname for web serving using gz_static: $!" if $err;
        }
    }
    select STDOUT;
  }

  sub substitute {
    
    my $self = shift;
    my $name_from_subst = shift;
    my $tree_or_file = shift;
    my $stem_length = shift;
    my $new_node_name = shift;

	if (defined $stem_length) {
		$stem_length = ":$stem_length"
	} else {
		$stem_length = "";
	}
	
    print STDERR " - substituting $name_from_subst.\n" if (defined $main::vv);

	my $sub_tree = $self->read_newick($tree_or_file);
		
	#replace ; or end of string with the name & length

 	$sub_tree =~ s{([^,\):;]*)(:[-\d\.]+)?;?\s*$}{  #locate name + optional length + optional semicolon at end of file
 	        my $name_from_file = $1;
 	        my ($nleaves) = ($name_from_file =~ /(#\d+)'?/);
 	        $nleaves = '' unless $nleaves;
 	        my $file_has_2_or_more_taxa = (($-[0] > 0) || ($nleaves && $nleaves > 1)); #if match is at start of file, this is a file with one taxon
	    	unless (defined($new_node_name)) {
	    	    if ($file_has_2_or_more_taxa && ($name_from_subst =~ /('?)(.+)_ott(\d*)~?([-\d]*)\@.*/)) { 
	    	      # if the 'substitution name' (e.g. PORIFERA@) contains an _ottXXX, then this is a substitution from the OpenTree
	    	      # in this case, we have less control over the name given to that clade within the substitution file 
	    	      # (which could be wrong in the OpenTree database, e.g. choanoflagellida/choanomondada). 
	    	      # So we might want to use the substitution name, which we can change in the tree.js file.
	    	      # The exception to this is where the file only contains a single species. Here we definitely want to 
	    	      # use the name in the substitution file, otherwise we will lose the species name, and replace it with a higher group
	    	      # Either way, we should take care to retain the #number_of_leaves value from the substitution file, if it exists
	    	      # note that some of the substition names will be enclosed in quotes.
    	    	   $new_node_name = $2;
    	    	   if ($3) {
                     $new_node_name .= "_ott".$3;
    	    	   }
    	    	   $new_node_name = $1.$new_node_name.$nleaves.$1;
	    	    } else { # else trust the name from the included file more than the one used in the subs command
	    		   $new_node_name = $name_from_file || $name_from_subst =~ s/\@.*/$nleaves/r;
    	        };
	    	};
	    	#default to using stem length from function. If not, use the value from the end of file, if not, nothing
	        $new_node_name.($stem_length || $2 || "");
    }ex;

	$self->{newick} =~ s/'?$name_from_subst'?(\:[-0-9\.]+)?/$sub_tree/ge;


  }
  
  sub substitute_with_fn_last {
    my $self = shift;
    my $subst_name = shift;
    my $stem_length = shift;
    my $new_node_name = shift;
    my $tree_or_file = shift;
  
    if ($tree_or_file =~ /^\d+$/) {
        $new_node_name = $new_node_name . '#' . $tree_or_file;
        $tree_or_file = '';
    }
    $self->substitute($subst_name, $tree_or_file, $stem_length, $new_node_name);
  }

    
  sub fill_with {
    my ($self) = shift;
    my ($meta) = shift;
    my $new_newick = '';
    $self->{leaf_metadata} = [[],];
    $self->{node_metadata} = [[],];
    $self->{leaf_schemas} = [];
    $self->{node_schemas} = [];

    $meta->{temporary_array} = [];

    open(TREESTR, '<', \$self->{newick}) || die "Couldn't access newick string";
    
    local $/=")"; #lines are separated by a closing brace
   
    while(<TREESTR>) {
        
      unless (/^\(/) { #unless first line
        if (/;/) { #at the end of the tree
            my $remainder;
            ($_, $remainder) = split(';',$_,2);
            warn("Remaining text after the tree: $remainder") if ((defined $main::v || defined $main::vv) && $remainder =~ /\S/);
        };
        ### INTERNAL NODES ###
        ### NB all nodes must get a metadata entry
        s/^([^,:)]*)/$meta->process_node(++$self->{nodecount}, $1).$self->node_suffix()/ex;
      };
    
      ### LEAVES ###
      #NB: all leaves have numbers (sequential), and cannot be blank (this is not 100% newick compatible)
      s/(?<=[,(])([^,:)(]+)/$meta->process_leaf(++$self->{leafcount}, $1).$self->leaf_suffix()/gex;

      #Build up a new newick string incrementally
      $new_newick .= $_;
    };
    $self->{newick} = $new_newick.";"; #add the terminal semicolon, in case it doesn't have one.
    $self->add_metadata($meta->{metadata}, $meta->{temporary_array}, $meta->{md_schemas});
    1; #avoids errors when include()ing metadata file
  }
  
  sub add_metadata {
    #here we must go through an array of references into the metadata array, 
    #each element of which refers to either a leaf (negative int) or node (positive)
    #in $self->newick_string

    my ($self) = shift;
    my ($metadata) = shift;
    my ($ref_array) = shift;
    $self->{md_schemas} = shift;
    my $used_taxa = {};
    
    foreach my $i (0..$#$ref_array) {
        my $potential_hash = $ref_array->[$i];
        my @foo = grep {!exists $used_taxa->{$_}} keys(%$potential_hash);
        my @best = sort {$potential_hash->{$b}->[0] <=> $potential_hash->{$a}->[0]} @foo;
        if (defined $best[0]) {
            $used_taxa->{$best[0]} = 1; #flag this number as used
            my $meta = $metadata->[$i];
            my $schema = $meta->[0];
            if ($best[0]>=0) {
                #this is a node
                my $taxon = $best[0];
                $self->{node_metadata}->[$taxon] = $meta;
            } else {
                #this is a leaf - might need to add n_spp to metadata
                my $taxon = -$best[0];
                my $n_spp = $potential_hash->{$best[0]}->[1];
                if ($n_spp != 1) {
                    #only bother adding species number if >1. Add it to the #schema_fields+1 th column of the md, since md has an initial column not in schema
                    $meta->[$#{$self->{md_schemas}->[$schema]} + 1] = $n_spp;
                }
                $self->{leaf_metadata}->[$taxon] = $meta;
            }
        }
    }
  }
  

package Metadata;
  use Text::CSV::Encoded;
  use DBI;
  use JSON;
  use Acme::Dot;
  use Data::Dumper;
  use Encode;
  use utf8;

  sub new {
        print STDERR "Creating metadata object.\n" if (defined $main::v || defined $main::vv);

        my $class = shift;
        my $self = {
            'md_schemas' => [],
            'metadata' => [],
            'temporary_array' => [],
            'ott_indexed_meta' => {},
            'name_indexed_meta' => {},
        };
        bless $self, $class;
        $self->add_JSONschema();
        return $self;
  }
  
  sub add_JSONschema {
    my ($self) = shift;
    my ($json_text) = shift;
    my $ott_field = {name=>"OTTid", allowed=>"integer"};
    my $sciname_field = {name=>"scientificName"};
    my $last_field = {name=>"n_spp"}; #only used for leaves, and only for a few leaves at that. Since this is the last field, when not used the data can be shorter
    
    unless (defined $json_text) {
        #if a blank schema is added, we just use the simplest possible desc
        $self->{md_schemas}->[0] = [$ott_field, $last_field];
        return (0);
    } else {
        my $schema = from_json($json_text); #should be of the form [col2details, col3details, ...] where col2details= {name:"col1name", desc:{...}};
        unshift @$schema, ($ott_field, $sciname_field);
        push @$schema, $last_field;
        return (push(@{$self->{md_schemas}}, $schema) - 1);
    }
  }
  
  sub standardize_name {
    #not a method: a simple function
    $_ = shift;
    s/ /_/;
    lc;
  }

  sub database_connect {
    my $self = shift;
    my $db_conn_string = shift; # e.g. mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
    $db_conn_string =~ s/^\s+|\s+$//g;
    my $dbh;
    if ($db_conn_string =~ m|^sqlite://(.+)|) {
       $dbh = DBI->connect("DBI:SQLite:dbname=$1", "","")
         or warn "Couldn't connect to database: " . DBI->errstr;
       return $dbh;
     } elsif ($db_conn_string =~ m|^mysql://([^:]+):([^@]+)@([^/]+)/([^?]+)|) {
       $dbh = DBI->connect("DBI:mysql:database=$4;host=$3;port=3306", $1, $2, {mysql_enable_utf8 => 1})
         or warn "Couldn't connect to database: " . DBI->errstr;
       return $dbh;
     }
  };

  sub verified_info_data_from_db {
    # hardcoded to return leaf metadata injected by admin into the verified_info table as
    #   [[,OTT_ID,common_name,,EOL_preferred_image,,,IUCN],...]
    my $self = shift;
    my $dbh = shift;
    my $q = "SELECT OTT_ID,common_name,EOL_preferred_image,IUCN FROM reservations WHERE verified_time IS NOT NULL and deactivated IS NULL;";
    my $sth = $dbh->prepare($q)
                or warn "Couldn't prepare statement: " . $dbh->errstr;
    $sth->execute;
    return([map {[undef,$_->[0],$_->[1],undef,$_->[2],undef,undef,$_->[3]]} @{$sth->fetchall_arrayref}]);
  };

  sub leaf_taxon_data_from_db {
    # hardcoded to look at the ordered_leaves table, only pick those that match the passed in positive otts, then 
    # return a list of 
    #   [[,ott,,popularity,,,,,price],...]
    # note that this will not return the popularity of 'ghost' leaves
    
    my $self = shift;
    my $dbh = shift;
    my $leaves = shift;
    my $ret = [];
    # Note that the max_allowed_packet size, which limits the size of the query, is usually 4MB
    # The largest OTT number is ~ 6000000 (7 chars = 7 bytes). With a comma separating the numbers, this allows
    # a 4Mb query to contain about half a million numbers. To be sure, we break up the list of leaf otts into groups of 100,000 
    @$leaves = grep {$_ >= 0} @$leaves;
    while (my @chunks = splice @$leaves, 0, 100000) {
        my $q = "SELECT ott,popularity,price FROM ordered_leaves WHERE ott in (".(join(",",@chunks)).");";
        my $sth = $dbh->prepare($q)
                or warn "Couldn't prepare statement: " . $dbh->errstr;
        $sth->execute;
        #print popularity to nearest integer, to save space
        push (@$ret, map {[undef,$_->[0],
                           undef,
                           defined($_->[1])?sprintf("%d",$_->[1]):undef,
                           undef,
                           undef,
                           undef,
                           undef,
                           $_->[2]]} @{$sth->fetchall_arrayref});
    };
    return($ret);
  }

  sub iucn_taxon_data_from_db {
    # hardcoded to look at the iucn table, only pick those that match the passed in positive otts, then 
    # return a list of 
    #   [[,ott,,,,,,iucn],...]
    # note that this will not return the iucn of 'ghost' leaves, which will have negative otts
    my $self = shift;
    my $dbh = shift;
    my $leaves = shift;
    my $ret = [];
    # Note that the max_allowed_packet size, which limits the size of the query, is usually 4MB
    # The largest OTT number is ~ 6000000 (7 chars = 7 bytes). With a comma separating the numbers, this allows
    # a 4Mb query to contain about half a million numbers. To be sure, we break up the list of leaf otts into groups of 100,000 
    @$leaves = grep {$_>=0} @$leaves;
    while (my @chunks = splice @$leaves, 0, 100000) {
        my $q = "SELECT ott,status_code FROM iucn WHERE ott IN (".(join(",",@chunks)).");";
        my $sth = $dbh->prepare($q)
                    or warn "Couldn't prepare statement: " . $dbh->errstr;
        $sth->execute;
        push (@$ret, map {[undef,$_->[0],undef,undef,undef,undef,undef,$_->[1]]} @{$sth->fetchall_arrayref});
    };
    return($ret);
  }


  sub add {
    # can add a string, a path, 
    #for old style, all leaf metadata is the same format
    my $self = shift;
    my $input = shift;
    my $JSONschema = shift;

    my $schema_id = $self->add_JSONschema($JSONschema);
    
    if (ref($input)) {
        if (ref($input) eq 'ARRAY') {
            print STDERR " - adding metadata from array\n" if (defined $main::vv);
            my $i=0;
            foreach my $row (@$input) {
                if (@$row) {
                    $self->addrow($schema_id, $row, "Row ".($i++));
                }
            }
        } else {
            print STDERR "CANNOT ADD METADATA: wrong input type\n";
        }
    } else {
        print STDERR " - adding metadata from file '$input'\n" if (defined $main::vv);
        my $csv = Text::CSV::Encoded->new({encoding_in  => "utf8" ,blank_is_undef=>1}) or die "Cannot use CSV: ".Text::CSV::Encoded->error_diag();
        open my $fh, "<", $input or die "Couldn't open $input: $!";
        while ( my $row = $csv->getline( $fh ) ) {
            $self->addrow($schema_id, $row, "row ".$csv->record_number." of $input");
        }
        $csv->eof or $csv->error_diag();
        close $fh;
    }
  }    
        
  sub addrow {
    my $self = shift;
    my $schema_id = shift;
    my $row = shift;
    my $err_location = shift;
    
    #rows are stored in csv as name, ott, data_field1, data_field2, etc....
    warn("Not enough data for $err_location: " + join(", ", map {defined($_)?$_:'undefined'} @$row)) if (scalar($row) < 3);
    #rows are saved in metadata variable as schemaID, OTTid, name, ...
    # convert all data keys to lowercase
    my $ottID = defined($row->[1])?0+int($row->[1]):undef;
    my $name = $row->[0];
    die("Error in $err_location. You must define either an OTTid or a name for each row.") unless (defined $name || defined $ottID);
    push(@{$self->{metadata}}, [$schema_id, $ottID, $name, @$row[2..$#$row]]);
    my $meta_rowIndex = $#{$self->{metadata}};
    $self->fill_image_info($self->{metadata}->[$meta_rowIndex]);

    if (defined $ottID) {
        #NB we could have multiple metadata items with the same OTT ID
        if (exists $self->{ott_indexed_meta}->{$ottID}) {
            push @{$self->{ott_indexed_meta}->{$ottID}}, $meta_rowIndex;
            warn("Multiple metadata items with the same OTT ID: ".to_json([map {$self->{metadata}->[$_]} @{$self->{ott_indexed_meta}->{$ottID}}])) if (defined $main::v || defined $main::vv);
        } else {
            $self->{ott_indexed_meta}->{$ottID} = [$meta_rowIndex];
        }
    }
    
    if (defined $name) {
        my $standard_name = standardize_name($name);
        if (exists $self->{name_indexed_meta}->{$standard_name}) {
            push @{$self->{name_indexed_meta}->{$standard_name}}, $meta_rowIndex;
            warn("Multiple metadata items with the same name: ".to_json([map {$self->{metadata}->[$_]} @{$self->{name_indexed_meta}->{$standard_name}}])) if (defined $main::v || defined $main::vv);
        } else {
            $self->{name_indexed_meta}->{$standard_name} = [$meta_rowIndex];
        }
    }
  }
  
  sub overwrite {
    #read from the CSV file
    my $self = shift;
    my $input = shift;
    my $JSONschema = shift;
    my $schema_id = undef;

    $schema_id = add_JSONschema($JSONschema) if ($JSONschema);
    if (ref($input)) {
        if (ref($input) eq 'ARRAY') {
            #used for database queries
            print STDERR " - overwriting metadata with data from array\n" if (defined $main::vv);
            my $i=0;
            foreach my $row (@$input) {
                if (@$row) {
                    $self->overwriterow($schema_id, $row, "Row ".($i++));
                }
            }
        } else {
            print STDERR "Wrong overwrite type: ".ref($input)."\n";
        }
    } else {
        print STDERR " - overwriting metadata with data from file '$input'\n" if (defined $main::vv);
        my $csv = Text::CSV::Encoded->new({encoding_in  => "utf8",blank_is_undef=>1}) or die "Cannot use CSV: ".Text::CSV::Encoded->error_diag();
        open my $fh, "<", $input or die "Couldn't open $input: $!";
        while ( my $row = $csv->getline( $fh ) ) {
            $self->overwriterow($schema_id, $row, "row ".$csv->record_number." of $input");
        }
        $csv->eof or $csv->error_diag();
        close $fh;
    }
  }

  sub overwriterow {
    my $self = shift;
    my $schema_id = shift;
    my $row = shift;
    my $err_location = shift;
    my $meta_rowIndex = undef;

    my $ottID = defined($row->[1])?int($row->[1]):undef;
    my $name = $row->[0];
    die("Error in $err_location. You must define either an OTTid or a name for each row.") unless (defined $name || defined $ottID);
    my $best_rowIndex = undef;
    if ((defined $ottID) && (exists $self->{ott_indexed_meta}->{$ottID})) {
        if (scalar(@{$self->{ott_indexed_meta}->{$ottID}}) == 1) {
            $best_rowIndex = $self->{ott_indexed_meta}->{$ottID}->[0];
        } else {
            #if more than one OTT match, must match name exactly to overwrite
            foreach $meta_rowIndex (@{$self->{ott_indexed_meta}->{$ottID}}) {
                if (defined $meta_rowIndex && defined $self->{metadata}->[$meta_rowIndex]) {
                    if ((defined($self->{metadata}->[$meta_rowIndex]->[2]) && defined($name)) ||
                        (!defined($self->{metadata}->[$meta_rowIndex]->[2]) && !defined($name))) {
                        if (standardize_name($self->{metadata}->[$meta_rowIndex]->[2]) eq standardize_name($name)) {
                            $best_rowIndex = $meta_rowIndex;
                            last;
                        }
                    }
                }
            }
        }
    } elsif (defined $name) {
        my $standard_name = standardize_name($name);
        if (exists $self->{name_indexed_meta}->{$standard_name}) {
            if (scalar(@{$self->{name_indexed_meta}->{$standard_name}}) == 1) {
                $best_rowIndex = $self->{name_indexed_meta}->{$standard_name}->[0];
            } else {
                foreach $meta_rowIndex (@{$self->{name_indexed_meta}->{$standard_name}}) {
                    if (defined $meta_rowIndex && defined $self->{metadata}->[$meta_rowIndex]) {
                        warn("Looking for a non-existing metadata row: $meta_rowIndex") unless (scalar(@{$self->{metadata}}) > $meta_rowIndex);
                        #if multiple identical names, OTT must match exactly to overwrite
                        if ((defined $self->{metadata}->[$meta_rowIndex]->[1] && defined $ottID && $self->{metadata}->[$meta_rowIndex]->[1]==$ottID) || 
                            (!defined $self->{metadata}->[$meta_rowIndex]->[1] && !defined $ottID)) {
                            $best_rowIndex = $meta_rowIndex;
                            last;
                        }
                    }
                }
            }
        }
    }

    if (defined $best_rowIndex) {
        warn("Looking for a non-existing metadata row: $meta_rowIndex") unless (scalar(@{$self->{metadata}}) > $best_rowIndex);
        my $existing = $self->{metadata}->[$best_rowIndex];
        if (defined $schema_id) {
            $existing->[0] = $schema_id;
            if ($#$existing > scalar(@{$self->{schemas}->[$schema_id]})) {
                $#$existing = scalar(@{$self->{schemas}->[$schema_id]}); #truncate
            }
        }
        unshift(@$row, $existing->[0]);
        $existing->[1] = ($ottID+0) if defined $ottID;
        $existing->[2] = $name if defined $name;
        $self->fill_image_info($row);
        foreach (3..$#$row) {
            $existing->[$_] = $row->[$_] if (defined $row->[$_])
        }
    }
  }
  
  sub taxon_match {
    my $self = shift;
    my $ott = shift;
    my $name = shift;
    
    my $match_index = undef;
    my $match_score = 0;
    
    ## Try to find a match in the name array first
    if (defined $name) {
        my $standard_name = standardize_name($name);
        if (exists $self->{name_indexed_meta}->{$standard_name}) {
            if (scalar(@{$self->{name_indexed_meta}->{$standard_name}}) == 1) {
                #at least the name matches
                $match_index = $self->{name_indexed_meta}->{$standard_name}->[0];
                $match_score = 1;
            }
    
            #carry on to look if there is a better hit
            foreach my $meta_rowIndex (@{$self->{name_indexed_meta}->{$standard_name}}) {
                die("Looking for a non-existing metadata row: $meta_rowIndex") unless (scalar(@{$self->{metadata}}) > $meta_rowIndex);
                my $meta_ott = $self->{metadata}->[$meta_rowIndex]->[1];
                if (defined $meta_ott && defined $ott && $meta_ott == $ott) {
                    $match_index = $meta_rowIndex;
                    $match_score = 3;
                    last;
                } elsif (!defined $meta_ott && !defined $ott) {
                    $match_index = $meta_rowIndex;
                    $match_score = 2.5;
                    last;
                }
            }
        }
    }
    
    ## If not, find a match in the OTT array
    if ($match_score < 2) {
        if ((defined $ott) && (exists $self->{ott_indexed_meta}->{$ott})) {
            if (scalar(@{$self->{ott_indexed_meta}->{$ott}})) {
                $match_index = $self->{ott_indexed_meta}->{$ott}->[0];
                if (scalar(@{$self->{ott_indexed_meta}->{$ott}})==1) {
                    $match_score = 2; #the OTT has matched, but since we got here, the name hasn't
                } else {
                    if ($match_score == 0) {
                        #this is difficult, as we have more than one OTT match, but no name match (otherwise it would have matched in the name_indexed_meta array. So we pick an arbitrary one.
                        $match_score = 0.5;
                        my $chosen_name = $self->{metadata}->[$match_index]->[2];
                        warn("OTT match ($ott), but no name match for $name and multiple possible metadata entries with the same OTT id, so choosing first one ($chosen_name)");
                    }
                }
            }
        }
    }
    return ($match_index, $match_score);
  }

  sub process_leaf {
    #take a leaf name in a tree and match against existing metadata.
    #place the passed-in leaf in a metadata array
    #return the name without the OTT id attached
    
    my $match_score = 4;
    my $match_metadata_index = undef;
    my ($self) = shift;
    my ($leaf_number) = shift;
    my ($leafname, $ott, $n_spp) = General::dissect_leafname(shift);
    
    warn("Set bespoke number of leaves ($n_spp) for $leafname") if (($n_spp != 1) && (defined $main::vv));
    
    ($match_metadata_index, $match_score) = $self->taxon_match($ott, $leafname) if ($leafname || (defined $ott && $ott >= 0));
    
    if (defined $match_metadata_index) {

        #save a temporary index to the matched metadata
        if (defined $self->{temporary_array}->[$match_metadata_index]) {
            $self->{temporary_array}->[$match_metadata_index]->{-$leaf_number} = [$match_score, $n_spp]; 
        } else {
            $self->{temporary_array}->[$match_metadata_index] = {-$leaf_number => [$match_score, $n_spp]}; 
        }
    } elsif(defined $ott) {
        push(@{$self->{metadata}}, [0, $ott]);
        $self->{temporary_array}->[$#{$self->{metadata}}] = {-$leaf_number => [$match_score, $n_spp]};
    }
    return($leafname);
  }

  sub process_node {
    #take a node name from a tree and match against existing metadata.
    #place the passed-in node_number in a metadata array
    #return the name without the OTT id attached
    
    my ($self) = shift;
    my ($node_number) = shift;
    my ($nodename) = shift;
    my $ott = undef;
    my $match_score = 4;
    my $match_metadata_index = undef;
    
    if ($nodename =~ /^(\d+)_$/) {
        #this is a temporary 'fake' label for an otherwise unnamed node
        # with no extra metadata but with a negative OTTid, used to find children
        $ott = - int($1);
    } else {
    
        if ($nodename =~ s/(_ott(\d+))('?)$/$3/) {
            $ott = int($2);
        }
        ($match_metadata_index, $match_score) = $self->taxon_match($ott,$nodename);
    }
    
    if (defined $match_metadata_index) {
        #save a temporary index to the matched metadata
        if (defined $self->{temporary_array}->[$match_metadata_index]) {
            $self->{temporary_array}->[$match_metadata_index]->{$node_number} = [$match_score]; 
        } else {
            $self->{temporary_array}->[$match_metadata_index] = {$node_number=>[$match_score]}; 
        }
    } elsif(defined $ott) {
        #even if there is no match, we might want to store the OTT in metadata
        my $index = push(@{$self->{metadata}}, [0, $ott]);
        $self->{temporary_array}->[$index-1] = {$node_number => [$match_score]};
    }
    return($nodename)         
  }
  
  sub fill_image_info {
    my $self = shift;
    my $rowdata = shift; #rowdata contains schema_id, name, OTT, common, pop, DOid
    my $schema = $self->{md_schemas}->[$rowdata->[0]];
   
    my $imgsuffix = ".jpg";
    my $credit_flag = 1;
    my $rating_flag = 2;
    my $imagecols = {'picID'=>$credit_flag|$rating_flag,'PhyloPicID'=>$credit_flag};

    my @cols = grep { exists $imagecols->{$schema->[$_]->{name}} } 0..$#$schema;
        
    if ($main::info_for_pics && scalar(@cols)) {
        unless (-d $main::info_for_pics) {
            die("Directory ".$main::info_for_pics." of picture files to obtain credit and rating info does not exist");
        } else {
            use Image::ExifTool qw(:Public);
            # For all @picture_cols, look to see if there is the same colname with _credit appended, 
            #and if there is no value in that column, try to grab it from the EXIF 'Copyright' field
            foreach my $c (@cols) {
                my $name = $schema->[$c]->{name};
                #look for credit if necessary
                if (($imagecols->{$name} & $credit_flag) && defined $rowdata->[$c+1]) {
                    my @cred_target_col = grep { $schema->[$_]->{name} eq $name."_credit"} 0..$#$schema;
                    die("Problem finding metadata column '${name}_credit'") unless (scalar(@cred_target_col) == 1);
                    unless (defined $rowdata->[$cred_target_col[0]+1] && $rowdata->[$cred_target_col[0]+1] ne '') {
                        my $credit = Encode::decode_utf8(ImageInfo($main::info_for_pics."/".$rowdata->[$c+1].$imgsuffix)->{'Copyright'});
                        if ($credit) {
                            $rowdata->[$cred_target_col[0]+1] = $credit;
                            warn("Set credit for ".($rowdata->[1]||"<Unnamed>")." with ott ".($rowdata->[2]||"<no OTT>")." (image $rowdata->[$c+1]) to $credit") if (defined $main::vv);
                        }
                    } else {
                        warn("Credit line already exists ".$rowdata->[$cred_target_col[0]+1]."\n");
                    }
                }

                if (($imagecols->{$name} & $rating_flag) && defined $rowdata->[$c+1]) {
                    my @rate_target_col = grep { $schema->[$_]->{name} eq $name."_rating"} 0..$#$schema;
                    unless (defined $rowdata->[$rate_target_col[0]+1] && $rowdata->[$rate_target_col[0]+1] ne '') {
                        die("Problem finding metadata column '${name}_rating'") unless (scalar(@rate_target_col) == 1);
                        my $rating = ImageInfo($main::info_for_pics."/".$rowdata->[$c+1].$imgsuffix)->{'Rating'};
                        if (defined $rating) {
                            $rowdata->[$rate_target_col[0]+1] = $rating;
                            warn("Set rating for ".($rowdata->[1]||"<Unnamed>")." with ott ".($rowdata->[2]||"<no OTT>")." (image $rowdata->[$c+1]) to $rating") if (defined $main::vv);
                        }
                    } else {
                        #rating exists - convert to int
                        $rowdata->[$rate_target_col[0]+1] += 0;
                    }
                }
            }
       }
    }
  }    


package main;
  use utf8;
  binmode(STDERR, ":utf8");
  $_ = ""; #stops error reporting for javascript comments like //;#
{
    our $tree; #so that the perl scripts in ARGV[0] can make a tree and pass it out
    use Data::Dumper;
    {
        local $SIG{__WARN__} =sub {    my @loc = caller(1); #stop error reporting for Acme::Dot syntax
            unless ($_[0] =~ /Useless use of concatenation \(\.\) or string in void context/) {
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
        print STDERR "Parsing tree includes:\n"  if (defined $main::v || defined $main::vv);
        require $ARGV[0];
    
        if (defined $ARGV[1] && $ARGV[1] ne '') {
            $_ = ""; #stops error reporting for javascript comments like //;#
            our $db_connection_string = $ARGV[2]; # pass in a database connection string to construct the tree with metadata from a db, e.g. "mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>"
            require($ARGV[1]);
        }
    }
    if (defined $ARGV[3]) {
      $tree->print($ARGV[3], $ARGV[4]);
    } else {
      $tree->print();
    }
}