#!/usr/bin/perl -ws
# Given a csv input file containing EOL page numbers, return a file of the best pd|cc-by|cc-by-sa picture ids and the common names
# we must then map the EOL ids against the OTT ids using ordered_leaves
# set -c=X to read EOL id from column X of the CSV file
#produce e.g. list of all leaves using 
# cut -f 2,4 -d, data/DBinputs/ordered_leaves.csv | ServerScripts/Utilities/getBestEOLdoID.pl -c=2 - > output.txt

# The simplest use of this script is e.g. 
#      ./getBestEOLdoID.pl pageIDs.txt output.txt

use strict;
use warnings;
use LWP::Simple;
use JSON -support_by_pp;
use Try::Tiny;
use Data::Dumper;
use Text::CSV;
use vars qw/$c/;  #column number for EOL ID
$c=1 unless defined $c;

## Default settings ##
my $APIkey="0e8786f5d94e9587e31ed0f7703c9a81f3036c7f"; #replace with your own API key.
my $vernacularLANG = 'en';
$vernacularLANG = $main::language if(defined($main::language));

my $pagesbase = "http://eol.org/api/pages/1.0.json"; #see http://eol.org/api/docs/pages
my %pages_params = (
  batch      => 'true',
#  key        => $APIkey,
  images     => 1,     # only look through the first 10 images
  videos     => 0,
  sounds     => 0,
  text       => 0,
  cache_ttl  => 2500, #only cache for 10 secs
  licenses   =>'pd|cc-by|cc-by-sa', #change this to get objects distributed under different licences
  iucn       => 'false',
  common_names=>'true',
  details    => 'false',
  taxonomy    => 'false',
  vetted     => 2, #If 'vetted' is given a value of '1', then only trusted content will be returned. If 'vetted' is '2', then only trusted and unreviewed content will be returned (untrusted content will not be returned). The default (0) is to return all content.
);
  

## Program starts here ##

die("The name of a file of EOL page ids names (or - for stdin) is required as a first argument\n") unless ($ARGV[0]);
my @taxa =(); #store all the data in here
my $pageids;
if ($ARGV[0] eq "-") {
  $pageids = \*STDIN;
} else {
  open($pageids, "<", $ARGV[0])
    or die "cannot open ".$ARGV[0]." for reading: $!";
}

if ($ARGV[1] && $ARGV[1] ne "-") {
  open(OUTPUT, ">:utf8", $ARGV[1])
    or die "cannot open ".$ARGV[1]." for (over)writing: $!";
} else {
  *OUTPUT = *STDOUT;
  binmode OUTPUT, ":utf8";
}
select OUTPUT;
$| = 1;


my @rows;
my $csv = Text::CSV->new ( { binary => 1 } )  # should set binary attribute.
                 or die "Cannot use CSV: ".Text::CSV->error_diag ();
 
while ( my $row = $csv->getline( $pageids ) ) {
     push @rows, $row;
}
$csv->eof or $csv->error_diag();
close $pageids;

my $h = {};

my @BATCHES;
push @BATCHES, [ splice @rows, 0, 10 ] while @rows;
foreach my $batch (@BATCHES) {
    print(join("\t", (@$_, getPageInfo(map {$_->[$c-1]} @$batch));
}


open(my $fh2, "<", $ARGV[1]);
while(<$fh2>) {
    s/^,(\d+)/,$h->{$1}/;
    print;
}


sub getPageInfo {
  my $ids = shift;  
  my $eol_data = {};
  my $url = $pagesbase."?id=".join("%2C",@$ids)."&".join("&", map{"$_=$pages_params{$_}"} keys %pages_params);
  my $i=0;
  my $pg;
  while (not($pg = fetch_json_page($url))) {
    last if (++$i==10); #try getting the page a few times
    sleep(2); #wait a bit and try again
  };
  unless ($pg) {
    warn "Error in getting json page result from EoL for url = '$url', tried $i times\n";    
  } else {
    #sort out names etc.
    if (ref($pg) ne "ARRAY") {
    	die "Error in EoL json page for url = '$url': no labelled data\n";    
    };
    foreach my $id (@$pg) {
        my @ids = keys %$id;
        die("No single id\n") if @ids != 1;
        my $EOLid = $ids[0];
        my $DOid = "";
        my $VN_en = "";
        if (!($id->{$EOLid}->{dataObjects}) || 0==@{$id->{$EOLid}->{dataObjects}}) {
          #warn "(no appropriate data objects found in EoL for $data{name} at ".pageID2URL($id)."\n";
        } else {
          $DOid = $id->{$EOLid}->{dataObjects}->[0]->{dataObjectVersionID}
        };

        foreach my $vn (@{$id->{$EOLid}->{vernacularNames}}) {
            if ($vn->{language} && $vn->{language} eq $vernacularLANG) {
              if (!$VN_en || ($vn->{eol_preferred} && $vn->{eol_preferred} eq 'true')) {
                $VN_en = $vn->{vernacularName}; #pick the first one
              }
            }
        }
        push(@$retvals, [$DOid, $VN_en]);
  };
 }
 return($retvals);
}


sub fetch_json_page
{
  my $json = new JSON;
  my ($json_url) = shift;
  # download the json page:
  my $json_text;
  my $content = get( $json_url );
  if (defined($content)) {
    try {
    # these are some nice json options to relax restrictions a bit:
      $json_text=$json->allow_nonref->utf8->relaxed->escape_slash->loose->allow_singlequote->allow_barekey->decode($content);
    } catch {
      warn "In string \"$content\" - JSON error: $_ \n";
    };
  };
  return $json_text;
}

sub trimname {
  #take an author name and make it nicer
  my $name = decode_entities(shift);
  $name =~ s/^\s*creator:?//i; #common idiom to start wikicommons authors with e.g. Creator: Joseph Smit
  $name =~ s/^\s*//;
  $name =~ s/\s*$//;
  $name =~ s/^(?:<.+?>)*unknown(?:<.+?>)*$//i; #strip "unknown" and tags
  return $name;
}