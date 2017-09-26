#!/usr/bin/perl -sw

use strict;
use File::ReadBackwards;

sub collapse {
    #pass in a set of node names or numbers to collapse

    my $intree = shift;
    my $collapse = shift; #this is a hash of node names
    my $regex_match = shift || qr/^([^',;\)]*)/; #this is a regexp to match names against

    tie *BACKTREE, "File::ReadBackwards", $intree, ")"
        or die "can't read newick file '$intree' $!" ;
    my $del_depth=0;
    my $line = 0;
    my @omit;
    while (<BACKTREE>) { #read in reverse order, separated by close brackets
      my ($uid) = (/$regex_match/); #name for the prev brace (comma = no name)
      if ($del_depth) {
        #if we have started deleting, we keep track of which are deleted 
        my $pos = length;
        do {
          $pos = rindex($_,'(',$pos-1);
        } while ($pos != -1 && --$del_depth);
        unshift @omit, [$line, $pos]; #$pos == -1 means omit all this line
        $del_depth++ if ($del_depth); #if still in brace nest, next loop increases depth
      };
      if (defined $uid && exists $collapse->{$uid}) {
        if ($del_depth) {
          my ($name) = (/^([^',;\)]+)/);
          warn("clade to collapse ($name) is nested within another collapsed clade: ignoring");
        } else {
          $del_depth = 1;
        }
      }
      $line++;
    }
    close(BACKTREE);
    
    #recalculate to count close braces from start of file
    foreach (@omit) {
      $_->[0] = $line - $_->[0];
    }
    
    #now go forwards through the file, printing when @omit allows
    $/ = ")";
    open(FORETREE, "<", $intree) or die "cannot open $intree: $!";
    while(<FORETREE>) {
      if (@omit && ($. == $omit[0][0])) {
        print substr($_, 0, $omit[0][1]) if ($omit[0][1] != -1);
        shift @omit;
      } else {
        print;
      }
    }
};

my $intree = shift @ARGV; # first arg is location of tree
my $OpenToLTaxonomy = shift @ARGV; # second arg is the corresponding taxonomy.tsv file
my $outtree = shift @ARGV; # third arg if present is the output tree
if ($outtree) {
    open(OUT, ">", $outtree)  or die "cannot open $outtree: $!";
    select OUT;
};
open(TAXONOMY, "<", $OpenToLTaxonomy) 
  or die "Cannot open taxonomy file $OpenToLTaxonomy: $!";

my @header = split("\t", <TAXONOMY>);
my( $rank_index )= grep { $header[$_] eq "rank" } 0..$#header;
my( $OTTid_index )= grep { $header[$_] eq "uid" } 0..$#header;
my $species={};

while (<TAXONOMY>) {
  if ((split("\t"))[$rank_index] eq "species") {
    $species->{(split("\t"))[$OTTid_index]} = 1;
  }
}
close(TAXONOMY);

collapse($intree, $species,  qr/^[^,].*?_ott(\d+)[',;\)]/);