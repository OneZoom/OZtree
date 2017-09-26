#!/usr/bin/perl -sw
use strict;
use vars qw/$d/;
use File::ReadBackwards;

#call as ./subtree_extract.pl -d=10 draftversion1.tre 632179 ...
# (d=depth to extract)

my $OpenToL = shift @ARGV;
tie *TREE, "File::ReadBackwards", $OpenToL, ")" || die "can't read '$OpenToL' $!" ;
my $match = join "|", @ARGV;
my %braces = ();
my $i=0;
while (<TREE>) { #read in reverse order, separated by close brackets
  if (scalar %braces) {  # currently in the middle of extracting one or more subtrees
    foreach my $k (keys(%braces)) {
       $braces{$k}->{depth}++;
    }
    my $open_brace = ""; # empty on first iteration, the open brace char afterwards
    foreach (reverse split(/\(/)) { #we are going backwards => count # of open braces
      foreach my $k (keys(%braces)) {
        if ($open_brace) {
         $braces{$k}->{depth}--;
        }
        if ($braces{$k}->{depth} == 0) {
          unshift @{$braces{$k}->{lines}}, $open_brace;
          open FH, ">", "$k.nwk" || die "Couldn't open file '$k.nwk' for writing: $!";
          print(FH) foreach (@{$braces{$k}->{lines}});
          close FH;
          delete $braces{$k};
        } else {
          if (!($d) || ($braces{$k}->{depth} < $d)) {
            unshift @{$braces{$k}->{lines}}, $_.$open_brace;
          } elsif ($braces{$k}->{depth} == $d) {
            unshift @{$braces{$k}->{lines}}, $_;
          }
        }
      }
      $open_brace = "(";
    }
  }
  if (m|^([- \w'/]+_ott($match)'?)\D|) {
     $braces{$2} = {depth=>0, lines=>["$1",";"]};
  }
}