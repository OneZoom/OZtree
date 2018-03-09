#!/usr/bin/perl -ws
#Test how to encode / decode unicode strings in image metadata using ExifTool

use Image::ExifTool qw(:Public);
use JSON;
use utf8;
use Encode;
warn("foo");
binmode(STDOUT, ":utf8");
my $string =   Encode::decode_utf8(ImageInfo("../../static/FinalOutputs/pics/31918342.jpg")->{'Copyright'});
print "'".to_json([$string])."'\n";
my $string = "© Me, foo";
print "'".to_json([$string])."'\n";
print "'燕'\n\n\n";
print "\ndone";