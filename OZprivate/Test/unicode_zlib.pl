#!/usr/bin/perl

use utf8;
use File::Copy qw(copy);

my $u="é and some 汉语/漢語;";
my $outname = 'tmp';
open(my $fh, ">:utf8", "$outname.nwk") || die "Couldn't open $outname.nwk: $!";
select $fh;
print 'leaf_metadesc: '.$u.",\n";
close $fh;
system('gzip', '-9kf', "$outname.nwk");
copy("$outname.nwk.gz", "$outfile.nwk.bak.gz");