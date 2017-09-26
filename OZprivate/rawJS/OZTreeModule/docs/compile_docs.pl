use MIME::Base64;
 
sub slurp {
    my $file = shift;
    open my $fh, '<', $file or die;
    local $/ = undef;
    my $cont = <$fh>;
    close $fh;
    return $cont;
}

while(<>) {
    s|^\{\{(.+?)\}\}|slurp($1)|e;    #sub in {{filename.md}} within main file
    s|^\{\{(.+?)\}\}|slurp($1)|emg;  # sub in {{filename.md}} within subfiles
    s|(<img src=)(.)(\w+\.svg)\g2|open(IMAGE,$3); $1.$2."data:image/svg+xml;utf8,".join("",map{chomp;$_}<IMAGE>).$2|eg; #embed svgs but remove newlines
    s|(<img src=)(.)(\w+\.png)\g2|open(IMAGE,$3); $1.$2."data:image/png;base64,".encode_base64(do{local $/=undef; <IMAGE>;}, "").$2|eg; #embed pngs
    print;
}