#!/usr/bin/perl
use strict;
use warnings;
use LWP::Simple;
use MIME::Base64;
our $^I=''; # see perlvar(1)
while(<>){
    s|(xlink:href=)(["'])(https?:[\w/.]+\.jpg)\g2|$1.$2."data:image/jpg;base64,".encode_base64(get($3), "").$2|eg; #embed jpgs
    print;
}
